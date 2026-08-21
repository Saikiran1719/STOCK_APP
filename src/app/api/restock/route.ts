import { NextRequest, NextResponse } from "next/server";
import { restock } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { product?: string; qty?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const product = typeof body.product === "string" ? body.product : "";
  const qty = Number(body.qty);

  try {
    const result = await restock(product, qty);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update stock." }, { status: 500 });
  }
}
