import { useEffect, useState, useRef } from 'react';
import { addDays, format, differenceInDays, parseISO, isWeekend } from 'date-fns';
import { TaskBar } from '@/components/gantt/task-bar';
import { Timeline } from '@/components/gantt/timeline';
import { useTaskContext } from '@/contexts/task-context';

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

type GanttChartProps = {
    project: Project | null;
    onTasksChanged: () => void;
};

declare global {
    interface Window {
        currentProjectId?: number;
    }
}

export function GanttChart({ project, onTasksChanged }: GanttChartProps) {
    const [timeRange, setTimeRange] = useState<Date[]>([]);
    const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
    const [resizingTaskId, setResizingTaskId] = useState<number | null>(null);
    const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dayWidth, setDayWidth] = useState(60);
    const { setSelectedTask } = useTaskContext();

    // New state for tracking preview offsets
    const [dragPreviewOffset, setDragPreviewOffset] = useState<number>(0);
    const [resizePreviewOffset, setResizePreviewOffset] = useState<number>(0);

    // Normalize date to UTC
    const normalizeToUTCDate = (date: string) => {
        const d = new Date(date);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };

    useEffect(() => {
        // Add this at the beginning of the component to track the current project
        if (project?.id) {
            window.currentProjectId = project.id;
        }

        // Subscribe to refresh-gantt events
        const handleRefreshGantt = () => {
            onTasksChanged();
        };

        window.addEventListener('refresh-gantt', handleRefreshGantt);

        return () => {
            window.removeEventListener('refresh-gantt', handleRefreshGantt);
            // Clean up the global reference when component unmounts
            if (window.currentProjectId === project?.id) {
                window.currentProjectId = undefined;
            }
        };
    }, [project?.id, onTasksChanged]);

    useEffect(() => {
        if (!project || !project.tasks.length) {
            const today = new Date();
            // Create UTC dates for the time range (same day in UTC)
            const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
            const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
            const range: Date[] = [];

            let current = new Date(start);
            while (current <= end) {
                range.push(new Date(current));
                current = addDays(current, 1);
            }

            setTimeRange(range);
            return;
        }

        // Use normalized UTC dates for the tasks
        let earliestDate = normalizeToUTCDate(project.tasks[0].startDate);
        let latestDate = normalizeToUTCDate(project.tasks[0].endDate);

        project.tasks.forEach(task => {
            const taskStartDate = normalizeToUTCDate(task.startDate);
            const taskEndDate = normalizeToUTCDate(task.endDate);

            if (taskStartDate < earliestDate) {
                earliestDate = taskStartDate;
            }

            if (taskEndDate > latestDate) {
                latestDate = taskEndDate;
            }
        });

        earliestDate = addDays(earliestDate, -3);
        latestDate = addDays(latestDate, 3);

        const range: Date[] = [];
        let current = new Date(earliestDate);

        while (current <= latestDate) {
            range.push(new Date(current));
            current = addDays(current, 1);
        }

        setTimeRange(range);
    }, [project, project?.tasks.length]);

    const handleTaskDragStart = (taskId: number) => {
        setDraggingTaskId(taskId);
        setDragPreviewOffset(0);
    };

    const handleTaskDrag = (taskId: number, daysOffset: number) => {
        if (!project) return;

        // Just update the preview offset, don't make API call
        setDragPreviewOffset(daysOffset);
    };

    const handleTaskDragEnd = async () => {
        if (draggingTaskId && dragPreviewOffset !== 0) {
            // Only make the API call when dragging ends
            const task = project?.tasks.find(t => t.id === draggingTaskId);
            if (task) {
                // Extract dates from the string format and create new Date objects
                const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
                const endDateParts = task.endDate.split('T')[0].split('-').map(Number);

                // Create UTC dates using the exact year, month, and day from the strings
                const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
                const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));

                // Apply the preview offset
                const newStartDate = new Date(startDate);
                const newEndDate = new Date(endDate);
                newStartDate.setUTCDate(newStartDate.getUTCDate() + dragPreviewOffset);
                newEndDate.setUTCDate(newEndDate.getUTCDate() + dragPreviewOffset);

                await updateTaskDates(draggingTaskId, newStartDate, newEndDate);
            }
        }

        // Reset states
        setDraggingTaskId(null);
        setDragPreviewOffset(0);
        onTasksChanged();
    };

    const handleTaskResizeStart = (taskId: number, edge: 'start' | 'end') => {
        setResizingTaskId(taskId);
        setResizeEdge(edge);
        setResizePreviewOffset(0);
    };

    const handleTaskResize = (taskId: number, daysOffset: number) => {
        if (!project) return;

        // Just update the preview offset, don't make API call
        setResizePreviewOffset(daysOffset);
    };

    const handleTaskResizeEnd = async () => {
        if (resizingTaskId && resizeEdge && resizePreviewOffset !== 0) {
            // Only make the API call when resizing ends
            const task = project?.tasks.find(t => t.id === resizingTaskId);
            if (task) {
                // Extract dates from the string format and create new Date objects
                const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
                const endDateParts = task.endDate.split('T')[0].split('-').map(Number);

                // Create UTC dates using the exact year, month, and day from the strings
                const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
                const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));

                // Create new Date objects for updating
                let newStartDate = new Date(startDate);
                let newEndDate = new Date(endDate);

                // Apply the resize offset only to the appropriate edge
                if (resizeEdge === 'start') {
                    newStartDate.setUTCDate(startDate.getUTCDate() + resizePreviewOffset);

                    // Ensure start date is before end date
                    if (newStartDate >= endDate) {
                        newStartDate = new Date(endDate);
                        newStartDate.setUTCDate(endDate.getUTCDate() - 1);
                    }
                } else {
                    newEndDate.setUTCDate(endDate.getUTCDate() + resizePreviewOffset);

                    // Ensure end date is after start date
                    if (newEndDate <= startDate) {
                        newEndDate = new Date(startDate);
                        newEndDate.setUTCDate(startDate.getUTCDate() + 1);
                    }
                }

                await updateTaskDates(resizingTaskId, newStartDate, newEndDate);
            }
        }

        // Reset states
        setResizingTaskId(null);
        setResizeEdge(null);
        setResizePreviewOffset(0);
        onTasksChanged();
    };

    const updateTaskDates = async (taskId: number, startDate: Date, endDate: Date) => {
        try {
            // Format dates in UTC for the API request using ISO string and extracting the date part
            const startDateFormatted = startDate.toISOString().split('T')[0];
            const endDateFormatted = endDate.toISOString().split('T')[0];

            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: `${startDateFormatted}T00:00:00.000Z`,
                    endDate: `${endDateFormatted}T00:00:00.000Z`,
                })
            });

            if (response.ok) {
                // Make sure we call onTasksChanged to refresh the whole UI
                onTasksChanged();

                // Dispatch event to notify other components
                window.dispatchEvent(new Event('tasks-changed'));
            }
        } catch (error) {
            console.error('Error updating task dates:', error);
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
    };

    const handleAddTask = async () => {
        if (!project) return;

        const today = new Date();
        // Create UTC dates
        const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const utcTomorrow = addDays(utcToday, 1);

        const newTask = {
            id: undefined, // Changed from not setting id at all
            name: 'New Task',
            description: '',
            startDate: format(utcToday, 'yyyy-MM-dd'),
            endDate: format(utcTomorrow, 'yyyy-MM-dd'),
            completed: false,
            projectId: project.id,
            order: project.tasks.length // Add order to maintain consistency
        };

        setSelectedTask(newTask as Task); // Cast to Task since we know this is a new task
    };

    // Get today's date in UTC format for highlighting
    const getTodayInUTC = () => {
        const today = new Date();
        return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    };

    // Calculate today's offset from the start of the time range
    const calculateTodayOffset = () => {
        if (timeRange.length === 0) return undefined;

        // Create today's date in local timezone, but at midnight UTC
        const today = new Date();
        const todayUTC = new Date(Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        ));

        // Get the first date from timeRange
        const timeRangeStart = timeRange[0];

        // Calculate offset
        const offset = differenceInDays(todayUTC, timeRangeStart);

        // Only return an offset if today is within the visible range
        if (offset >= 0 && offset < timeRange.length) {
            return offset;
        }

        return undefined;
    };

    const todayOffset = calculateTodayOffset();

    // Check if a date is today in UTC
    const isDateToday = (date: Date) => {
        const today = new Date();
        return date.getUTCFullYear() === today.getFullYear() &&
            date.getUTCMonth() === today.getMonth() &&
            date.getUTCDate() === today.getUTCDate();
    };

    if (!project) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                    <h3 className="text-xl font-semibold">Select a project to view its Gantt chart</h3>
                </div>
            </div>
        );
    }

    if (!timeRange.length) {
        return <div className="p-4">Loading timeline...</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b">
                <h2 className="text-xl font-bold">{project.name} - Gantt Chart</h2>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleAddTask}
                        className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
                    >
                        Add Task
                    </button>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setDayWidth(prev => Math.max(30, prev - 10))}
                            className="p-1 rounded hover:bg-gray-200"
                        >
                            Zoom Out
                        </button>
                        <button
                            onClick={() => setDayWidth(prev => Math.min(120, prev + 10))}
                            className="p-1 rounded hover:bg-gray-200"
                        >
                            Zoom In
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex grow overflow-auto" ref={containerRef}>
                <div className="relative flex flex-col min-w-full"
                    style={{
                        width: `${timeRange.length * dayWidth + 200}px`,
                    }}>
                    <Timeline timeRange={timeRange} dayWidth={dayWidth} />

                    {/* Day columns that span the entire task area */}
                    <div className="absolute left-48 right-0 top-[60px] bottom-0 z-0">
                        {timeRange.map((date, i) => {
                            const isCurrentDay = isDateToday(date);
                            // Today's styling takes precedence over weekend styling
                            const bgColorClass = isCurrentDay ? 'bg-blue-50' : (isWeekend(date) ? 'bg-gray-50' : '');

                            return (
                                <div
                                    key={i}
                                    className={`absolute top-0 bottom-0 ${i === 0 ? 'border-l' : ''} border-r border-neutral-200 ${bgColorClass}`}
                                    style={{
                                        left: `${i * dayWidth}px`,
                                        width: `${dayWidth}px`,
                                    }}
                                />
                            );
                        })}
                        {/* Today indicator line that spans entire chart */}
                        {todayOffset !== undefined && (
                            <div
                                className="absolute top-[10px] bottom-0 w-[2px] bg-blue-500 z-5"
                                style={{
                                    left: `${(todayOffset * dayWidth) + (dayWidth / 2)}px`, // Center in column
                                    opacity: 0.4
                                }}
                            />
                        )}
                    </div>

                    {/* Tasks container */}
                    <div className="relative z-10">
                        {project.tasks.length > 0 ? (
                            project.tasks
                                .sort((a, b) => a.order - b.order)
                                .map((task, index) => {
                                    // Extract dates directly from the string format
                                    const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
                                    const endDateParts = task.endDate.split('T')[0].split('-').map(Number);

                                    // Create UTC dates using the exact year, month, and day
                                    const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
                                    const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));

                                    // Get the first date in the time range
                                    const timeRangeStartParts = timeRange[0].toISOString().split('T')[0].split('-').map(Number);
                                    const timeRangeStartUTC = new Date(Date.UTC(timeRangeStartParts[0], timeRangeStartParts[1] - 1, timeRangeStartParts[2]));

                                    // Calculate days between UTC dates
                                    const startOffset = differenceInDays(startDate, timeRangeStartUTC);
                                    // Calculate duration using UTC dates
                                    const duration = differenceInDays(endDate, startDate) + 1;

                                    // Apply preview offsets for the active task
                                    const previewDragOffset = (draggingTaskId === task.id) ? dragPreviewOffset : 0;
                                    const previewResizeStartOffset = (resizingTaskId === task.id && resizeEdge === 'start') ? resizePreviewOffset : 0;
                                    const previewResizeEndOffset = (resizingTaskId === task.id && resizeEdge === 'end') ? resizePreviewOffset : 0;

                                    return (
                                        <TaskBar
                                            key={task.id}
                                            task={task}
                                            index={index}
                                            startOffset={startOffset + previewDragOffset + previewResizeStartOffset}
                                            duration={duration - previewResizeStartOffset + previewResizeEndOffset}
                                            dayWidth={dayWidth}
                                            isDragging={draggingTaskId === task.id}
                                            isResizing={resizingTaskId === task.id}
                                            resizeEdge={resizeEdge}
                                            timeRange={timeRange}
                                            onDragStart={handleTaskDragStart}
                                            onDrag={handleTaskDrag}
                                            onDragEnd={handleTaskDragEnd}
                                            onResizeStart={handleTaskResizeStart}
                                            onResize={handleTaskResize}
                                            onResizeEnd={handleTaskResizeEnd}
                                            onTaskClick={handleTaskClick}
                                            projectColor={project.color}
                                            onReorder={(taskId: number, newOrder: number) => {
                                                console.log("Reordering task", taskId, "to", newOrder);
                                            }}
                                        />
                                    );
                                })
                        ) : (
                            <div className="flex items-center justify-center h-40 text-gray-500">
                                <p>No tasks yet. Click "Add Task" to create one.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
