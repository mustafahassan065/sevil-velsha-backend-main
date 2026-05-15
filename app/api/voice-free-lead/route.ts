// app/api/voice-free-lead/route.ts
// Next.js App Router format
// Backend repo mein: app/api/voice-free-lead/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FREE_URL   = 'https://sevilvelsha.com/voice-free-access';
const PDF_URL    = 'https://sevilvelsha.com/voice-control-pdf';
const COURSE_URL = 'https://sevilvelsha.com/voice-control-course';

export async function POST(req: NextRequest) {
  try {
    const { name, email, source } = await req.json();

    if (!name || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'Name and email required.' }, { status: 400, headers: corsHeaders });
    }

    const firstName  = name.split(' ')[0];
    const isPdf      = source === 'pdf_lead';
    const sourceName = isPdf ? 'PDF Guide Page' : 'Free Video Page';
    const accessUrl  = isPdf ? PDF_URL : FREE_URL;

    // ── 1. Welcome email → user ──────────────────────────────────
    await resend.emails.send({
      from:    'Sevil Velsha <onboarding@resend.dev>',
      to:      email,
      subject: isPdf
        ? '📄 Your Free Voice Control PDF is Ready'
        : '🎤 Your Free Voice Control Training is Ready',
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
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">
        ${isPdf ? '📄 Your Free PDF is Ready' : '🎤 Your Free Training is Ready'}
      </h1>
    </td>
  </tr>
  <tr><td style="background:linear-gradient(90deg,#c9a96e,#e8d5a3,#c9a96e);height:3px;"></td></tr>
  <tr>
    <td style="padding:40px 48px;">
      <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;font-weight:600;">Dear ${firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
        Thank you for taking the first step. Your free Voice Control
        ${isPdf ? 'PDF guide' : 'training'} is ready to access now.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#f8f6f2;border-left:4px solid #c9a96e;border-radius:8px;padding:20px 24px;">
            ${isPdf ? `
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c9a96e;">Free PDF Guide</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a;">5 Voice Mistakes That Make People Ignore You</p>
            ` : `
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c9a96e;">Lesson 1 — Free</p>
            <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#1a1a1a;">The One Breathing Technique That Calms & Empowers</p>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">Video + PDF workbook included</p>
            `}
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr><td align="center">
          <a href="${accessUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#c9a96e,#e8d5a3);color:#1a1a1a;font-weight:700;font-size:14px;padding:16px 48px;border-radius:50px;text-decoration:none;">
            ${isPdf ? '📄 Access Your PDF Now' : '🎯 Watch Free Lesson Now'}
          </a>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:14px;color:#888;line-height:1.7;">
        Want to go deeper? Explore the full Voice Control course.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="${COURSE_URL}"
            style="display:inline-block;background:#1a1a1a;color:#fff;font-weight:600;font-size:13px;padding:12px 36px;border-radius:50px;text-decoration:none;">
            Explore Full Course →
          </a>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr><td style="padding:0 48px;"><hr style="border:none;border-top:1px solid #eee;"/></td></tr>
  <tr>
    <td style="padding:20px 48px 28px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#aaa;">Questions? <a href="mailto:info@sevilvelsha.com" style="color:#c9a96e;">info@sevilvelsha.com</a></p>
    </td>
  </tr>
</table>
<p style="margin:20px 0 0;font-size:11px;color:#aaa;text-align:center;">© ${new Date().getFullYear()} Sevil Velsha. All rights reserved.</p>
</td></tr>
</table>
</body></html>`,
    });

    // ── 2. Notification → info@sevilvelsha.com ───────────────────
    await resend.emails.send({
      from:    'Sevil Velsha <onboarding@resend.dev>',
      to:      'info@sevilvelsha.com',
      subject: `New Lead — ${name} (${sourceName})`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border:1px solid #eee;border-radius:8px;">
          <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9a96e;margin:0 0 16px;">New Lead</p>
          <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 24px;">Someone signed up</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 16px;background:#f9f7f3;font-size:13px;color:#777;width:80px;">Name</td>
              <td style="padding:10px 16px;background:#f9f7f3;font-size:14px;color:#1a1a1a;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#777;">Email</td>
              <td style="padding:10px 16px;font-size:14px;color:#1a1a1a;font-weight:600;">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;background:#f9f7f3;font-size:13px;color:#777;">Source</td>
              <td style="padding:10px 16px;background:#f9f7f3;font-size:14px;color:#c9a96e;font-weight:600;">${sourceName}</td>
            </tr>
          </table>
        </div>`,
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });

  } catch (err) {
    console.error('voice-free-lead error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500, headers: corsHeaders });
  }
}