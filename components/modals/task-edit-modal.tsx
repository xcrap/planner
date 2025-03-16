import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaskContext } from "@/contexts/task-context";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';

export function TaskEditModal() {
    const { selectedTask, setSelectedTask, handleTaskUpdate, handleTaskDelete } = useTaskContext();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        completed: false,
    });

    // Normalize date to UTC
    const normalizeToUTCDate = (date: string) => {
        const d = new Date(date);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };

    // Function to format date to UTC in YYYY-MM-DD format WITHOUT timezone conversion
    const formatDateToUTC = (dateString: string) => {
        if (!dateString) return '';

        // If the dateString is already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        // Otherwise, normalize to UTC and format
        const utcDate = normalizeToUTCDate(dateString);
        return format(utcDate, 'yyyy-MM-dd');
    };

    useEffect(() => {
        if (!selectedTask) return;

        // Log the raw dates from the database for debugging
        console.log('Database date strings:', selectedTask.startDate, selectedTask.endDate);

        // Extract the date part only - important for correct UTC handling
        let startDateStr = selectedTask.startDate;
        let endDateStr = selectedTask.endDate;

        if (startDateStr.includes('T')) {
            startDateStr = startDateStr.split('T')[0];
        }

        if (endDateStr.includes('T')) {
            endDateStr = endDateStr.split('T')[0];
        }

        console.log('Formatted UTC dates:', startDateStr, endDateStr);

        setFormData({
            name: selectedTask.name || '',
            description: selectedTask.description || '',
            // Use exact date strings without any timezone manipulation
            startDate: startDateStr,
            endDate: endDateStr,
            completed: selectedTask.completed || false,
        });
    }, [selectedTask]);

    if (!selectedTask) return null;

    const isNewTask = !selectedTask.id || selectedTask.id === 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting form data:', formData);

        // Add UTC time to indicate these are UTC dates
        const updatedTask = {
            ...selectedTask,
            ...formData,
            startDate: `${formData.startDate}T00:00:00.000Z`,
            endDate: `${formData.endDate}T00:00:00.000Z`,
        };

        handleTaskUpdate(updatedTask)
            .then(() => {
                // Close the modal before task change propagation
                setSelectedTask(null);

                // Dispatch a custom event to notify all components that tasks have changed
                window.dispatchEvent(new Event('tasks-changed'));

                // If the task belongs to the currently selected project in the Gantt chart,
                // trigger a refresh there too
                if (typeof window.currentProjectId !== 'undefined' &&
                    window.currentProjectId === updatedTask.projectId) {
                    window.dispatchEvent(new Event('refresh-gantt'));
                }
            })
            .catch(error => {
                console.error("Failed to update task:", error);
            });
    };

    return (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isNewTask ? 'Add Task' : 'Edit Task'}</DialogTitle>
                    <DialogDescription>
                        {isNewTask ? 'Create a new task' : 'Edit the details of your task'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date (UTC)</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date (UTC)</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="completed"
                            checked={formData.completed}
                            onCheckedChange={(checked) =>
                                setFormData(prev => ({ ...prev, completed: checked === true }))
                            }
                        />
                        <Label htmlFor="completed">Mark as completed</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleTaskDelete(selectedTask.id)}
                        >
                            Delete
                        </Button>
                        <Button type="submit">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
