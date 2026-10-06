import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

function getDatabaseUrl(): string {
  // If an absolute path is already supplied
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith('file:')) {
    const rawPath = envUrl.replace('file:', '');
    if (path.isAbsolute(rawPath) && fs.existsSync(rawPath)) {
      return envUrl;
    }
  }

  // Look for eslakids.db in standard locations
  const candidates = [
    path.join(process.cwd(), 'prisma', 'eslakids.db'),
    path.join(process.cwd(), 'eslakids.db'),
    path.resolve('prisma/eslakids.db'),
    path.resolve('eslakids.db'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const absPath = path.resolve(candidate).replace(/\\/g, '/');
      return `file:${absPath}`;
    }
  }

  // Default fallback
  const fallback = path.join(process.cwd(), 'prisma', 'eslakids.db').replace(/\\/g, '/');
  return `file:${fallback}`;
}

const dbUrl = getDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
