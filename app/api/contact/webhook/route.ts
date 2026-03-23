import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe initialize karein
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  try {
    // Stripe ka raw body text lena zaroori hai signature verify karne ke liye
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;

    // 1. Stripe Signature Verify Karein (Security ke liye)
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    // 2. Agar payment complete ho gayi hai
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Customer ki details nikalein
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name || 'Customer';

      if (customerEmail) {
        // 3. Brevo API Call (User ko list mein add karne ke liye)
        const brevoListId = parseInt(process.env.BREVO_LIST_ID);

        const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            email: customerEmail,
            attributes: { FIRSTNAME: customerName },
            listIds: [brevoListId],
            updateEnabled: true // Agar user pehle se list mein ho toh error nahi dega, update kar dega
          })
        });

        if (!brevoResponse.ok) {
          const brevoError = await brevoResponse.text();
          console.error('Brevo API Error:', brevoError);
          // Error log karenge par Stripe ko 200 hi bhejenge taake Stripe bar bar retry na kare
        } else {
          console.log(`Successfully added ${customerEmail} to Brevo list.`);
        }
      }
    }

    // Stripe ko OK bhej dein taake usay pata chal jaye humein webhook mil gaya hai
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}