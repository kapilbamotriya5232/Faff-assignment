// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma client.
// This is to prevent creating multiple instances of PrismaClient in development
// due to Next.js hot reloading.
declare global {
  // eslint-disable-next-line no-unused-vars
  var prisma: PrismaClient | undefined;
}

// Initialize PrismaClient.
// If 'global.prisma' already exists (in development), use it. Otherwise, create a new instance.
export const prisma = global.prisma || new PrismaClient({
  // Optional: You can add logging configuration here if needed
  // log: ['query', 'info', 'warn', 'error'],
});

// In production, ensure that 'global.prisma' is set to this instance.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// It's also common to export it as default if you prefer,
// but your current import `import { prisma } from '@/lib/prisma'`
// expects a named export `export const prisma`.
// export default prisma; // If you used this, your import would be `import prisma from '@/lib/prisma'`