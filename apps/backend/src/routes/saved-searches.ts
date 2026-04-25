import { FastifyInstance, FastifyRequest } from 'fastify';
import type { ApiResponse, CreateSavedSearchInput, SavedSearch, UpdateSavedSearchInput } from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

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
      if (!query || typeof query !== 'object') {
        return reply.status(400).send({ success: false, error: 'Query is required' });
      }

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const savedSearch = await prisma.savedSearch.create({
        data: {
          userId: appUser.id,
          name: name.trim(),
          query: query as object,
        },
      });

      return {
        success: true,
        data: mapSavedSearch(savedSearch),
      };
    },
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateSavedSearchInput }>(
    '/api/saved-searches/:id',
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
      if (name !== undefined && !name.trim()) {
        return reply.status(400).send({ success: false, error: 'Name cannot be empty' });
      }
      if (query !== undefined && (!query || typeof query !== 'object')) {
        return reply.status(400).send({ success: false, error: 'Query must be an object' });
      }
      if (name === undefined && query === undefined) {
        return reply.status(400).send({ success: false, error: 'Provide a name or query to update' });
      }

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const existing = await prisma.savedSearch.findFirst({
        where: { id: request.params.id, userId: appUser.id },
      });

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Saved search not found' });
      }

      const updated = await prisma.savedSearch.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(query !== undefined ? { query: query as object } : {}),
        },
      });

      return { success: true, data: mapSavedSearch(updated) };
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
