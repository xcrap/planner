'use client';

import { useEffect, useState } from 'react';
import { ProjectList } from '@/components/sidebar/project-list';
import { GanttChart } from '@/components/gantt/gantt-chart';
import { initializeDatabase } from '@/lib/db';
import { TaskProvider } from '@/contexts/task-context';
import { TaskEditModal } from '@/components/modals/task-edit-modal';

type Project = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    tasks: Task[];
};

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

export default function Home() {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [dbInitialized, setDbInitialized] = useState(false);

    useEffect(() => {
        // Initialize the database on app startup
        const init = async () => {
            await initializeDatabase();
            setDbInitialized(true);
        };

        init();
    }, []);

    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
    };

    const handleTasksChanged = async () => {
        if (selectedProject && selectedProject.id > 0) {  // Add validation check
            try {
                const response = await fetch(`/api/projects/${selectedProject.id}`);
                const updatedProject = await response.json();
                setSelectedProject(updatedProject);
            } catch (error) {
                console.error('Error refreshing project data:', error);
            }
        }
    };

    if (!dbInitialized) {
        return <div className="flex items-center justify-center h-screen">Initializing database...</div>;
    }

    return (
        <TaskProvider onTasksChanged={handleTasksChanged}>
            <main className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <div className="w-96 border-r h-full overflow-y-auto bg-gray-50">
                    <ProjectList onSelectProject={handleSelectProject} />
                </div>

                {/* Main Content */}
                <div className="flex-1 h-full overflow-hidden">
                    <GanttChart
                        project={selectedProject}
                        onTasksChanged={handleTasksChanged}
                    />
                </div>

                <TaskEditModal />
            </main>
        </TaskProvider>
    );
}
