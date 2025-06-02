
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth as adminAuth, db } from '@/firebaseAdmin'; // Assuming you have firebase-admin setup
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, userId, userEmail, userName } = await req.json();

    if (!priceId || !userId || !userEmail) {
      return NextResponse.json({ error: 'Price ID, User ID, and User Email are required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    // Check if user exists in Firestore to get stripeCustomerId
    const userDocRef = doc(db, 'usuarios', userId);
    const userDocSnap = await getDoc(userDocRef);
    let stripeCustomerId: string | undefined;

    if (userDocSnap.exists() && userDocSnap.data()?.stripeCustomerId) {
      stripeCustomerId = userDocSnap.data()?.stripeCustomerId;
    } else {
      // Create a new Stripe customer
      const customerParams: Stripe.CustomerCreateParams = {
        email: userEmail,
      };
      if (userName) {
        customerParams.name = userName;
      }
      const customer = await stripe.customers.create(customerParams);
      stripeCustomerId = customer.id;
      // Update Firestore user with new Stripe Customer ID
      if (userDocSnap.exists()) {
        await updateDoc(userDocRef, { stripeCustomerId });
      } else {
        // This case should ideally not happen if user is authenticated from client
        // but as a fallback, we can create a minimal user doc.
        // Or, better, ensure userDoc exists before this point.
        console.warn(`User document for ${userId} not found. Creating with Stripe ID.`);
        await setDoc(userDocRef, { email: userEmail, stripeCustomerId, uid: userId, createdAt: new Date() }, { merge: true });
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer: stripeCustomerId,
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`, // Or a dedicated success page
      cancel_url: `${appUrl}/#planos`, // Back to plans or a dedicated cancel page
      metadata: {
        userId: userId, // Pass Firebase UID to identify user in webhook
        priceId: priceId,
      },
      // Enable automatic tax calculation if needed
      // automatic_tax: { enabled: true },
      // Subscription trial settings if applicable
      // subscription_data: {
      //   trial_period_days: 30, // Example: 30-day trial
      // },
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error: any) {
    console.error('Stripe Checkout Session Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
