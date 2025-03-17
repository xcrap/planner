import { createContext, useState, useContext, ReactNode } from 'react';
import type { Task } from '@/types/task';
import { useAppStore } from '@/lib/store';

interface TaskContextType {
    selectedTask: Task | null;
    setSelectedTask: (task: Task | null) => void;
    handleTaskUpdate: (task: Task) => Promise<void>;
    handleTaskDelete: (taskId: number) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
    children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const updateTask = useAppStore(state => state.updateTask);
    const deleteTask = useAppStore(state => state.deleteTask);
    const addTask = useAppStore(state => state.addTask);

    const handleTaskUpdate = async (task: Task) => {
        try {
            let result;

            if (task.id) {
                // Update existing task
                result = await updateTask(task);
            } else {
                // Create new task
                result = await addTask(task);
            }

            if (result) {
                // Close the modal after successful update
                setSelectedTask(null);

                return Promise.resolve();
            } else {
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
            const success = await deleteTask(taskId);

            if (success) {
                setSelectedTask(null);

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
