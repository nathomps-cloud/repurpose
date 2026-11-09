// tests/db.test.js
// Real tests for lib/db.js — Upstash Redis persistence for user access.
// The @upstash/redis client is mocked with an in-memory store, so no
// network or credentials are needed. Run with: npm test
// (Node's built-in runner, node:test — no extra test dependencies.)

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// --- In-memory fake for @upstash/redis ------------------------------------
// db.js creates a new Redis client per operation, so the fake shares one
// store across instances. Tests reset it in beforeEach.
let store = new Map();

class FakeRedis {
  constructor({ url, token } = {}) {
    this.url = url;
    this.token = token;
  }

  async get(key) {
    const value = store.get(key);
    return value === undefined ? null : structuredClone(value);
  }

  async set(key, value) {
    store.set(key, structuredClone(value));
    return 'OK';
  }
}

mock.module('@upstash/redis', {
  exports: { Redis: FakeRedis },
});

// db.js reads its env config at import time, so each scenario imports a
// fresh copy (the query string busts the module cache).
let importCount = 0;
async function loadDb() {
  importCount += 1;
  return import(`../lib/db.js?import-${importCount}`);
}

function setConfiguredEnv() {
  process.env.KV_REST_API_URL = 'https://fake.upstash.io';
  process.env.KV_REST_API_TOKEN = 'fake-token';
}

function clearEnv() {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

beforeEach(() => {
  store = new Map();
  clearEnv();
});

describe('isConfigured', () => {
  it('returns false when no Redis env vars are set', async () => {
    const db = await loadDb();
    assert.equal(db.isConfigured(), false);
  });

  it('returns true when KV_REST_API_URL and KV_REST_API_TOKEN are set', async () => {
    setConfiguredEnv();
    const db = await loadDb();
    assert.equal(db.isConfigured(), true);
  });

  it('returns true via the UPSTASH_REDIS_REST_* fallback vars', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    const db = await loadDb();
    assert.equal(db.isConfigured(), true);
  });
});

describe('upsertUser', () => {
  it('creates a new active user with defaults', async () => {
    setConfiguredEnv();
    const db = await loadDb();

    const user = await db.upsertUser({
      email: 'a@example.com',
      token: 'tok-1',
      plan: 'lifetime',
    });

    assert.equal(user.email, 'a@example.com');
    assert.equal(user.plan, 'lifetime');
    assert.equal(user.active, true);
    assert.equal(user.generationsUsed, 0);
    assert.equal(user.subscriptionId, null);
    assert.equal(user.activeUntil, null);
    assert.match(user.createdAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.match(user.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

    // Persisted under the email key, and the token maps back to the email.
    assert.equal(store.get('user:email:a@example.com').email, 'a@example.com');
    assert.equal(store.get('user:token:tok-1'), 'a@example.com');
  });

  it('stores no token mapping when no token is given', async () => {
    setConfiguredEnv();
    const db = await loadDb();

    await db.upsertUser({ email: 'b@example.com', plan: 'monthly' });

    const tokenKeys = [...store.keys()].filter((k) => k.startsWith('user:token:'));
    assert.deepEqual(tokenKeys, []);
  });

  it('preserves generationsUsed and createdAt when updating an existing user', async () => {
    setConfiguredEnv();
    const db = await loadDb();

    const first = await db.upsertUser({
      email: 'c@example.com',
      token: 'tok-1',
      plan: 'monthly',
      subscriptionId: 'sub_1',
      activeUntil: '2026-12-01T00:00:00.000Z',
    });
    // Simulate usage, then update the plan.
    const stored = store.get('user:email:c@example.com');
    stored.generationsUsed = 7;
    store.set('user:email:c@example.com', stored);

    const updated = await db.upsertUser({
      email: 'c@example.com',
      token: 'tok-2',
      plan: 'lifetime',
    });

    assert.equal(updated.generationsUsed, 7);
    assert.equal(updated.createdAt, first.createdAt);
    assert.equal(updated.plan, 'lifetime');
    assert.equal(updated.subscriptionId, null);
    assert.equal(store.get('user:token:tok-2'), 'c@example.com');
  });
});

describe('findUserByToken', () => {
  it('returns the user for a known token', async () => {
    setConfiguredEnv();
    const db = await loadDb();

    await db.upsertUser({ email: 'd@example.com', token: 'tok-9', plan: 'lifetime' });

    const found = await db.findUserByToken('tok-9');
    assert.equal(found.email, 'd@example.com');
    assert.equal(found.plan, 'lifetime');
    assert.equal(found.active, true);
  });

  it('returns null for an unknown token', async () => {
    setConfiguredEnv();
    const db = await loadDb();

    assert.equal(await db.findUserByToken('nope'), null);
  });
});

describe('revokeUser', () => {
  it('returns null when the user does not exist', async () => {
    setConfiguredEnv();
    const db = await loadDb();

    assert.equal(await db.revokeUser({ email: 'ghost@example.com', reason: 'cancelled' }), null);
  });

  it('marks the user inactive with a reason and timestamp', async () => {
    setConfiguredEnv();
    const db = await loadDb();

    await db.upsertUser({
      email: 'e@example.com',
      token: 'tok-5',
      plan: 'monthly',
      subscriptionId: 'sub_9',
    });

    const revoked = await db.revokeUser({ email: 'e@example.com', reason: 'cancelled' });

    assert.equal(revoked.active, false);
    assert.equal(revoked.revokeReason, 'cancelled');
    assert.match(revoked.revokedAt, /^\d{4}-\d{2}-\d{2}T/);
    // Other fields are preserved.
    assert.equal(revoked.email, 'e@example.com');
    assert.equal(revoked.plan, 'monthly');
    assert.equal(revoked.subscriptionId, 'sub_9');

    // The stored record is revoked too, and the token still resolves to it
    // (current behaviour: lookup does not filter inactive users).
    const stored = store.get('user:email:e@example.com');
    assert.equal(stored.active, false);
    const found = await db.findUserByToken('tok-5');
    assert.equal(found.active, false);
  });
});
