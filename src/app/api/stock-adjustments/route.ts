import { NextRequest, NextResponse } from "next/server";
import { getStockAdjustments, removeStock } from "@/lib/db";

export async function GET() {
  try {
    const adjustments = await getStockAdjustments();
    return NextResponse.json({ adjustments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load stock adjustments." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { product?: string; qty?: number; remarks?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const product = typeof body.product === "string" ? body.product : "";
  const qty = Number(body.qty);
  const remarks = typeof body.remarks === "string" ? body.remarks : "";

  try {
    const result = await removeStock(product, qty, remarks);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to remove stock." }, { status: 500 });
  }
}
