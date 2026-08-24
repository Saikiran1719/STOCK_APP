import { NextRequest, NextResponse } from "next/server";
import { getParties, createParty, type PartyInput } from "@/lib/db";

function partyTypeFrom(value: string | null): "customer" | "vendor" {
  return value === "vendor" ? "vendor" : "customer";
}

export async function GET(request: NextRequest) {
  const type = partyTypeFrom(request.nextUrl.searchParams.get("type"));
  try {
    const parties = await getParties(type);
    return NextResponse.json({ parties });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load parties." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: PartyInput & { type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const type = partyTypeFrom(typeof body.type === "string" ? body.type : null);

  try {
    const result = await createParty(
      {
        name: typeof body.name === "string" ? body.name : "",
        address: typeof body.address === "string" ? body.address : "",
        phone: typeof body.phone === "string" ? body.phone : "",
        email: typeof body.email === "string" ? body.email : "",
        gstin: typeof body.gstin === "string" ? body.gstin : "",
      },
      type
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to add the party." }, { status: 500 });
  }
}
