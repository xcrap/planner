'use client';

import { useParams } from 'next/navigation';
import { GanttChartContainer } from '@/components/gantt/gantt-chart-container';

export default function GanttProjectPage() {
    const params = useParams();
    const projectId = params.id ? Number.parseInt(params.id as string) : null;

    return <GanttChartContainer projectId={projectId} />;
}
