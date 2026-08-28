/**
 * POST /api/ask
 *
 * Accepts a natural-language question about current space weather.
 * Returns a grounded answer with sources, or an abstention.
 *
 * Security:
 * - Input validated and length-limited
 * - Question text is passed as data to the model, never as a prompt-injection vector
 * - Snapshot fetched server-side from our own internal API (not user-supplied URL)
 */

import { NextRequest, NextResponse } from "next/server";
import { narrate } from "@/lib/narration";
import type { SpaceWeatherSnapshot } from "@/lib/data/types";
import { assembleSnapshot } from "@/lib/data/snapshot";

const MAX_QUESTION_LENGTH = 500;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse and validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const { question } = body as Record<string, unknown>;

  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "question field is required and must be a string" }, { status: 400 });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `question must be ${MAX_QUESTION_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }

  // Sanitized question: stripped of leading/trailing whitespace
  // Treated as data, not as prompt instructions (prompt injection prevention)
  const sanitizedQuestion = question.trim();

  // Get current snapshot (server-side, allowlisted fetch only)
  let snapshot: SpaceWeatherSnapshot;
  try {
    snapshot = await assembleSnapshot();
  } catch {
    // assembleSnapshot uses allSettled and shouldn't throw, but guard anyway
    snapshot = {
      snapshotUtc: new Date().toISOString(),
      degraded: true,
      degradedSources: ["NOAA-SWPC", "NASA-DONKI"],
      latestKp: null,
      latestSolarWind: null,
      activeAlerts: [],
      recentCmes: [],
    };
  }

  const result = await narrate(sanitizedQuestion, snapshot);

  return NextResponse.json(result);
}
