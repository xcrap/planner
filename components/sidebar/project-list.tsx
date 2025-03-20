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
import { Plus, Layers, Edit, Trash2, GripVertical } from "lucide-react";
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
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

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
    const reorderProjects = useAppStore(state => state.reorderProjects);

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

    // Handle drag end for reordering projects
    const handleDragEnd = async (result: DropResult) => {
        const { source, destination } = result;

        // Return if dropped outside the list or at the same position
        if (!destination || source.index === destination.index) {
            return;
        }

        const currentProjects = [...projects];
        const [reorderedProject] = currentProjects.splice(source.index, 1);
        currentProjects.splice(destination.index, 0, reorderedProject);

        // Get project IDs in the new order and update via store
        await reorderProjects(currentProjects.map(p => p.id));
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

            <div className="space-y-2 mb-10">
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

                {/* Draggable Projects List */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="project-list" ignoreContainerClipping={true}>
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2"
                            >
                                {Array.isArray(projects) &&
                                    projects.map((project, index) => (
                                        <Draggable
                                            key={project.id}
                                            draggableId={`project-${project.id}`}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`${snapshot.isDragging ? "opacity-70" : ""}`}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        transition: snapshot.isDragging ? undefined : 'all 0.2s'
                                                    }}
                                                >
                                                    <Card
                                                        className={`p-4 cursor-pointer ${currentProjectId() === project.id ? "bg-neutral-900 text-white shadow-none" : "bg-white border-neutral-200 shadow-none hover:border-neutral-300 hover:shadow-sm"} transition`}
                                                        onMouseEnter={() => setHoveredProjectId(project.id)}
                                                        onMouseLeave={() => setHoveredProjectId(null)}
                                                        onClick={(e) => {
                                                            router.push(`/gantt/${project.id}`);
                                                        }}
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
                                                                    {/* Drag Handle - Always rendered but only visible on hover */}
                                                                    <div
                                                                        {...provided.dragHandleProps}
                                                                        className={`cursor-grab active:cursor-grabbing h-7 w-7 flex items-center justify-center ${hoveredProjectId === project.id ? 'opacity-100' : 'opacity-0'}`}
                                                                    >
                                                                        <GripVertical className="h-4 w-4 text-neutral-400" />
                                                                    </div>
                                                                    {hoveredProjectId === project.id && (
                                                                        <>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-neutral-500 hover:text-neutral-600"
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
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
                                                                                    e.stopPropagation();
                                                                                    handleDeleteClick(project.id);
                                                                                }}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {project.description && (
                                                                <CardDescription className="text-xs p-0 mt-2">{project.description}</CardDescription>
                                                            )}
                                                        </CardHeader>
                                                    </Card>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
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