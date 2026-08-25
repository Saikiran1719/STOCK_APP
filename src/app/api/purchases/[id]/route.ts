import { NextRequest, NextResponse } from "next/server";
import { getPurchaseById, recordPurchasePayment, type PaymentMode } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const purchaseId = Number(id);
  if (!Number.isInteger(purchaseId)) {
    return NextResponse.json({ error: "Invalid purchase id." }, { status: 400 });
  }

  try {
    const purchase = await getPurchaseById(purchaseId);
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
    }
    return NextResponse.json({ purchase });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load the purchase." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const purchaseId = Number(id);
  if (!Number.isInteger(purchaseId)) {
    return NextResponse.json({ error: "Invalid purchase id." }, { status: 400 });
  }

  let body: { amount?: number; mode?: PaymentMode; reference?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await recordPurchasePayment(purchaseId, Number(body.amount), body.mode, body.reference);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to record the payment." }, { status: 500 });
  }
}
