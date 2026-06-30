// app/api/booking-inquiry/route.js
// Receives the "Have a question?" booking inquiry form from Home_New.jsx
// Emails the details to info@sevilvelsha.com via Resend
//
// Add to backend repo at: app/api/booking-inquiry/route.js
// Uses existing env vars: RESEND_API_KEY, RESEND_SENDER_EMAIL, CONTACT_RECIPIENT_EMAIL

import { Resend } from 'resend';

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
    const body = await req.json();
    const { reason, firstName, lastName, email, subject, message } = body;

    if (!reason || !firstName || !email || !message) {
      return Response.json(
        { error: 'Reason, first name, email, and message are required.' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return Response.json(
        { error: 'Please provide a valid email address.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`;

    // 1) Email to admin/info inbox with full inquiry details
    await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL,
      to: process.env.CONTACT_RECIPIENT_EMAIL, // info@sevilvelsha.com
      replyTo: email,
      subject: `New Booking Inquiry — ${reason} — ${fullName}`,
      text: `New booking inquiry received from the website.

Reason for Contact: ${reason}
Name: ${fullName}
Email: ${email}
Subject: ${subject || 'N/A'}

Message:
${message}`,
    });

    // 2) Confirmation email to the person who submitted the form
    await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL,
      to: email,
      subject: 'Your message has been received — Sevil Velsha',
      text: `Hi ${firstName},

Thank you for reaching out. Your message has been received and Sevil's team will get back to you within 24 hours.

For reference, here's what you sent:

Reason: ${reason}
Subject: ${subject || 'N/A'}
Message: ${message}

Thanks,
Sevil Velsha`,
    });

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('Booking inquiry error:', err);
    return Response.json(
      { error: 'Server error. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}