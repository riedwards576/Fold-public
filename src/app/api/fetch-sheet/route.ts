import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const sheetIdParam = searchParams.get("sheetId");

  let sheetId: string | null = sheetIdParam;

  if (!sheetId && url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    sheetId = match ? match[1] : null;
  }

  if (!sheetId) {
    return NextResponse.json({ error: "could not extract sheet id from url" }, { status: 400 });
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  let res: Response;
  try {
    res = await fetch(exportUrl);
  } catch {
    return NextResponse.json({ error: "failed to fetch sheet" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "sheet fetch returned non-ok status" }, { status: 400 });
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text") && !contentType.includes("csv")) {
    return NextResponse.json({ error: "unexpected content type from sheet" }, { status: 400 });
  }

  const csvText = await res.text();
  return new NextResponse(csvText, {
    status: 200,
    headers: { "content-type": "text/csv; charset=utf-8" },
  });
}
