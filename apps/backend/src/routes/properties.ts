import { FastifyInstance, FastifyRequest } from 'fastify';
import type { Property } from '@proppulse/shared';
import type { ApiResponse } from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';

/**
 * Property routes.
 * GET /api/properties/:id
 *
 * Returns a single property by ID.
 * Currently a stub — returns a 404 until the DB is seeded.
 *
 * TODO:
 * - Add seed data / import from external listing sources
 * - Add AI summary generation on-demand
 */
export async function propertyRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/properties/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply,
    ): Promise<ApiResponse<Property>> => {
      const { id } = request.params;

      // Query the database for the property
      const property = await prisma.property.findUnique({ where: { id } });

      if (!property) {
        return reply.status(404).send({
          success: false,
          error: `Property with id "${id}" not found`,
        });
      }

      // Map Prisma model → shared Property type
      const result: Property = {
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
      };

      return { success: true, data: result };
    },
  );
}
