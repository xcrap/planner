import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTaskContext } from "@/contexts/task-context";
import { useState, useEffect } from "react";

export function TaskEditModal() {
    const { selectedTask, setSelectedTask, handleTaskUpdate, handleTaskDelete } = useTaskContext();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        if (selectedTask) {
            setFormData({
                name: selectedTask.name || '',
                description: selectedTask.description || '',
                startDate: selectedTask.startDate || new Date().toISOString().split('T')[0],
                endDate: selectedTask.endDate || new Date().toISOString().split('T')[0],
            });
        }
    }, [selectedTask]);

    if (!selectedTask) return null;

    const isNewTask = selectedTask.id === 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleTaskUpdate({
            ...selectedTask,
            ...formData,
        });
    };

    return (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isNewTask ? 'Add Task' : 'Edit Task'}</DialogTitle>
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
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
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
