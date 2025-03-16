// migrations/init.ts
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

async function main() {
    const dbPath = path.join(process.cwd(), 'gantt.db');
    
    // Delete existing database if it exists
    if (fs.existsSync(dbPath)) {
        console.log('Removing existing database...');
        fs.unlinkSync(dbPath);
    }

    console.log('Creating database schema...');

    try {
        // Generate Prisma client and create schema
        execSync('npx prisma generate', { stdio: 'inherit' });
        console.log('Prisma client generated.');

        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('Database schema created.');

        // Now create the sample data
        const prisma = new PrismaClient();

        console.log('Adding sample data...');

        // Add sample projects
        const project1 = await prisma.project.create({
            data: {
                name: 'Website Redesign',
                description: 'Complete overhaul of company website',
                color: '#3498db'
            }
        });

        const project2 = await prisma.project.create({
            data: {
                name: 'Mobile App Development',
                description: 'Build a new mobile app for clients',
                color: '#e74c3c'
            }
        });

        // Add sample tasks
        const today = new Date();

        // Tasks for Project 1
        await prisma.task.createMany({
            data: [
                {
                    name: 'Research & Planning',
                    description: 'Market research and planning',
                    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
                    completed: true,
                    order: 1,
                    projectId: project1.id
                },
                {
                    name: 'Wireframing',
                    description: 'Create wireframes for all pages',
                    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
                    completed: false,
                    order: 2,
                    projectId: project1.id
                },
                {
                    name: 'UI Design',
                    description: 'Design UI components and pages',
                    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12),
                    completed: false,
                    order: 3,
                    projectId: project1.id
                },
                {
                    name: 'Frontend Development',
                    description: 'Implement the frontend code',
                    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10),
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 25),
                    completed: false,
                    order: 4,
                    projectId: project1.id
                }
            ]
        });

        // Tasks for Project 2
        await prisma.task.createMany({
            data: [
                {
                    name: 'Requirements Gathering',
                    description: 'Collect and document requirements',
                    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
                    completed: false,
                    order: 1,
                    projectId: project2.id
                },
                {
                    name: 'App Architecture',
                    description: 'Design app architecture',
                    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10),
                    completed: false,
                    order: 2,
                    projectId: project2.id
                },
                {
                    name: 'UI/UX Design',
                    description: 'Design app interfaces',
                    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20),
                    completed: false,
                    order: 3,
                    projectId: project2.id
                }
            ]
        });

        console.log('Sample data added successfully!');
    } catch (error) {
        console.error('Error during database initialization:', error);
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
