import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectForm } from '@/components/sidebar/project-form';
import { TaskList } from '@/components/sidebar/task-list';

type Project = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    tasks: Task[];
};

type Task = {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    completed: boolean;
    projectId: number;
};

export function ProjectList({ onSelectProject }: { onSelectProject: (project: Project) => void }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/projects');

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Check if data is an array, if not, look for projects property
            const projectsArray = Array.isArray(data) ? data :
                (data.projects && Array.isArray(data.projects) ? data.projects : []);

            setProjects(projectsArray);

            // Select the first project by default
            if (projectsArray.length > 0 && !selectedProject) {
                setSelectedProject(projectsArray[0]);
                onSelectProject(projectsArray[0]);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            setError('Failed to load projects. Please try again.');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
        onSelectProject(project);
    };

    const handleAddProject = async (project: Omit<Project, 'id' | 'tasks'>) => {
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });

            if (response.ok) {
                setIsAddingProject(false);
                fetchProjects();
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        } catch (error) {
            console.error('Error adding project:', error);
        }
    };

    const handleUpdateProject = async (project: Partial<Project> & { id: number }) => {
        try {
            const response = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });

            if (response.ok) {
                setIsEditingProject(false);
                fetchProjects();
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE'
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
            console.error('Error deleting project:', error);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4">
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

            <div className="space-y-2 px-3 flex-grow overflow-auto">
                {loading && <p className="text-center py-4">Loading projects...</p>}
                {error && <p className="text-center text-red-500 py-4">{error}</p>}
                {!loading && !error && projects.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No projects found. Create one to get started!</p>
                )}
                {Array.isArray(projects) && projects.map(project => (
                    <Card
                        key={project.id}
                        className={`cursor-pointer ${selectedProject?.id === project.id ? 'border-2 border-primary' : ''}`}
                        onClick={() => handleSelectProject(project)}
                    >
                        <CardHeader className="p-3 pb-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{ backgroundColor: project.color }}
                                    />
                                    <CardTitle className="text-base">{project.name}</CardTitle>
                                </div>
                                <div className="flex space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditingProject(true);
                                            setSelectedProject(project);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProject(project.id);
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                            <CardDescription className="truncate text-xs">
                                {project.description || 'No description'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="text-xs text-gray-500">
                                {project.tasks.length} tasks
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isEditingProject && selectedProject && (
                <ProjectForm
                    project={selectedProject}
                    onSubmit={handleUpdateProject}
                    onCancel={() => setIsEditingProject(false)}
                />
            )}

            {selectedProject && (
                <div className="mt-4">
                    <TaskList
                        projectId={selectedProject.id}
                        onTasksChanged={fetchProjects}
                    />
                </div>
            )}
        </div>
    );
}
