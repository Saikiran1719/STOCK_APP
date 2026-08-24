import { NextRequest, NextResponse } from "next/server";
import { getPurchases, recordPurchase, type PurchaseItemInput } from "@/lib/db";

export async function GET() {
  try {
    const purchases = await getPurchases();
    return NextResponse.json({ purchases });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load purchases." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: {
    vendorName?: string;
    vendorRef?: string;
    partyId?: number;
    items?: { name?: string; qty?: number; unitCost?: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const items: PurchaseItemInput[] = Array.isArray(body.items)
    ? body.items.map((it) => ({
        name: typeof it.name === "string" ? it.name : "",
        qty: Number(it.qty),
        unitCost: Number(it.unitCost),
      }))
    : [];
  const vendorName = typeof body.vendorName === "string" ? body.vendorName : "";
  const vendorRef = typeof body.vendorRef === "string" ? body.vendorRef : "";
  const partyId = typeof body.partyId === "number" && Number.isFinite(body.partyId) ? body.partyId : undefined;

  try {
    const result = await recordPurchase(items, vendorName, vendorRef, partyId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to record the purchase. Please try again." }, { status: 500 });
  }
}
