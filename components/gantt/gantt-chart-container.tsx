'use client';

import { useEffect, useCallback } from 'react';
import { GanttChart } from '@/components/gantt/gantt-chart';
import { useAppStore } from '@/lib/store';

type GanttChartContainerProps = {
    projectId?: number | null;
};

export function GanttChartContainer({ projectId = null }: GanttChartContainerProps) {
    // Use the store for data and actions
    const {
        projects,
        isLoading,
        fetchProjects,
        fetchProjectDetails,
        setSelectedProjectId
    } = useAppStore(state => ({
        projects: state.projects,
        isLoading: state.isLoading,
        fetchProjects: state.fetchProjects,
        fetchProjectDetails: state.fetchProjectDetails,
        setSelectedProjectId: state.setSelectedProjectId
    }));

    // Create a no-op function for the required prop
    // This is a transitional approach until we can update GanttChart
    const handleTasksChanged = useCallback(() => {
        // No need to do anything - Zustand store updates will trigger re-renders
        console.log("Task change detected - store will handle updates automatically");
    }, []);

    // Effect to fetch initial data and set the selected project
    useEffect(() => {
        if (projectId) {
            fetchProjectDetails(projectId);
        } else {
            fetchProjects();
        }
    }, [projectId, fetchProjectDetails, fetchProjects]);

    return (
        <>
            {isLoading && projects.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                    <p>Loading projects...</p>
                </div>
            ) : (
                <GanttChart
                    projects={projects}
                    projectId={projectId}
                />
            )}
        </>
    );
}
