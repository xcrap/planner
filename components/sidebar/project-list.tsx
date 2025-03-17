import { useState, useEffect, useCallback, useRef } from "react";
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
import type { Task, Project } from "@/types/task";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuLabel
} from "@/components/ui/context-menu";
import { ContextMenuSeparator } from "@radix-ui/react-context-menu";


export function ProjectList({
    onSelectProject,
}: { onSelectProject: (project: Project) => void }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAllProjectsView, setIsAllProjectsView] = useState(true);
    const [allTasks, setAllTasks] = useState<Task[]>([]);

    // Use refs to track state without causing re-renders
    const initialLoadDone = useRef(false);
    const isLoading = useRef(false);
    const isSelectingProject = useRef(false);

    // Simplified fetchAllTasks that doesn't trigger further state updates
    const fetchAllTasks = useCallback(async () => {
        if (isLoading.current || !isAllProjectsView) return;

        isLoading.current = true;
        try {
            // Get all projects and extract tasks
            const projects = await Promise.all(
                (await fetch("/api/projects").then((res) => res.json())).map(
                    async (project: Project) => {
                        const details = await fetch(`/api/projects/${project.id}`).then(
                            (res) => res.json(),
                        );
                        return {
                            ...details,
                            tasks: details.tasks ? details.tasks.map((task: Task) => ({
                                ...task,
                                projectName: project.name,
                                projectColor: project.color,
                            })) : [],
                        };
                    },
                ),
            );

            // Collect all tasks from all projects
            const tasks: Task[] = [];
            for (const project of projects) {
                if (project.tasks && Array.isArray(project.tasks)) {
                    tasks.push(...project.tasks);
                }
            }

            // Sort tasks
            tasks.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                return (
                    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                );
            });

            setAllTasks(tasks);

            if (isAllProjectsView && !isSelectingProject.current) {
                const allProjectsView = {
                    id: -1,
                    name: "All Projects",
                    description: "Tasks from all projects",
                    color: "",
                    tasks: tasks,
                };
                // Use setTimeout to break the synchronous cycle
                setTimeout(() => {
                    onSelectProject(allProjectsView);
                }, 0);
            }
        } catch (error) {
            console.error("Error fetching all tasks:", error);
            setAllTasks([]);
        } finally {
            isLoading.current = false;
            setLoading(false);
        }
    }, [isAllProjectsView, onSelectProject]);

    const fetchProjects = useCallback(async () => {
        if (isLoading.current) return;

        isLoading.current = true;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/projects");

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Check if data is an array, if not, look for projects property
            const projectsArray = Array.isArray(data)
                ? data
                : data.projects && Array.isArray(data.projects)
                    ? data.projects
                    : [];

            setProjects(projectsArray);
        } catch (error) {
            console.error("Error fetching projects:", error);
            setError("Failed to load projects. Please try again.");
            setProjects([]);
        } finally {
            isLoading.current = false;
            setLoading(false);
        }
    }, []);

    // Initial load effect - only run once
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Effect to load all tasks on initial load - using a ref to prevent dependency issues
    const didRunLoadEffect = useRef(false);
    useEffect(() => {
        if (projects.length > 0 && isAllProjectsView && !initialLoadDone.current && !isLoading.current && !didRunLoadEffect.current) {
            didRunLoadEffect.current = true;
            initialLoadDone.current = true;
            fetchAllTasks();
        }
    }, [projects.length, isAllProjectsView, fetchAllTasks]);

    const handleSelectProject = async (project: Project) => {
        if (isSelectingProject.current) return;
        isSelectingProject.current = true;

        setIsAllProjectsView(false);

        try {
            if (project.id === -1) {
                // Special case for "All Projects"
                setIsAllProjectsView(true);
                setSelectedProject(null);
                isSelectingProject.current = false;
                return;
            }

            // Fetch the latest project data including tasks
            const response = await fetch(`/api/projects/${project.id}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Get fresh project data with latest tasks
            const freshProject = await response.json();

            // Update the selected project with fresh data
            setSelectedProject(freshProject);

            // Update the projects array with the fresh project data
            setProjects(projects =>
                projects.map((p) => (p.id === freshProject.id ? freshProject : p))
            );

            // Pass fresh project data to parent
            onSelectProject(freshProject);
        } catch (error) {
            console.error("Error fetching project details:", error);
            // Fallback to using cached data if fetch fails
            setSelectedProject(project);
            onSelectProject(project);
        } finally {
            isSelectingProject.current = false;
        }
    };

    const handleSelectAllProjects = () => {
        if (isAllProjectsView) return; // Don't do anything if already in All Projects view

        setIsAllProjectsView(true);
        setSelectedProject(null);

        // Create a virtual "All Projects" object with current tasks
        const allProjectsView = {
            id: -1,
            name: "All Projects",
            description: "Tasks from all projects",
            color: "",
            tasks: allTasks,
        };

        onSelectProject(allProjectsView);

        // Fetch latest tasks asynchronously
        setTimeout(() => {
            fetchAllTasks();
        }, 0);
    };

    const handleAddProject = async (project: Omit<Project, "id" | "tasks">) => {
        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(project),
            });

            if (response.ok) {
                setIsAddingProject(false);
                fetchProjects();
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        } catch (error) {
            console.error("Error adding project:", error);
        }
    };

    const handleUpdateProject = async (
        project: Partial<Project> & { id: number },
    ) => {
        try {
            const response = await fetch(`/api/projects/${project.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(project),
            });

            if (response.ok) {
                setIsEditingProject(false);
                fetchProjects();
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        } catch (error) {
            console.error("Error updating project:", error);
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (!confirm("Are you sure you want to delete this project?")) return;

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                fetchProjects();
                if (selectedProject?.id === projectId) {
                    setSelectedProject(null);
                }
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        } catch (error) {
            console.error("Error deleting project:", error);
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
                <Card
                    className={`cursor-pointer ${isAllProjectsView ? "bg-neutral-900 text-white shadow-none" : "bg-white border-neutral-200 shadow-none hover:border-neutral-300 hover:shadow-sm"} transition`}
                    onClick={handleSelectAllProjects}
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

                {error && <p className="text-center text-red-500 py-4">{error}</p>}
                {!loading && !error && projects.length === 0 && (
                    <p className="text-center text-neutral-500 py-4">
                        No projects found. Create one to get started!
                    </p>
                )}
                {Array.isArray(projects) &&
                    projects.map((project) => (
                        <ContextMenu key={project.id}>
                            <ContextMenuTrigger className="flex flex-col space-y-2">
                                <Card
                                    className={`cursor-pointer ${selectedProject?.id === project.id && !isAllProjectsView ? "bg-neutral-900 text-white shadow-none" : "bg-white border-neutral-200 shadow-none hover:border-neutral-300 hover:shadow-sm"} transition`}
                                    onClick={() => handleSelectProject(project)}
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
                                                <div className={`text-xs px-2 py-1 rounded-md shadow-xs ${selectedProject?.id === project.id ? "bg-neutral-700 text-neutral-300 " : "bg-neutral-50 text-neutral-400 shadow-neutral-400/40"}`}>
                                                    {project.tasks?.length || 0} tasks
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                </Card>
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
