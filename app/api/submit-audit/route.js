// app/api/submit-audit/route.js
// Receives email + audio file from the Thank You page,
// emails the admin (with attachment) and confirms to the customer.
//
// Add to your repo at: app/api/submit-audit/route.js
//
// Required dependency: nodemailer
//   npm install nodemailer
//
// Required env vars (add in Vercel → Project → Settings → Environment Variables):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL
//   STRIPE_SECRET_KEY (optional, to verify session_id)

import nodemailer from 'nodemailer';
import Stripe from 'stripe';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // tighten to your frontend domain in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const email = formData.get('email');
    const sessionId = formData.get('sessionId');
    const file = formData.get('audio');

    if (!email || !file) {
      return Response.json(
        { error: 'Email and audio file are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Optional: verify Stripe session was actually paid
    if (sessionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
          console.warn('⚠️ Submission with unpaid session:', sessionId);
        }
      } catch (e) {
        console.warn('Could not verify Stripe session:', e.message);
      }
    }

    // Convert file (Blob) to Buffer for the email attachment
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email to admin with attachment
    await transporter.sendMail({
      from: `"Voice Audit" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Voice Audit Submission — ${email}`,
      text: `New submission received.\n\nCustomer email: ${email}\nStripe session: ${sessionId || 'N/A'}\n\nRecording attached.`,
      attachments: [
        {
          filename: file.name || 'recording',
          content: buffer,
        },
      ],
    });

    // Confirmation email to customer
    await transporter.sendMail({
      from: `"Sevil Velsha — Voice Audit" <${process.env.SMTP_USER}>`,
      to: email,
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