// app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idString } = await context.params;
        const id = Number.parseInt(idString);

        const task = await prisma.task.findUnique({
            where: { id },
            include: { project: true }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json(task);
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching task' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idString } = await context.params;
        const id = Number.parseInt(idString);
        const body = await request.json();
        const { name, description, startDate, endDate, completed, projectId, order } = body;

        const task = await prisma.task.update({
            where: { id },
            data: {
                name,
                description,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                completed: completed !== undefined ? completed : undefined,
                projectId: projectId !== undefined ? projectId : undefined,
                order: order !== undefined ? order : undefined
            }
        });

        return NextResponse.json(task);
    } catch (error) {
        return NextResponse.json({ error: 'Error updating task' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idString } = await context.params;
        const id = Number.parseInt(idString);

        await prisma.task.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Task deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting task' }, { status: 500 });
    }
}
