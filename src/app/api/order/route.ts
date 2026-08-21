import { NextRequest, NextResponse } from "next/server";
import { placeOrder } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { product?: string; qty?: number; customerName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const product = typeof body.product === "string" ? body.product : "";
  const qty = Number(body.qty);
  const customerName = typeof body.customerName === "string" ? body.customerName : undefined;

  try {
    const result = await placeOrder(product, qty, customerName);
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
