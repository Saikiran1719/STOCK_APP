import { NextRequest, NextResponse } from "next/server";
import { voidInvoice } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  }

  let body: { reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason : "";

  try {
    const result = await voidInvoice(invoiceId, reason);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to void the invoice." }, { status: 500 });
  }
}
