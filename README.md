# Meeting Tasks

> Turn meeting notes into actionable tasks with an AI agent — with a human in the loop.

Paste a meeting transcript, and an AI agent reads it, checks existing tasks and team members, then **proposes** new tasks or updates to existing ones (e.g. marking a task as done when someone says "I fixed it"). Nothing is written to the database until you review and confirm each proposal.

> 🚧 Work in progress. See the [roadmap](#roadmap) below.

## Features

- **Tasks** — create, update status, delete; priority, assignee, due date and overdue highlighting
- **Meetings** — store meeting transcripts, view tasks linked to each meeting
- **Members** — manage team members, see each person's todo / in-progress / done workload
- **Human review** — tick, untick or edit each proposal (title, owner, due date, priority) before writing; the meeting summary is saved with the meeting
- **AI task extraction** — a tool-calling agent reads the transcript, looks up members and existing tasks, and proposes new tasks or updates (e.g. "mark as done"), each with the source quote it came from. Invalid tool calls are rejected with an error message so the model can correct itself, and the full execution trace is shown in the UI
- Dark mode, responsive layout, accessible components

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions) |
| Language | TypeScript |
| Database | [Supabase](https://supabase.com) (PostgreSQL, Row Level Security) |
| UI | [shadcn/ui](https://ui.shadcn.com) + Radix UI, Tailwind CSS v4, Lucide icons |
| AI | [Vercel AI SDK](https://ai-sdk.dev) + OpenAI |
| Testing | Vitest, with a scripted mock model to test the agent loop deterministically |
| CI | GitHub Actions (lint, type-check, unit tests, build) |

## Design decisions

- **Server-only database access.** RLS is enabled on every table with no public policies, so the browser can never query the database directly. All reads and writes go through Server Components and Server Actions using a server-only secret key.
- **Human-in-the-loop agent.** Read tools (search tasks, list members) run automatically; write operations are only *proposed* and must be confirmed by the user.
- **Validated tool calls.** Every agent tool validates its input (dates, member ids, task ids, duplicates). Errors are returned to the model instead of thrown, so it can fix the call in the next step. The loop is capped at 12 steps to bound latency and cost.
- **Cheapest viable model.** The agent defaults to `gpt-5-nano` with low reasoning effort — a full extraction costs a fraction of a cent. Override with `OPENAI_MODEL`.
- **Testable agent.** Data access sits behind an `AgentDataSource` interface, so tests swap in fake data and a scripted mock model — no API calls in CI.
- **Atomic writes.** Confirmed proposals are applied by a Postgres function (`apply_task_proposals`), so all creates and updates run in a single transaction — if one fails, nothing is written. Input is validated twice: with Zod in the server action, and by foreign keys and check constraints in the database. Only the service role may execute the function.
- **Traceability.** Each extracted task stores a `source_quote` — the exact sentence from the transcript it came from — to make AI output verifiable.

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project
- An OpenAI API key

### Setup

```bash
git clone https://github.com/MARCHTOWNE/Meeting-Task.git
cd Meeting-Task
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Set up the database by running these files in the Supabase SQL Editor, in order:

1. [`supabase/schema.sql`](supabase/schema.sql) — tables, RLS, sample members
2. [`supabase/migrations/002_apply_task_proposals.sql`](supabase/migrations/002_apply_task_proposals.sql) — function that applies confirmed proposals in one transaction

Then open http://localhost:3000.

## Project structure

```
app/
  tasks/          # Task list page + server actions
  meetings/       # Meeting list, create, detail, edit + server actions
  members/        # Member list with workload stats + server actions
components/
  ui/             # shadcn/ui components
  tasks/          # Task card, create-task dialog
  meetings/       # Meeting form, delete button
  members/        # Member card, add / edit dialog
lib/
  agent/          # Agent: prompt, tools, loop, Supabase data source, tests
                  # + Supabase client, types, shared helpers
supabase/         # Database schema
```

## Roadmap

- [x] Task CRUD
- [x] Meeting CRUD
- [x] Team member management
- [x] AI agent: extract task proposals from transcripts
- [x] Review & confirm proposals
- [ ] Kanban board
- [ ] Deploy to Vercel
- [ ] Auth (Supabase Auth) and per-user data
- [ ] Agent evaluation set

## License

[MIT](LICENSE)
