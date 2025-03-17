'use client';

import { useEffect, useState } from 'react';
import { ProjectList } from '@/components/sidebar/project-list';
import { GanttChart } from '@/components/gantt/gantt-chart';
import { initializeDatabase } from '@/lib/db';
import { TaskProvider } from '@/contexts/task-context';
import { TaskEditModal } from '@/components/modals/task-edit-modal';
import type { Project } from '@/types/task';

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
            {/* header */}
            <header className="flex items-center justify-between p-6 text-black">
                <h1 className="text-2xl font-semibold">Gantt Task Planner</h1>
            </header>

            <main className="flex grow overflow-hidden">
                {/* Sidebar */}
                <div className="w-96 flex flex-col overflow-y-auto ml-6 mr-6 mb-4">
                    <ProjectList onSelectProject={handleSelectProject} />
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden mb-4 ml-6 mr-6">
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
