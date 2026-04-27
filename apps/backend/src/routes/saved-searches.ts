import { FastifyInstance, FastifyRequest } from 'fastify';
import type { ApiResponse, CreateSavedSearchInput, SavedSearch, SearchQuery } from '@proppulse/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Normalizes a SearchQuery to a Prisma-compatible JSON value by picking only
 * the known fields, excluding any extraneous keys that could violate the
 * expected shape or introduce injection of unexpected data.
 */
function toSearchQueryJson(q: SearchQuery): Prisma.InputJsonValue {
  const result: Record<string, Prisma.InputJsonValue> = {};

  if (typeof q.query === 'string' && q.query.trim()) result.query = q.query.trim();
  if (typeof q.city === 'string' && q.city.trim()) result.city = q.city.trim();
  if (typeof q.state === 'string' && q.state.trim()) result.state = q.state.trim();
  if (typeof q.zipCode === 'string' && q.zipCode.trim()) result.zipCode = q.zipCode.trim();
  if (typeof q.minPriceCents === 'number' && Number.isFinite(q.minPriceCents)) result.minPriceCents = q.minPriceCents;
  if (typeof q.maxPriceCents === 'number' && Number.isFinite(q.maxPriceCents)) result.maxPriceCents = q.maxPriceCents;
  if (typeof q.minBedrooms === 'number' && Number.isFinite(q.minBedrooms)) result.minBedrooms = q.minBedrooms;
  if (typeof q.maxBedrooms === 'number' && Number.isFinite(q.maxBedrooms)) result.maxBedrooms = q.maxBedrooms;
  if (typeof q.minBathrooms === 'number' && Number.isFinite(q.minBathrooms)) result.minBathrooms = q.minBathrooms;
  if (typeof q.minSqft === 'number' && Number.isFinite(q.minSqft)) result.minSqft = q.minSqft;
  if (typeof q.maxSqft === 'number' && Number.isFinite(q.maxSqft)) result.maxSqft = q.maxSqft;
  if (typeof q.propertyType === 'string' && q.propertyType.trim()) result.propertyType = q.propertyType;
  if (typeof q.status === 'string' && q.status.trim()) result.status = q.status;
  if (typeof q.page === 'number' && Number.isFinite(q.page)) result.page = q.page;
  if (typeof q.limit === 'number' && Number.isFinite(q.limit)) result.limit = q.limit;
  if (typeof q.sort === 'string' && q.sort.trim()) result.sort = q.sort;

  return result;
}

function normalizeSearchQuery(input: unknown): SearchQuery | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const query = input as Record<string, unknown>;
  const normalized: SearchQuery = {};

  if (typeof query.query === 'string' && query.query.trim()) normalized.query = query.query.trim();
  if (typeof query.city === 'string' && query.city.trim()) normalized.city = query.city.trim();
  if (typeof query.state === 'string' && query.state.trim()) normalized.state = query.state.trim();
  if (typeof query.zipCode === 'string' && query.zipCode.trim()) normalized.zipCode = query.zipCode.trim();
  if (typeof query.minPriceCents === 'number' && Number.isFinite(query.minPriceCents)) normalized.minPriceCents = query.minPriceCents;
  if (typeof query.maxPriceCents === 'number' && Number.isFinite(query.maxPriceCents)) normalized.maxPriceCents = query.maxPriceCents;
  if (typeof query.minBedrooms === 'number' && Number.isFinite(query.minBedrooms)) normalized.minBedrooms = query.minBedrooms;
  if (typeof query.maxBedrooms === 'number' && Number.isFinite(query.maxBedrooms)) normalized.maxBedrooms = query.maxBedrooms;
  if (typeof query.minBathrooms === 'number' && Number.isFinite(query.minBathrooms)) normalized.minBathrooms = query.minBathrooms;
  if (typeof query.minSqft === 'number' && Number.isFinite(query.minSqft)) normalized.minSqft = query.minSqft;
  if (typeof query.maxSqft === 'number' && Number.isFinite(query.maxSqft)) normalized.maxSqft = query.maxSqft;
  if (query.propertyType === 'house' || query.propertyType === 'condo' || query.propertyType === 'townhouse' || query.propertyType === 'multi-family' || query.propertyType === 'land' || query.propertyType === 'other') normalized.propertyType = query.propertyType;
  if (query.status === 'active' || query.status === 'pending' || query.status === 'sold' || query.status === 'off-market') normalized.status = query.status;
  if (typeof query.page === 'number' && Number.isFinite(query.page)) normalized.page = query.page;
  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) normalized.limit = query.limit;
  if (query.sort === 'best-match' || query.sort === 'newest' || query.sort === 'price-asc' || query.sort === 'price-desc') normalized.sort = query.sort;

  return normalized;
}

function mapSavedSearch(record: {
  id: string;
  name: string;
  query: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SavedSearch {
  return {
    id: record.id,
    name: record.name,
    query: record.query as SavedSearch['query'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function getOrCreateUser(clerkId: string, email?: string) {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      clerkId,
      email: email ?? `${clerkId}@placeholder.proppulse.local`,
    },
  });
}

export async function savedSearchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/saved-searches',
    { preHandler: requireAuth },
    async (request: FastifyRequest): Promise<ApiResponse<SavedSearch[]>> => {
      const user = request.user;
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const searches = await prisma.savedSearch.findMany({
        where: { userId: appUser.id },
        orderBy: { updatedAt: 'desc' },
      });

      return {
        success: true,
        data: searches.map(mapSavedSearch),
      };
    },
  );

  fastify.post<{ Body: CreateSavedSearchInput }>(
    '/api/saved-searches',
    { preHandler: requireAuth },
    async (
      request,
      reply,
    ): Promise<ApiResponse<SavedSearch>> => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const { name, query } = request.body ?? {};
      if (!name?.trim()) {
        return reply.status(400).send({ success: false, error: 'Name is required' });
      }

      const normalizedQuery = normalizeSearchQuery(query);
      if (!normalizedQuery) {
        return reply.status(400).send({ success: false, error: 'Query is required' });
      }

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const savedSearch = await prisma.savedSearch.create({
        data: {
          userId: appUser.id,
          name: name.trim(),
          query: toSearchQueryJson(normalizedQuery),
        },
      });

      return {
        success: true,
        data: mapSavedSearch(savedSearch),
      };
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/saved-searches/:id',
    { preHandler: requireAuth },
    async (
      request,
      reply,
    ): Promise<ApiResponse<{ id: string }>> => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const existing = await prisma.savedSearch.findFirst({
        where: { id: request.params.id, userId: appUser.id },
      });

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Saved search not found' });
      }

      await prisma.savedSearch.delete({ where: { id: existing.id } });
      return { success: true, data: { id: existing.id } };
    },
  );
}
