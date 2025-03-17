'use client';

import { ProjectList } from '@/components/sidebar/project-list';
import { TaskEditModal } from '@/components/modals/task-edit-modal';
import { useAppStore } from '@/lib/store';
import { useEffect } from 'react';

export default function DashboardLayout({
    children
}: {
    children: React.ReactNode
}) {

    // Access the store's fetch method
    const fetchProjects = useAppStore(state => state.fetchProjects);

    // Fetch projects at the layout level
    useEffect(() => {
        // This will populate the projects in the store
        fetchProjects();
    }, [fetchProjects]);

    return (
        <>
            {/* header */}
            <header className="flex items-center justify-between p-6 text-black">
                <h1 className="text-2xl font-semibold">Gantt Task Planner</h1>
            </header>

            <main className="flex grow overflow-hidden">
                {/* Sidebar */}
                <div className="w-96 flex flex-col overflow-y-auto ml-6 mr-6 mb-4">
                    <ProjectList />
                </div>

                {/* Main Content - Children render here */}
                <div className="flex-1 overflow-hidden mb-4 ml-6 mr-6">
                    {children}
                </div>

                <TaskEditModal />
            </main>
        </>
    );
}
