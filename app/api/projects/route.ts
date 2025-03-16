import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            include: { tasks: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(projects);
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, color } = body;

        const project = await prisma.project.create({
            data: {
                name,
                description,
                color: color || '#3498db'
            }
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Error creating project' }, { status: 500 });
    }
}
