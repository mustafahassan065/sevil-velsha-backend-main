// app/api/create-checkout-session/route.js
// Creates a Stripe Checkout Session for "quick" ($19) or "complete" ($49) plans.
// Returns the checkout URL — frontend redirects the user to it.
//
// Add to your repo at: app/api/create-checkout-session/route.js
//
// Required dependency: stripe
//   npm install stripe
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY, STRIPE_PRICE_QUICK, STRIPE_PRICE_COMPLETE, FRONTEND_URL

import Stripe from 'stripe';

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
    const { plan } = await req.json(); // 'quick' or 'complete'

    const PRICES = {
      quick: process.env.STRIPE_PRICE_QUICK,
      complete: process.env.STRIPE_PRICE_COMPLETE,
    };

    const priceId = PRICES[plan];
    if (!priceId) {
      return Response.json({ error: 'Invalid plan' }, { status: 400, headers: corsHeaders });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/voice-audit/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/voice-audit`,
    });

    return Response.json({ url: session.url }, { headers: corsHeaders });
  } catch (err) {
    console.error('Checkout session error:', err);
    return Response.json(
      { error: 'Could not create checkout session' },
      { status: 500, headers: corsHeaders }
    );
  }
}