# Sports Poll App

A tiny public poll app for the question **"What is your favourite sport?"** — vote once per browser, see live results.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via `better-sqlite3` (file-based, persists between restarts)
- **Frontend:** Plain HTML/CSS/JS (no build step, no framework)
- **Duplicate-vote prevention:** a cookie set on vote (server-checked) plus a `localStorage` flag (client-side UX), not bulletproof by design

## Project structure

```
.
├── server.js           # Express app entry point
├── db/
│   ├── database.js     # SQLite connection, schema, seeds the default poll
│   └── poll.db          # created on first run (gitignored)
├── routes/
│   └── poll.js          # /api/polls/:pollId GET + /vote POST
├── public/
│   ├── poll.html         # single-page voting/results view
│   ├── app.js            # client logic (fetch poll, vote, poll results every 5s)
│   └── style.css
└── package.json
```

## How it works

- On first startup, the app seeds one poll ("What is your favourite sport?") with the 11 fixed options and generates a random poll ID, stored in SQLite. That ID stays the same across restarts (it's only created once).
- `GET /poll/:pollId` serves the voting page. That URL **is** the shareable link — anyone who opens it can vote, no login required.
- `GET /api/polls/:pollId` returns the poll question, options, vote counts, and percentages (used both for the initial page load and for live refresh).
- `POST /api/polls/:pollId/vote` records a vote (validates the poll and option exist), sets a `poll_voted_<id>` cookie, and returns the updated results.
- After voting (or if the cookie/localStorage flag shows you already have), the page shows a live results view — a simple bar list of vote counts and percentages — and polls the API every 5 seconds for updates.
- Errors are handled for: poll not found (404), missing/invalid `optionId` (400), voting twice (409).

## Running locally

**Requirements:** Node.js 18+ (tested on Node 22).

```bash
npm install
npm start
```

The server starts on `http://localhost:3000` (override with `PORT=xxxx npm start`). On startup it prints the shareable poll link, e.g.:

```
Sports poll app running at http://localhost:3000
Shareable poll link: http://localhost:3000/poll/8f3a1c2b9d4e
```

Visiting `http://localhost:3000/` also redirects to that link. Open it in multiple browsers/incognito windows to simulate different voters.

For auto-restart on file changes during development:

```bash
npm run dev
```

The SQLite database file lives at `db/poll.db` and is created automatically on first run — delete it to reset all votes and reseed the poll.

## Deployment

The app is a standard Node/Express server with a local SQLite file, so it deploys anywhere that runs Node.js with a **persistent filesystem** (SQLite needs a writable, non-ephemeral disk).

### Render

1. Push this repo to GitHub.
2. Create a new **Web Service** on [Render](https://render.com), connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add a **persistent disk** (Render dashboard → Disks) mounted at, e.g., `/opt/render/project/src/db`, and set an env var `DB_PATH=/opt/render/project/src/db/poll.db` so the SQLite file survives redeploys.

### Railway

1. Push this repo to GitHub, create a new project on [Railway](https://railway.app) from the repo.
2. Railway auto-detects Node and runs `npm install && npm start`.
3. Add a **Volume**, mount it (e.g. at `/data`), and set `DB_PATH=/data/poll.db` so votes persist across deploys.

### Vercel

Vercel's serverless functions use an **ephemeral filesystem**, so plain SQLite won't persist votes between requests reliably. If you want to deploy there, either:
- Use [Vercel's own Postgres/SQLite-compatible storage](https://vercel.com/docs/storage) instead of a local file, or
- Point `DB_PATH` at a mounted volume on a different host (Render/Railway/Fly.io are simpler for this app).

### Environment variables

| Variable  | Default              | Purpose                              |
|-----------|-----------------------|---------------------------------------|
| `PORT`    | `3000`                | Port the server listens on            |
| `DB_PATH` | `db/poll.db`          | Path to the SQLite database file      |

## Notes on scope

This is intentionally minimal: one fixed poll, in-memory-simple vote counting (no per-voter audit trail beyond the cookie), and basic duplicate-vote prevention that a user could bypass by clearing cookies/localStorage or using a different browser — that's an accepted tradeoff for a lightweight public poll, not a security feature.
