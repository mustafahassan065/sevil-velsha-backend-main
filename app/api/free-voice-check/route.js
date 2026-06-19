// app/api/free-voice-check/route.js
// Receives name + email + audio recording from FreeVoiceCheckPage
// Emails admin (with attachment) + confirmation to customer via Resend
//
// Add to backend repo at: app/api/free-voice-check/route.js
// Uses existing env vars: RESEND_API_KEY, RESEND_SENDER_EMAIL, CONTACT_RECIPIENT_EMAIL

import { Resend } from 'resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const name  = formData.get('name');
    const email = formData.get('email');
    const file  = formData.get('audio');

    if (!name || !email || !file) {
      return Response.json(
        { error: 'Name, email, and audio file are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Convert file to base64 for Resend attachment
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const resend = new Resend(process.env.RESEND_API_KEY);

    // 1) Email to admin with recording attached
    await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL,
      to: process.env.CONTACT_RECIPIENT_EMAIL,
      subject: `New Free Voice Check — ${name} (${email})`,
      text: `New FREE Voice Check submission.\n\nName: ${name}\nEmail: ${email}\n\nRecording attached.\n\nPlease review and send feedback within 24 hours.`,
      attachments: [
        {
          filename: file.name || 'free-voice-check-recording',
          content: base64,
        },
      ],
    });

    // 2) Confirmation to customer
    await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL,
      to: email,
      subject: 'Your Free Voice Check has been received',
      text: `Hi ${name},\n\nThank you for submitting your voice sample.\n\nYour FREE Voice Check has been received. You will receive your personalized feedback within 24 hours.\n\nThanks,\nSevil Velsha`,
    });

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('Free voice check error:', err);
    return Response.json(
      { error: 'Server error. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}