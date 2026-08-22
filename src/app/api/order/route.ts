import { NextRequest, NextResponse } from "next/server";
import { placeInvoice, type InvoiceItemInput } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { customerName?: string; items?: { name?: string; qty?: number }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const items: InvoiceItemInput[] = Array.isArray(body.items)
    ? body.items.map((it) => ({ name: typeof it.name === "string" ? it.name : "", qty: Number(it.qty) }))
    : [];
  const customerName = typeof body.customerName === "string" ? body.customerName : undefined;

  try {
    const result = await placeInvoice(items, customerName);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to place the order. Please try again." },
      { status: 500 }
    );
  }
}
