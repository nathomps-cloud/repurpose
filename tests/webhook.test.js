// tests/webhook.test.js
// Real tests for pages/api/webhook.js — the Stripe webhook handler.
// Stripe signature verification, the email sender, and the DB layer are
// mocked, so no network or credentials are needed. Run with: npm test
// (Node's built-in runner, node:test — no extra test dependencies.)

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// --- Fakes ---------------------------------------------------------------

// In-memory store backing the fake DB (same key layout as lib/db.js).
let store = new Map();
let dbConfigured = true;

const dbFake = {
  isConfigured: () => dbConfigured,

  upsertUser: async ({ email, token: accessToken, plan, subscriptionId = null, activeUntil = null }) => {
    const existing = store.get(`user:email:${email}`) || {};
    const user = {
      ...existing,
      email,
      plan,
      subscriptionId,
      activeUntil,
      active: true,
      generationsUsed: existing.generationsUsed || 0,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.set(`user:email:${email}`, user);
    if (accessToken) store.set(`user:token:${accessToken}`, email);
    return user;
  },

  findUserByToken: async (accessToken) => {
    const email = store.get(`user:token:${accessToken}`);
    if (!email) return null;
    return store.get(`user:email:${email}`) || null;
  },

  revokeUser: async ({ email, reason }) => {
    const existing = store.get(`user:email:${email}`);
    if (!existing) return null;
    const updated = {
      ...existing,
      active: false,
      revokedAt: new Date().toISOString(),
      revokeReason: reason,
    };
    store.set(`user:email:${email}`, updated);
    return updated;
  },
};

// The event the fake Stripe verification returns (set per test), or the
// error it throws for a bad signature.
let nextEvent = null;
let constructError = null;

class FakeStripe {
  constructor(key) {
    this.key = key;
    this.webhooks = {
      constructEvent: () => {
        if (constructError) throw constructError;
        return nextEvent;
      },
    };
    this.customers = {
      retrieve: async (id) => ({ id, email: 'buyer@example.com' }),
    };
  }
}

// Welcome emails the handler tried to send, in order.
let sentEmails = [];

mock.module('stripe', { exports: { default: FakeStripe } });
mock.module('micro', { exports: { buffer: async (req) => req._rawBody } });
mock.module('../lib/emails/welcome.js', {
  exports: {
    sendWelcomeEmail: async (args) => {
      sentEmails.push(args);
    },
  },
});
mock.module('../lib/db.js', { exports: dbFake });

// The handler constructs its Stripe client at import time, so give it
// placeholder keys (the fake client never talks to Stripe).
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
process.env.ACCESS_TOKEN_SECRET = 'test-secret';

// webhook.js reads its imports at load time, so each scenario imports a
// fresh copy (the query string busts the module cache).
let importCount = 0;
async function loadWebhook() {
  importCount += 1;
  return import(`../pages/api/webhook.js?import-${importCount}`);
}

function makeReq({ method = 'POST', event = null } = {}) {
  return {
    method,
    headers: { 'stripe-signature': 't=1,v1=fakesig' },
    _rawBody: Buffer.from(JSON.stringify(event || {})),
  };
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
  return res;
}

beforeEach(() => {
  store = new Map();
  sentEmails = [];
  nextEvent = null;
  constructError = null;
  dbConfigured = true;
});

describe('webhook handler', () => {
  it('grants lifetime access on payment_intent.succeeded and emails the link', async () => {
    const webhook = await loadWebhook();
    nextEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          metadata: { email: 'buyer@example.com', plan: 'lifetime', customerName: 'Buyer Person' },
        },
      },
    };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });

    const user = store.get('user:email:buyer@example.com');
    assert.equal(user.plan, 'lifetime');
    assert.equal(user.active, true);
    assert.equal(user.subscriptionId, null);

    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].email, 'buyer@example.com');
    assert.equal(sentEmails[0].plan, 'lifetime');
    assert.match(sentEmails[0].accessUrl, /\/app\?token=[0-9a-f]{32}$/);

    // The token in the emailed link resolves back to the buyer.
    const token = sentEmails[0].accessUrl.split('token=')[1];
    assert.equal(store.get(`user:token:${token}`), 'buyer@example.com');
  });

  it('activates a monthly subscription on customer.subscription.created', async () => {
    const webhook = await loadWebhook();
    nextEvent = {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          current_period_end: 1790000000,
        },
      },
    };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 200);
    const user = store.get('user:email:buyer@example.com');
    assert.equal(user.plan, 'monthly');
    assert.equal(user.active, true);
    assert.equal(user.subscriptionId, 'sub_123');
    assert.equal(user.activeUntil, new Date(1790000000 * 1000).toISOString());

    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].plan, 'monthly');
  });

  it('revokes access on customer.subscription.deleted', async () => {
    const webhook = await loadWebhook();
    await dbFake.upsertUser({
      email: 'buyer@example.com',
      token: 'tok-1',
      plan: 'monthly',
      subscriptionId: 'sub_123',
    });
    nextEvent = {
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123', customer: 'cus_123' } },
    };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 200);
    const user = store.get('user:email:buyer@example.com');
    assert.equal(user.active, false);
    assert.equal(user.revokeReason, 'cancelled');
    assert.equal(sentEmails.length, 0);
  });

  it('revokes access on charge.refunded', async () => {
    const webhook = await loadWebhook();
    await dbFake.upsertUser({
      email: 'buyer@example.com',
      token: 'tok-1',
      plan: 'lifetime',
    });
    nextEvent = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_123', customer: 'cus_123' } },
    };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 200);
    const user = store.get('user:email:buyer@example.com');
    assert.equal(user.active, false);
    assert.equal(user.revokeReason, 'refunded');
  });

  it('rejects a bad Stripe signature with 400', async () => {
    const webhook = await loadWebhook();
    constructError = new Error('No signatures found matching the expected signature version for payload');
    nextEvent = { type: 'payment_intent.succeeded', data: { object: { metadata: {} } } };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /^Webhook error:/);
    assert.equal(store.size, 0);
    assert.equal(sentEmails.length, 0);
  });

  it('rejects non-POST requests with 405', async () => {
    const webhook = await loadWebhook();

    const res = makeRes();
    await webhook.default(makeReq({ method: 'GET' }), res);

    assert.equal(res.statusCode, 405);
    assert.equal(res.body.error, 'Method not allowed');
  });

  it('returns 500 when the database is not configured', async () => {
    const webhook = await loadWebhook();
    dbConfigured = false;
    nextEvent = { type: 'payment_intent.succeeded', data: { object: { metadata: {} } } };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'Database not configured');
  });

  it('acknowledges invoice.payment_succeeded without granting access', async () => {
    const webhook = await loadWebhook();
    nextEvent = {
      type: 'invoice.payment_succeeded',
      data: { object: { billing_reason: 'subscription_cycle', customer_email: 'buyer@example.com' } },
    };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });
    assert.equal(store.size, 0);
    assert.equal(sentEmails.length, 0);
  });

  it('acknowledges unknown event types', async () => {
    const webhook = await loadWebhook();
    nextEvent = { type: 'customer.updated', data: { object: {} } };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });
  });

  it('does nothing when a succeeded payment has no email in metadata', async () => {
    const webhook = await loadWebhook();
    nextEvent = {
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { plan: 'lifetime' } } },
    };

    const res = makeRes();
    await webhook.default(makeReq(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(store.size, 0);
    assert.equal(sentEmails.length, 0);
  });
});
