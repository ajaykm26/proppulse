import { FastifyInstance, FastifyRequest } from 'fastify';
import type {
  ApiResponse,
  ComparableProperty,
  ComparablesSummary,
  ComparablesResult,
} from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';

/**
 * Comparables routes.
 * GET /api/properties/:id/comparables
 *
 * Returns up to 4 comparable properties for the given property, along with a
 * market-snapshot summary object.
 *
 * Matching strategy (two-pass):
 *   Pass 1 — strict: same city + state + propertyType, |beds − subjectBeds| ≤ 1
 *   Pass 2 — loose:  same city + state only (fills up to MAX_COMPARABLES)
 *
 * Within each pass, candidates are ranked by price proximity to the subject.
 * The current property is always excluded from results.
 */

const MAX_COMPARABLES = 4;

/** Map a raw Prisma property row to the shared ComparableProperty type. */
function toComparable(
  row: {
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
  },
  matchLabel: string,
): ComparableProperty {
  return {
    id: row.id,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    priceCents: row.priceCents,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    sqft: row.sqft,
    propertyType: row.propertyType as ComparableProperty['propertyType'],
    status: row.status as ComparableProperty['status'],
    images: row.images,
    aiSummary: row.aiSummary ?? undefined,
    listedAt: row.listedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    matchLabel,
  };
}

/** Compute the median value of a numeric array.  Returns 0 for empty arrays. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export async function comparablesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/properties/:id/comparables',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ): Promise<ApiResponse<ComparablesResult>> => {
      const { id } = request.params;

      // ------------------------------------------------------------------
      // 1. Load the subject property — 404 if missing
      // ------------------------------------------------------------------
      const subject = await prisma.property.findUnique({ where: { id } });

      if (!subject) {
        return reply.status(404).send({
          success: false,
          error: `Property with id "${id}" not found`,
        });
      }

      // ------------------------------------------------------------------
      // 2. Fetch a broad candidate pool (same city + state, excluding self)
      //    We fetch more than we need so we can sort/filter in JS without
      //    multiple round-trips.
      // ------------------------------------------------------------------
      const candidates = await prisma.property.findMany({
        where: {
          id: { not: subject.id },
          city: subject.city,
          state: subject.state,
        },
        // Fetch up to 100 candidates for ranking; avoids full-table scan
        take: 100,
      });

      // ------------------------------------------------------------------
      // 3. Sort candidates by price proximity (ascending absolute delta)
      // ------------------------------------------------------------------
      const byPriceProximity = [...candidates].sort(
        (a, b) =>
          Math.abs(a.priceCents - subject.priceCents) -
          Math.abs(b.priceCents - subject.priceCents),
      );

      // ------------------------------------------------------------------
      // 4. Pass 1 — strict: same propertyType AND beds within ±1
      // ------------------------------------------------------------------
      const strict = byPriceProximity.filter(
        (c) =>
          c.propertyType === subject.propertyType &&
          Math.abs(c.bedrooms - subject.bedrooms) <= 1,
      );

      // ------------------------------------------------------------------
      // 5. Pass 2 — loose: fill remaining slots from price-sorted pool,
      //    excluding properties already selected in pass 1.
      // ------------------------------------------------------------------
      const strictIds = new Set(strict.map((c) => c.id));
      const loose = byPriceProximity.filter((c) => !strictIds.has(c.id));

      // Merge: up to MAX_COMPARABLES from strict first, then fill with loose
      const selected: ComparableProperty[] = [];

      for (const row of strict) {
        if (selected.length >= MAX_COMPARABLES) break;
        selected.push(toComparable(row, 'strong'));
      }
      for (const row of loose) {
        if (selected.length >= MAX_COMPARABLES) break;
        // Label based on property-type or bedroom similarity
        const sameType = row.propertyType === subject.propertyType;
        const sameBeds = Math.abs(row.bedrooms - subject.bedrooms) <= 1;
        const label = sameType || sameBeds ? 'moderate' : 'nearby';
        selected.push(toComparable(row, label));
      }

      // ------------------------------------------------------------------
      // 6. Compute market-snapshot summary
      // ------------------------------------------------------------------
      const prices = selected.map((c) => c.priceCents);
      const medianPrice = median(prices);

      // Average price-per-sqft (ignore entries with sqft === 0)
      const withSqft = selected.filter((c) => c.sqft > 0);
      const averagePricePerSqft =
        withSqft.length > 0
          ? Math.round(
              withSqft.reduce((sum, c) => sum + c.priceCents / c.sqft, 0) /
                withSqft.length /
                100, // convert cents/sqft → dollars/sqft
            )
          : 0;

      // priceVsMedianPct: how the subject's price compares to the median comp
      const priceVsMedianPct =
        medianPrice > 0
          ? Math.round(
              ((subject.priceCents - medianPrice) / medianPrice) * 100 * 10,
            ) / 10 // one decimal place
          : 0;

      const summary: ComparablesSummary = {
        medianComparablePriceCents: medianPrice,
        averagePricePerSqft,
        activeComparableCount: selected.length,
        priceVsMedianPct,
      };

      return {
        success: true,
        data: { comparables: selected, summary },
      };
    },
  );
}
