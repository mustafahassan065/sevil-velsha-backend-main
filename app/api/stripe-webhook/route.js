// app/api/stripe-webhook/route.js
// Verifies Stripe "checkout.session.completed" events.
// Optional but recommended — lets you log/confirm real payments.
//
// Add to your repo at: app/api/stripe-webhook/route.js
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//
// IMPORTANT: In Next.js App Router, the raw body must be read as text
// (NOT parsed as JSON) for Stripe's signature check to work — this is
// handled automatically below since we don't use any bodyParser.

import Stripe from 'stripe';

export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('✅ Payment completed:', session.id, session.customer_details?.email);
    // Optional: store session.id + email in a DB here so you can
    // cross-check it later in /api/submit-audit.
  }

  return Response.json({ received: true });
}