import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task } from '@/types/task';

type AppState = {
    // Current state
    projects: Project[];
    isLoading: boolean;
    error: string | null;
    selectedProjectId: number | null;
    
    // Selectors
    getProjectById: (id: number) => Project | undefined;
    getTaskById: (id: number) => Task | undefined;
    getTasksByProjectId: (projectId: number) => Task[];
    getAllTasks: () => Task[];
    
    // Actions - Project Operations
    setSelectedProjectId: (id: number | null) => void;
    setProjects: (projects: Project[]) => void;
    addProject: (project: Omit<Project, 'id' | 'tasks'>) => Promise<Project | null>;
    updateProject: (project: Partial<Project> & { id: number }) => Promise<Project | null>;
    deleteProject: (projectId: number) => Promise<boolean>;
    
    // Actions - Task Operations
    setTask: (task: Task) => void;
    addTask: (task: Omit<Task, 'id'>) => Promise<Task | null>;
    updateTask: (task: Partial<Task> & { id: number }) => Promise<Task | null>;
    deleteTask: (taskId: number) => Promise<boolean>;
    
    // Data fetching
    fetchProjects: () => Promise<void>;
    fetchProjectDetails: (projectId: number) => Promise<Project | null>;
};

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Initial state
            projects: [],
            isLoading: false,
            error: null,
            selectedProjectId: null,
            
            // Selectors
            getProjectById: (id) => get().projects.find(project => project.id === id),
            getTaskById: (id) => {
                for (const project of get().projects) {
                    if (project.tasks) {
                        const task = project.tasks.find(task => task.id === id);
                        if (task) return task;
                    }
                }
                return undefined;
            },
            getTasksByProjectId: (projectId) => {
                const project = get().projects.find(p => p.id === projectId);
                return project?.tasks || [];
            },
            getAllTasks: () => {
                return get().projects.flatMap(project => 
                    project.tasks?.map(task => ({
                        ...task,
                        projectName: project.name,
                        projectColor: project.color
                    })) || []
                );
            },
            
            // Project actions
            setSelectedProjectId: (id) => set({ selectedProjectId: id }),
            setProjects: (projects) => set({ projects }),
            
            addProject: async (project) => {
                try {
                    const response = await fetch("/api/projects", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(project),
                    });
                    
                    if (response.ok) {
                        const newProject = await response.json();
                        // Update the projects in our store
                        set(state => ({
                            projects: [...state.projects, { ...newProject, tasks: [] }]
                        }));
                        return newProject;
                    } else {
                        set({ error: "Failed to add project" });
                        return null;
                    }
                } catch (error) {
                    console.error("Error adding project:", error);
                    set({ error: "Error adding project" });
                    return null;
                }
            },
            
            updateProject: async (project) => {
                try {
                    // Optimistic update
                    const currentProjects = get().projects;
                    const projectIndex = currentProjects.findIndex(p => p.id === project.id);
                    
                    if (projectIndex !== -1) {
                        const updatedProjects = [...currentProjects];
                        updatedProjects[projectIndex] = {
                            ...updatedProjects[projectIndex],
                            ...project
                        };
                        set({ projects: updatedProjects });
                    }
                    
                    const response = await fetch(`/api/projects/${project.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(project),
                    });
                    
                    if (response.ok) {
                        const updatedProject = await response.json();
                        // We already did the optimistic update, so we just ensure the data is correct
                        get().fetchProjects(); // Refresh all projects to ensure consistency
                        return updatedProject;
                    } else {
                        // If API call fails, revert to the previous state
                        set({ projects: currentProjects, error: "Failed to update project" });
                        return null;
                    }
                } catch (error) {
                    console.error("Error updating project:", error);
                    set({ error: "Error updating project" });
                    return null;
                }
            },
            
            deleteProject: async (projectId) => {
                try {
                    // Optimistic update
                    const currentProjects = get().projects;
                    set({ 
                        projects: currentProjects.filter(p => p.id !== projectId)
                    });
                    
                    const response = await fetch(`/api/projects/${projectId}`, {
                        method: "DELETE",
                    });
                    
                    if (response.ok) {
                        // Update was successful, already removed from state
                        if (get().selectedProjectId === projectId) {
                            set({ selectedProjectId: null });
                        }
                        return true;
                    } else {
                        // Revert the optimistic update
                        set({ projects: currentProjects, error: "Failed to delete project" });
                        return false;
                    }
                } catch (error) {
                    console.error("Error deleting project:", error);
                    set({ error: "Error deleting project" });
                    return false;
                }
            },
            
            // Task actions
            setTask: (task) => {
                // This function updates a task in the local state
                const projects = get().projects;
                const projectIndex = projects.findIndex(p => p.id === task.projectId);
                
                if (projectIndex !== -1) {
                    const project = projects[projectIndex];
                    const taskIndex = project.tasks?.findIndex(t => t.id === task.id) ?? -1;
                    
                    const updatedProjects = [...projects];
                    if (taskIndex !== -1 && project.tasks) {
                        // Update existing task
                        const updatedTasks = [...project.tasks];
                        updatedTasks[taskIndex] = task;
                        updatedProjects[projectIndex] = { ...project, tasks: updatedTasks };
                    } else if (project.tasks) {
                        // Add new task
                        updatedProjects[projectIndex] = { 
                            ...project, 
                            tasks: [...project.tasks, task] 
                        };
                    } else {
                        // Initialize tasks array if it doesn't exist
                        updatedProjects[projectIndex] = { 
                            ...project, 
                            tasks: [task] 
                        };
                    }
                    
                    set({ projects: updatedProjects });
                }
            },
            
            addTask: async (task) => {
                try {
                    const response = await fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(task),
                    });
                    
                    if (response.ok) {
                        const newTask = await response.json();
                        
                        // Update task in project
                        const projects = get().projects;
                        const projectIndex = projects.findIndex(p => p.id === task.projectId);
                        
                        if (projectIndex !== -1) {
                            const updatedProjects = [...projects];
                            const project = updatedProjects[projectIndex];
                            
                            if (project.tasks) {
                                updatedProjects[projectIndex] = {
                                    ...project,
                                    tasks: [...project.tasks, newTask]
                                };
                            } else {
                                updatedProjects[projectIndex] = {
                                    ...project,
                                    tasks: [newTask]
                                };
                            }
                            
                            set({ projects: updatedProjects });
                        }
                        
                        return newTask;
                    } else {
                        set({ error: "Failed to add task" });
                        return null;
                    }
                } catch (error) {
                    console.error("Error adding task:", error);
                    set({ error: "Error adding task" });
                    return null;
                }
            },
            
            updateTask: async (task) => {
                if (!task.id) return null;
                
                try {
                    // Find the task in the current state to get full task data
                    const fullTask = get().getTaskById(task.id);
                    if (!fullTask) return null;
                    
                    // Merge the changes with the full task
                    const updatedTask = { ...fullTask, ...task };
                    
                    // Optimistic update
                    get().setTask(updatedTask as Task);
                    
                    const response = await fetch(`/api/tasks/${task.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updatedTask),
                    });
                    
                    if (response.ok) {
                        const serverTask = await response.json();
                        // Ensure our local state matches server state
                        get().setTask(serverTask);
                        return serverTask;
                    } else {
                        // If API call fails, we should re-fetch the project to get correct data
                        if (fullTask.projectId) {
                            get().fetchProjectDetails(fullTask.projectId);
                        } else {
                            get().fetchProjects();
                        }
                        set({ error: "Failed to update task" });
                        return null;
                    }
                } catch (error) {
                    console.error("Error updating task:", error);
                    set({ error: "Error updating task" });
                    // Revert by re-fetching data
                    get().fetchProjects();
                    return null;
                }
            },
            
            deleteTask: async (taskId) => {
                try {
                    // Find which project contains this task
                    const task = get().getTaskById(taskId);
                    if (!task) return false;
                    
                    // Optimistic update - remove task from state
                    const projects = get().projects;
                    const projectIndex = projects.findIndex(p => p.id === task.projectId);
                    
                    if (projectIndex !== -1 && projects[projectIndex].tasks) {
                        const updatedProjects = [...projects];
                        const project = updatedProjects[projectIndex];
                        
                        updatedProjects[projectIndex] = {
                            ...project,
                            tasks: project.tasks?.filter(t => t.id !== taskId) || []
                        };
                        
                        set({ projects: updatedProjects });
                    }
                    
                    const response = await fetch(`/api/tasks/${taskId}`, {
                        method: "DELETE",
                    });
                    
                    if (response.ok) {
                        // Task was successfully deleted, state is already updated
                        return true;
                    } else {
                        // Revert by re-fetching project data
                        if (task.projectId) {
                            get().fetchProjectDetails(task.projectId);
                        } else {
                            get().fetchProjects();
                        }
                        set({ error: "Failed to delete task" });
                        return false;
                    }
                } catch (error) {
                    console.error("Error deleting task:", error);
                    set({ error: "Error deleting task" });
                    get().fetchProjects(); // Revert by re-fetching data
                    return false;
                }
            },
            
            // Data fetching functions
            fetchProjects: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await fetch("/api/projects");
                    
                    if (response.ok) {
                        const data = await response.json();
                        const projectsArray = Array.isArray(data) ? data :
                            (data.projects && Array.isArray(data.projects) ? data.projects : []);
                        
                        set({ projects: projectsArray, isLoading: false });
                    } else {
                        set({ error: "Failed to fetch projects", isLoading: false });
                    }
                } catch (error) {
                    console.error("Error fetching projects:", error);
                    set({ error: "Error fetching projects", isLoading: false });
                }
            },
            
            fetchProjectDetails: async (projectId) => {
                try {
                    set(state => ({ 
                        isLoading: true, 
                        error: null,
                        // Mark project as selected
                        selectedProjectId: projectId
                    }));
                    
                    const response = await fetch(`/api/projects/${projectId}`);
                    
                    if (response.ok) {
                        const projectData = await response.json();
                        
                        // Update this specific project in our projects array
                        set(state => {
                            const existingProjects = [...state.projects];
                            const projectIndex = existingProjects.findIndex(p => p.id === projectId);
                            
                            if (projectIndex !== -1) {
                                existingProjects[projectIndex] = projectData;
                            } else {
                                existingProjects.push(projectData);
                            }
                            
                            return { 
                                projects: existingProjects, 
                                isLoading: false 
                            };
                        });
                        
                        return projectData;
                    } else {
                        set({ error: "Failed to fetch project details", isLoading: false });
                        return null;
                    }
                } catch (error) {
                    console.error("Error fetching project details:", error);
                    set({ error: "Error fetching project details", isLoading: false });
                    return null;
                }
            }
        }),
        {
            name: 'gantt-app-storage',
            // Only persist specific parts of the state
            partialize: (state) => ({ 
                selectedProjectId: state.selectedProjectId 
            }),
        }
    )
);
