import { NextRequest, NextResponse } from "next/server";
import { findFileRecord } from "@/lib/repositories/leaderboard";
import { getStorageAdapter } from "@/lib/storage";

export const dynamic = "force-dynamic";

function parseRange(rangeHeader: string | null, sizeBytes: number) {
  if (!rangeHeader) return null;

  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return "invalid";

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) return "invalid";

  let start = startValue ? Number(startValue) : 0;
  let end = endValue ? Number(endValue) : sizeBytes - 1;

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return "invalid";
    start = Math.max(sizeBytes - suffixLength, 0);
    end = sizeBytes - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= sizeBytes
  ) {
    return "invalid";
  }

  return {
    start,
    end: Math.min(end, sizeBytes - 1),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const storageKey = path.join("/");
  const record = await findFileRecord(storageKey);

  if (!record) {
    return new NextResponse("Not found", { status: 404 });
  }

  const adapter = await getStorageAdapter(record.storageProvider);
  const range = parseRange(request.headers.get("range"), record.sizeBytes);

  if (range === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${record.sizeBytes}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  if (range) {
    const file = await adapter.open(storageKey, { range });
    return new NextResponse(file.stream, {
      status: 206,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(file.contentLength),
        "Content-Range": `bytes ${range.start}-${range.end}/${file.sizeBytes}`,
        "Accept-Ranges": "bytes",
        "Content-Disposition": `inline; filename="${record.filename.replaceAll('"', "")}"`,
      },
    });
  }

  const file = await adapter.open(storageKey);
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Length": String(file.contentLength),
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="${record.filename.replaceAll('"', "")}"`,
    },
  });
}
