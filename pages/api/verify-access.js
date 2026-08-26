// pages/api/verify-access.js
import * as db from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ error: 'No access token provided.' });
  }

  const isDemoMode = process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
  if (isDemoMode) {
    return res.status(200).json({
      valid: true,
      user: {
        email: 'demo@example.com',
        name: 'Demo User',
        plan: 'lifetime',
        memberSince: new Date().toISOString(),
        generationsUsed: 0,
        generationsLimit: null
      }
    });
  }

  if (!db.isConfigured()) {
    console.error('❌ No KV database configured — cannot verify access tokens.');
    return res.status(500).json({ error: 'Access verification is temporarily unavailable.' });
  }

  try {
    const user = await db.findUserByToken(token);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Invalid or expired access token.' });
    }
    if (user.plan === 'monthly' && user.activeUntil && new Date(user.activeUntil) < new Date()) {
      return res.status(401).json({ error: 'Your subscription has expired. Please renew.' });
    }
    return res.status(200).json({
      valid: true,
      user: {
        email: user.email,
        name: user.name || user.email,
        plan: user.plan,
        memberSince: user.createdAt,
        generationsUsed: user.generationsUsed || 0,
        generationsLimit: user.plan === 'monthly' ? 500 : null,
        subscriptionId: user.subscriptionId || null
      }
    });
  } catch (err) {
    console.error('Verify access error:', err);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}
