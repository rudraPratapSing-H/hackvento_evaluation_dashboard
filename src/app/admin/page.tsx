import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams?: { key?: string } }) {
  const key = searchParams?.key || "";
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey || key !== adminKey) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-cloud">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold text-white">Admin Access</h1>
          <p className="mt-2 text-sm text-cloud/70">Enter the admin key to view rankings.</p>
          <form method="get" className="mt-6 space-y-3">
            <label className="block text-sm text-cloud/80">
              Admin key
              <input
                name="key"
                type="password"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-mint/60 focus:outline-none"
                placeholder="Enter admin key"
                required
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-mint to-amber px-4 py-2 text-sm font-semibold text-slate-900 shadow-glass transition hover:brightness-105"
            >
              Unlock
            </button>
          </form>
        </div>
      </main>
    );
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.from("scores").select("*");
  if (error) {
    throw new Error(error.message);
  }

  const rankings = Object.values(
    (data || []).reduce((acc: Record<string, { teamId: string; total: number; judgesCount: number }>, row) => {
      const t = row.team_id as string;
      if (!acc[t]) acc[t] = { teamId: t, total: 0, judgesCount: 0 };
      acc[t].total +=
        row.problem_relevance +
        row.technical_feasibility +
        row.statement_alignment +
        row.creativity +
        row.presentation +
        row.google_tech_use;
      acc[t].judgesCount += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-cloud">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">Admin</p>
            <h1 className="text-3xl font-semibold text-white">Team Rankings</h1>
            <p className="text-sm text-cloud/70">Total points across all judges. Sorted highest to lowest.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-cloud/80">
            Teams: {rankings.length}
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-cloud/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-white">Rank</th>
                <th className="px-4 py-3 text-left font-semibold text-white">Team</th>
                <th className="px-4 py-3 text-right font-semibold text-white">Total Score</th>
                <th className="px-4 py-3 text-right font-semibold text-white">Judges</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((row, idx) => (
                <tr key={row.teamId} className={idx % 2 === 0 ? "bg-black/10" : "bg-black/5"}>
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-white">{row.teamId}</td>
                  <td className="px-4 py-3 text-right text-lg font-semibold text-white">{row.total}</td>
                  <td className="px-4 py-3 text-right text-cloud/70">{row.judgesCount}</td>
                </tr>
              ))}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-cloud/70">
                    No scores yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
