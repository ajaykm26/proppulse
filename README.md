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

For AI-powered features (like the PropPulse investment score), set:

```bash
# apps/backend/.env
OPENAI_API_KEY="sk-..."  # your OpenAI API key
```

If `OPENAI_API_KEY` is not set, the backend will fall back to a deterministic mock scorer so the `/api/properties/:id/score` endpoint still works in local/dev environments.

### 3. Set Up the Database

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
```

#### Seed sample data

The seed script inserts ~40 realistic properties across NYC metro + NJ (Jersey City, Hoboken, Newark, Manhattan, Brooklyn, Queens, Edison, Metuchen, Montclair). It is **idempotent** — re-running wipes and re-inserts the full dataset.

```bash
# Option A — via Prisma (recommended)
npx prisma db seed

# Option B — direct npm script (from apps/backend)
npm run seed
```

After seeding, try these searches in the UI:

- `Jersey City` — waterfront condos and investment properties
- `Brooklyn` — brownstones, Park Slope, Bed-Stuy, and more
- `condo` — free-text search across address and description
- `Edison, NJ` — suburban NJ homes and condos

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

### 6. Tests

There is currently no dedicated test runner, but the root `npm test` command is configured as a fast safety check:

```bash
npm test  # runs typecheck + lint across all workspaces
```

## PropPulse Score Endpoint

The PropPulse score endpoint generates an investment-focused score for a specific property, plus a short narrative and pros/cons list.

### Request

```bash
curl -X POST "http://localhost:3001/api/properties/<propertyId>/score" \
  -H "Content-Type: application/json"
```

### Response

```json
{
  "success": true,
  "data": {
    "score": 78,
    "summary": "Short narrative about the investment profile...",
    "pros": [
      "Strong rental demand in the submarket",
      "Balanced price-to-rent ratio"
    ],
    "cons": [
      "Limited value-add opportunities",
      "Returns sensitive to interest rate environment"
    ]
  }
}
```

On the frontend, the property detail page (`/properties/:id`) exposes a **PropPulse Score** section with a button that calls this endpoint and renders the score, summary, and pros/cons with loading/error states.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/search` | Search properties (Prisma-backed, supports city/state/zip/price/bed/bath/sqft/type filters) |
| GET | `/api/properties/:id` | Get property by ID |
| POST | `/api/properties/:id/score` | Generate a PropPulse investment score + AI narrative for a property |

## Frontend Pages

| Path | Description |
|------|-------------|
| `/` | Landing page with hero section |
| `/search` | Property search — calls real `/api/search`, renders result cards |
| `/properties/:id` | Property detail page — loads from `/api/properties/:id` |
| `/dashboard` | User dashboard (auth required) |

## Demo Search Queries

After seeding the database, try these in the search bar:

- `Jersey City` — waterfront condos, Journal Square, Newport
- `Hoboken, NJ` — luxury condos and townhouses
- `Brooklyn` — brownstones, Park Slope, Crown Heights
- `New York, NY` — condos across Manhattan neighborhoods
- `Newark` — multi-family and value plays in NJ
- `Edison, NJ` — suburban colonials and condos
- `Metuchen` — walkable NJ with transit access
- `condo` — free-text search across all property descriptions

## Contributing

This is an MVP foundation. PRs welcome — please open a branch and submit for review rather than pushing directly to `main`.
