import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
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
import { useAppStore } from "@/lib/store";

export function TaskEditModal() {
    const selectedTask = useAppStore(state => state.selectedTask);
    const setSelectedTask = useAppStore(state => state.setSelectedTask);
    const updateTask = useAppStore(state => state.updateTask);
    const deleteTask = useAppStore(state => state.deleteTask);
    const addTask = useAppStore(state => state.addTask);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        completed: false,
        projectId: 0,
    });
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

    // Get projects from store
    const projects = useAppStore(state => state.projects);

    // Add this function
    const getCalendarSelectedDate = (dateString: string) => {
        if (!dateString) return undefined;

        // Parse the yyyy-MM-dd string and create a local date object that will display correctly
        const [year, month, day] = dateString.split('-').map(Number);

        // Create a local date without time components
        return new Date(year, month - 1, day);
    };

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
            alert("Please select a project");
            return;
        }

        // Validate project ID before proceeding
        if (!formData.projectId || formData.projectId <= 0) {
            console.error("Invalid project ID");
            return;
        }

        // Add UTC time to indicate these are UTC dates
        const taskWithDates = {
            ...formData,
            startDate: `${formData.startDate}T00:00:00.000Z`,
            endDate: `${formData.endDate}T00:00:00.000Z`,
            order: selectedTask.order
        };

        if (isNewTask) {
            // Use addTask for new tasks
            addTask(taskWithDates)
                .then(() => {
                    setSelectedTask(null); // Close modal after adding
                })
                .catch(error => {
                    console.error("Failed to create task:", error);
                });
        } else {
            // Use updateTask for existing tasks
            updateTask({
                ...selectedTask,
                ...taskWithDates,
            })
                .catch(error => {
                    console.error("Failed to update task:", error);
                });
        }
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
                            <SelectContent className="bg-white border border-neutral-200 shadow-lg">
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
                                <PopoverContent className="w-auto p-0 border-0 shadow-lg" align="start">
                                    <Calendar
                                        mode="single"
                                        className="bg-white border border-neutral-200 rounded"
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
                                <PopoverContent className="w-auto p-0 border-0 shadow-lg" align="start">
                                    <Calendar
                                        mode="single"
                                        className="bg-white border border-neutral-200 rounded"
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
                        {!isNewTask && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    deleteTask(selectedTask.id)
                                        .then(() => {
                                            setSelectedTask(null); // Close modal after deletion
                                        })
                                        .catch(error => {
                                            console.error("Failed to delete task:", error);
                                        });
                                }}
                            >
                                Delete
                            </Button>
                        )}
                        <Button type="submit">
                            {isNewTask ? 'Create Task' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
