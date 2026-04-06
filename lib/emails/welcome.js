// lib/emails/welcome.js
// Plug this into your webhook.js sendWelcomeEmail() function
// Uses Resend — npm install resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail({ email, name, plan, accessUrl }) {
  const isLifetime = plan === 'lifetime';
  const firstName = name?.split(' ')[0] || 'there';

  await resend.emails.send({
    from: 'REPURPOSE <hello@repurpose.ai>',
    to: email,
    subject: isLifetime
      ? `You're in. Here's your lifetime access link.`
      : `Your REPURPOSE subscription is active.`,
    html: isLifetime
      ? lifetimeHTML({ firstName, accessUrl })
      : monthlyHTML({ firstName, accessUrl }),
    text: isLifetime
      ? lifetimePlainText({ firstName, accessUrl })
      : monthlyPlainText({ firstName, accessUrl }),
  });
}


// ══════════════════════════════════════════
// LIFETIME EMAIL — $97 one-time
// ══════════════════════════════════════════

function lifetimeHTML({ firstName, accessUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your REPURPOSE Access</title>
</head>
<body style="margin:0;padding:0;background:#06090f;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06090f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f59e0b;width:32px;height:32px;text-align:center;vertical-align:middle;">
                    <span style="font-family:Georgia,serif;font-weight:900;font-size:16px;color:#000;">R</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-family:Georgia,serif;font-weight:700;font-size:14px;letter-spacing:3px;color:#f1f5f9;text-transform:uppercase;">REPURPOSE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#0d1117;border:1px solid #1a2332;padding:40px;">

              <!-- Eyebrow -->
              <p style="margin:0 0 24px;font-size:10px;letter-spacing:4px;color:#f59e0b;text-transform:uppercase;">
                ● LIFETIME ACCESS CONFIRMED
              </p>

              <!-- Headline -->
              <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:700;color:#f1f5f9;line-height:1.2;letter-spacing:-0.5px;">
                You're in, ${firstName}.
              </h1>

              <!-- Body -->
              <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.8;">
                Your lifetime access to REPURPOSE is active. One click below and you're repurposing content.
              </p>

              <p style="margin:0 0 28px;font-size:13px;color:#64748b;line-height:1.8;">
                Paste any blog post, transcript, or draft. Get a polished X thread, LinkedIn post, newsletter, and TikTok script — all at once.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#f59e0b;">
                    <a href="${accessUrl}"
                       style="display:inline-block;padding:16px 36px;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#000;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                      OPEN YOUR DASHBOARD →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Access note -->
              <p style="margin:0 0 28px;font-size:11px;color:#334155;line-height:1.7;">
                This link is tied to your account. Bookmark your dashboard once you're in so you don't need this email again.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-top:1px solid #1a2332;"></td>
                </tr>
              </table>

              <!-- What you get -->
              <p style="margin:0 0 14px;font-size:9px;letter-spacing:3px;color:#334155;text-transform:uppercase;">
                WHAT'S INCLUDED
              </p>

              ${['Unlimited content repurposing', 'X Thread — hook-first, 6–10 tweets', 'LinkedIn Post — story-driven, engagement-ready', 'Newsletter — subject line, preview, full body', 'TikTok Script — hook in 3 seconds, stage directions', 'One-click copy for every output', 'All future formats, automatically'].map(item => `
              <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="color:#10b981;font-size:11px;padding-right:10px;vertical-align:top;">✓</td>
                  <td style="font-size:11px;color:#475569;line-height:1.5;">${item}</td>
                </tr>
              </table>`).join('')}

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 6px;font-size:9px;color:#1e2d3d;letter-spacing:2px;text-transform:uppercase;">
                REPURPOSE · AI CONTENT ENGINE
              </p>
              <p style="margin:0;font-size:9px;color:#1a2332;">
                Questions? Reply to this email or reach us at
                <a href="mailto:support@repurpose.ai" style="color:#334155;">support@repurpose.ai</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


// ══════════════════════════════════════════
// MONTHLY EMAIL — $29/mo subscription
// ══════════════════════════════════════════

function monthlyHTML({ firstName, accessUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your REPURPOSE Subscription</title>
</head>
<body style="margin:0;padding:0;background:#06090f;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellpadding="0" cellspacing="0" style="background:#06090f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f59e0b;width:32px;height:32px;text-align:center;vertical-align:middle;">
                    <span style="font-family:Georgia,serif;font-weight:900;font-size:16px;color:#000;">R</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-family:Georgia,serif;font-weight:700;font-size:14px;letter-spacing:3px;color:#f1f5f9;text-transform:uppercase;">REPURPOSE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#0d1117;border:1px solid #1a2332;padding:40px;">

              <p style="margin:0 0 24px;font-size:10px;letter-spacing:4px;color:#0ea5e9;text-transform:uppercase;">
                ● SUBSCRIPTION ACTIVE
              </p>

              <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:700;color:#f1f5f9;line-height:1.2;letter-spacing:-0.5px;">
                Welcome aboard, ${firstName}.
              </h1>

              <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.8;">
                Your REPURPOSE subscription is live. You're billed $29/month and can cancel anytime from your dashboard.
              </p>

              <p style="margin:0 0 28px;font-size:13px;color:#64748b;line-height:1.8;">
                Start repurposing content now — paste anything and get 4 platform-ready formats in under 30 seconds.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#f59e0b;">
                    <a href="${accessUrl}"
                       style="display:inline-block;padding:16px 36px;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#000;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                      OPEN YOUR DASHBOARD →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:11px;color:#334155;line-height:1.7;">
                Bookmark your dashboard after signing in. Your next billing date is 30 days from today.
                To cancel, go to Account → Cancel Subscription inside the app.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="border-top:1px solid #1a2332;"></td></tr>
              </table>

              <p style="margin:0 0 14px;font-size:9px;letter-spacing:3px;color:#334155;text-transform:uppercase;">
                YOUR PLAN INCLUDES
              </p>

              ${['500 generations per month', 'All 4 output formats', 'X Thread, LinkedIn, Newsletter, TikTok Script', 'One-click copy for every output', 'Cancel anytime — no questions asked'].map(item => `
              <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="color:#10b981;font-size:11px;padding-right:10px;vertical-align:top;">✓</td>
                  <td style="font-size:11px;color:#475569;line-height:1.5;">${item}</td>
                </tr>
              </table>`).join('')}

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td style="background:#06090f;border:1px solid #1a2332;border-left:2px solid #f59e0b;padding:14px 16px;">
                    <p style="margin:0;font-size:10px;color:#334155;line-height:1.7;">
                      Want lifetime access instead? Reply to this email and we'll credit your $29 toward the $97 one-time price.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 6px;font-size:9px;color:#1e2d3d;letter-spacing:2px;text-transform:uppercase;">
                REPURPOSE · AI CONTENT ENGINE
              </p>
              <p style="margin:0;font-size:9px;color:#1a2332;">
                Questions? <a href="mailto:support@repurpose.ai" style="color:#334155;">support@repurpose.ai</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


// ══════════════════════════════════════════
// PLAIN TEXT FALLBACKS
// ══════════════════════════════════════════

function lifetimePlainText({ firstName, accessUrl }) {
  return `
REPURPOSE — LIFETIME ACCESS CONFIRMED
──────────────────────────────────────

You're in, ${firstName}.

Your lifetime access to REPURPOSE is active.

Open your dashboard here:
${accessUrl}

Bookmark that link once you're in — you won't need this email again.

WHAT'S INCLUDED:
✓ Unlimited content repurposing
✓ X Thread — hook-first, 6–10 tweets
✓ LinkedIn Post — story-driven, engagement-ready
✓ Newsletter — subject line, preview, full body
✓ TikTok Script — hook in 3 seconds, stage directions
✓ One-click copy for every output
✓ All future formats, automatically

Questions? support@repurpose.ai

──────────────────────────────────────
REPURPOSE · AI CONTENT ENGINE
`.trim();
}

function monthlyPlainText({ firstName, accessUrl }) {
  return `
REPURPOSE — SUBSCRIPTION ACTIVE
──────────────────────────────────────

Welcome aboard, ${firstName}.

Your REPURPOSE subscription is live ($29/month).

Open your dashboard here:
${accessUrl}

To cancel anytime: Dashboard → Account → Cancel Subscription.

YOUR PLAN INCLUDES:
✓ 500 generations per month
✓ All 4 output formats
✓ X Thread, LinkedIn, Newsletter, TikTok Script
✓ One-click copy for every output
✓ Cancel anytime — no questions asked

Want lifetime access? Reply to this email and we'll credit your $29 toward the $97 one-time price.

Questions? support@repurpose.ai

──────────────────────────────────────
REPURPOSE · AI CONTENT ENGINE
`.trim();
}
