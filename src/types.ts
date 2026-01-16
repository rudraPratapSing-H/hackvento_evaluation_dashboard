export type TeamRecord = {
  id: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  problemStatement: string;
  deckLink?: string;
  liveLink?: string;
  googleTech?: string;
  googleAI?: string;
  description?: string;
  videoLink?: string;
  githubLink?: string;
};

export type ScoreCategory =
  | "problemRelevance"
  | "technicalFeasibility"
  | "statementAlignment"
  | "creativity"
  | "presentation"
  | "googleTechUse";

export type ScoreEntry = Record<ScoreCategory, number> & {
  notes?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: string;
};
export type ScoreStore = Record<string, ScoreEntry & { judges?: ScoreEntry[] }>;
