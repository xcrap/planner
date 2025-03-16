import { createContext, useContext, useState, ReactNode } from 'react';

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

type TaskContextType = {
    selectedTask: Task | null;
    setSelectedTask: (task: Task | null) => void;
    handleTaskUpdate: (task: Task) => Promise<void>;
    handleTaskDelete: (taskId: number) => Promise<void>;
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children, onTasksChanged }: { children: ReactNode, onTasksChanged: () => void }) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const handleTaskUpdate = async (task: Task) => {
        try {
            const isNewTask = !task.id;
            const url = isNewTask ? '/api/tasks' : `/api/tasks/${task.id}`;
            const method = isNewTask ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });

            if (response.ok) {
                setSelectedTask(null);
                onTasksChanged(); // This will trigger updates in both components
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleTaskDelete = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setSelectedTask(null);
                onTasksChanged(); // This will trigger updates in both components
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    return (
        <TaskContext.Provider value={{
            selectedTask,
            setSelectedTask,
            handleTaskUpdate,
            handleTaskDelete,
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
