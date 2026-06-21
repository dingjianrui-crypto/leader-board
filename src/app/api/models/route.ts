import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createModel, listProvidersWithModels } from "@/lib/repositories/leaderboard";
import { modelInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await listProvidersWithModels();
  return NextResponse.json(
    providers.flatMap((provider) =>
      provider.models.map((model) => ({
        ...model,
        provider,
      })),
    ),
  );
}

export async function POST(request: NextRequest) {
  try {
    const input = modelInputSchema.parse(await request.json());
    const id = await createModel(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
