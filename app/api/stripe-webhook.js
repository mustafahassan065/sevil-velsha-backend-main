// api/stripe-webhook.js
// Payment complete hone par sirf Resend se welcome email bhejta hai

import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend   = new Resend(process.env.RESEND_API_KEY);
const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session      = event.data.object;
    const email        = session.customer_details?.email;
    const name         = session.customer_details?.name || 'Student';
    const firstName    = name.split(' ')[0];
    const dashboardUrl = 'https://sevilvelsha.com/voice-control-dashboard';

    if (!email) {
      return res.status(200).json({ received: true });
    }

    console.log(`✅ Payment confirmed: ${email}`);

    // ── RESEND — welcome email ────────────────────────────────────
    try {
      const { error } = await resend.emails.send({
        from:    'Sevil Velsha <onboarding@resend.dev>',
        to:      email,
        subject: '🎤 Your Voice Control Course Access',
        html:    buildWelcomeEmail(firstName, dashboardUrl),
        text:    `Welcome ${firstName}!\n\nYour Voice Control Course is ready.\n\nDashboard: ${dashboardUrl}\n\n— Sevil Velsha`,
      });

      if (error) {
        console.error('Resend error:', error);
      } else {
        console.log(`✅ Welcome email sent to ${email}`);
      }
    } catch (err) {
      console.error('Resend failed:', err);
    }
  }

  return res.status(200).json({ received: true });
}

// ── EMAIL TEMPLATE ────────────────────────────────────────────────
function buildWelcomeEmail(firstName, dashboardUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

      <tr>
        <td style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d,#4a3728);padding:40px 48px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;font-weight:600;">Sevil Velsha</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;">🎤 Welcome to Voice Control</h1>
          <p style="margin:12px 0 0;font-size:14px;color:#a0a0a0;">Your transformation begins now</p>
        </td>
      </tr>

      <tr><td style="background:linear-gradient(90deg,#c9a96e,#e8d5a3,#c9a96e);height:3px;"></td></tr>

      <tr>
        <td style="padding:40px 48px;">
          <p style="margin:0 0 20px;font-size:16px;color:#1a1a1a;font-weight:600;">Dear ${firstName},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
            Your payment was successful. Your <strong>Voice Control Course</strong> access is ready.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">
            You have full access to all 8 video lessons, downloadable workbooks, and your certificate.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#f8f6f2;border-left:4px solid #c9a96e;border-radius:8px;padding:20px 24px;">
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c9a96e;">Your Course Includes</p>
                <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:2.2;">
                  ✅ &nbsp;8 video lessons<br/>
                  ✅ &nbsp;8 downloadable PDF workbooks<br/>
                  ✅ &nbsp;Daily practice exercises<br/>
                  ✅ &nbsp;30-Day Voice Power Plan<br/>
                  ✅ &nbsp;Completion certificate<br/>
                  ✅ &nbsp;Lifetime access
                </p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center">
                <a href="${dashboardUrl}"
                  style="display:inline-block;background:linear-gradient(135deg,#c9a96e,#e8d5a3);color:#1a1a1a;font-weight:700;font-size:15px;padding:16px 48px;border-radius:50px;text-decoration:none;">
                  🎯 Start Lesson 1 Now
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#aaa;text-align:center;">
            Or copy: <a href="${dashboardUrl}" style="color:#c9a96e;">${dashboardUrl}</a>
          </p>
        </td>
      </tr>

      <tr><td style="padding:0 48px;"><hr style="border:none;border-top:1px solid #eee;"/></td></tr>

      <tr>
        <td style="padding:24px 48px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#aaa;">
            Questions? Contact <strong style="color:#c9a96e;">sevilvelsha.com</strong>
          </p>
        </td>
      </tr>

    </table>
    <p style="margin:20px 0 0;font-size:11px;color:#aaa;text-align:center;">
      © ${new Date().getFullYear()} Sevil Velsha. All rights reserved.
    </p>
  </td></tr>
</table>
</body>
</html>`;
}