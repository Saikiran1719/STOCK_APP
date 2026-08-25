import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById, getSettings, recordInvoicePayment, type PaymentMode } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  }

  try {
    const [invoice, settings] = await Promise.all([getInvoiceById(invoiceId), getSettings()]);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    return NextResponse.json({ invoice, settings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load the invoice." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  }

  let body: { amount?: number; mode?: PaymentMode; reference?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await recordInvoicePayment(invoiceId, Number(body.amount), body.mode, body.reference);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to record the payment." }, { status: 500 });
  }
}
