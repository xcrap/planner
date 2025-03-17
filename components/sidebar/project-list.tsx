import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layers } from "lucide-react";
import { ProjectForm } from "@/components/sidebar/project-form";
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

export function ProjectList() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Use Zustand store for projects data and actions
    const {
        projects,
        fetchProjects,
        isLoading,
        error,
        addProject,
        updateProject,
        deleteProject
    } = useAppStore(state => ({
        projects: state.projects,
        fetchProjects: state.fetchProjects,
        isLoading: state.isLoading,
        error: state.error,
        addProject: state.addProject,
        updateProject: state.updateProject,
        deleteProject: state.deleteProject
    }));

    // Get the current projectId from the pathname
    const getCurrentProjectId = (): number | null => {
        const match = pathname.match(/\/gantt\/(\d+)/);
        return match ? Number.parseInt(match[1]) : null;
    };

    const currentProjectId = getCurrentProjectId();

    // Initial load effect - only run once
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleAddProject = async (project: Omit<Project, "id" | "tasks">) => {
        const result = await addProject(project);
        if (result) {
            setIsAddingProject(false);
        }
    };

    const handleUpdateProject = async (
        project: Partial<Project> & { id: number },
    ) => {
        const result = await updateProject(project);
        if (result) {
            setIsEditingProject(false);

            // Refresh the page if we're currently on this project
            // if (currentProjectId === project.id) {
            //     window.dispatchEvent(new Event('refresh-gantt'));
            // }
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (!confirm("Are you sure you want to delete this project?")) return;

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
                    onClick={() => setIsAddingProject(true)}
                    variant="outline"
                >
                    <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
            </div>

            {isAddingProject && (
                <ProjectForm
                    onSubmit={handleAddProject}
                    onCancel={() => setIsAddingProject(false)}
                />
            )}

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
                                        </CardHeader>
                                    </Card>
                                </Link>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="bg-white shadow-lg border border-neutral-200 w-38">
                                <ContextMenuLabel className="text-xs uppercase font-medium text-black">Project Actions</ContextMenuLabel>
                                <ContextMenuSeparator className="border-neutral-100 border-b my-2" />
                                <ContextMenuItem
                                    onClick={() => {
                                        setIsEditingProject(true);
                                        setSelectedProject(project);
                                    }}
                                >
                                    Edit
                                </ContextMenuItem>

                                <ContextMenuItem
                                    onClick={() => handleDeleteProject(project.id)}
                                >
                                    Delete
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
            </div>

            {isEditingProject && selectedProject && (
                <ProjectForm
                    project={selectedProject}
                    onSubmit={(project) => {
                        // Create a wrapper that ensures id is properly handled
                        const projectWithId = project.id
                            ? project
                            : { ...project, id: selectedProject.id };
                        return handleUpdateProject(
                            projectWithId as Partial<Project> & { id: number },
                        );
                    }}
                    onCancel={() => setIsEditingProject(false)}
                />
            )}
        </div>
    );
}
