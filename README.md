# HackVento Judging Dashboard

A Next.js + TypeScript dashboard for GDGOC IET-DAVV judges to search teams, review submissions, and store scores locally.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Connect Google Sheets by setting env vars in a `.env.local` file (see `.env.local.example` prefilled with your sheet ID):
   ```bash
   GOOGLE_SHEETS_SPREADSHEET_ID=1YwELUMp2NK2pPsHeB6PVDTnNnDOwF0CFWLk0IvzOIcs
   GOOGLE_SHEETS_API_KEY=your-api-key
   GOOGLE_SHEETS_RANGE=Sheet1!A2:K
   ```
   Columns expected: Team Name, Leader Name, Leader Email, Leader Phone, Problem Statements, Presentation Link, Live Link, Google Technologies, Google AI Tools, Description, Video Link, GitHub.
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Scoring Storage

Scores are stored in `data/scores.json` via the `/api/scores` route (server-side file write). Keep this file under version control as needed.

## Tech Stack

- Next.js (App Router) + React 18
- Tailwind CSS
- TypeScript, ESLint

## Notes

- The UI embeds demo videos with an iframe and enables fullscreen.
- A fallback sample dataset is used if Sheets credentials are absent.
