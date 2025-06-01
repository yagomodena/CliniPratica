
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { buffer } from 'node:stream/consumers';
import { db } from '@/firebaseAdmin'; // Assuming firebase-admin setup for server-side Firestore
import { doc, updateDoc, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { plans } from '@/lib/plans-data';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const reqBuffer = await buffer(req.body!); // Read the raw body

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(reqBuffer, sig!, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);
      
      if (session.mode === 'subscription' && session.payment_status === 'paid') {
        const userId = session.metadata?.userId;
        const stripeCustomerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const priceId = session.metadata?.priceId; // Or from line_items if more complex

        if (!userId || !stripeCustomerId || !subscriptionId || !priceId) {
          console.error('Missing data in checkout.session.completed event', { userId, stripeCustomerId, subscriptionId, priceId });
          return NextResponse.json({ error: 'Webhook error: Missing user or subscription data' }, { status: 400 });
        }

        const planDetails = plans.find(p => p.stripePriceId === priceId);
        if (!planDetails) {
          console.error(`Plan details not found for priceId: ${priceId}`);
          return NextResponse.json({ error: `Webhook error: Plan not found for priceId ${priceId}` }, { status: 400 });
        }
        
        try {
          const userDocRef = doc(db, 'usuarios', userId);
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await updateDoc(userDocRef, {
            stripeCustomerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plano: planDetails.name,
            stripeSubscriptionStatus: subscription.status, // e.g., 'active', 'trialing'
            stripeCurrentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
          });
          console.log(`User ${userId} updated with subscription ${subscriptionId} for plan ${planDetails.name}`);
        } catch (dbError) {
          console.error('Firestore update error after checkout:', dbError);
          // Potentially queue for retry or alert admin
          return NextResponse.json({ error: 'Firestore update failed' }, { status: 500 });
        }
      }
      break;

    case 'invoice.payment_succeeded':
      const invoicePaymentSucceeded = event.data.object as Stripe.Invoice;
      console.log('Invoice payment succeeded:', invoicePaymentSucceeded.id);
       if (invoicePaymentSucceeded.subscription) {
        const subscriptionId = invoicePaymentSucceeded.subscription as string;
        const stripeCustomerId = invoicePaymentSucceeded.customer as string;

        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            // Find user by stripeCustomerId or stripeSubscriptionId
            // For simplicity, assuming we have userId mapping or can query users by stripeCustomerId
             const usersRef = collection(db, 'usuarios');
             const q = query(usersRef, where('stripeSubscriptionId', '==', subscriptionId));
             const userSnapshot = await getDocs(q);

             if (!userSnapshot.empty) {
                 const userId = userSnapshot.docs[0].id;
                 const userDocRef = doc(db, 'usuarios', userId);
                 await updateDoc(userDocRef, {
                     stripeSubscriptionStatus: subscription.status,
                     stripeCurrentPeriodEnd: Timestamp.fromMillis(subscription.current_period_end * 1000),
                     plano: plans.find(p => p.stripePriceId === subscription.items.data[0]?.price.id)?.name || 'Unknown', // Update plan if it changed
                 });
                 console.log(`Subscription for user ${userId} (sub: ${subscriptionId}) updated after payment.`);
             } else {
                 console.warn(`User not found for subscription ID ${subscriptionId} on invoice.payment_succeeded`);
             }
        } catch (stripeError) {
            console.error('Stripe API or DB error during invoice.payment_succeeded:', stripeError);
        }
      }
      break;

    case 'invoice.payment_failed':
      const invoicePaymentFailed = event.data.object as Stripe.Invoice;
      console.log('Invoice payment failed:', invoicePaymentFailed.id);
      if (invoicePaymentFailed.subscription) {
        const subscriptionId = invoicePaymentFailed.subscription as string;
         try {
            const usersRef = collection(db, 'usuarios');
            const q = query(usersRef, where('stripeSubscriptionId', '==', subscriptionId));
            const userSnapshot = await getDocs(q);
            if (!userSnapshot.empty) {
                 const userId = userSnapshot.docs[0].id;
                 const userDocRef = doc(db, 'usuarios', userId);
                 await updateDoc(userDocRef, {
                    stripeSubscriptionStatus: 'past_due', // Or 'canceled' if Stripe settings dictate
                    // Potentially revert plan to 'Gratuito' after multiple failures or grace period
                 });
                 console.log(`User ${userId} subscription status set to past_due for sub: ${subscriptionId}`);
                 // TODO: Notify user about payment failure
            } else {
                console.warn(`User not found for subscription ID ${subscriptionId} on invoice.payment_failed`);
            }
        } catch (dbError) {
            console.error('Firestore update error on invoice.payment_failed:', dbError);
        }
      }
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object as Stripe.Subscription;
      console.log('Subscription updated:', subscriptionUpdated.id);
      try {
          const usersRef = collection(db, 'usuarios');
          const q = query(usersRef, where('stripeSubscriptionId', '==', subscriptionUpdated.id));
          const userSnapshot = await getDocs(q);

          if (!userSnapshot.empty) {
            const userId = userSnapshot.docs[0].id;
            const userDocRef = doc(db, 'usuarios', userId);
            const newPlan = plans.find(p => p.stripePriceId === subscriptionUpdated.items.data[0]?.price.id);
            
            await updateDoc(userDocRef, {
              stripeSubscriptionStatus: subscriptionUpdated.status,
              stripePriceId: subscriptionUpdated.items.data[0]?.price.id,
              plano: newPlan ? newPlan.name : userSnapshot.docs[0].data().plano, // Keep old plan if new one not found
              stripeCurrentPeriodEnd: Timestamp.fromMillis(subscriptionUpdated.current_period_end * 1000),
              // If cancel_at_period_end is true, user has chosen to cancel but access remains until period end
              ...(subscriptionUpdated.cancel_at_period_end && { stripeSubscriptionStatus: 'active_until_period_end' }),
            });
            console.log(`User ${userId} subscription ${subscriptionUpdated.id} updated in Firestore. Status: ${subscriptionUpdated.status}`);
          } else {
             console.warn(`User not found for subscription ID ${subscriptionUpdated.id} on customer.subscription.updated`);
          }
      } catch (dbError) {
          console.error('Firestore update error on customer.subscription.updated:', dbError);
      }
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', subscriptionDeleted.id);
      // Update user's plan to 'Gratuito' or mark as canceled
      try {
        const usersRef = collection(db, 'usuarios');
        const q = query(usersRef, where('stripeSubscriptionId', '==', subscriptionDeleted.id));
        const userSnapshot = await getDocs(q);

        if (!userSnapshot.empty) {
          const userId = userSnapshot.docs[0].id;
          const userDocRef = doc(db, 'usuarios', userId);
          await updateDoc(userDocRef, {
            plano: 'Gratuito', // Revert to free plan
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeSubscriptionStatus: 'canceled',
            stripeCurrentPeriodEnd: null,
          });
          console.log(`User ${userId} plan set to Gratuito due to subscription ${subscriptionDeleted.id} deletion.`);
        } else {
            console.warn(`User not found for subscription ID ${subscriptionDeleted.id} on customer.subscription.deleted`);
        }
      } catch (dbError) {
          console.error('Firestore update error on customer.subscription.deleted:', dbError);
      }
      break;
    
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Required for raw body parsing in Next.js Edge/Node.js runtimes
export const config = {
  api: {
    bodyParser: false,
  },
};
