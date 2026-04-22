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

> **Note:** If upgrading an existing database, run a new migration to add the `saved_properties` table:
> ```bash
> npx prisma migrate dev --name add-saved-properties
> ```

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

## Market Context & Comparables

The property detail page includes a **Market Context & Comparables** section that automatically loads comparable listings and a quick market snapshot for the current property.

### Endpoint

```bash
GET /api/properties/:id/comparables
```

Returns 404 if the property does not exist.  Otherwise returns up to **4 comparable properties** drawn from the same city and state, plus a summary object.

**Matching logic (two-pass):**

1. **Strict pass** — same `propertyType` and bedroom count within ±1, ranked by price proximity.
2. **Loose pass** — fills remaining slots from any same-city/state property, still ranked by price proximity.

**Example response:**

```json
{
  "success": true,
  "data": {
    "comparables": [
      {
        "id": "clx...",
        "address": "456 Park Ave",
        "city": "Jersey City",
        "state": "NJ",
        "zipCode": "07302",
        "priceCents": 72500000,
        "bedrooms": 2,
        "bathrooms": 2,
        "sqft": 1050,
        "propertyType": "condo",
        "status": "active",
        "matchLabel": "strong",
        "images": [],
        "listedAt": "2024-01-15T00:00:00.000Z",
        "updatedAt": "2024-01-15T00:00:00.000Z"
      }
    ],
    "summary": {
      "medianComparablePriceCents": 72500000,
      "averagePricePerSqft": 690,
      "activeComparableCount": 3,
      "priceVsMedianPct": 3.4
    }
  }
}
```

### Market Snapshot Metrics

| Metric | Description |
|--------|-------------|
| **Median Comp Price** | Median asking price across the returned comparables |
| **Avg $/sqft** | Average price-per-square-foot across comparables with known sqft |
| **Comparables Found** | Count of comparable properties returned (up to 4) |
| **vs. Median** | How the current property's price relates to the median comparable price (positive = above median, shown in red; negative = below, shown in green) |

### Frontend

On the property detail page (`/properties/:id`), the **Market Context & Comparables** card renders between the Investment Calculator and the PropPulse Score.  It shows:

- The four market-snapshot metrics above.
- A clickable row for each comparable property with address, price, bed/bath/sqft stats, and a match-quality badge (strong / moderate / nearby).  Each row links to that property's own detail page.
- Loading and error states if the backend is unavailable.

## Investment Calculator

The property detail page includes a client-side **Investment Calculator** that lets investors model returns without leaving the page. All calculations are entirely frontend — no backend call required.

### Scenario Presets

Three one-click presets instantly populate all key assumptions so you can compare scenarios at a glance:

| Preset | Down Payment | Rate | Vacancy | Maintenance | Rent |
|--------|-------------|------|---------|-------------|------|
| 🛡️ **Conservative** | 25% | 7.75% | 8% | 12% of rent | −5% |
| 📊 **Base Case** | 20% | 7.0% | 5% | 10% of rent | default |
| 🚀 **Aggressive** | 15% | 6.25% | 3% | 8% of rent | +5% |

Editing any input after applying a preset switches to "Custom" mode, preserving your changes.

### Inputs (all editable)

| Input | Default | Notes |
|-------|---------|-------|
| Purchase price | Property list price | Pre-filled from the listing |
| Down payment | 20% | Common conventional mortgage threshold |
| Interest rate | 7.0% | Approximate current market rate |
| Loan term | 30 years | Standard amortization |
| Monthly rent | ~0.5% of price | Rough rule-of-thumb for NYC metro |
| Vacancy | 5% | ≈ 18 days per year |
| Property tax | 1.2% / yr | Varies widely by municipality |
| Insurance | $150 / mo | Landlord policy estimate |
| Maintenance | 10% of rent | Ongoing repairs allowance |
| HOA | $0 / mo | Enter 0 if not applicable |

### Calculated Metrics

| Metric | Description |
|--------|-------------|
| **Loan Amount** | Purchase price minus down payment |
| **Monthly Mortgage** | Principal & interest (standard amortization) |
| **Estimated Monthly Expenses** | Tax + insurance + maintenance + HOA |
| **NOI (monthly / annual)** | Effective income minus operating expenses (excl. mortgage) |
| **Monthly Cash Flow** | NOI minus mortgage payment |
| **Cap Rate** | Annualised NOI ÷ purchase price |
| **Cash-on-Cash Return** | Annual cash flow ÷ cash invested (down payment) |
| **DSCR** | NOI ÷ monthly mortgage; ≥ 1.25 is typical lender floor |

### Sensitivity Analysis

An expandable **Sensitivity Analysis** grid shows projected monthly cash flow across a 5×5 matrix of rent and interest-rate variations centered on the current assumptions:

- **Rows**: rent at −10%, −5%, 0% (current), +5%, +10%
- **Columns**: interest rate at −1 pp, −0.5 pp, 0 (current), +0.5 pp, +1 pp

Cells are color-coded green (positive) through red (negative) so you can immediately see the range of outcomes and identify break-even thresholds. The current scenario cell is outlined for reference.

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/search` | — | Search properties (Prisma-backed, supports city/state/zip/price/bed/bath/sqft/type filters + sort) |
| GET | `/api/properties/:id` | — | Get property by ID |
| GET | `/api/properties/:id/comparables` | — | Get up to 4 comparable properties + market snapshot for a property |
| POST | `/api/properties/:id/score` | — | Generate a PropPulse investment score + AI narrative for a property |
| GET | `/api/saved-searches` | ✓ | List the signed-in user's saved searches |
| POST | `/api/saved-searches` | ✓ | Save the current search criteria to the dashboard |
| DELETE | `/api/saved-searches/:id` | ✓ | Delete one saved search |
| GET | `/api/saved-properties` | ✓ | List the signed-in user's saved (favorited) properties |
| POST | `/api/saved-properties` | ✓ | Save (favorite) a property — body: `{ propertyId }` |
| DELETE | `/api/saved-properties/:id` | ✓ | Remove a saved property by its saved-record ID |

## Frontend Pages

| Path | Description |
|------|-------------|
| `/` | Landing page with hero section |
| `/search` | Property search — calls real `/api/search`, renders result cards with heart toggle when signed in |
| `/properties/:id` | Property detail page — loads from `/api/properties/:id`, includes save/unsave button when signed in, an **Investment Calculator** with live return metrics, a **Market Context & Comparables** section, and a PropPulse Score |
| `/dashboard` | User dashboard (auth required) — Portfolio Snapshot metrics, Search Opportunity Pulse, saved properties, saved searches, and recent new-match previews from saved searches |

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

## Filters & Pagination

The search page (`/search`) supports advanced filters and pagination, all reflected in the URL so searches are shareable and bookmarkable.

### Using Filters

Click the **Filters** button below the search bar to expand the filter panel. Available filters:

| Filter | Description | Example |
|--------|-------------|---------|
| Min Price | Minimum listing price in USD | `500000` |
| Max Price | Maximum listing price in USD | `1500000` |
| Min Beds | Minimum number of bedrooms | `2` |
| Min Baths | Minimum number of bathrooms (supports half-baths) | `1.5` |
| Type | Property type | `house`, `condo`, `townhouse`, `multi-family`, `land`, `other` |
| Status | Listing status | `active`, `pending`, `sold`, `off-market` |

Click **Apply Filters** to run a new search with the selected criteria. The active filter indicator (✓) on the button shows when filters are in effect. Use **Clear filters** to reset all filter values.

### Saved Properties (Favorites)

When signed in, a heart icon appears on every property card in the search results. Clicking it saves or unsaves the property instantly. Saved properties also have a **Save / Saved** button on the detail page (`/properties/:id`).

All favorited properties appear in the **Saved Properties** section of `/dashboard`, showing a thumbnail, price, address, and specs. From there you can jump straight to a listing's detail page or remove it from favorites.

The backend stores saved properties in the `saved_properties` table with a unique `(userId, propertyId)` constraint, so duplicate saves are safely idempotent.

### Saved Searches

When signed in, the search page shows a **Save search** button that stores the current query + filters to the user's dashboard. Saved searches can be re-run later or deleted from `/dashboard`.

### Search Insights

When a search returns results, a compact **Search Insights** panel appears above the property grid. It computes four metrics client-side from the current page of results — no backend changes required:

| Metric | Description |
|--------|-------------|
| **Median Price** | Median listing price of properties on the current page |
| **Avg $/sqft** | Average price-per-square-foot across listings with known sqft |
| **Newest Listing** | Date of the most recently listed property on this page |
| **Listing Mix** | Dominant property type and its share of current-page results |

A plain-English summary sentence beneath the cards helps investors and homebuyers quickly interpret the result set — noting price anchors, listing volume, and demand signals like the share of listings already under contract.

### Dashboard Intelligence Panels

The dashboard now provides three layers of intelligence on top of saved data:

#### Portfolio Snapshot

A four-metric card row computed client-side from saved properties:

- **Total Portfolio Value** — sum of all saved property prices
- **Median Price** — middle price across saved properties (sorted ascending)
- **Top City** — the city with the most saved properties, plus a count of unique cities
- **Avg $/sqft** — average price per square foot for saved properties that have sqft data

A plain-English insight sentence beneath the cards summarises the portfolio in one line (city spread, median price, price-per-sqft). All calculations are client-side — no additional backend endpoints.

#### Search Opportunity Pulse

A compact panel that surfaces which saved search is most active:

- **Total Fresh Matches** — de-duplicated count of new listings across all saved searches
- **Hottest Search** — the saved search with the most fresh (unseen) matches, with a direct link to run it

#### Dashboard Match Previews

The dashboard turns saved searches into a lightweight alerting surface:

- **New Matches** counts listings whose `listedAt` date is newer than when the search was saved
- The count is **de-duplicated across saved searches** so the same property is not double-counted
- Already-favorited properties are excluded from the headline **New Matches** number
- A **Recent Matches** section previews fresh listings grouped by saved search and links directly to the property detail page or full search results
- **Sort order is persisted** with each saved search — re-running it from the dashboard restores the original sort in the URL, and the dashboard match-preview fetches honour it too
- Where a non-default sort was saved, a **"Sorted by: …"** label is shown on both the Recent Matches and Saved Searches cards so users know what ordering to expect

All three panels are built on top of the existing `/api/search` and saved-data endpoints — no extra schema or background jobs required.

### URL-Synced State

All search parameters are stored in the URL query string, making searches shareable. For example:

```
/search?q=Jersey+City&minPrice=400000&maxPrice=900000&minBeds=2&type=condo&status=active
```

Parameters:

| URL param | Description |
|-----------|-------------|
| `q` | Free-text search or location (e.g. `Brooklyn`, `Edison, NJ`) |
| `minPrice` | Minimum price in USD dollars |
| `maxPrice` | Maximum price in USD dollars |
| `minBeds` | Minimum bedrooms |
| `minBaths` | Minimum bathrooms |
| `type` | Property type |
| `status` | Listing status |
| `sort` | Sort order (see below) |
| `page` | Current page number |

### Sorting

When results are displayed, a **Sort by** dropdown appears to the right of the result count. Changing the sort option resets to page 1 and re-fetches results.

| Sort option | URL value | Behaviour |
|-------------|-----------|-----------|
| Best match (default) | *(omitted)* | Relevance-ranked — see below |
| Newest | `sort=newest` | Newest listings first |
| Price: Low to High | `sort=price-asc` | Cheapest listings first |
| Price: High to Low | `sort=price-desc` | Most expensive listings first |

The `sort` parameter is preserved across filter changes and page navigation.

#### How Best Match Works

When no explicit sort is chosen (or `sort=best-match`), the API fetches up to **500 matching candidates** from the database and ranks them in-process using a deterministic relevance score. Each property earns points across several dimensions:

| Signal | Max pts | Notes |
|--------|---------|-------|
| Listing status | 20 | Active = 20, Pending = 8, others = 0 |
| Recency | 15 | Decays linearly to 0 at 90 days since listing |
| Keyword in address | 15 | Free-text query present in address string |
| Keyword in city / zip | 12 ea | Free-text query matches city or zip code |
| Keyword in AI summary | 8 | Free-text query found in `aiSummary` |
| Keyword in state | 5 | Free-text query matches state abbreviation |
| Structured city match | 10 | Parsed city equals property city |
| Structured zip match | 15 | Parsed zip code matches exactly |
| Structured state match | 5 | Parsed state matches |
| Price-range proximity | 10 | Distance from the midpoint of requested price range |

Results within the same score are broken by `listedAt` descending. The candidate-pool cap (500) means best-match pagination is accurate for any filter set returning ≤ 500 properties; if a filter regularly produces larger sets, the top pages are still well-ranked but deep pages may not see every possible result — a trade-off documented in the source code.

### Pagination

When a search returns more than 20 results, **Previous** / **Next** buttons and a page indicator appear below the results grid. The `page` parameter is also reflected in the URL (e.g. `?q=Brooklyn&page=2`).

## Contributing

This is an MVP foundation. PRs welcome — please open a branch and submit for review rather than pushing directly to `main`.
