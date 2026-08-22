import { NextRequest, NextResponse } from "next/server";
import { createProduct, getProducts, getSettings, isDemoMode, updateProduct } from "@/lib/db";

export async function GET() {
  try {
    const [products, settings] = await Promise.all([getProducts(), getSettings()]);
    return NextResponse.json({
      products,
      demo: isDemoMode(),
      currencySymbol: settings.currencySymbol,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load products." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { name?: string; cost?: number; stock?: number; gstRate?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const cost = Number(body.cost);
  const stock = Number(body.stock);
  const gstRate = Number(body.gstRate);

  try {
    const result = await createProduct(name, cost, stock, gstRate);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create the product." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: { name?: string; cost?: number; gstRate?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const cost = Number(body.cost);
  const gstRate = Number(body.gstRate);

  try {
    const result = await updateProduct(name, cost, gstRate);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update the product." }, { status: 500 });
  }
}
