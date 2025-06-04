import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { plans } from '@/lib/plans-data';

export async function POST(req: NextRequest) {
  const { userId, userEmail, planName } = await req.json();

  const selectedPlan = plans.find(p => p.name === planName);

  if (!selectedPlan) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
  }

  if (!selectedPlan.mercadoPagoPreapprovalPlanId) {
    return NextResponse.json({ error: 'Plano não possui assinatura configurada.' }, { status: 400 });
  }

  const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${selectedPlan.mercadoPagoPreapprovalPlanId}&external_reference=${encodeURIComponent(userId)}&payer_email=${encodeURIComponent(userEmail)}`;

  return NextResponse.json({ checkoutUrl });
}
