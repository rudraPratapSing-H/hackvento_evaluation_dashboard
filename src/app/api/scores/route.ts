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

  const store = await ensureStore();
  store[body.teamId] = {
    ...body.scores,
    updatedBy: body.scores.updatedBy || session.user.email || session.user.name || "unknown",
    updatedAt: body.scores.updatedAt ?? new Date().toISOString()
  };

  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
  return NextResponse.json(store);
}

export const dynamic = "force-dynamic";
