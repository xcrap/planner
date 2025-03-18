'use client';

import { GanttChart } from '@/components/gantt/gantt-chart';
import { useAppStore } from '@/lib/store';

type GanttChartContainerProps = {
    projectId?: number | null;
};

export function GanttChartContainer({ projectId = null }: GanttChartContainerProps) {
    // Fix: Use separate selectors instead of returning an object
    const projects = useAppStore(state => state.projects);
    const isLoading = useAppStore(state => state.isLoading);

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
