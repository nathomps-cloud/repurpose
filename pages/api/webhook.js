// pages/api/webhook.js
// Listens for Stripe events and grants access after successful payment
// This is where you actually unlock access for the user


          // pages/api/webhook.js
import Stripe from 'stripe';
import { buffer } from 'micro';
import { sendWelcomeEmail } from '../../lib/emails/welcome.js';
import * as db from '../../lib/db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!db.isConfigured()) {
    console.error('❌ No KV database configured — access cannot be persisted.');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const rawBody = await buffer(req);
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { email, plan, customerName } = paymentIntent.metadata;
        if (plan === 'lifetime' && email) {
          await grantLifetimeAccess({ email, customerName, paymentIntent });
          console.log(`✅ Lifetime access granted: ${email}`);
        }
        break;
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const email = customer.email;
        if (email) {
          await grantMonthlyAccess({ email, subscription, customer });
          console.log(`✅ Monthly subscription activated: ${email}`);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_cycle') {
          console.log(`🔄 Subscription renewed: ${invoice.customer_email}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        await db.revokeUser({ email: customer.email, reason: 'cancelled' });
        console.log(`❌ Subscription cancelled: ${customer.email}`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`⚠️ Payment failed: ${invoice.customer_email}`);
        await sendPaymentFailedEmail(invoice.customer_email);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const customer = await stripe.customers.retrieve(charge.customer);
        await db.revokeUser({ email: customer.email, reason: 'refunded' });
        console.log(`💸 Refund issued, access revoked: ${customer.email}`);
        break;
      }
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function grantLifetimeAccess({ email, customerName, paymentIntent }) {
  const token = generateAccessToken(email);
  await db.upsertUser({ email, token, plan: 'lifetime', subscriptionId: null, activeUntil: null });
  await sendWelcomeEmail({
    email,
    name: customerName,
    plan: 'lifetime',
    accessUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app?token=${token}`
  });
}

async function grantMonthlyAccess({ email, subscription, customer }) {
  const token = generateAccessToken(email);
  await db.upsertUser({
    email,
    token,
    plan: 'monthly',
    subscriptionId: subscription.id,
    activeUntil: new Date(subscription.current_period_end * 1000).toISOString(),
  });
  await sendWelcomeEmail({
    email,
    name: customer.name,
    plan: 'monthly',
    accessUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app?token=${token}`
  });
}

async function sendPaymentFailedEmail(email) {
  console.log(`📧 Payment failed email → ${email}`);
}

function generateAccessToken(email) {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', process.env.ACCESS_TOKEN_SECRET || 'dev-secret')
    .update(email + Date.now())
    .digest('hex')
    .slice(0, 32);
}
