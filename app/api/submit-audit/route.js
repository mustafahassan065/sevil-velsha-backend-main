// app/api/submit-audit/route.js
// Receives email + audio file from the Thank You page.
// Emails admin (with attachment) + confirms to customer via Resend.
// Uses existing env vars: RESEND_API_KEY, RESEND_SENDER_EMAIL, CONTACT_RECIPIENT_EMAIL
// Optional: STRIPE_SECRET_KEY (to verify payment session)

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
    const email     = formData.get('email');
    const sessionId = formData.get('sessionId');
    const file      = formData.get('audio');

    if (!email || !file) {
      return Response.json(
        { error: 'Email and audio file are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Optional: verify Stripe session was actually paid
    if (sessionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
          console.warn('⚠️ Submission with unpaid session:', sessionId);
        }
      } catch (e) {
        console.warn('Could not verify Stripe session:', e.message);
      }
    }

    // Convert file to base64 for Resend attachment
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const resend = new Resend(process.env.RESEND_API_KEY);

    // 1) Admin email with recording attached
    await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL,
      to:   process.env.CONTACT_RECIPIENT_EMAIL,
      subject: `New Voice Audit Submission — ${email}`,
      text: `New submission received.\n\nCustomer email: ${email}\nStripe session: ${sessionId || 'N/A'}\n\nRecording attached.`,
      attachments: [{ filename: file.name || 'recording', content: base64 }],
    });

    // 2) Confirmation to customer
    await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL,
      to:   email,
      subject: 'Your Voice Audit has been received',
      text: `Hi,\n\nYour Voice Audit has been received. You will receive your personalized video feedback within 24 hours.\n\nThanks,\nSevil Velsha`,
    });

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('Submission error:', err);
    return Response.json(
      { error: 'Server error. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}