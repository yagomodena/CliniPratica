// This file is no longer needed as Stripe is being replaced by Mercado Pago.
// Stripe webhooks will not be used.
// Mercado Pago webhooks will be handled by a new route, e.g., /api/mercado-pago/webhook.

// To signify removal, this file can be left empty or contain a comment like this.
// In a real Git workflow, you would delete this file.

export async function POST() {
  return new Response("This Stripe webhook endpoint is deprecated. Use Mercado Pago webhooks.", { status: 410 });
}
