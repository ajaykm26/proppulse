import { FastifyInstance, FastifyRequest } from 'fastify';
import type { SearchQuery, SearchResult, Property } from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';

/**
 * Search routes.
 * POST /api/search
 *
 * Accepts a SearchQuery and returns matching properties.
 * Implements a Prisma-backed search over the `Property` table.
 *
 * Filter priority:
 * - Structured filters (city/state/zip/price/bed/bath/sqft/type/status) are always applied.
 * - When `query` is provided AND no structured location filter (city/state/zip) is set,
 *   a free-text OR search runs across address, city, state, zipCode, and aiSummary using
 *   case-insensitive LIKE (Prisma's `contains` + mode: 'insensitive').
 * - Pagination via `page` + `limit` (default page 1, default limit 20, max 100).
 *
 * Sorting:
 * - best-match (default/omitted): in-memory relevance score — see bestMatchScore()
 * - newest: listedAt desc (DB-level, no candidate pool)
 * - price-asc / price-desc: priceCents asc/desc (DB-level, no candidate pool)
 */

// ---------------------------------------------------------------------------
// Best-match candidate pool
// ---------------------------------------------------------------------------

/**
 * Maximum rows fetched from the DB when computing best-match relevance.
 *
 * Trade-off: fetching a larger pool improves ranking accuracy (the truly
 * best-matching property across all filtered results is never missed) but
 * costs more DB I/O and in-process memory.  For PropPulse's typical filter
 * result sets (hundreds to low-thousands of properties) 500 rows is plenty
 * while staying comfortably fast.  If a deployment consistently returns
 * filtered sets much larger than this, consider moving the scoring to a
 * Postgres computed column or a full-text index instead.
 */
const BEST_MATCH_POOL_SIZE = 500;

// ---------------------------------------------------------------------------
// Relevance scoring
// ---------------------------------------------------------------------------

type DbProperty = {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  priceCents: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  status: string;
  images: string[];
  aiSummary: string | null;
  listedAt: Date;
  updatedAt: Date;
};

/**
 * Compute a relevance score for a single property relative to a search query.
 * Higher scores bubble up first.  Factors and their max contribution:
 *
 *   Status (active/pending priority)          0 – 20 pts
 *   Recency (linear decay over 90 days)       0 – 15 pts
 *   Free-text keyword in address              0 – 15 pts
 *   Free-text keyword in city / zipCode       0 – 12 pts each
 *   Free-text keyword in aiSummary            0 –  8 pts
 *   Free-text keyword in state                0 –  5 pts
 *   Structured city exact match               0 – 10 pts
 *   Structured zip exact match                0 – 15 pts
 *   Structured state match                    0 –  5 pts
 *   Price proximity to requested range mid    0 – 10 pts
 */
function bestMatchScore(property: DbProperty, query: SearchQuery): number {
  let score = 0;

  // --- Status: active listings are most actionable ---
  if (property.status === 'active') score += 20;
  else if (property.status === 'pending') score += 8;

  // --- Recency: decays linearly to 0 at 90 days ---
  const ageDays = (Date.now() - property.listedAt.getTime()) / 86_400_000;
  score += Math.max(0, Math.round(15 * (1 - ageDays / 90)));

  // --- Free-text keyword matches ---
  if (query.query) {
    const needle = query.query.toLowerCase();
    if (property.address.toLowerCase().includes(needle)) score += 15;
    if (property.city.toLowerCase().includes(needle))    score += 12;
    if (property.zipCode.toLowerCase().includes(needle)) score += 12;
    if (property.aiSummary?.toLowerCase().includes(needle)) score += 8;
    if (property.state.toLowerCase().includes(needle))   score += 5;
  }

  // --- Structured location precision bonus ---
  // Applies when the frontend has already parsed city/state/zip out of the
  // raw query string.  All results have already passed the filter, so this
  // is a tie-breaker when the filter is broad (e.g. state-only).
  if (query.city && property.city.toLowerCase() === query.city.toLowerCase())  score += 10;
  if (query.zipCode && property.zipCode === query.zipCode)                      score += 15;
  if (query.state && property.state.toLowerCase() === query.state.toLowerCase()) score += 5;

  // --- Price proximity to the midpoint of the requested range ---
  if (query.minPriceCents != null && query.maxPriceCents != null) {
    const mid      = (query.minPriceCents + query.maxPriceCents) / 2;
    const halfRange = (query.maxPriceCents - query.minPriceCents) / 2;
    if (halfRange > 0) {
      const proximity = 1 - Math.min(1, Math.abs(property.priceCents - mid) / halfRange);
      score += Math.round(proximity * 10);
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/search',
    async (request: FastifyRequest<{ Body: SearchQuery }>): Promise<SearchResult> => {
      const query = request.body;

      const page  = Math.max(1, query.page  ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const skip  = (page - 1) * limit;

      // Structured location/attribute filters
      const structuredFilter = {
        city:         query.city     ? { equals: query.city,  mode: 'insensitive' as const } : undefined,
        state:        query.state    ? { equals: query.state, mode: 'insensitive' as const } : undefined,
        zipCode:      query.zipCode  ?? undefined,
        propertyType: query.propertyType ?? undefined,
        status:       query.status   ?? undefined,
        ...(query.minPriceCents != null || query.maxPriceCents != null
          ? { priceCents: { gte: query.minPriceCents ?? undefined, lte: query.maxPriceCents ?? undefined } }
          : {}),
        ...(query.minBedrooms != null || query.maxBedrooms != null
          ? { bedrooms: { gte: query.minBedrooms ?? undefined, lte: query.maxBedrooms ?? undefined } }
          : {}),
        ...(query.minBathrooms != null ? { bathrooms: { gte: query.minBathrooms } } : {}),
        ...(query.minSqft != null || query.maxSqft != null
          ? { sqft: { gte: query.minSqft ?? undefined, lte: query.maxSqft ?? undefined } }
          : {}),
      };

      // Free-text search: apply when `query` string is set but no location filters are provided.
      // Uses case-insensitive LIKE across address, city, state, zipCode, and aiSummary.
      const hasLocationFilter = !!query.city || !!query.state || !!query.zipCode;
      const textFilter =
        query.query && !hasLocationFilter
          ? {
              OR: [
                { address:   { contains: query.query, mode: 'insensitive' as const } },
                { city:      { contains: query.query, mode: 'insensitive' as const } },
                { state:     { contains: query.query, mode: 'insensitive' as const } },
                { zipCode:   { contains: query.query, mode: 'insensitive' as const } },
                { aiSummary: { contains: query.query, mode: 'insensitive' as const } },
              ],
            }
          : null;

      const where = textFilter ? { AND: [structuredFilter, textFilter] } : structuredFilter;

      fastify.log.info({ query, where, page, limit, sort: query.sort }, 'Search request received');

      const isBestMatch = !query.sort || query.sort === 'best-match';

      let items: DbProperty[];
      let total: number;

      if (isBestMatch) {
        // Best-match path: fetch the candidate pool, score in-memory, paginate.
        [items, total] = await Promise.all([
          prisma.property.findMany({
            where,
            take: BEST_MATCH_POOL_SIZE,
            // Stable base order so pagination is deterministic within a score tier
            orderBy: { listedAt: 'desc' },
          }) as Promise<DbProperty[]>,
          prisma.property.count({ where }),
        ]);

        // Sort by descending relevance score, then by listedAt desc as tiebreaker
        items.sort((a, b) => {
          const diff = bestMatchScore(b, query) - bestMatchScore(a, query);
          if (diff !== 0) return diff;
          return b.listedAt.getTime() - a.listedAt.getTime();
        });

        // Slice to the requested page
        items = items.slice(skip, skip + limit);
      } else {
        // Explicit sort: delegate ordering entirely to Prisma with DB-level pagination
        type ExplicitOrderBy = { listedAt: 'asc' | 'desc' } | { priceCents: 'asc' | 'desc' };
        const orderBy: ExplicitOrderBy = (() => {
          switch (query.sort) {
            case 'price-asc':  return { priceCents: 'asc'  as const };
            case 'price-desc': return { priceCents: 'desc' as const };
            case 'newest':
            default:           return { listedAt:   'desc' as const };
          }
        })();

        [items, total] = await Promise.all([
          prisma.property.findMany({ where, skip, take: limit, orderBy }) as Promise<DbProperty[]>,
          prisma.property.count({ where }),
        ]);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: Property[] = items.map((property: any) => ({
        id:           property.id,
        address:      property.address,
        city:         property.city,
        state:        property.state,
        zipCode:      property.zipCode,
        priceCents:   property.priceCents,
        bedrooms:     property.bedrooms,
        bathrooms:    property.bathrooms,
        sqft:         property.sqft,
        propertyType: property.propertyType as Property['propertyType'],
        status:       property.status       as Property['status'],
        images:       property.images,
        aiSummary:    property.aiSummary ?? undefined,
        listedAt:     property.listedAt.toISOString(),
        updatedAt:    property.updatedAt.toISOString(),
      }));

      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

      return {
        properties,
        total,
        page,
        limit,
        totalPages,
        aiInsight: undefined,
      };
    },
  );
}
