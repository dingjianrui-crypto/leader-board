import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { deleteProvider } from "@/lib/repositories/leaderboard";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteProvider(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
