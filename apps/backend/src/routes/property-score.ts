import { FastifyInstance, FastifyRequest } from 'fastify';
import type { ApiResponse, PropPulseScore } from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';
import { getPropPulseScore } from '../lib/propScore.js';

interface ScoreParams {
  id: string;
}

function registerScoreRoute(
  fastify: FastifyInstance,
  method: 'GET' | 'POST',
): void {
  fastify.route<{ Params: ScoreParams }>({
    method,
    url: '/api/properties/:id/score',
    handler: async (
      request: FastifyRequest<{ Params: ScoreParams }>,
      reply,
    ): Promise<ApiResponse<PropPulseScore>> => {
      const { id } = request.params;

      if (!id) {
        return reply.status(400).send({
          success: false,
          error: 'Property id is required',
        });
      }

      const property = await prisma.property.findUnique({ where: { id } });

      if (!property) {
        return reply.status(404).send({
          success: false,
          error: `Property with id "${id}" not found`,
        });
      }

      const score = await getPropPulseScore({
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        priceCents: property.priceCents,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        propertyType: property.propertyType,
        status: property.status,
      });

      return {
        success: true,
        data: score,
      };
    },
  });
}

export async function propertyScoreRoutes(fastify: FastifyInstance): Promise<void> {
  registerScoreRoute(fastify, 'GET');
  registerScoreRoute(fastify, 'POST');
}
