import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { useTaskContext } from '@/contexts/task-context';

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

type TaskListProps = {
    projectId: number;
    onTasksChanged: () => void;
};

export function TaskList({ projectId, onTasksChanged }: TaskListProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const { setSelectedTask, handleTaskDelete } = useTaskContext();

    const fetchTasks = useCallback(async () => {
        if (!projectId) return;
        
        try {
            const response = await fetch(`/api/projects/${projectId}`);
            const project = await response.json();
            setTasks(project.tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }, [projectId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks, projectId]);

    const handleAddClick = () => {
        // Create a new task with UTC dates
        const today = new Date();
        const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        
        const newTask = {
            id: 0, // This will be replaced by the server
            name: '',
            description: '',
            startDate: format(utcToday, 'yyyy-MM-dd'),
            endDate: format(utcToday, 'yyyy-MM-dd'),
            completed: false,
            order: tasks.length,
            projectId: projectId
        };
        setSelectedTask(newTask);
    };

    const handleDeleteTask = async (taskId: number) => {
        await handleTaskDelete(taskId);
        fetchTasks(); // Refresh the list after deletion
    };

    const handleToggleTaskCompletion = async (taskId: number, completed: boolean) => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });

            if (response.ok) {
                fetchTasks();
                onTasksChanged();
            }
        } catch (error) {
            console.error('Error updating task completion:', error);
        }
    };

    // Normalize date to exact UTC without any timezone conversion
    const normalizeToUTCDate = (date: string) => {
        const d = new Date(date);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };
    
    // Format date in UTC explicitly using standard JavaScript methods
    const formatUTCDate = (dateString: string) => {
        if (!dateString) return '';
        const date = normalizeToUTCDate(dateString);
        // Use universal date formatting that maintains UTC
        const month = date.toLocaleString('en', { month: 'short', timeZone: 'UTC' });
        const day = date.getUTCDate();
        return `${month} ${day}`;
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Tasks</h3>
                <Button
                    size="sm"
                    onClick={handleAddClick}
                    variant="outline"
                >
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
            </div>

            <div className="space-y-2 mt-4">
                {tasks.length === 0 ? (
                    <p className="text-sm text-gray-500">No tasks yet. Create your first task!</p>
                ) : (
                    tasks
                        .sort((a, b) => a.order - b.order)
                        .map(task => (
                            <Card key={task.id} className="relative">
                                <CardContent className="p-3">
                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            checked={task.completed}
                                            onCheckedChange={(checked) =>
                                                handleToggleTaskCompletion(task.id, checked === true)
                                            }
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                                    {task.name}
                                                </h4>
                                                <div className="flex space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedTask(task)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteTask(task.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>

                                            {task.description && (
                                                <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {task.description}
                                                </p>
                                            )}

                                            <div className="flex text-xs text-gray-500 mt-2">
                                                <span className="flex-1">
                                                    {formatUTCDate(task.startDate)} - {formatUTCDate(task.endDate)}
                                                </span>
                                                <span>
                                                    #{task.order}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                )}
            </div>
        </div>
    );
}
