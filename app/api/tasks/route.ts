import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';


export async function GET() {
    try {
        const tasks = await prisma.task.findMany({
            include: { project: true },
            orderBy: [
                { projectId: 'asc' },
                { order: 'asc' }
            ]
        });
        return NextResponse.json(tasks);
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, startDate, endDate, completed, projectId, order } = body;

        // Find the maximum order in the project to add the task at the end
        const maxOrderTask = await prisma.task.findFirst({
            where: { projectId },
            orderBy: { order: 'desc' }
        });

        const newOrder = order ?? (maxOrderTask ? maxOrderTask.order + 1 : 1);

        const task = await prisma.task.create({
            data: {
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                completed: completed || false,
                projectId,
                order: newOrder
            }
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Error creating task' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { tasks } = body;

        // Update multiple tasks at once (for reordering)
        const updatePromises = tasks.map((task: { id: number, order: number }) => {
            return prisma.task.update({
                where: { id: task.id },
                data: { order: task.order }
            });
        });

        await Promise.all(updatePromises);

        return NextResponse.json({ message: 'Tasks updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Error updating tasks' }, { status: 500 });
    }
}
