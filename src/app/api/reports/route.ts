import { NextRequest, NextResponse } from "next/server";
import { getReportSummary } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // "YYYY-MM"

  const now = new Date();
  const [yStr, mStr] = (
    monthParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  ).split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1-based

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);

  try {
    const summary = await getReportSummary(from.toISOString(), to.toISOString());
    return NextResponse.json({ summary, month: `${yStr}-${mStr}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load the report." }, { status: 500 });
  }
}
