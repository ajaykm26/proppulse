# PropPulse 🏠

> **AI-powered real estate intelligence** — find, analyze, and track properties with the power of AI.

## Overview

PropPulse is a monorepo containing the full-stack web application for AI-driven real estate intelligence. It helps users search properties, get AI-generated insights, and track their saved searches — all in one place.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Fastify + TypeScript |
| Auth | Clerk (frontend + backend JWT verification) |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis (ioredis) |
| AI | OpenAI SDK |
| CI | GitHub Actions |

## Monorepo Structure

```
proppulse/
├── apps/
│   ├── frontend/          # React + Vite SPA
│   └── backend/           # Fastify API server
├── packages/
│   └── shared/            # Shared TypeScript types & utils
├── .github/
│   └── workflows/
│       └── ci.yml         # CI pipeline
├── .env.example           # Environment variable template
└── package.json           # Workspace root
```

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL running locally (or connection string)
- Redis running locally (or connection string)
- [Clerk](https://clerk.dev) account
- OpenAI API key

### 1. Clone & Install

```bash
git clone <repo-url>
cd proppulse
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and fill in your values
```

Also copy `apps/backend/.env.example` → `apps/backend/.env`.

### 3. Set Up the Database

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed   # Seeds 4 sample properties in the NJ/NY area
```

### 4. Run Locally

In separate terminals:

```bash
# Terminal 1 — Backend API (http://localhost:3001)
npm run dev:backend

# Terminal 2 — Frontend (http://localhost:5173)
npm run dev:frontend
```

### 5. Typecheck & Lint

```bash
npm run typecheck
npm run lint
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/search` | Search properties (Prisma-backed, supports city/state/zip/price/bed/bath/sqft/type filters) |
| GET | `/api/properties/:id` | Get property by ID |

## Frontend Pages

| Path | Description |
|------|-------------|
| `/` | Landing page with hero section |
| `/search` | Property search — calls real `/api/search`, renders result cards |
| `/properties/:id` | Property detail page — loads from `/api/properties/:id` |
| `/dashboard` | User dashboard (auth required) |

## Demo Search Queries

After seeding the database, try these in the search bar:

- `Edison, NJ` — returns the Edison colonial
- `Jersey City` — returns the Jersey City condo
- `New York, NY` — returns the Midtown condo
- `Metuchen` — returns the Metuchen house

## Contributing

This is an MVP foundation. PRs welcome — please open a branch and submit for review rather than pushing directly to `main`.
