import { NextRequest, NextResponse } from "next/server";
import { getPayments } from "@/lib/db";

// The Cash & Bank ledger with no query params; ?partyId= / ?invoiceId= /
// ?purchaseId= narrows it — used by the party ledger and invoice/purchase
// detail pages to show just that one party's or document's history.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const partyId = searchParams.get("partyId");
  const invoiceId = searchParams.get("invoiceId");
  const purchaseId = searchParams.get("purchaseId");

  try {
    const payments = await getPayments({
      partyId: partyId ? Number(partyId) : undefined,
      invoiceId: invoiceId ? Number(invoiceId) : undefined,
      purchaseId: purchaseId ? Number(purchaseId) : undefined,
    });
    return NextResponse.json({ payments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load payments." }, { status: 500 });
  }
}
