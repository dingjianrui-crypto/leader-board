import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createProvider, listProvidersWithModels } from "@/lib/repositories/leaderboard";
import { providerInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listProvidersWithModels());
}

export async function POST(request: NextRequest) {
  try {
    const input = providerInputSchema.parse(await request.json());
    const id = await createProvider(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
