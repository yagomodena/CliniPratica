// This file is no longer needed as Stripe is being replaced by Mercado Pago.
// Its functionality for creating Stripe checkout sessions is obsolete.
// The new payment flow will involve direct links to Mercado Pago preapproval plans.
// For Mercado Pago, we do not typically need a backend API route to *create* a checkout session
// when using pre-existing preapproval plan links; the frontend can redirect directly.
// Webhooks for Mercado Pago will be handled in a different route: /api/mercado-pago/webhook.

// To signify removal, this file can be left empty or contain a comment like this.
// In a real Git workflow, you would delete this file.

export async function POST() {
  return new Response("This Stripe endpoint is deprecated. Use Mercado Pago.", { status: 410 });
}
