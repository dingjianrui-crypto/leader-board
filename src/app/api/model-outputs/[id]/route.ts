import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { deleteModelOutput } from "@/lib/repositories/leaderboard";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const storageKey = await deleteModelOutput(id);
    const storageAdapter = await storage;
    await storageAdapter.delete(storageKey);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
