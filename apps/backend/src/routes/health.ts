import { FastifyInstance } from 'fastify';

/**
 * Health check route.
 * GET /health
 *
 * Returns the server status and basic metadata.
 * Useful for load balancers and uptime monitors.
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  });
}
