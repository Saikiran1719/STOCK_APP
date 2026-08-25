import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, type Settings } from "@/lib/db";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let body: Partial<Settings>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const settings: Settings = {
    companyName: typeof body.companyName === "string" ? body.companyName : "",
    address: typeof body.address === "string" ? body.address : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    email: typeof body.email === "string" ? body.email : "",
    gstin: typeof body.gstin === "string" ? body.gstin : "",
    currencySymbol: typeof body.currencySymbol === "string" ? body.currencySymbol : "",
    invoiceNote: typeof body.invoiceNote === "string" ? body.invoiceNote : "",
    logoDataUrl: typeof body.logoDataUrl === "string" ? body.logoDataUrl : "",
    invoicePrefix: typeof body.invoicePrefix === "string" ? body.invoicePrefix : "INV",
  };

  try {
    const result = await saveSettings(settings);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
