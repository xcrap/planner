'use client';

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
    } = useAppStore(state => ({
        projects: state.projects,
        isLoading: state.isLoading,
    }));

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
