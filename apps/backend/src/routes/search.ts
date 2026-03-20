import { FastifyInstance, FastifyRequest } from 'fastify';
import type { SearchQuery, SearchResult, Property } from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';

/**
 * Search routes.
 * POST /api/search
 *
 * Accepts a SearchQuery and returns matching properties.
 * Implements a basic Prisma-backed search over the `Property` table.
 *
 * Notes:
 * - Focuses on structured filters (price/bed/bath/sqft/location/type/status)
 * - `query` is currently unused (reserved for future AI-powered parsing)
 * - Pagination is supported via `page` + `limit` (default 1 / 20)
 */
export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/search',
    async (request: FastifyRequest<{ Body: SearchQuery }>): Promise<SearchResult> => {
      const query = request.body;

      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const skip = (page - 1) * limit;

      // Build Prisma where clause from structured filters
      const where: Parameters<typeof prisma.property.findMany>[0]['where'] = {
        city: query.city ? { equals: query.city, mode: 'insensitive' } : undefined,
        state: query.state ? { equals: query.state, mode: 'insensitive' } : undefined,
        zipCode: query.zipCode ?? undefined,
        propertyType: query.propertyType ?? undefined,
        status: query.status ?? undefined,
        priceCents: {
          gte: query.minPriceCents ?? undefined,
          lte: query.maxPriceCents ?? undefined,
        },
        bedrooms: {
          gte: query.minBedrooms ?? undefined,
          lte: query.maxBedrooms ?? undefined,
        },
        bathrooms: {
          gte: query.minBathrooms ?? undefined,
        },
        sqft: {
          gte: query.minSqft ?? undefined,
          lte: query.maxSqft ?? undefined,
        },
      };

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

      const properties: Property[] = items.map((property) => ({
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
