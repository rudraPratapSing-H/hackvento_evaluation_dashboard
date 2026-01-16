"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TeamRecord, ScoreCategory, ScoreEntry, ScoreStore } from "../types";
import { clsx } from "clsx";
import { useSession, signIn, signOut } from "next-auth/react";

const CATEGORY_META: Record<ScoreCategory, { label: string; helper: string }> = {
  problemRelevance: {
    label: "Problem Statement Relevance",
    helper: "Does the proposal squarely address the stated challenge? Penalize scope drift."
  },
  technicalFeasibility: {
    label: "Technical Feasibility & Implementation",
    helper: "Are architecture, data flows, and implementation details sound and realistic for the timeframe?"
  },
  statementAlignment: {
    label: "Solution Alignment",
    helper: "Do features and trade-offs stay aligned with user needs outlined in the statement?"
  },
  creativity: {
    label: "Creativity & Innovation",
    helper: "Is there a novel idea, workflow, or insight—beyond a straightforward baseline?"
  },
  presentation: {
    label: "Presentation & Design",
    helper: "Clarity of storytelling, visual hierarchy, and ability to convey value quickly."
  },
  googleTechUse: {
    label: "Use of Google Technologies",
    helper: "Quality of integration and appropriateness of Google APIs / AI tools."
  }
};

const EMPTY_SCORES: ScoreEntry = {
  problemRelevance: 0,
  technicalFeasibility: 0,
  statementAlignment: 0,
  creativity: 0,
  presentation: 0,
  googleTechUse: 0,
  notes: "",
  updatedAt: ""
};

type Props = {
  teams: TeamRecord[];
};

export function Dashboard({ teams }: Props) {
  const [query, setQuery] = useState("");
  const [activeTeamId, setActiveTeamId] = useState<string | null>(teams[0]?.id ?? null);
  const [store, setStore] = useState<ScoreStore>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);
  const [videoError, setVideoError] = useState(false);
  const { data: session, status } = useSession();
  const loginPrompted = useRef(false);
  const judgeKey = useMemo(() => session?.user?.email || session?.user?.name || null, [session?.user?.email, session?.user?.name]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => team.teamName.toLowerCase().includes(query.toLowerCase()));
  }, [teams, query]);

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) ?? null, [teams, activeTeamId]);

  useEffect(() => {
    const loadScores = async () => {
      try {
        const res = await fetch("/api/scores", { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load scores");
        const json = (await res.json()) as ScoreStore;
        setStore(json);
      } catch (err) {
        console.warn(err);
      }
    };
    loadScores();
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" && !loginPrompted.current) {
      loginPrompted.current = true;
      signIn("google");
    }
  }, [status]);

  useEffect(() => {
    setVideoError(false);
  }, [activeTeamId]);

  const videoIsFrameDenied = (link?: string) => {
    if (!link) return false;
    try {
      const host = new URL(link).hostname;
      const isLoom = host.includes("loom.com");
      const isGoogleNonYouTube = host.includes("google.com") && !host.includes("youtube.com");
      return isLoom || isGoogleNonYouTube;
    } catch {
      return false;
    }
  };

  const currentEntry: ScoreEntry = useMemo(() => {
    if (!activeTeamId) return EMPTY_SCORES;
    const teamStore = store[activeTeamId];
    if (!teamStore) return { ...EMPTY_SCORES };
    const judges = teamStore.judges ?? [];
    const match = judgeKey ? judges.find((j) => j.updatedBy === judgeKey) : null;
    if (match) return match;
    if (judgeKey && teamStore.updatedBy === judgeKey) return teamStore;
    return { ...EMPTY_SCORES };
  }, [store, activeTeamId, judgeKey]);

  async function handleSave(next: ScoreEntry) {
    if (!activeTeamId || !activeTeam?.teamName) return;
    const teamName = activeTeam.teamName;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeamId, teamName, scores: next })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save");
      }
      const payload = (await res.json()) as ScoreStore;
      setStore(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function setField(category: ScoreCategory, value: number) {
    const next: ScoreEntry = {
      ...currentEntry,
      [category]: Math.max(0, Math.min(15, value)),
      updatedAt: new Date().toISOString(),
      updatedBy: judgeKey || "unknown",
      updatedByName: session?.user?.name || session?.user?.email || "unknown"
    };
    setStore((prev) => {
      if (!activeTeamId) return prev;
      const team = prev[activeTeamId] ?? { judges: [] };
      const judges = team.judges ?? [];
      const others = judges.filter((j) => j.updatedBy !== judgeKey);
      return {
        ...prev,
        [activeTeamId]: { ...next, judges: [...others, next] }
      };
    });
  }

  function setNotes(value: string) {
    const next: ScoreEntry = {
      ...currentEntry,
      notes: value,
      updatedAt: new Date().toISOString(),
      updatedBy: judgeKey || "unknown",
      updatedByName: session?.user?.name || session?.user?.email || "unknown"
    };
    setStore((prev) => {
      if (!activeTeamId) return prev;
      const team = prev[activeTeamId] ?? { judges: [] };
      const judges = team.judges ?? [];
      const others = judges.filter((j) => j.updatedBy !== judgeKey);
      return {
        ...prev,
        [activeTeamId]: { ...next, judges: [...others, next] }
      };
    });
  }

  const totalScore = (entry: ScoreEntry) =>
    entry.problemRelevance +
    entry.technicalFeasibility +
    entry.statementAlignment +
    entry.creativity +
    entry.presentation +
    entry.googleTechUse;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cloud/70">HackVento Judging</p>
          <h1 className="text-3xl font-semibold text-gradient lg:text-4xl">Evaluation Dashboard</h1>
          <p className="mt-2 text-cloud/80">Search, review, and score teams in one view.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <div className="w-full max-w-md lg:w-80">
            <label className="text-sm text-cloud/70" htmlFor="team-search">
              Search by team name
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl input-surface px-3 py-2">
              <svg className="h-5 w-5 text-cloud/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
              <input
                id="team-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Start typing..."
                className="w-full bg-transparent py-1 text-cloud placeholder:text-cloud/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-cloud/70">
              {status === "authenticated" ? (
                <div className="text-right">
                  <p className="font-semibold text-white">{session?.user?.name || session?.user?.email}</p>
                  <p className="text-xs text-cloud/60">Signed in</p>
                </div>
              ) : (
                <p className="text-right text-cloud/60">Sign in to save scores</p>
              )}
            </div>
            {status === "authenticated" ? (
              <button
                onClick={() => signOut()}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-amber/60 hover:text-amber-200"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="rounded-xl bg-gradient-to-r from-mint to-amber px-4 py-2 text-sm font-semibold text-slate-900 shadow-glass transition hover:brightness-105"
              >
                Sign in with Google
              </button>
            )}
            <a
              href="/admin"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-mint/60 hover:text-mint"
            >
              Admin
            </a>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="glass-panel p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 text-sm font-semibold uppercase tracking-wide text-cloud/70">
            <span>Teams</span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-cloud/80">{filteredTeams.length}</span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: "70vh" }}>
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => setActiveTeamId(team.id)}
                className={clsx(
                  "w-full rounded-xl border px-4 py-3 text-left transition",
                  "border-white/5 bg-white/5 hover:border-mint/60 hover:bg-white/10",
                  activeTeamId === team.id && "border-mint/70 bg-mint/10"
                )}
              >
                <p className="text-sm uppercase tracking-tight text-cloud/70">{team.id}</p>
                <p className="mt-1 text-lg font-semibold text-white">{team.teamName}</p>
                <p className="text-sm text-cloud/70">{team.problemStatement}</p>
              </button>
            ))}
            {filteredTeams.length === 0 && (
              <p className="text-sm text-cloud/70">No teams match that query.</p>
            )}
          </div>
        </aside>

        <section className="glass-panel p-5 sm:p-6 lg:p-8">
          {activeTeam ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.25em] text-cloud/60">Team</p>
                  <h2 className="text-3xl font-semibold text-white">{activeTeam.teamName}</h2>
                  <p className="text-cloud/80">{activeTeam.problemStatement}</p>
                </div>
                <div className="flex gap-3 text-sm text-cloud/80">
                  <div className="rounded-xl bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-cloud/60">Leader</p>
                    <p className="font-semibold text-white">{activeTeam.leaderName}</p>
                    <div className="mt-1 space-y-1">
                      <a className="block text-mint hover:underline" href={`mailto:${activeTeam.leaderEmail}`}>
                        {activeTeam.leaderEmail}
                      </a>
                      <a className="block text-mint hover:underline" href={`tel:${activeTeam.leaderPhone}`}>
                        {activeTeam.leaderPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {activeTeam.deckLink && (
                  <InfoCard title="Presentation" href={activeTeam.deckLink} label="Open deck" />
                )}
                {activeTeam.liveLink && <InfoCard title="Live Link" href={activeTeam.liveLink} label="View project" />}
                {activeTeam.videoLink && (
                  <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm text-cloud/80">
                      <span>Demo Video</span>
                      <span className="text-xs text-cloud/60">Up to 3 minutes</span>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
                      {!videoError && !videoIsFrameDenied(activeTeam.videoLink) ? (
                        <iframe
                          className="aspect-video w-full"
                          src={activeTeam.videoLink}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`${activeTeam.teamName} demo video`}
                          onError={() => setVideoError(true)}
                        />
                      ) : (
                        <div className="p-4 text-sm text-cloud/80">
                          <p className="mb-2">Unable to load the video inline (blocked or 403). Use the direct link:</p>
                          <a className="text-mint underline break-words" href={activeTeam.videoLink} target="_blank" rel="noreferrer">
                            {activeTeam.videoLink}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeTeam.githubLink && (
                  <InfoCard title="GitHub" href={activeTeam.githubLink} label="Repository" />
                )}
                {activeTeam.googleTech && (
                  <InfoCard
                    title="Google Technologies"
                    body={activeTeam.googleTech}
                    subdued
                    listFromComma
                    onReadMore={() => setModal({ title: "Google Technologies", body: activeTeam.googleTech ?? "" })}
                  />
                )}
                {activeTeam.googleAI && (
                  <InfoCard
                    title="Google AI Tools"
                    body={activeTeam.googleAI}
                    subdued
                    listFromComma
                    onReadMore={() => setModal({ title: "Google AI Tools", body: activeTeam.googleAI ?? "" })}
                  />
                )}
                {activeTeam.description && (
                  <InfoCard
                    title="Solution Overview"
                    body={activeTeam.description}
                    subdued
                    onReadMore={() => setModal({ title: "Solution Overview", body: activeTeam.description ?? "" })}
                  />
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr,0.9fr]">
                <ScoreForm
                  entry={currentEntry}
                  onChange={setField}
                  onNotes={setNotes}
                  onSave={() =>
                    handleSave({
                      ...currentEntry,
                      updatedAt: new Date().toISOString(),
                      updatedBy: session?.user?.email || session?.user?.name || "unknown",
                      updatedByName: session?.user?.name || session?.user?.email || "unknown"
                    })
                  }
                  isSaving={isSaving}
                  error={error}
                  isAuthed={status === "authenticated"}
                />

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Score Snapshot</p>
                  <p className="mt-2 text-4xl font-semibold text-white">{totalScore(currentEntry)} / 90</p>
                    <p className="text-sm text-cloud/70">Sum of six criteria (0-15 each).</p>

                  {(currentEntry.updatedAt || currentEntry.updatedBy) && (
                    <div className="mt-3 space-y-1 text-sm text-cloud/70">
                      {currentEntry.updatedAt && (
                        <p>Last saved: {new Date(currentEntry.updatedAt).toLocaleString()}</p>
                      )}
                      {currentEntry.updatedBy && (
                        <p>
                          By: {currentEntry.updatedByName ? `${currentEntry.updatedByName} (${currentEntry.updatedBy})` : currentEntry.updatedBy}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 space-y-3 text-sm text-cloud/80">
                    {(Object.keys(CATEGORY_META) as ScoreCategory[]).map((key) => (
                      <div key={key} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                        <span>{CATEGORY_META[key].label}</span>
                        <span className="font-semibold text-white">{currentEntry[key] ?? 0}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-amber/30 bg-amber/10 px-3 py-3 text-amber-100">
                    <p className="text-sm font-semibold">Judge note</p>
                    <p className="text-sm text-amber-50">
                      Save frequently. Entries are stored in a JSON file on disk for quick retrieval.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-cloud/70">Select a team to view details.</p>
          )}
        </section>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/95 p-6 shadow-glass">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cloud/60">Expanded</p>
                <h3 className="text-2xl font-semibold text-white">{modal.title}</h3>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-full border border-white/20 px-3 py-1 text-sm text-cloud hover:border-amber/60 hover:text-amber-200"
              >
                Close
              </button>
            </div>
            <p className="whitespace-pre-line text-cloud/90">{modal.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  title,
  label,
  href,
  body,
  subdued,
  listFromComma,
  onReadMore
}: {
  title: string;
  label?: string;
  href?: string;
  body?: string;
  subdued?: boolean;
  listFromComma?: boolean;
  onReadMore?: () => void;
}) {
  const items = listFromComma && body ? body.split(/,|;/).map((item) => item.trim()).filter(Boolean) : null;
  const isLong = (body?.length ?? 0) > 180;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">{title}</p>
      {href ? (
        <a
          className="mt-2 inline-flex items-center gap-2 text-mint hover:text-white"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          <span className="font-semibold">{label ?? href}</span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
      ) : items ? (
        <div className="mt-2 space-y-1">
          {items.map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-cloud/85">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-mint" />
              <span className="leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <p className={clsx("leading-relaxed", subdued ? "text-cloud/80" : "text-white", isLong && "line-clamp-4")}>{body}</p>
          {isLong && onReadMore && (
            <button
              onClick={onReadMore}
              className="mt-2 text-sm font-semibold text-mint underline-offset-2 hover:text-white hover:underline"
            >
              Read more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type ScoreFormProps = {
  entry: ScoreEntry;
  onChange: (category: ScoreCategory, value: number) => void;
  onNotes: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  error: string | null;
  isAuthed: boolean;
};

function ScoreForm({ entry, onChange, onNotes, onSave, isSaving, error, isAuthed }: ScoreFormProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Evaluation</p>
          <h3 className="text-xl font-semibold text-white">Score (0-15 each)</h3>
          {!isAuthed && <p className="text-xs text-amber-200">Sign in with Google to save scores.</p>}
        </div>
        <button
          onClick={onSave}
          disabled={isSaving || !isAuthed}
          className="rounded-xl bg-gradient-to-r from-mint to-amber px-4 py-2 text-sm font-semibold text-slate-900 shadow-glass transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save scores"}
        </button>
      </div>

      <div className="mt-4 space-y-5">
        {(Object.keys(CATEGORY_META) as ScoreCategory[]).map((key) => (
          <div key={key} className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{CATEGORY_META[key].label}</p>
                <p className="text-xs text-cloud/70">{CATEGORY_META[key].helper}</p>
              </div>
              <span className="rounded-lg bg-white/10 px-3 py-1 text-sm font-semibold text-white">{entry[key] ?? 0}</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={entry[key] ?? 0}
              onChange={(e) => onChange(key, Number(e.target.value))}
              className="h-2 w-full cursor-pointer rounded-full accent-mint"
            />
            <div className="flex justify-between text-[11px] uppercase tracking-wide text-cloud/60">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-white">Notes (optional)</label>
          <textarea
            value={entry.notes ?? ""}
            onChange={(e) => onNotes(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-cloud/60 focus:border-mint/60 focus:outline-none"
            placeholder="Call out strengths, risks, blockers, or data sources to verify."
          />
        </div>

        {error && <p className="text-sm text-amber-200">{error}</p>}
      </div>
    </div>
  );
}
