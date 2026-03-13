# PropPulse — Scaffold Summary

Generated: 2026-03-13

## What Was Created

### Root
| File | Purpose |
|------|---------|
| `package.json` | npm workspaces root — ties together `apps/*` and `packages/*` |
| `.gitignore` | Standard Node/TS/Prisma ignores |
| `.env.example` | Root-level env var template |
| `README.md` | Project overview, stack table, and local dev instructions |
| `.github/workflows/ci.yml` | GitHub Actions CI: typecheck + lint on push/PR to main |

### packages/shared
| File | Purpose |
|------|---------|
| `package.json` | Package config — name `@proppulse/shared` |
| `tsconfig.json` | TypeScript config |
| `src/types.ts` | Shared types: `Property`, `PropertyType`, `PropertyStatus`, `SearchQuery`, `SearchResult`, `ApiResponse<T>` |
| `src/index.ts` | Re-exports everything from `types.ts` |

### apps/backend
| File | Purpose |
|------|---------|
| `package.json` | Dependencies: Fastify, Prisma, OpenAI, ioredis, Clerk backend, dotenv |
| `tsconfig.json` | TypeScript config with path alias for `@proppulse/shared` |
| `.env.example` | All required backend env vars documented |
| `prisma/schema.prisma` | Prisma schema with `User`, `Property`, `SavedSearch` models |
| `src/index.ts` | Fastify server entry point — registers plugins and routes |
| `src/lib/prisma.ts` | Singleton Prisma client |
| `src/lib/redis.ts` | ioredis client with reconnect strategy |
| `src/lib/openai.ts` | OpenAI SDK client (initialized, not yet wired to routes) |
| `src/middleware/auth.ts` | Clerk JWT verification middleware stub + `requireAuth` hook |
| `src/routes/health.ts` | `GET /health` — returns server status |
| `src/routes/search.ts` | `POST /api/search` — stub returning empty results |
| `src/routes/properties.ts` | `GET /api/properties/:id` — queries Prisma, returns property or 404 |

### apps/frontend
| File | Purpose |
|------|---------|
| `package.json` | Dependencies: React, Vite, Tailwind, Clerk React, react-router-dom |
| `tsconfig.json` | TypeScript config for Vite/browser |
| `tsconfig.node.json` | TypeScript config for vite.config.ts |
| `vite.config.ts` | Vite config with React plugin, path alias, and API proxy |
| `tailwind.config.js` | Tailwind config with content paths and PropPulse brand colors |
| `postcss.config.js` | PostCSS config for Tailwind + Autoprefixer |
| `index.html` | HTML entry with Inter font |
| `.env.example` | Frontend env vars (Clerk publishable key) |
| `src/main.tsx` | React entry — wraps app in `ClerkProvider` |
| `src/index.css` | Tailwind directives + base body styles |
| `src/App.tsx` | Root component with `BrowserRouter` and route definitions |
| `src/components/Nav.tsx` | Sticky top nav with links and Clerk auth buttons |
| `src/components/SearchBar.tsx` | Reusable search input + submit button |
| `src/pages/HomePage.tsx` | Landing page: hero with tagline, search bar, feature cards |
| `src/pages/SearchPage.tsx` | Search results page with search bar (stub results) |
| `src/pages/DashboardPage.tsx` | Authenticated dashboard (redirects to sign-in if not authed) |

## Architecture Notes

- **Monorepo:** npm workspaces — no build step needed for `@proppulse/shared`; both apps reference its TypeScript source directly via path aliases.
- **Auth:** Clerk handles all auth. Backend has a `requireAuth` middleware stub ready to wire up with `@clerk/backend`'s `verifyToken`. Frontend wraps the app in `ClerkProvider`.
- **Database:** Prisma schema is defined. Run `npx prisma migrate dev --name init` in `apps/backend` to create the DB.
- **AI:** OpenAI client is initialized in `src/lib/openai.ts`. Not yet connected to routes — intentional for MVP.
- **Redis:** ioredis client initialized with a retry strategy. Ready to use for caching.

## Next Steps (Not Built Yet)

1. Implement real property search in `POST /api/search` (Prisma query + optional AI query parsing)
2. Seed the database with sample properties
3. Wire up OpenAI for natural language search parsing and property summaries
4. Build property card UI components
5. Add filter panel to the search page
6. Implement saved searches (frontend + backend)
7. Add proper Clerk JWT verification in `requireAuth` middleware
8. Add Redis caching for search results
