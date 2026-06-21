import { NextRequest, NextResponse } from "next/server";
import { findFileRecord } from "@/lib/repositories/leaderboard";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const storageKey = path.join("/");
  const record = await findFileRecord(storageKey);

  if (!record) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await storage.open(storageKey);
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `inline; filename="${record.filename.replaceAll('"', "")}"`,
    },
  });
}
