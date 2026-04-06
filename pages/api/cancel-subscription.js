// pages/api/cancel-subscription.js
// Called from user account settings to cancel monthly plan

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscriptionId, email } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ error: 'Subscription ID required.' });
  }

  try {
    // Cancel at period end — user keeps access until billing cycle ends
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    const cancelDate = new Date(subscription.cancel_at * 1000).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    return res.status(200).json({
      success: true,
      message: `Subscription cancelled. Access remains active until ${cancelDate}.`,
      cancelAt: subscription.cancel_at
    });

  } catch (err) {
    console.error('Cancel error:', err);
    return res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
}
