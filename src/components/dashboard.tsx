"use client";

import { useEffect, useMemo, useState } from "react";
import { TeamRecord, ScoreCategory, ScoreEntry, ScoreStore } from "../types";
import { clsx } from "clsx";

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

  const currentEntry: ScoreEntry = useMemo(() => {
    if (!activeTeamId) return EMPTY_SCORES;
    return store[activeTeamId] ?? { ...EMPTY_SCORES };
  }, [store, activeTeamId]);

  async function handleSave(next: ScoreEntry) {
    if (!activeTeamId) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: activeTeamId, scores: next })
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
      updatedAt: new Date().toISOString()
    };
    setStore((prev) => ({ ...prev, [activeTeamId ?? ""]: next }));
  }

  function setNotes(value: string) {
    const next: ScoreEntry = { ...currentEntry, notes: value, updatedAt: new Date().toISOString() };
    setStore((prev) => ({ ...prev, [activeTeamId ?? ""]: next }));
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
                {activeTeam.githubLink && (
                  <InfoCard title="GitHub" href={activeTeam.githubLink} label="Repository" />
                )}
                {activeTeam.googleTech && (
                  <InfoCard title="Google Technologies" body={activeTeam.googleTech} subdued />
                )}
                {activeTeam.googleAI && <InfoCard title="Google AI Tools" body={activeTeam.googleAI} subdued />}
                {activeTeam.description && <InfoCard title="Solution Overview" body={activeTeam.description} subdued />}
              </div>

              {activeTeam.videoLink && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-cloud/80">
                    <span>Demo Video</span>
                    <span className="text-xs text-cloud/60">Up to 3 minutes</span>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
                    <iframe
                      className="aspect-video w-full"
                      src={activeTeam.videoLink}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`${activeTeam.teamName} demo video`}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[1.2fr,0.9fr]">
                <ScoreForm
                  entry={currentEntry}
                  onChange={setField}
                  onNotes={setNotes}
                  onSave={() => handleSave({ ...currentEntry, updatedAt: new Date().toISOString() })}
                  isSaving={isSaving}
                  error={error}
                />

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Score Snapshot</p>
                  <p className="mt-2 text-4xl font-semibold text-white">{totalScore(currentEntry)} / 90</p>
                  <p className="text-sm text-cloud/70">Sum of six criteria (0-15 each).</p>

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
    </div>
  );
}

function InfoCard({ title, label, href, body, subdued }: { title: string; label?: string; href?: string; body?: string; subdued?: boolean }) {
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
      ) : (
        <p className={clsx("mt-2 leading-relaxed", subdued ? "text-cloud/80" : "text-white")}>{body}</p>
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
};

function ScoreForm({ entry, onChange, onNotes, onSave, isSaving, error }: ScoreFormProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Evaluation</p>
          <h3 className="text-xl font-semibold text-white">Score (0-15 each)</h3>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
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
