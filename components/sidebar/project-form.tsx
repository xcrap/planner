import { useState } from 'react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Project = {
    id: number;
    name: string;
    description: string | null;
    color: string;
};

type ProjectFormProps = {
    project?: Project;
    onSubmit: (project: Omit<Project, 'id'> & { id?: number }) => void;
    onCancel: () => void;
};

export function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
    const [formData, setFormData] = useState({
        name: project?.name || '',
        description: project?.description || '',
        color: project?.color || '#3498db'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(project?.id ? { ...formData, id: project.id } : formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Card className="mb-4">
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>{project ? 'Edit Project' : 'New Project'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Project name"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Project description"
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                id="color"
                                name="color"
                                value={formData.color}
                                onChange={handleChange}
                                className="w-12 h-10 p-1"
                            />
                            <Input
                                type="text"
                                value={formData.color}
                                onChange={handleChange}
                                name="color"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">
                        {project ? 'Update' : 'Create'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
