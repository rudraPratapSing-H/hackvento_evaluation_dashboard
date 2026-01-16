import { Dashboard } from "../components/dashboard";
import { fetchTeamsFromSheets } from "../lib/sheets";

export default async function Page() {
  const teams = await fetchTeamsFromSheets();

  return (
    <main className="pb-16 pt-10">
      <Dashboard teams={teams} />
    </main>
  );
}
