import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { healthRoutes } from './routes/health.js';
import { searchRoutes } from './routes/search.js';
import { propertyRoutes } from './routes/properties.js';

/**
 * PropPulse Backend — Fastify API Server
 */

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

async function buildApp() {
  const fastify = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // -------------------------------------------------------------------------
  // Plugins
  // -------------------------------------------------------------------------

  await fastify.register(cors, {
    origin: FRONTEND_URL,
    credentials: true,
  });

  // -------------------------------------------------------------------------
  // Routes
  // -------------------------------------------------------------------------

  await fastify.register(healthRoutes);
  await fastify.register(searchRoutes);
  await fastify.register(propertyRoutes);

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🏠 PropPulse API running on http://localhost:${PORT}\n`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
