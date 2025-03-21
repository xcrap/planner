import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task } from '@/types/task';

type AppState = {
    // Current state
    projects: Project[];
    isLoading: boolean;
    error: string | null;
    selectedProjectId: number | null;
    selectedTask: Task | null;
    
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
    reorderProjects: (projectIds: number[]) => Promise<boolean>;
    
    // Actions - Task Operations
    setTask: (task: Task) => void;
    addTask: (task: Omit<Task, 'id'>) => Promise<Task | null>;
    updateTask: (task: Partial<Task> & { id: number }, silentUpdate?: boolean) => Promise<Task | null>;
    deleteTask: (taskId: number) => Promise<boolean>;
    setSelectedTask: (task: Task | null) => void;
    reorderTasks: (projectId: number, taskIds: number[]) => Promise<boolean>;
    
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
            selectedTask: null,
            
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
                // Return tasks sorted by their inherent order
                return project?.tasks?.slice().sort((a, b) => {
                    // First sort by order property if it exists
                    if (a.order !== undefined && b.order !== undefined) {
                        return a.order - b.order;
                    }
                    // Fall back to sorting by id if order is not available
                    return a.id - b.id;
                }) || [];
            },
            getAllTasks: () => {
                return get().projects.reduce((allTasks, project) => {
                    if (project.tasks && project.tasks.length > 0) {
                        // Sort tasks using the same logic as in getTasksByProjectId
                        const sortedTasks = project.tasks.slice().sort((a, b) => {
                            // First sort by order property if it exists
                            if (a.order !== undefined && b.order !== undefined) {
                                return a.order - b.order;
                            }
                            // Fall back to sorting by id if order is not available
                            return a.id - b.id;
                        });
                        
                        const projectTasks = sortedTasks.map(task => ({
                            ...task,
                            projectName: project.name,
                            projectColor: project.color
                        }));
                        
                        allTasks.push(...projectTasks);
                    }
                    
                    return allTasks;
                }, [] as (Task & { projectName: string; projectColor: string })[]);
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
                    }
                    
                    set({ error: "Failed to add project" });
                    return null;
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
                    }
                    
                    // If API call fails, revert to the previous state
                    set({ projects: currentProjects, error: "Failed to update project" });
                    return null;
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
                    }
                    
                    // Revert the optimistic update
                    set({ projects: currentProjects, error: "Failed to delete project" });
                    return false;
                } catch (error) {
                    console.error("Error deleting project:", error);
                    set({ error: "Error deleting project" });
                    return false;
                }
            },
            
            reorderProjects: async (projectIds) => {
                try {
                    const currentProjects = get().projects;
                    
                    // Create a new array of projects with updated order
                    // Assign higher values to items that should appear first (reverse the index)
                    const projectsWithNewOrder = projectIds.map((id, index) => {
                        return {
                            id,
                            order: projectIds.length - index  // Higher values for items at the beginning
                        };
                    });
                    
                    // Optimistic update
                    const updatedProjects = [...currentProjects].sort((a, b) => {
                        const aIndex = projectIds.indexOf(a.id);
                        const bIndex = projectIds.indexOf(b.id);
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });
                    
                    // Update the order property on each project
                    updatedProjects.forEach((project, index) => {
                        if (projectIds.includes(project.id)) {
                            project.order = projectIds.length - index;  // Higher values for higher priority
                        }
                    });
                    
                    set({ projects: updatedProjects });
                    
                    // Send update to API
                    const response = await fetch("/api/projects", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projects: projectsWithNewOrder }),
                    });
                    
                    if (response.ok) {
                        return true;
                    }
                    
                    // Revert on failure
                    set({ projects: currentProjects, error: "Failed to reorder projects" });
                    return false;
                } catch (error) {
                    console.error("Error reordering projects:", error);
                    set({ error: "Error reordering projects" });
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
                    }
                    
                    set({ error: "Failed to add task" });
                    return null;
                } catch (error) {
                    console.error("Error adding task:", error);
                    set({ error: "Error adding task" });
                    return null;
                }
            },
            
            updateTask: async (task, silentUpdate = false) => {
                if (!task.id) return null;
                
                try {
                    // Find the task in the current state to get full task data
                    const fullTask = get().getTaskById(task.id);
                    if (!fullTask) return null;
                    
                    // Merge the changes with the full task
                    const updatedTask = { ...fullTask, ...task };
                    
                    // Optimistic update - always perform this
                    get().setTask(updatedTask as Task);
                    
                    // For silent updates used in drag/resize, return early after optimistic update
                    if (silentUpdate) {
                        // Still send the request to the server, but don't wait for response to update UI
                        fetch(`/api/tasks/${task.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(updatedTask),
                        }).catch(err => console.error("Background task update failed:", err));
                        
                        return updatedTask as Task;
                    }
                    
                    // For normal updates, continue with standard flow
                    const response = await fetch(`/api/tasks/${task.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updatedTask),
                    });
                    
                    if (response.ok) {
                        const serverTask = await response.json();
                        // Ensure our local state matches server state
                        get().setTask(serverTask);
                        // Clear selected task
                        set({ selectedTask: null });
                        return serverTask;
                    }
                    
                    // If API call fails, we should re-fetch the project to get correct data
                    if (fullTask.projectId) {
                        get().fetchProjectDetails(fullTask.projectId);
                    } else {
                        get().fetchProjects();
                    }
                    set({ error: "Failed to update task" });
                    return null;
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
                        
                        set({ 
                            projects: updatedProjects,
                            selectedTask: null // Clear selected task
                        });
                    }
                    
                    const response = await fetch(`/api/tasks/${taskId}`, {
                        method: "DELETE",
                    });
                    
                    if (response.ok) {
                        // Task was successfully deleted, state is already updated
                        return true;
                    }
                    
                    // Revert by re-fetching project data
                    if (task.projectId) {
                        get().fetchProjectDetails(task.projectId);
                    } else {
                        get().fetchProjects();
                    }
                    set({ error: "Failed to delete task" });
                    return false;
                } catch (error) {
                    console.error("Error deleting task:", error);
                    set({ error: "Error deleting task" });
                    get().fetchProjects(); // Revert by re-fetching data
                    return false;
                }
            },
            
            // Add reorderTasks function
            reorderTasks: async (projectId, taskIds) => {
                try {
                    const currentProjects = [...get().projects];
                    const projectIndex = currentProjects.findIndex(p => p.id === projectId);
                    
                    if (projectIndex === -1) return false;
                    
                    // Create a new array of tasks with updated order
                    // Assign sequential order values (lower values come first)
                    const tasksWithNewOrder = taskIds.map((id, index) => {
                        return {
                            id,
                            order: index * 10  // Use intervals of 10 to allow for insertions
                        };
                    });
                    
                    // Optimistic update
                    if (currentProjects[projectIndex].tasks) {
                        // Sort the tasks in this project based on the new order
                        const updatedProject = {...currentProjects[projectIndex]};
                        const updatedTasks = [...(updatedProject.tasks || [])].sort((a, b) => {
                            const aIndex = taskIds.indexOf(a.id);
                            const bIndex = taskIds.indexOf(b.id);
                            
                            if (aIndex === -1) return 1;
                            if (bIndex === -1) return -1;
                            return aIndex - bIndex;
                        });
                        
                        // Update the order property on each task
                        updatedTasks.forEach((task, index) => {
                            if (taskIds.includes(task.id)) {
                                task.order = index * 10;  // Use intervals of 10
                            }
                        });
                        
                        updatedProject.tasks = updatedTasks;
                        currentProjects[projectIndex] = updatedProject;
                        set({ projects: currentProjects });
                    }
                    
                    // Send update to API using the existing tasks endpoint
                    const response = await fetch("/api/tasks", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tasks: tasksWithNewOrder }),
                    });
                    
                    if (response.ok) {
                        return true;
                    }
                    
                    // On failure, revert to original state
                    get().fetchProjectDetails(projectId);
                    return false;
                } catch (error) {
                    console.error("Error reordering tasks:", error);
                    set({ error: "Error reordering tasks" });
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
                        
                        // Sort projects by order
                        const sortedProjects = projectsArray.sort((a, b) => {
                            if (a.order !== undefined && b.order !== undefined) {
                                return b.order - a.order;
                            }
                            return a.id - b.id;
                        });
                        
                        set({ projects: sortedProjects, isLoading: false });
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
                    }
                    
                    set({ error: "Failed to fetch project details", isLoading: false });
                    return null;
                } catch (error) {
                    console.error("Error fetching project details:", error);
                    set({ error: "Error fetching project details", isLoading: false });
                    return null;
                }
            },
            setSelectedTask: (task) => set({ selectedTask: task }),
        }),
        {
            name: 'gantt-app-storage',
            // Only persist specific parts of the state
            partialize: (state) => ({ 
                selectedProjectId: state.selectedProjectId,
                selectedTask: state.selectedTask // Add task to persisted state
            }),
        }
    )
);
