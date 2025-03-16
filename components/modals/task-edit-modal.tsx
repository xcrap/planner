import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaskContext } from "@/contexts/task-context";
import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function TaskEditModal() {
    const { selectedTask, setSelectedTask, handleTaskUpdate, handleTaskDelete } = useTaskContext();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        completed: false,
        projectId: 0,
    });
    const [projects, setProjects] = useState<Array<{ id: number, name: string }>>([]);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

    // Normalize date to UTC
    // Replace your normalizeToUTCDate function with this corrected version:
    const normalizeToUTCDate = (date: string) => {
        // If date is in YYYY-MM-DD format, parse it correctly to avoid timezone issues
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-').map(Number);
            return new Date(Date.UTC(year, month - 1, day)); // Month is 0-indexed in JS
        }

        // For other formats, use the previous approach
        const d = new Date(date);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };

    // Add this function after your normalizeToUTCDate function
    const getCalendarSelectedDate = (dateString: string) => {
        if (!dateString) return undefined;

        // Parse the yyyy-MM-dd string and create a local date object that will display correctly
        const [year, month, day] = dateString.split('-').map(Number);

        // Create a local date without time components
        return new Date(year, month - 1, day);
    };

    // Fetch all projects for the dropdown
    const fetchProjects = useCallback(async () => {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            } else {
                console.error('Failed to fetch projects');
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    }, []);

    useEffect(() => {
        // Fetch projects when the component mounts
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (!selectedTask) return;

        // Extract the date part only - important for correct UTC handling
        let startDateStr = selectedTask.startDate;
        let endDateStr = selectedTask.endDate;

        if (startDateStr.includes('T')) {
            startDateStr = startDateStr.split('T')[0];
        }

        if (endDateStr.includes('T')) {
            endDateStr = endDateStr.split('T')[0];
        }

        setFormData({
            name: selectedTask.name || '',
            description: selectedTask.description || '',
            // Use exact date strings without any timezone manipulation
            startDate: startDateStr,
            endDate: endDateStr,
            completed: selectedTask.completed || false,
            projectId: selectedTask.projectId,
        });
    }, [selectedTask]);

    if (!selectedTask) return null;

    const isNewTask = !selectedTask.id || selectedTask.id === 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.projectId) {
            alert("Please select a project"); // Add user feedback
            return;
        }

        // console.log('Submitting form data:', formData);

        // Validate project ID before proceeding
        if (!formData.projectId || formData.projectId <= 0) {
            console.error("Invalid project ID");
            return;
        }

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
                window.dispatchEvent(new Event('refresh-gantt'));
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
                    <div className="space-y-2">
                        <Label htmlFor="project">Project</Label>
                        <Select
                            value={String(formData.projectId)}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: Number.parseInt(value) }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={String(project.id)}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Start Date Picker */}
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.startDate ? format(new Date(`${formData.startDate}T12:00:00Z`), "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={getCalendarSelectedDate(formData.startDate)}
                                        onSelect={(date) => {
                                            if (date) {
                                                // Format date directly without UTC conversion
                                                const year = date.getFullYear();
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    startDate: `${year}-${month}-${day}`
                                                }));
                                            }
                                            // Close the popover after selection
                                            setStartDateOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* End Date Picker - use the same pattern */}
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !formData.endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.endDate ? format(new Date(`${formData.endDate}T12:00:00Z`), "PPP") : "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={getCalendarSelectedDate(formData.endDate)}
                                        onSelect={(date) => {
                                            if (date) {
                                                // Format date directly without UTC conversion
                                                const year = date.getFullYear();
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    endDate: `${year}-${month}-${day}`
                                                }));
                                            }
                                            // Close the popover after selection
                                            setEndDateOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 my-6">
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
                            onClick={() => {
                                handleTaskDelete(selectedTask.id)
                                    .then(() => {
                                        // Close the modal
                                        setSelectedTask(null);

                                        // Notify components that tasks have changed
                                        window.dispatchEvent(new Event('tasks-changed'));
                                        window.dispatchEvent(new Event('refresh-gantt'));
                                    })
                                    .catch(error => {
                                        console.error("Failed to delete task:", error);
                                    });
                            }}
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
