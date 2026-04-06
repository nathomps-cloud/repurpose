// pages/api/verify-access.js
// Called when user lands on /app?token=xxx
// Validates the token and returns user session data

import crypto from 'crypto';

// In production, replace this with a real DB lookup
// e.g. await db.users.findOne({ where: { accessToken: token } })
const MOCK_USERS = {
  // This gets populated by webhook.js when a user pays
  // Format: token -> user data
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'No access token provided.' });
  }

  try {
    // ── PRODUCTION: Replace with real DB lookup ──
    // const user = await db.users.findOne({ accessToken: token, active: true });
    // if (!user) return res.status(401).json({ error: 'Invalid or expired token.' });

    // ── DEMO: Accept any non-empty token for testing ──
    // Remove this block in production and use the DB lookup above
    const isDemoMode = process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL;
    
    if (isDemoMode) {
      return res.status(200).json({
        valid: true,
        user: {
          email: 'demo@example.com',
          name: 'Demo User',
          plan: 'lifetime',
          memberSince: new Date().toISOString(),
          generationsUsed: 0,
          generationsLimit: null // null = unlimited
        }
      });
    }

    // ── REAL LOOKUP (uncomment when DB is wired) ──
    /*
    const user = await db.users.findOne({ 
      where: { accessToken: token, isActive: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired access token.' });
    }

    // Check if monthly user's subscription is still active
    if (user.plan === 'monthly' && user.activeUntil < new Date()) {
      return res.status(401).json({ error: 'Your subscription has expired. Please renew.' });
    }

    return res.status(200).json({
      valid: true,
      user: {
        email: user.email,
        name: user.name,
        plan: user.plan,
        memberSince: user.createdAt,
        generationsUsed: user.generationsUsed || 0,
        generationsLimit: user.plan === 'monthly' ? 500 : null,
        subscriptionId: user.subscriptionId || null
      }
    });
    */

  } catch (err) {
    console.error('Verify access error:', err);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}
