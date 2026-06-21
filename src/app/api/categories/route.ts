import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createCategory, listCategories } from "@/lib/repositories/leaderboard";
import { categoryInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listCategories());
}

export async function POST(request: NextRequest) {
  try {
    const input = categoryInputSchema.parse(await request.json());
    const id = await createCategory(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
