import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ScoreEntry, ScoreStore } from "@/types";

const STORE_PATH = path.join(process.cwd(), "data", "scores.json");

async function ensureStore(): Promise<ScoreStore> {
  try {
    const data = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(data) as ScoreStore;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
      await fs.writeFile(STORE_PATH, JSON.stringify({}, null, 2));
      return {};
    }
    throw err;
  }
}

export async function GET() {
  const store = await ensureStore();
  return NextResponse.json(store);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { teamId?: string; scores?: ScoreEntry };
  if (!body.teamId || !body.scores) {
    return NextResponse.json({ message: "teamId and scores are required" }, { status: 400 });
  }

  const userEmail = session.user.email || session.user.name || "unknown";
  const userName = session.user.name || session.user.email || "unknown";

  const store = await ensureStore();
  const existing = store[body.teamId];
  const priorJudges = Array.isArray(existing?.judges) ? existing?.judges ?? [] : existing ? [existing] : [];
  const filtered = priorJudges.filter((judge) => judge.updatedBy !== userEmail);

  const entry: ScoreEntry = {
    ...body.scores,
    updatedBy: userEmail,
    updatedByName: userName,
    updatedAt: body.scores.updatedAt ?? new Date().toISOString()
  };

  const judges = [...filtered, entry];
  store[body.teamId] = { ...entry, judges };

  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
  return NextResponse.json(store);
}

export const dynamic = "force-dynamic";
