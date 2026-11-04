# Loop: Agentic Interview Simulator

Bring your own notes and code. Loop turns them into a prep plan built for your
target role, then spars with you: scored drills, adaptive mock interviews, an
interactive mindmap of your material, hand-picked reading, and a step-by-step
code tracer. Every AI step is a live call to Meta Muse Spark through the Meta
Model API.

Built during the **Meta Global AI Developer Hackathon** (Indie track, *Build for
Your World* theme).

## Live demo

- **Live app:** https://divya0702.github.io/loop/#
- **Demo video (3 min):** https://youtu.be/Lzml8PeXlhA

To try it: sign up with any email and password. Email confirmation is turned off, so your account works instantly.

## How it works

1. **Materials**: paste notes and code, or upload text files; set your target role.
2. **Plan**: Muse reads your materials and builds a role-specific plan (topics
   that matter, drills for each, a 5-day run-up, likely interview angles).
   Plans save to your account automatically.
3. **Drills**: one question at a time, scored with feedback and a model answer.
   Three styles: Technical, Behavioral (graded on STAR structure), Leadership.
4. **Mock interview**: an adaptive interviewer (typed or voice input in
   Chrome/Edge) that ramps difficulty, ending in a full scorecard: overall
   score, dimension ratings, strengths, improvements, hire signal.
5. **Mindmap**: Muse reorganizes your notes into an interactive concept tree.
   Expand and collapse branches, search concepts, read key points, and drill
   any node. Saved to your account.
6. **Code visualizer**: paste Python, JavaScript, TypeScript, Java, or Go.
   Muse traces execution line by line with variable states and gotchas.
7. **Resources**: Muse proposes genuinely useful, well-known resources for any
   topic. Save the best to your shelf and check them off as you finish.

Role tracks adapt the loop to you: frontend, backend, data/ML, and DevOps roles
get the code visualizer; manager and product roles get behavioral weight
instead. Light and dark themes included.

## Stack

React 19 + TypeScript + Tailwind CSS v4 (Vite, Hash routing) · Supabase
(Postgres, Auth, Edge Functions on Deno) · Meta Muse via the Meta Model API
(`https://api.meta.ai/v1`, default model `muse-spark-1.3`).

## How Meta AI is used

Every intelligent step is a separate live Muse call with structured JSON
output: plan generation, drill questions, answer grading, the interviewer,
interview scoring, mindmap generation, resource curation, and code tracing.
Token budgets are sized generously because Muse Spark is a reasoning model.

## Setup

### 1. Supabase project (fresh)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run these in order:
   `supabase/migrations/0001_init.sql`,
   `supabase/migrations/0002_saved_resources.sql`,
   `supabase/migrations/0003_mindmaps.sql`.
3. In **Project Settings → API**, copy the Project URL and *publishable* key.
   The publishable key is safe to embed in the frontend because Row Level
   Security isolates every user's rows. Never put the secret key in the app.
4. In **Authentication → Providers**, confirm Email is enabled. Sign-up stays
   on; this app is multi-user.

### 2. Edge functions

Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref <your-project-ref>

supabase secrets set MODEL_API_KEY=your-meta-model-api-key
# optional overrides:
# supabase secrets set META_MODEL=muse-spark-1.3
# supabase secrets set META_API_BASE=https://api.meta.ai/v1

supabase functions deploy generate-plan
supabase functions deploy coach
```

### 3. Frontend

```bash
cp .env.local.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the publishable key)

npm install
npm run dev
```

### 4. Deploy

Pushing to `main` publishes to GitHub Pages via `.github/workflows/deploy.yml`:

1. **Settings → Environments → `github-pages`**: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` as *environment* secrets.
2. **Settings → Pages → Source**: set to **GitHub Actions**.

## Project structure

```
src/
  App.tsx              routing shell
  components/
    ui.tsx             small shared primitives
    layout/            sidebar (collapsible), topbar, theme toggle
  features/
    landing/           public home page
    auth/              sign in / sign up + session provider
    dashboard/         role track, counts, recent sessions
    materials/         paste/upload notes & code, target role
    plan/              generate + auto-save role-specific plans
    practice/          drills (technical / behavioral / leadership)
    interview/         adaptive mock interviewer + scorecard
    mindmap/           interactive Muse mindmap of your notes
    visualizer/        step-through code tracer
    resources/         Muse resource finder + saved shelf
  lib/
    supabaseClient.ts
    coach.ts           typed edge-function callers
    tracks.ts          role-aware module tracks
  hooks/
    useDarkMode.ts     light/dark theme, persisted
supabase/
  migrations/          0001 init, 0002 resources, 0003 mindmaps (+ RLS)
  functions/
    _shared/meta.ts    Meta Model API client
    generate-plan/     materials -> prep plan
    coach/             drills, interview, mindmap, resources, tracing
```

## License

MIT. See [LICENSE](LICENSE).
