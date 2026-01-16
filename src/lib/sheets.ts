import { TeamRecord } from "../types";

const FALLBACK_SAMPLE: TeamRecord[] = [
  {
    id: "T-001",
    teamName: "Aurora",
    leaderName: "Aisha Khan",
    leaderEmail: "aisha@example.com",
    leaderPhone: "+91-9876543210",
    problemStatement: "Build a real-time flood response dashboard for first responders.",
    deckLink: "https://example.com/aurora-pitch.pdf",
    liveLink: "https://aurora-floods.vercel.app",
    googleTech: "Google Maps Platform, Firebase, Vertex AI",
    googleAI: "Vertex AI Forecasting",
    description:
      "A map-first web app for live flood telemetry, citizen reports, and relief routing with automated severity predictions.",
    videoLink: "https://drive.google.com/file/d/1-example/preview",
    githubLink: "https://github.com/example/aurora-floods"
  },
  {
    id: "T-002",
    teamName: "Nebula",
    leaderName: "Rahul Mehta",
    leaderEmail: "rahul@example.com",
    leaderPhone: "+91-9123456780",
    problemStatement: "Mental well-being assistant for students under exam stress.",
    deckLink: "https://example.com/nebula-deck.pdf",
    liveLink: "https://nebula-care.vercel.app",
    googleTech: "Flutter, Firebase Auth, Cloud Run",
    googleAI: "Vertex AI Generative APIs",
    description:
      "A companion app delivering empathetic journaling prompts, SOS escalation, and campus resource routing.",
    videoLink: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    githubLink: "https://github.com/example/nebula-care"
  }
];

function normalizeVideoLink(link?: string): string | undefined {
  if (!link) return undefined;
  if (link.includes("drive.google.com")) {
    return link.replace(/\/view\?.*$/, "/preview").replace(/\/edit\?.*$/, "/preview");
  }
  if (link.includes("youtube.com/watch")) {
    const id = new URL(link).searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : link;
  }
  return link;
}

export async function fetchTeamsFromSheets(): Promise<TeamRecord[]> {
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const range = process.env.GOOGLE_SHEETS_RANGE || "Sheet1!A2:L";

  if (!sheetId || !apiKey) {
    return FALLBACK_SAMPLE;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    console.warn("Sheets fetch failed", res.status, await res.text());
    return FALLBACK_SAMPLE;
  }

  const json = (await res.json()) as { values?: string[][] };
  const rows = json.values || [];

  const teams: TeamRecord[] = rows
    .filter((row) => row[0])
    .map((row, idx) => {
      const [teamName, leaderName, leaderEmail, leaderPhone, problem, deck, live, tech, ai, desc, video, github] = [
        row[0],
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        row[8],
        row[9],
        row[10],
        row[11]
      ];

      return {
        id: `TEAM-${idx + 1}`,
        teamName,
        leaderName,
        leaderEmail,
        leaderPhone,
        problemStatement: problem,
        deckLink: deck,
        liveLink: live,
        googleTech: tech,
        googleAI: ai,
        description: desc,
        videoLink: normalizeVideoLink(video),
        githubLink: github
      } satisfies TeamRecord;
    });

  return teams.length ? teams : FALLBACK_SAMPLE;
}
