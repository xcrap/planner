import { useState } from 'react';
import {
    Card,
    CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { useTaskContext } from '@/contexts/task-context';
import { Task } from '@/types/task';

type AllTasksListProps = {
    tasks: Task[];
    onTasksChanged: () => void;
};

export function AllTasksList({ tasks, onTasksChanged }: AllTasksListProps) {
    const { selectedTask, setSelectedTask, handleTaskDelete } = useTaskContext();
    const [updateKey, setUpdateKey] = useState(0);

    const handleToggleTaskCompletion = async (taskId: number, completed: boolean) => {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });

            if (response.ok) {
                onTasksChanged();
                window.dispatchEvent(new Event('tasks-changed'));
                window.dispatchEvent(new Event('refresh-gantt'));
            }
        } catch (error) {
            console.error('Error updating task completion:', error);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        await handleTaskDelete(taskId);
        onTasksChanged();
    };

    const normalizeToUTCDate = (date: string) => {
        if (!date) return new Date();

        try {
            const datePart = date.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);
            return new Date(Date.UTC(year, month - 1, day));
        } catch (error) {
            console.error("Date parsing error:", error);
            return new Date();
        }
    };

    const formatUTCDate = (dateString: string) => {
        if (!dateString) return '';
        const date = normalizeToUTCDate(dateString);
        const month = date.toLocaleString('en', { month: 'short', timeZone: 'UTC' });
        const day = date.getUTCDate();
        return `${month} ${day}`;
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">All Tasks</h3>
            </div>

            <div className="space-y-2 mt-4">
                {tasks.length === 0 ? (
                    <p className="text-sm text-gray-500">No tasks found in any project.</p>
                ) : (
                    tasks.map(task => (
                        <Card key={`${task.id}-${updateKey}`} className="relative">
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
                                            <div>
                                                <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                                    {task.name}
                                                </h4>
                                                <div className="flex items-center mt-1">
                                                    <div
                                                        className="w-2 h-2 rounded-full mr-1"
                                                        style={{ backgroundColor: task.projectColor || '#cbd5e1' }}
                                                    />
                                                    <span className="text-xs text-gray-600">
                                                        {task.projectName || 'Unknown Project'}
                                                    </span>
                                                </div>
                                            </div>
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
                                            <span>
                                                {formatUTCDate(task.startDate)} - {formatUTCDate(task.endDate)}
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
