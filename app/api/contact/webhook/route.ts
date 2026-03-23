import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// "as string" laga kar TypeScript ko bata diya ke yeh keys 100% mojood hain
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event;

    // 1. Stripe Signature Verify Karein
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    // 2. Agar payment complete ho gayi hai
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name || 'Customer';

      if (customerEmail) {
        // 3. Brevo API Call
        const brevoListId = parseInt(process.env.BREVO_LIST_ID as string);

        const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY as string,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            email: customerEmail,
            attributes: { FIRSTNAME: customerName },
            listIds: [brevoListId],
            updateEnabled: true 
          })
        });

        if (!brevoResponse.ok) {
          const brevoError = await brevoResponse.text();
          console.error('Brevo API Error:', brevoError);
        } else {
          console.log(`Successfully added ${customerEmail} to Brevo list.`);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}