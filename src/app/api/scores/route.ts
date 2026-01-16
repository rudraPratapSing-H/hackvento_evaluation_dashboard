import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ScoreEntry, ScoreStore } from "@/types";
import { supabaseServer } from "@/lib/supabase-server";

const TABLE = "scores";

function toEntry(row: any): ScoreEntry {
  return {
    problemRelevance: row.problem_relevance,
    technicalFeasibility: row.technical_feasibility,
    statementAlignment: row.statement_alignment,
    creativity: row.creativity,
    presentation: row.presentation,
    googleTechUse: row.google_tech_use,
    notes: row.notes || "",
    updatedAt: row.updated_at,
    updatedBy: (row.judge_email as string | undefined)?.toLowerCase() || row.judge_email,
    updatedByName: row.judge_name
  };
}

function rowsToStore(rows: any[]): ScoreStore {
  const byTeam: ScoreStore = {};
  for (const row of rows) {
    const entry = toEntry(row);
    const key = row.team_id ?? row.team_name ?? "unknown-team";
    const current = byTeam[key];
    const judges = current?.judges ? [...current.judges, entry] : [entry];
    byTeam[key] = { ...entry, judges };
  }
  return byTeam;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const supabase = supabaseServer();

  // If not signed in yet, return an empty store so the client doesn't see others' scores.
  if (!session?.user) {
    return NextResponse.json({});
  }

  const judgeKeyRaw = session.user.email || session.user.name;
  if (!judgeKeyRaw) return NextResponse.json({});
  const judgeKey = judgeKeyRaw.toLowerCase();

  const { data, error } = await supabase.from(TABLE).select("*").eq("judge_email", judgeKey);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(rowsToStore(data || []));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { teamId?: string; teamName?: string; scores?: ScoreEntry };
  if ((!body.teamId && !body.teamName) || !body.scores) {
    return NextResponse.json({ message: "teamName (or teamId) and scores are required" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const userEmail = session.user.email || session.user.name || "unknown";
  const userName = session.user.name || session.user.email || "unknown";
  const userEmailLower = userEmail.toLowerCase();

  const teamKey = body.teamName || body.teamId || "unknown";

    const payloadBase = {
      team_id: body.teamId ?? teamKey,
      team_name: body.teamName,
    judge_email: userEmailLower,
    judge_name: userName,
    problem_relevance: body.scores.problemRelevance,
    technical_feasibility: body.scores.technicalFeasibility,
    statement_alignment: body.scores.statementAlignment,
    creativity: body.scores.creativity,
    presentation: body.scores.presentation,
    google_tech_use: body.scores.googleTechUse,
    notes: body.scores.notes || "",
    updated_at: body.scores.updatedAt ?? new Date().toISOString()
  };

  const payloadWithName = { ...payloadBase, team_name: body.teamName ?? teamKey } as const;

  const tryUpsert = async (payload: Record<string, unknown>) =>
    supabase.from(TABLE).upsert(payload, { onConflict: "team_id,judge_email" });

  let upsertError;
  ({ error: upsertError } = await tryUpsert(payloadWithName));
  if (upsertError && (upsertError.code === "42703" || upsertError.message?.includes("team_name"))) {
    ({ error: upsertError } = await tryUpsert(payloadBase));
  }
  if (upsertError) return NextResponse.json({ message: upsertError.message }, { status: 500 });

  const { data, error } = await supabase.from(TABLE).select("*").eq("judge_email", userEmailLower);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json(rowsToStore(data || []));
}

export const dynamic = "force-dynamic";

