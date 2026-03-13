import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Clerk JWT verification middleware (stub).
 *
 * TODO: Replace with full Clerk verification using @clerk/backend's
 * `verifyToken` once the Clerk secret key is configured.
 *
 * Usage in routes:
 *   fastify.addHook('preHandler', requireAuth);
 */

export interface AuthenticatedUser {
  clerkId: string;
  email?: string;
}

/**
 * Extends the Fastify request type to include the authenticated user.
 * Add this declaration to your app's type augmentation as needed.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * requireAuth — Fastify preHandler hook.
 * Verifies the Bearer token in the Authorization header using Clerk.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    // TODO: Replace this stub with actual Clerk token verification:
    //
    // import { verifyToken } from '@clerk/backend';
    // const payload = await verifyToken(token, {
    //   secretKey: process.env.CLERK_SECRET_KEY,
    // });
    // request.user = { clerkId: payload.sub, email: payload.email as string };

    // Stub: decode payload naively (JWT body is base64url-encoded JSON)
    const [, payloadB64] = token.split('.');
    if (!payloadB64) throw new Error('Invalid token format');

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      sub?: string;
      email?: string;
    };

    if (!payload.sub) throw new Error('Missing sub claim');

    request.user = { clerkId: payload.sub, email: payload.email };
  } catch {
    return reply.status(401).send({ success: false, error: 'Invalid or expired token' });
  }
}
