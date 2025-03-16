import { createContext, useState, useContext, ReactNode } from 'react';

type Task = {
    id: number;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    completed: boolean;
    order: number;
    projectId: number;
};

interface TaskContextType {
    selectedTask: Task | null;
    setSelectedTask: (task: Task | null) => void;
    handleTaskUpdate: (task: Task) => Promise<void>;
    handleTaskDelete: (taskId: number) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
    children: ReactNode;
    onTasksChanged?: () => void;
}

export function TaskProvider({ children, onTasksChanged }: TaskProviderProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    const handleTaskUpdate = async (task: Task) => {
        try {
            const response = await fetch(`/api/tasks/${task.id || ''}`, {
                method: task.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            
            if (response.ok) {
                // First call onTasksChanged to update the project data
                if (onTasksChanged) {
                    await onTasksChanged(); // Wait for this to complete
                }
                
                // Close the modal after data update is done
                setSelectedTask(null);
                return Promise.resolve();
            } else {
                console.error('Error updating task:', await response.text());
                return Promise.reject('Failed to update task');
            }
        } catch (error) {
            console.error('Error updating task:', error);
            return Promise.reject(error);
        }
    };
    
    const handleTaskDelete = async (taskId: number) => {
        if (!taskId) return Promise.resolve();
        
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                setSelectedTask(null);
                // Call onTasksChanged with a slight delay
                if (onTasksChanged) {
                    setTimeout(onTasksChanged, 0);
                }
                return Promise.resolve();
            } else {
                return Promise.reject('Failed to delete task');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            return Promise.reject(error);
        }
    };
    
    return (
        <TaskContext.Provider value={{
            selectedTask,
            setSelectedTask,
            handleTaskUpdate,
            handleTaskDelete
        }}>
            {children}
        </TaskContext.Provider>
    );
}

export const useTaskContext = () => {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error('useTaskContext must be used within a TaskProvider');
    }
    return context;
};
