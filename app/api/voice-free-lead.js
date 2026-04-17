// api/voice-free-lead.js
// Handles free lead capture for Voice Control course
// Saves lead + sends 3-email sequence via Resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const COURSE_URL = 'https://sevilvelsha.com/voice-control-course';
const FREE_URL   = 'https://sevilvelsha.com/voice-free-access';
const STRIPE_URL = 'https://buy.stripe.com/test_7sYbJ00yHdM59PUaV2gIo01';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email } = req.body;

  if (!name || !email || !email.includes('@')) {
    return res.status(400).json({ error: 'Name and email required.' });
  }

  const firstName = name.split(' ')[0];

  // ── Email 1 — Immediate: deliver free video + PDF ──────────────
  try {
    await resend.emails.send({
      from:    'Sevil Velsha <onboarding@resend.dev>',
      to:      email,
      subject: '🎤 Your Free Voice Control Training is Ready',
      html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
  <tr>
    <td style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d,#4a3728);padding:40px 48px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;font-weight:600;">Sevil Velsha</p>
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">🎤 Your Free Training is Ready</h1>
    </td>
  </tr>
  <tr><td style="background:linear-gradient(90deg,#c9a96e,#e8d5a3,#c9a96e);height:3px;"></td></tr>
  <tr>
    <td style="padding:40px 48px;">
      <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;font-weight:600;">Dear ${firstName},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
        Thank you for taking the first step. Your free Voice Control training is ready to watch now.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#f8f6f2;border-left:4px solid #c9a96e;border-radius:8px;padding:20px 24px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c9a96e;">Lesson 1 — Free</p>
            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a1a;">The One Breathing Technique That Calms & Empowers</p>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">Video + PDF workbook included</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td align="center">
          <a href="${FREE_URL}"
            style="display:inline-block;background:linear-gradient(135deg,#c9a96e,#e8d5a3);color:#1a1a1a;font-weight:700;font-size:14px;padding:16px 48px;border-radius:50px;text-decoration:none;">
            🎯 Watch Free Lesson Now
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
        In this lesson you will learn the single most powerful breathing technique used by TED speakers, actors, and confident communicators worldwide.
      </p>
      <p style="margin:0;font-size:14px;color:#888;">
        Tomorrow, I will share what separates those who speak with real authority from those who struggle to be heard.
      </p>
    </td>
  </tr>
  <tr><td style="padding:0 48px;"><hr style="border:none;border-top:1px solid #eee;"/></td></tr>
  <tr>
    <td style="padding:24px 48px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#aaa;">Questions? Contact <strong style="color:#c9a96e;">sevilvelsha.com</strong></p>
    </td>
  </tr>
</table>
<p style="margin:20px 0 0;font-size:11px;color:#aaa;text-align:center;">© ${new Date().getFullYear()} Sevil Velsha. All rights reserved.</p>
</td></tr>
</table>
</body></html>`,
    });
  } catch (err) {
    console.error('Email 1 error:', err);
  }

  // ── Email 2 — After 1 day (scheduled note in subject) ─────────
  // Note: Resend free plan sends immediately — use Brevo for actual delays
  // This is the email CONTENT ready for Brevo automation sequence
  /*
  Email 2 subject: "What's really stopping your voice"
  Email 3 subject: "9,000+ people changed how they speak. Here's how."
  — Add these in Brevo automation triggered by tag: voice-control-free-lead
  */

  return res.status(200).json({ success: true });
}