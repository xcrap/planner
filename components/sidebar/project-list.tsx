import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layers } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuLabel
} from "@/components/ui/context-menu";
import { ContextMenuSeparator } from "@radix-ui/react-context-menu";
import type { Project } from "@/types/task";
import { ProjectEditModal } from "@/components/modals/project-edit-modal";

export function ProjectList() {
    const router = useRouter();
    const pathname = usePathname();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Fix: Use separate selectors for each piece of state
    const projects = useAppStore(state => state.projects);
    const isLoading = useAppStore(state => state.isLoading);
    const error = useAppStore(state => state.error);

    // Get the current projectId from the pathname
    const getCurrentProjectId = (): number | null => {
        const match = pathname.match(/\/gantt\/(\d+)/);
        return match ? Number.parseInt(match[1]) : null;
    };
    const currentProjectId = getCurrentProjectId();

    const handleAddNew = () => {
        setSelectedProject(null);
        setIsModalOpen(true);
    };

    const handleEdit = (project: Project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProject(null);
    };

    const handleDeleteProject = async (projectId: number) => {
        if (!confirm("Are you sure you want to delete this project?")) return;

        const { deleteProject } = useAppStore.getState();
        const success = await deleteProject(projectId);

        if (success && currentProjectId === projectId) {
            // Navigate to home if we're on the deleted project's page
            router.push('/');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Projects</h2>
                <Button
                    size="sm"
                    onClick={handleAddNew}
                    variant="outline"
                >
                    <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
            </div>

            <div className="space-y-2 overflow-auto mb-10">
                {/* All Projects option */}
                <Link href="/" className="block">
                    <Card
                        className={`cursor-pointer ${!currentProjectId ? "bg-neutral-900 text-white shadow-none" : "bg-white border-neutral-200 shadow-none hover:border-neutral-300 hover:shadow-sm"} transition`}
                    >
                        <CardHeader className="p-4">
                            <div className="flex items-center">
                                <CardTitle className="text-base flex items-center">
                                    <Layers className="h-4 w-4 mr-3" />
                                    All Projects
                                </CardTitle>
                            </div>
                            <CardDescription className="truncate text-xs">
                                View tasks from all projects
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                {error && <p className="text-center text-red-500 py-4">{error}</p>}

                {!isLoading && !error && projects.length === 0 && (
                    <p className="text-center text-neutral-500 py-4">
                        No projects found. Create one to get started!
                    </p>
                )}

                {Array.isArray(projects) &&
                    projects.map((project) => (
                        <ContextMenu key={project.id}>
                            <ContextMenuTrigger className="flex flex-col space-y-2">
                                <Link href={`/gantt/${project.id}`} className="block">
                                    <Card
                                        className={`cursor-pointer ${currentProjectId === project.id ? "bg-neutral-900 text-white shadow-none" : "bg-white border-neutral-200 shadow-none hover:border-neutral-300 hover:shadow-sm"} transition`}
                                    >
                                        <CardHeader className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div
                                                        className="w-3 h-3 rounded-full mr-3"
                                                        style={{ backgroundColor: project.color }}
                                                    />
                                                    <CardTitle className="text-base">{project.name}</CardTitle>
                                                </div>
                                                {(project.tasks?.length ?? 0) > 0 && (
                                                    <div className={`text-xs px-2 py-1 rounded-md shadow-xs ${currentProjectId === project.id ? "bg-neutral-700 text-neutral-300 " : "bg-neutral-50 text-neutral-400 shadow-neutral-400/40"}`}>
                                                        {project.tasks?.length || 0} tasks
                                                    </div>
                                                )}
                                            </div>
                                            {project.description && (
                                                <CardDescription className="truncate text-xs mt-1">
                                                    {project.description}
                                                </CardDescription>
                                            )}
                                        </CardHeader>
                                    </Card>
                                </Link>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="bg-white shadow-lg border border-neutral-200 w-38">
                                <ContextMenuLabel className="text-xs uppercase font-medium text-black">Project Actions</ContextMenuLabel>
                                <ContextMenuSeparator className="border-neutral-100 border-b my-2" />
                                <ContextMenuItem onClick={() => handleEdit(project)}>
                                    Edit
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleDeleteProject(project.id)}>
                                    Delete
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
            </div>

            {/* Project Edit Modal */}
            <ProjectEditModal
                project={selectedProject}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
}
