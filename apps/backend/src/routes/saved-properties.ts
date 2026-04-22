import { FastifyInstance } from 'fastify';
import type { ApiResponse, CreateSavedPropertyInput, DealStatus, Property, SavedProperty, UpdateSavedPropertyInput } from '@proppulse/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

type PrismaProperty = {
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
};

function mapProperty(p: PrismaProperty): Property {
  return {
    id: p.id,
    address: p.address,
    city: p.city,
    state: p.state,
    zipCode: p.zipCode,
    priceCents: p.priceCents,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sqft: p.sqft,
    propertyType: p.propertyType as Property['propertyType'],
    status: p.status as Property['status'],
    images: p.images,
    aiSummary: p.aiSummary ?? undefined,
    listedAt: p.listedAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const VALID_DEAL_STATUSES: DealStatus[] = ['watching', 'analyzing', 'offer_made', 'passed'];

function mapSavedProperty(record: {
  id: string;
  propertyId: string;
  property: PrismaProperty;
  notes: string | null;
  dealStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SavedProperty {
  return {
    id: record.id,
    propertyId: record.propertyId,
    property: mapProperty(record.property),
    notes: record.notes ?? undefined,
    dealStatus: (record.dealStatus as DealStatus | null) ?? undefined,
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

export async function savedPropertyRoutes(fastify: FastifyInstance): Promise<void> {
  // List all saved properties for the signed-in user
  fastify.get(
    '/api/saved-properties',
    { preHandler: requireAuth },
    async (request): Promise<ApiResponse<SavedProperty[]>> => {
      const user = request.user;
      if (!user) return { success: false, error: 'Unauthorized' };

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const saved = await prisma.savedProperty.findMany({
        where: { userId: appUser.id },
        include: { property: true },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: saved.map(mapSavedProperty) };
    },
  );

  // Save (favorite) a property
  fastify.post<{ Body: CreateSavedPropertyInput }>(
    '/api/saved-properties',
    { preHandler: requireAuth },
    async (request, reply): Promise<ApiResponse<SavedProperty>> => {
      const user = request.user;
      if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const { propertyId } = request.body ?? {};
      if (!propertyId?.trim()) {
        return reply.status(400).send({ success: false, error: 'propertyId is required' });
      }

      const property = await prisma.property.findUnique({ where: { id: propertyId } });
      if (!property) {
        return reply.status(404).send({ success: false, error: 'Property not found' });
      }

      const appUser = await getOrCreateUser(user.clerkId, user.email);

      // Upsert so duplicate saves are idempotent
      const saved = await prisma.savedProperty.upsert({
        where: { userId_propertyId: { userId: appUser.id, propertyId } },
        create: { userId: appUser.id, propertyId },
        update: {},
        include: { property: true },
      });

      return { success: true, data: mapSavedProperty(saved) };
    },
  );

  // Update notes and/or dealStatus for a saved property
  fastify.patch<{ Params: { id: string }; Body: UpdateSavedPropertyInput }>(
    '/api/saved-properties/:id',
    { preHandler: requireAuth },
    async (request, reply): Promise<ApiResponse<SavedProperty>> => {
      const user = request.user;
      if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const { notes, dealStatus } = request.body ?? {};

      if (dealStatus !== undefined && dealStatus !== null && !VALID_DEAL_STATUSES.includes(dealStatus)) {
        return reply.status(400).send({ success: false, error: 'Invalid dealStatus value' });
      }

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const existing = await prisma.savedProperty.findFirst({
        where: { id: request.params.id, userId: appUser.id },
      });

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Saved property not found' });
      }

      const updated = await prisma.savedProperty.update({
        where: { id: existing.id },
        data: {
          ...(notes !== undefined ? { notes: notes ?? null } : {}),
          ...(dealStatus !== undefined ? { dealStatus: dealStatus ?? null } : {}),
        },
        include: { property: true },
      });

      return { success: true, data: mapSavedProperty(updated) };
    },
  );

  // Remove a saved property by its saved record id
  fastify.delete<{ Params: { id: string } }>(
    '/api/saved-properties/:id',
    { preHandler: requireAuth },
    async (request, reply): Promise<ApiResponse<{ id: string }>> => {
      const user = request.user;
      if (!user) return reply.status(401).send({ success: false, error: 'Unauthorized' });

      const appUser = await getOrCreateUser(user.clerkId, user.email);
      const existing = await prisma.savedProperty.findFirst({
        where: { id: request.params.id, userId: appUser.id },
      });

      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Saved property not found' });
      }

      await prisma.savedProperty.delete({ where: { id: existing.id } });
      return { success: true, data: { id: existing.id } };
    },
  );
}
