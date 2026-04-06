// pages/api/create-payment-intent.js
// Handles both one-time ($97 lifetime) and subscription ($29/mo) payments

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Your Stripe Price IDs — create these in Stripe Dashboard
// Dashboard → Products → Add Product → Add Price
const PLANS = {
  lifetime: {
    type: 'one_time',
    amount: 9700,        // $97.00 in cents
    currency: 'usd',
    name: 'REPURPOSE — Lifetime Access',
    priceId: process.env.STRIPE_LIFETIME_PRICE_ID,  // e.g. price_1ABC...
  },
  monthly: {
    type: 'recurring',
    amount: 2900,        // $29.00 in cents
    currency: 'usd',
    name: 'REPURPOSE — Monthly Plan',
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID,   // e.g. price_1XYZ...
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan, email, firstName, lastName } = req.body;

  // Validate inputs
  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const selectedPlan = PLANS[plan];

  try {
    // Find or create Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name: `${firstName || ''} ${lastName || ''}`.trim() || undefined,
        metadata: { plan, signupSource: 'repurpose-landing' }
      });
    }

    // Route to correct payment flow
    if (selectedPlan.type === 'one_time') {
      // ── ONE-TIME PAYMENT (Lifetime $97) ──
      const paymentIntent = await stripe.paymentIntents.create({
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        customer: customer.id,
        receipt_email: email,
        description: selectedPlan.name,
        metadata: {
          plan,
          email,
          customerName: `${firstName || ''} ${lastName || ''}`.trim()
        },
        automatic_payment_methods: { enabled: true }
      });

      return res.status(200).json({
        type: 'payment_intent',
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id
      });

    } else {
      // ── SUBSCRIPTION PAYMENT (Monthly $29) ──
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: selectedPlan.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { plan, email }
      });

      const paymentIntent = subscription.latest_invoice.payment_intent;

      return res.status(200).json({
        type: 'subscription',
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
        subscriptionId: subscription.id
      });
    }

  } catch (err) {
    console.error('Stripe error:', err);

    // Return user-friendly errors
    if (err.type === 'StripeCardError') {
      return res.status(400).json({ error: err.message });
    }
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Payment configuration error. Contact support.' });
    }

    return res.status(500).json({ error: 'Payment failed. Please try again.' });
  }
}
