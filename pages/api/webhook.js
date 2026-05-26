// pages/api/webhook.js
// Listens for Stripe events and grants access after successful payment
// This is where you actually unlock access for the user

import Stripe from 'stripe';
import { buffer } from 'micro';
import { sendWelcomeEmail } from '../../lib/emails/welcome.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Disable Next.js body parsing — Stripe needs the raw body to verify signature
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await buffer(req);
  const signature = req.headers['stripe-signature'];

  let event;

  // Verify webhook came from Stripe (not a fake request)
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET  // From: stripe listen --print-secret
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // ── HANDLE EVENTS ──
  try {
    switch (event.type) {

      // ── ONE-TIME PAYMENT SUCCEEDED (Lifetime $97) ──
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { email, plan, customerName } = paymentIntent.metadata;

        if (plan === 'lifetime' && email) {
          await grantLifetimeAccess({ email, customerName, paymentIntent });
          console.log(`✅ Lifetime access granted: ${email}`);
        }
        break;
      }

      // ── SUBSCRIPTION ACTIVATED (Monthly $29) ──
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

      // ── SUBSCRIPTION RENEWED ──
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_cycle') {
          console.log(`🔄 Subscription renewed: ${invoice.customer_email}`);
          // Optionally: extend access, send renewal email, log to DB
        }
        break;
      }

      // ── SUBSCRIPTION CANCELLED / PAYMENT FAILED ──
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        await revokeAccess({ email: customer.email, reason: 'cancelled' });
        console.log(`❌ Subscription cancelled: ${customer.email}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`⚠️ Payment failed: ${invoice.customer_email}`);
        await sendPaymentFailedEmail(invoice.customer_email);
        break;
      }

      // ── REFUND ISSUED ──
      case 'charge.refunded': {
        const charge = event.data.object;
        const customer = await stripe.customers.retrieve(charge.customer);
        await revokeAccess({ email: customer.email, reason: 'refunded' });
        console.log(`💸 Refund issued, access revoked: ${customer.email}`);
        break;
      }

      default:
        // Unhandled event — ignore safely
        break;
    }

    res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}


// ══════════════════════════════════════════════
// ACCESS CONTROL FUNCTIONS
// Wire these to your database / email system
// ══════════════════════════════════════════════

async function grantLifetimeAccess({ email, customerName, paymentIntent }) {
  // 1. Add user to your DB with plan = 'lifetime'
  // await db.users.upsert({ email, plan: 'lifetime', paidAt: new Date(), stripeId: paymentIntent.customer })

  // 2. Send welcome email with access link
  await sendWelcomeEmail({
    email,
    name: customerName,
    plan: 'lifetime',
    accessUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app?token=${generateAccessToken(email)}`
  });
}

async function grantMonthlyAccess({ email, subscription, customer }) {
  // 1. Add user to DB with plan = 'monthly', subscriptionId for future cancellation
  // await db.users.upsert({ email, plan: 'monthly', subscriptionId: subscription.id, activeUntil: new Date(subscription.current_period_end * 1000) })

  // 2. Send welcome email with access link
  await sendWelcomeEmail({
    email,
    name: customer.name,
    plan: 'monthly',
    accessUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app?token=${generateAccessToken(email)}`
  });
}

async function revokeAccess({ email, reason }) {
  // Update DB to mark user as inactive
  // await db.users.update({ where: { email }, data: { plan: null, revokedAt: new Date(), revokeReason: reason } })
  console.log(`Access revoked for ${email} — reason: ${reason}`);
}


async function sendPaymentFailedEmail(email) {
  // Notify user their payment failed and they need to update card
  console.log(`📧 Payment failed email → ${email}`);
}

function generateAccessToken(email) {
  // Simple token — in production use JWT or a UUID stored in DB
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', process.env.ACCESS_TOKEN_SECRET || 'dev-secret')
    .update(email + Date.now())
    .digest('hex')
    .slice(0, 32);
}
