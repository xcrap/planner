import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Layers } from 'lucide-react';
import { ProjectForm } from '@/components/sidebar/project-form';
import { TaskList } from '@/components/sidebar/task-list';
import { AllTasksList } from '@/components/sidebar/all-tasks-list';
import { Task, Project } from '@/types/task';

export function ProjectList({ onSelectProject }: { onSelectProject: (project: Project) => void }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAllProjectsView, setIsAllProjectsView] = useState(false);
    const [allTasks, setAllTasks] = useState<Task[]>([]);

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

    const fetchAllTasks = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get all projects first
            const response = await fetch('/api/projects');

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const projectsArray = Array.isArray(data) ? data :
                (data.projects && Array.isArray(data.projects) ? data.projects : []);

            // Collect all tasks from all projects
            const tasks: Task[] = [];
            projectsArray.forEach(project => {
                if (project.tasks && Array.isArray(project.tasks)) {
                    // Add project info to each task
                    const tasksWithProjectInfo = project.tasks.map(task => ({
                        ...task,
                        projectName: project.name,
                        projectColor: project.color
                    }));
                    tasks.push(...tasksWithProjectInfo);
                }
            });

            // Sort by completion status and date
            tasks.sort((a, b) => {
                // First by completion status
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                // Then by date
                return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            });

            setAllTasks(tasks);
        } catch (error) {
            console.error('Error fetching all tasks:', error);
            setError('Failed to load tasks. Please try again.');
            setAllTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProject = async (project: Project) => {
        setIsAllProjectsView(false);

        try {
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
            setProjects(projects.map(p =>
                p.id === freshProject.id ? freshProject : p
            ));

            // Pass fresh project data to parent
            onSelectProject(freshProject);
        } catch (error) {
            console.error('Error fetching project details:', error);
            // Fallback to using cached data if fetch fails
            setSelectedProject(project);
            onSelectProject(project);
        }
    };

    const handleSelectAllProjects = () => {
        setIsAllProjectsView(true);
        setSelectedProject(null);
        fetchAllTasks();

        // Create a virtual "All Projects" object to pass to the parent
        const allProjectsView = {
            id: -1, // Special ID for "All Projects"
            name: "All Projects",
            description: "Tasks from all projects",
            color: "#6366f1", // Indigo color
            tasks: allTasks
        };

        onSelectProject(allProjectsView);
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

    useEffect(() => {
        const refreshAllTasks = () => {
            if (isAllProjectsView) {
                fetchAllTasks();
            }
        };

        window.addEventListener('tasks-changed', refreshAllTasks);

        return () => {
            window.removeEventListener('tasks-changed', refreshAllTasks);
        };
    }, [isAllProjectsView]);

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

            <div className="space-y-2 px-3 grow overflow-auto">
                {/* All Projects option */}
                <Card
                    className={`cursor-pointer ${isAllProjectsView ? 'border-2 border-primary' : ''}`}
                    onClick={handleSelectAllProjects}
                >
                    <CardHeader className="p-3 pb-1">
                        <div className="flex items-center">
                            <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: "#6366f1" }} // Indigo color for All Projects
                            />
                            <CardTitle className="text-base flex items-center">
                                <Layers className="h-4 w-4 mr-2" />
                                All Projects
                            </CardTitle>
                        </div>
                        <CardDescription className="truncate text-xs">
                            View tasks from all projects
                        </CardDescription>
                    </CardHeader>
                </Card>

                {/* Divider */}
                <div className="border-t border-gray-200 my-2"></div>

                {loading && <p className="text-center py-4">Loading projects...</p>}
                {error && <p className="text-center text-red-500 py-4">{error}</p>}
                {!loading && !error && projects.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No projects found. Create one to get started!</p>
                )}
                {Array.isArray(projects) && projects.map(project => (
                    <Card
                        key={project.id}
                        className={`cursor-pointer ${selectedProject?.id === project.id && !isAllProjectsView ? 'border-2 border-primary' : ''}`}
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
                    onSubmit={(project) => {
                        // Create a wrapper that ensures id is properly handled
                        const projectWithId = project.id ? project : { ...project, id: selectedProject.id };
                        return handleUpdateProject(projectWithId as Partial<Project> & { id: number });
                    }}
                    onCancel={() => setIsEditingProject(false)}
                />
            )}

            {selectedProject && !isAllProjectsView && (
                <div className="mt-4">
                    <TaskList
                        projectId={selectedProject.id}
                        onTasksChanged={fetchProjects}
                    />
                </div>
            )}

            {isAllProjectsView && (
                <div className="mt-4">
                    <AllTasksList
                        tasks={allTasks}
                        onTasksChanged={fetchAllTasks}
                    />
                </div>
            )}
        </div>
    );
}
