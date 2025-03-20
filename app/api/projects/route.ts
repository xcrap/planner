import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            include: { tasks: true },
            orderBy: { order: 'desc' }
        });
        return NextResponse.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: 'Error fetching projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, color } = body;

        // Find the maximum order
        const maxOrderProject = await prisma.project.findFirst({
            orderBy: { order: 'desc' }
        });

        const newOrder = maxOrderProject ? maxOrderProject.order + 1 : 0;

        const project = await prisma.project.create({
            data: {
                name,
                description,
                color: color || '#3498db',
                order: newOrder
            }
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Error creating project' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { projects } = body;
        
        if (!projects || !Array.isArray(projects)) {
            return Response.json({ error: 'Invalid request format' }, { status: 400 });
        }
        
        // Update multiple projects at once (for reordering)
        const updatePromises = projects.map((project: { id: number, order: number }) => {
            return prisma.project.update({
                where: { id: project.id },
                data: { order: project.order }
            });
        });
        
        await Promise.all(updatePromises);
        return Response.json({ success: true });
    } catch (error) {
        console.error('Error updating project orders:', error);
        return Response.json({ error: 'Failed to update project orders' }, { status: 500 });
    }
}
