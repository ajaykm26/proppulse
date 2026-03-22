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
 */
export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/search',
    async (request: FastifyRequest<{ Body: SearchQuery }>): Promise<SearchResult> => {
      const query = request.body;

      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const skip = (page - 1) * limit;

      // Structured location/attribute filters
      const structuredFilter = {
        city: query.city ? { equals: query.city, mode: 'insensitive' as const } : undefined,
        state: query.state ? { equals: query.state, mode: 'insensitive' as const } : undefined,
        zipCode: query.zipCode ?? undefined,
        propertyType: query.propertyType ?? undefined,
        status: query.status ?? undefined,
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
                { address: { contains: query.query, mode: 'insensitive' as const } },
                { city: { contains: query.query, mode: 'insensitive' as const } },
                { state: { contains: query.query, mode: 'insensitive' as const } },
                { zipCode: { contains: query.query, mode: 'insensitive' as const } },
                { aiSummary: { contains: query.query, mode: 'insensitive' as const } },
              ],
            }
          : null;

      const where = textFilter ? { AND: [structuredFilter, textFilter] } : structuredFilter;

      fastify.log.info({ query, where, page, limit }, 'Search request received');

      const [items, total] = await Promise.all([
        prisma.property.findMany({
          where,
          skip,
          take: limit,
          orderBy: { listedAt: 'desc' },
        }),
        prisma.property.count({ where }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties: Property[] = items.map((property: any) => ({
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        priceCents: property.priceCents,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        propertyType: property.propertyType as Property['propertyType'],
        status: property.status as Property['status'],
        images: property.images,
        aiSummary: property.aiSummary ?? undefined,
        listedAt: property.listedAt.toISOString(),
        updatedAt: property.updatedAt.toISOString(),
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
