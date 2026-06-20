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

  // Extract tab gid from URL fragment (#gid=…) or query param
  let gid: string | null = null;
  if (url) {
    const gidMatch = url.match(/[#&?]gid=(\d+)/);
    gid = gidMatch ? gidMatch[1] : null;
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ""}`;

  let res: Response;
  try {
    res = await fetch(exportUrl);
  } catch {
    return NextResponse.json({ error: "failed to fetch sheet" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({
      error: "Could not access this sheet. Make sure it is shared as \"Anyone with the link\" → Viewer, then try again.",
    }, { status: 400 });
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text") && !contentType.includes("csv")) {
    // Google redirected to a login page — sheet is private
    return NextResponse.json({
      error: "This sheet appears to be private. In Google Sheets, click Share → change to \"Anyone with the link\" → Viewer, then try again.",
    }, { status: 400 });
  }

  const csvText = await res.text();
  return new NextResponse(csvText, {
    status: 200,
    headers: { "content-type": "text/csv; charset=utf-8" },
  });
}
