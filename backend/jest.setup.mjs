// DO NOT MODIFY: Configuration locked for consistency
// Jest configuration for a Node.js project using ES modules
// This configuration is tailored for a Node.js environment with ES module support,
// ensuring compatibility with both .js and .mjs files, and includes necessary setup for Jest globals.
// It also includes custom module name mappings for utility files and error handling.
/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
import { beforeAll, afterAll, jest } from '@jest/globals';

// __dirname is available once transpiled to CommonJS

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// Set Jest timeout
jest.setTimeout(30000);

// Logging setup info
console.log('JEST_SETUP: NODE_ENV:', process.env.NODE_ENV);
console.log('JEST_SETUP: DATABASE_URL used for tests:', process.env.DATABASE_URL);

const prismaInstances = new Set();
const activeHandles = new Set();
let cleanupInProgress = false;

// Global cleanup function
async function performGlobalCleanup() {
  if (cleanupInProgress) {
    return;
  }
  cleanupInProgress = true;

  console.log('[Jest Cleanup] Starting global cleanup...');

  // Disconnect all Prisma instances
  const disconnectPromises = Array.from(prismaInstances).map(async prisma => {
    try {
      await prisma.$disconnect();
      console.log('[Jest Cleanup] Prisma instance disconnected');
    } catch (err) {
      console.warn('[Jest Cleanup] Error disconnecting Prisma:', err.message);
    }
  });

  await Promise.all(disconnectPromises);
  prismaInstances.clear();

  // Clear any remaining handles
  activeHandles.clear();

  console.log('[Jest Cleanup] Global cleanup completed');
}

beforeAll(async () => {
  // Any global setup
});

afterAll(async () => {
  await performGlobalCleanup();
});

// Handle process exit events
process.on('beforeExit', async () => {
  await performGlobalCleanup();
});

process.on('exit', () => {
  console.log('[Jest Setup] Process exiting');
});

process.on('SIGTERM', async () => {
  console.log('[Jest Setup] SIGTERM received');
  await performGlobalCleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Jest Setup] SIGINT received');
  await performGlobalCleanup();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log it
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log it
});

export function registerPrismaForCleanup(prisma) {
  if (prisma && typeof prisma.$disconnect === 'function') {
    prismaInstances.add(prisma);
    console.log('[Jest Setup] Prisma instance registered for cleanup');
  }
}

export async function disconnectPrisma(prisma) {
  try {
    if (prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
      prismaInstances.delete(prisma);
      console.log('[Jest Setup] Prisma instance disconnected and unregistered');
    }
  } catch (err) {
    console.warn('[Jest Setup] Error during Prisma disconnect:', err.message);
  }
}

export function registerHandle(handle) {
  activeHandles.add(handle);
}

export function unregisterHandle(handle) {
  activeHandles.delete(handle);
}
