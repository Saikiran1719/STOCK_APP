import { NextResponse } from "next/server";
import { getInvoices } from "@/lib/db";

export async function GET() {
  try {
    const invoices = await getInvoices();
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load invoices." }, { status: 500 });
  }
}
