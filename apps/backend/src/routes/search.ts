import { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import type { SearchQuery, SearchResult, Property } from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';

export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/search',
    async (request: FastifyRequest<{ Body: SearchQuery }>, _reply): Promise<SearchResult> => {
      const {
        query,
        city,
        state,
        zipCode,
        minPriceCents,
        maxPriceCents,
        minBedrooms,
        minBathrooms,
        minSqft,
        maxSqft,
        propertyType,
        status,
        page = 1,
        limit = 20,
      } = request.body ?? {};

      const take = Math.min(Math.max(Number(limit), 1), 100);
      const skip = (Math.max(Number(page), 1) - 1) * take;

      const where: Prisma.PropertyWhereInput = {};

      if (query?.trim()) {
        where.OR = [
          { address: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { state: { contains: query, mode: 'insensitive' } },
          { zipCode: { contains: query } },
        ];
      }

      if (city?.trim()) where.city = { contains: city, mode: 'insensitive' };
      if (state?.trim()) where.state = { contains: state, mode: 'insensitive' };
      if (zipCode?.trim()) where.zipCode = zipCode;
      if (propertyType) where.propertyType = propertyType;
      if (status) where.status = status;

      if (minPriceCents !== undefined || maxPriceCents !== undefined) {
        where.priceCents = {
          ...(minPriceCents !== undefined ? { gte: minPriceCents } : {}),
          ...(maxPriceCents !== undefined ? { lte: maxPriceCents } : {}),
        };
      }

      if (minBedrooms !== undefined) {
        where.bedrooms = { gte: minBedrooms };
      }

      if (minBathrooms !== undefined) {
        where.bathrooms = { gte: minBathrooms };
      }

      if (minSqft !== undefined || maxSqft !== undefined) {
        where.sqft = {
          ...(minSqft !== undefined ? { gte: minSqft } : {}),
          ...(maxSqft !== undefined ? { lte: maxSqft } : {}),
        };
      }

      fastify.log.info({ where }, 'Search query');

      const [rows, total] = await Promise.all([
        prisma.property.findMany({
          where,
          orderBy: { listedAt: 'desc' },
          skip,
          take,
        }),
        prisma.property.count({ where }),
      ]);

      const safePage = Math.max(Number(page), 1);

      return {
        properties: rows.map(toProperty),
        total,
        page: safePage,
        limit: take,
        totalPages: Math.ceil(total / take),
      };
    },
  );
}

function toProperty(row: {
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
}): Property {
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
    propertyType: row.propertyType as Property['propertyType'],
    status: row.status as Property['status'],
    images: row.images,
    listedAt: row.listedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    aiSummary: row.aiSummary ?? undefined,
  };
}
