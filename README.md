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
   GOOGLE_SHEETS_RANGE=Sheet1!A2:L
   ```

3. Enable Google OAuth for saving scores (only signed-in judges can write scores):
   ```bash
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   NEXTAUTH_SECRET=generate_a_random_string
   NEXTAUTH_URL=http://localhost:3000
   ```
   - Create OAuth credentials in Google Cloud (Web app). Add `http://localhost:3000/api/auth/callback/google` to the redirect URIs.
   - Judges must sign in with Google before saving scores.

4. Supabase storage (recommended for deploys; Vercel FS is read-only):
   ```bash
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```
   - Create table `scores` with columns:
   - `team_id` text, `judge_email` text, `judge_name` text, `problem_relevance` int,
     `technical_feasibility` int, `statement_alignment` int, `creativity` int,
     `presentation` int, `google_tech_use` int, `notes` text, `updated_at` timestamptz,
     unique constraint on (team_id, judge_email).
   - Service role key is server-only (API routes); do not expose in the browser.
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
