# Meeting Tasks

> Turn meeting notes into actionable tasks with an AI agent — with a human in the loop.

Paste a meeting transcript, and an AI agent reads it, checks existing tasks and team members, then **proposes** new tasks or updates to existing ones (e.g. marking a task as done when someone says "I fixed it"). Nothing is written to the database until you review and confirm each proposal.

> 🚧 Work in progress. See the [roadmap](#roadmap) below.

## Features

- **Tasks** — create, update status, delete; priority, assignee, due date and overdue highlighting
- **Meetings** — store meeting transcripts, view tasks linked to each meeting
- **Members** — manage team members, see each person's todo / in-progress / done workload
- **AI task extraction** *(in progress)* — tool-calling agent that proposes create/update actions for human review
- Dark mode, responsive layout, accessible components

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions) |
| Language | TypeScript |
| Database | [Supabase](https://supabase.com) (PostgreSQL, Row Level Security) |
| UI | [shadcn/ui](https://ui.shadcn.com) + Radix UI, Tailwind CSS v4, Lucide icons |
| AI | [Vercel AI SDK](https://ai-sdk.dev) + OpenAI |
| CI | GitHub Actions (lint, type-check, build) |

## Design decisions

- **Server-only database access.** RLS is enabled on every table with no public policies, so the browser can never query the database directly. All reads and writes go through Server Components and Server Actions using a server-only secret key.
- **Human-in-the-loop agent.** Read tools (search tasks, list members) run automatically; write operations are only *proposed* and must be confirmed by the user.
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

Create the database tables by running the SQL in [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor, then open http://localhost:3000.

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
lib/              # Supabase client, types, shared helpers
supabase/         # Database schema
```

## Roadmap

- [x] Task CRUD
- [x] Meeting CRUD
- [x] Team member management
- [ ] AI agent: extract task proposals from transcripts
- [ ] Review & confirm proposals
- [ ] Kanban board
- [ ] Deploy to Vercel
- [ ] Auth (Supabase Auth) and per-user data
- [ ] Agent evaluation set

## License

[MIT](LICENSE)
