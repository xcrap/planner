import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layers, Edit, Trash2 } from "lucide-react";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProjectList() {
    const router = useRouter();
    const params = useParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

    // Fix: Use separate selectors for each piece of state
    const projects = useAppStore(state => state.projects);
    const isLoading = useAppStore(state => state.isLoading);
    const error = useAppStore(state => state.error);

    // Get the current projectId from the pathname    
    const currentProjectId = (): number | null => {
        const projectId = params.id;
        return projectId ? Number(projectId) : null;
    };

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

    const handleDeleteClick = (projectId: number) => {
        setProjectToDelete(projectId);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (projectToDelete) {
            const { deleteProject } = useAppStore.getState();
            const success = await deleteProject(projectToDelete);

            if (success && currentProjectId() === projectToDelete) {
                // Navigate to home if we're on the deleted project's page
                router.push('/');
            }
        }

        setIsDeleteDialogOpen(false);
        setProjectToDelete(null);
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
                        className={`cursor-pointer ${!currentProjectId() ? "bg-neutral-900 text-white shadow-none" : "bg-white border-neutral-200 shadow-none hover:border-neutral-300 hover:shadow-sm"} transition`}
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
                        <Link key={project.id} href={`/gantt/${project.id}`} className="block">
                            <Card
                                className={`p-4 cursor-pointer ${currentProjectId() === project.id ? "bg-neutral-900 text-white shadow-none" : "bg-white border-neutral-200 shadow-none hover:border-neutral-300 hover:shadow-sm"} transition`}
                                onMouseEnter={() => setHoveredProjectId(project.id)}
                                onMouseLeave={() => setHoveredProjectId(null)}
                            >
                                <CardHeader className="p-0">
                                    <div className="flex items-center justify-between h-6">
                                        <div className="flex items-center">
                                            <div
                                                className="w-3 h-3 rounded-full mr-3"
                                                style={{ backgroundColor: project.color }}
                                            />
                                            <CardTitle className="text-base">{project.name}</CardTitle>
                                        </div>
                                        <div className="flex space-x-1">
                                            {hoveredProjectId === project.id && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleEdit(project);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-500 hover:text-red-600"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDeleteClick(project.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                {project.description && (
                                    <CardDescription className="text-xs p-0 mt-2">
                                        <div>{project.description}</div>
                                    </CardDescription>
                                )}
                            </Card>
                        </Link>
                    ))}
            </div>

            {/* Project Edit Modal */}
            <ProjectEditModal
                project={selectedProject}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription className="leading-6">
                            Are you sure you want to delete this project? This action cannot be undone and will remove all associated tasks.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
