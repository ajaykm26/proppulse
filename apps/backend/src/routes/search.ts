import { FastifyInstance, FastifyRequest } from 'fastify';
import type { SearchQuery, SearchResult } from '@proppulse/shared';

/**
 * Search routes.
 * POST /api/search
 *
 * Accepts a SearchQuery and returns matching properties.
 * Currently a stub — returns an empty result set.
 *
 * TODO:
 * - Query the database via Prisma
 * - Add AI-powered natural language query parsing (OpenAI)
 * - Add Redis caching for repeated queries
 */
export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/search',
    async (request: FastifyRequest<{ Body: SearchQuery }>, _reply): Promise<SearchResult> => {
      const query = request.body;

      fastify.log.info({ query }, 'Search request received');

      // TODO: implement real search logic
      // For now, return an empty result set
      return {
        properties: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        totalPages: 0,
        aiInsight: undefined,
      };
    },
  );
}
