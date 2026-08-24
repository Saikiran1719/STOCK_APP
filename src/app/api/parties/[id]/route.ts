import { NextRequest, NextResponse } from "next/server";
import { getPartyLedger, updateParty, type PartyInput } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const partyId = Number(id);
  if (!Number.isInteger(partyId)) {
    return NextResponse.json({ error: "Invalid party id." }, { status: 400 });
  }

  try {
    const ledger = await getPartyLedger(partyId);
    if (!ledger) {
      return NextResponse.json({ error: "Party not found." }, { status: 404 });
    }
    return NextResponse.json(ledger);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load the party." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const partyId = Number(id);
  if (!Number.isInteger(partyId)) {
    return NextResponse.json({ error: "Invalid party id." }, { status: 400 });
  }

  let body: PartyInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await updateParty(partyId, {
      name: typeof body.name === "string" ? body.name : "",
      address: typeof body.address === "string" ? body.address : "",
      phone: typeof body.phone === "string" ? body.phone : "",
      email: typeof body.email === "string" ? body.email : "",
      gstin: typeof body.gstin === "string" ? body.gstin : "",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update the party." }, { status: 500 });
  }
}
