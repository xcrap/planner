import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/types/task";

interface ProjectEditModalProps {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ProjectEditModal({ project, isOpen, onClose }: ProjectEditModalProps) {
    const { addProject, updateProject, deleteProject, projects } = useAppStore();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3b82f6', // Default blue color
    });

    // Preset colors for quick selection
    const presetColors = [
        "#3b82f6", // Blue
        "#21A6B9", // Teal
        "#4D3557", // Purple
        "#E55556", // Red
        "#FF9418", // Orange
        "#B0C900", // Green
        "#6b7280", // Gray
    ];

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || '',
                description: project.description || '',
                color: project.color || '#3b82f6',
            });
        } else {
            // Reset form for new project
            setFormData({
                name: '',
                description: '',
                color: '#3b82f6',
            });
        }
    }, [project]);

    const isNewProject = !project || !project.id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert("Project name is required");
            return;
        }

        try {
            if (isNewProject) {
                // Calculate next order value based on existing projects
                const nextOrder = Array.isArray(projects) && projects.length > 0
                    ? Math.max(...projects.map(p => p.order)) + 1
                    : 0;

                await addProject({
                    ...formData,
                    order: nextOrder
                });
            } else if (project) {
                await updateProject({
                    id: project.id,
                    ...formData
                });
            }
            onClose();
        } catch (error) {
            console.error("Failed to save project:", error);
        }
    };

    const handleDelete = async () => {
        if (!project?.id) return;

        if (confirm("Are you sure you want to delete this project?")) {
            try {
                await deleteProject(project.id);
                onClose();
            } catch (error) {
                console.error("Failed to delete project:", error);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isNewProject ? 'Add Project' : 'Edit Project'}</DialogTitle>
                    <DialogDescription>
                        {isNewProject ? 'Create a new project' : 'Edit project details'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Project name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Project description"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <div className="flex items-center gap-4">
                            <Input
                                type="color"
                                id="color"
                                value={formData.color}
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                className="w-12 h-8 p-1 shrink-0"
                            />
                            <div className="flex gap-2">
                                {presetColors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        className="size-7 rounded-full border border-gray-300 hover:scale-110 transition-transform shrink-0"
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                        title={color}
                                        aria-label={`Select color ${color}`}
                                    />
                                ))}
                            </div>
                            <Input
                                value={formData.color}
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                placeholder="#HEX"
                                className="flex-grow"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        {!isNewProject && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                            >
                                Delete
                            </Button>
                        )}
                        <Button type="submit">
                            {isNewProject ? 'Create Project' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
