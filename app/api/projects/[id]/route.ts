// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from '@/lib/db';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id: idString } = await context.params;
        const id = Number.parseInt(idString);

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: {
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        return NextResponse.json(
            { error: "Error fetching project" },
            { status: 500 },
        );
    }
}

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id: idString } = await context.params;
        const id = Number.parseInt(idString);
        const body = await request.json();
        const { name, description, color } = body;

        const project = await prisma.project.update({
            where: { id },
            data: {
                name,
                description,
                color,
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        return NextResponse.json(
            { error: "Error updating project" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    try {
        const { id: idString } = await context.params;
        const id = Number.parseInt(idString);

        await prisma.project.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Project deleted successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: "Error deleting project" },
            { status: 500 },
        );
    }
}
