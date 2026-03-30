import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '@clerk/backend';

/**
 * Clerk JWT verification middleware.
 *
 * In local/dev environments where Clerk is not fully configured, we fall back to
 * a simple JWT payload decode so authenticated UI flows can still be exercised.
 */

export interface AuthenticatedUser {
  clerkId: string;
  email?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

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
    if (process.env.CLERK_SECRET_KEY) {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      request.user = {
        clerkId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
      return;
    }

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
