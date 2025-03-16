import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Only run this code on the server side
export async function initializeDatabase() {
    if (typeof window === 'undefined') {
        // Dynamic imports to avoid bundling with client code
        const fs = await import('node:fs');
        const path = await import('node:path');
        const { execSync } = await import('node:child_process');

        const dbPath = path.default.join(process.cwd(), 'gantt.db');

        if (!fs.default.existsSync(dbPath) || fs.default.statSync(dbPath).size === 0) {
            console.log('Database does not exist or is empty, initializing...');

            // Delete empty database if it exists
            if (fs.default.existsSync(dbPath)) {
                fs.default.unlinkSync(dbPath);
            }

            try {
                // Make sure your migrations/init.js exists
                execSync(`npx ts-node --compiler-options '{"module":"CommonJS"}' migrations/init.ts`);
                console.log('Database initialized successfully!');
            } catch (error) {
                console.error('Error initializing database:', error);
            }
        } else {
            console.log('Database already exists, skipping initialization');
        }
    }
}
