import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { addDays, format, differenceInDays, isWeekend } from 'date-fns';
import { TaskBar } from '@/components/gantt/task-bar';
import { Timeline } from '@/components/gantt/timeline';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Task, Project } from '@/types/task';

// Move the function outside the component so it's not recreated on each render
const normalizeToUTCDate = (date: string) => {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

type GanttChartProps = {
    projects: Project[];
    projectId: number | null;
    onTasksChanged?: () => void; // Make optional with '?'
};

export function GanttChart({
    projects,
    projectId
}: GanttChartProps) {
    const [timeRange, setTimeRange] = useState<Date[]>([]);
    const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
    const [resizingTaskId, setResizingTaskId] = useState<number | null>(null);
    const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dayWidth, setDayWidth] = useState(60);
    const setSelectedTask = useAppStore(state => state.setSelectedTask);

    // New state for tracking preview offsets
    const [dragPreviewOffset, setDragPreviewOffset] = useState<number>(0);
    const [resizePreviewOffset, setResizePreviewOffset] = useState<number>(0);

    // Access store data with proper selectors
    const updateTask = useAppStore(state => state.updateTask);
    const getProjectById = useAppStore(state => state.getProjectById);
    // Use updateTask for reordering since there's no dedicated reorderTask function
    const reorderTask = updateTask;

    // Get current project directly with selector pattern
    const currentProject = useAppStore(state =>
        projectId ? state.getProjectById(projectId) : null
    );

    // Get tasks with proper selector to auto-update
    const tasks = useAppStore(state =>
        projectId ? state.getTasksByProjectId(projectId) : state.getAllTasks()
    );

    // Memoize calculateTimeRange with useCallback to prevent recreation on every render
    const calculateTimeRange = useCallback((taskList: Task[]) => {
        if (!taskList.length) {
            const today = new Date();
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

        let earliestDate = normalizeToUTCDate(taskList[0].startDate);
        let latestDate = normalizeToUTCDate(taskList[0].endDate);

        for (const task of taskList) {
            const taskStartDate = normalizeToUTCDate(task.startDate);
            const taskEndDate = normalizeToUTCDate(task.endDate);

            if (taskStartDate < earliestDate) {
                earliestDate = taskStartDate;
            }

            if (taskEndDate > latestDate) {
                latestDate = taskEndDate;
            }
        }

        // Add padding days
        earliestDate = addDays(earliestDate, -3);
        latestDate = addDays(latestDate, 3);

        const range: Date[] = [];
        let current = new Date(earliestDate);

        while (current <= latestDate) {
            range.push(new Date(current));
            current = addDays(current, 1);
        }

        setTimeRange(range);
    }, []); // Empty dependency array

    // Now the useEffect can reference calculateTimeRange safely
    useEffect(() => {
        // Initial calculation
        calculateTimeRange(tasks);

        // Set up the subscription
        const unsubscribe = useAppStore.subscribe((state) => {
            const newTasks = projectId
                ? state.getTasksByProjectId(projectId)
                : state.getAllTasks();

            calculateTimeRange(newTasks);
        });

        return unsubscribe;
    }, [projectId, calculateTimeRange]);

    const handleTaskDragStart = (taskId: number) => {
        setDraggingTaskId(taskId);
        setDragPreviewOffset(0);
    };

    const handleTaskDrag = (_taskId: number, daysOffset: number) => {
        setDragPreviewOffset(daysOffset);
    };

    const handleTaskDragEnd = async () => {
        if (draggingTaskId && dragPreviewOffset !== 0) {
            // Find the task
            const task = tasks.find(t => t.id === draggingTaskId);

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

                // Format dates for API call
                const startDateFormatted = newStartDate.toISOString().split('T')[0];
                const endDateFormatted = newEndDate.toISOString().split('T')[0];

                // Use store action to update task
                await updateTask({
                    id: draggingTaskId,
                    startDate: `${startDateFormatted}T00:00:00.000Z`,
                    endDate: `${endDateFormatted}T00:00:00.000Z`,
                });
            }
        }

        // Reset states
        setDraggingTaskId(null);
        setDragPreviewOffset(0);
    };

    const handleTaskResizeStart = (taskId: number, edge: 'start' | 'end') => {
        setResizingTaskId(taskId);
        setResizeEdge(edge);
        setResizePreviewOffset(0);
    };

    const handleTaskResize = (_taskId: number, daysOffset: number) => {
        // Just update the preview offset, don't make API call
        setResizePreviewOffset(daysOffset);
    };

    const handleTaskResizeEnd = async () => {
        if (resizingTaskId && resizeEdge && resizePreviewOffset !== 0) {
            // Find the task
            const task = tasks.find(t => t.id === resizingTaskId);

            if (task) {
                const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
                const endDateParts = task.endDate.split('T')[0].split('-').map(Number);

                const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
                const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));

                let newStartDate = new Date(startDate);
                let newEndDate = new Date(endDate);

                if (resizeEdge === 'start') {
                    newStartDate.setUTCDate(startDate.getUTCDate() + resizePreviewOffset);
                    if (newStartDate >= endDate) {
                        newStartDate = new Date(endDate);
                        newStartDate.setUTCDate(endDate.getUTCDate() - 1);
                    }
                } else {
                    newEndDate.setUTCDate(endDate.getUTCDate() + resizePreviewOffset);
                    if (newEndDate <= startDate) {
                        newEndDate = new Date(startDate);
                        newEndDate.setUTCDate(startDate.getUTCDate() + 1);
                    }
                }

                // Format dates for API call
                const startDateFormatted = newStartDate.toISOString().split('T')[0];
                const endDateFormatted = newEndDate.toISOString().split('T')[0];

                // Use store action to update task
                await updateTask({
                    id: resizingTaskId,
                    startDate: `${startDateFormatted}T00:00:00.000Z`,
                    endDate: `${endDateFormatted}T00:00:00.000Z`,
                });
            }
        }

        // Reset states
        setResizingTaskId(null);
        setResizeEdge(null);
        setResizePreviewOffset(0);
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
    };

    const handleAddTask = () => {
        const today = new Date();
        // Create UTC dates
        const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const utcTomorrow = addDays(utcToday, 1);

        // Determine which project to add the task to
        let targetProjectId = projectId;
        if (!targetProjectId && projects.length > 0) {
            // If no specific project is selected, use the first available project
            targetProjectId = projects[0].id;
        }

        if (!targetProjectId) {
            alert("Please create a project first before adding tasks.");
            return;
        }

        const newTask = {
            name: 'New Task',
            description: '',
            startDate: format(utcToday, 'yyyy-MM-dd'),
            endDate: format(utcTomorrow, 'yyyy-MM-dd'),
            completed: false,
            projectId: targetProjectId,
            order: currentProject?.tasks?.length || 0
        };

        setSelectedTask(newTask as Task);
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
            date.getUTCDate() === today.getDate();
    };

    // Get the project color for a task based on its projectId
    const getProjectColorForTask = (task: Task): string => {
        if ('projectColor' in task && task.projectColor) {
            return task.projectColor;
        }

        if (projectId && currentProject) {
            return currentProject.color || '#3498db';
        }

        // Find the project that owns this task
        const taskProject = projects.find(p => p.id === task.projectId);
        return taskProject?.color || '#3498db';
    };

    // Default empty time range message
    if (!timeRange.length) {
        // Create a default time range if none exists
        const today = new Date();
        const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
        const range: Date[] = [];

        let current = new Date(start);
        while (current <= end) {
            range.push(new Date(current));
            current = addDays(current, 1);
        }

        setTimeRange(range);
        return <div className="p-4">Setting up timeline...</div>;
    }

    // Get title based on current view
    const chartTitle = projectId && currentProject ? currentProject.name : 'All Projects';

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{chartTitle}</h2>
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={handleAddTask}>
                        Add Task
                    </Button>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => setDayWidth(prev => Math.max(30, prev - 10))}>
                            <ZoomOut size={20} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setDayWidth(prev => Math.min(120, prev + 10))}>
                            <ZoomIn size={20} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="relative flex overflow-auto " ref={containerRef}>
                <div
                    className="relative flex flex-col "
                    style={{
                        width: `${Math.max(2000, timeRange.length * dayWidth + 200)}px`,
                    }}
                >
                    <Timeline timeRange={timeRange} dayWidth={dayWidth} />
                    {/* Special White Cover for the Gantt Chart */}
                    <div className="absolute left-0 right-0 bottom-0 top-[60px] bg-white -z-10 rounded-xl border border-neutral-200" />

                    {/* Day columns that span the entire task area */}
                    <div className="absolute left-60 right-0 top-[60px] bottom-0 z-0">
                        {timeRange.map((date, i) => {
                            const isCurrentDay = isDateToday(date);
                            // Today's styling takes precedence over weekend styling
                            const bgColorClass = isCurrentDay ? 'bg-yellow-50' : (isWeekend(date) ? 'bg-neutral-50' : '');

                            return (
                                <div
                                    key={date.toISOString()}
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
                            <div className="absolute top-0 bottom-0 w-[2px] bg-yellow-500/30 z-20" style={{
                                left: `${(todayOffset * dayWidth) + (dayWidth / 2)}px`, // Center in column
                            }} />
                        )}
                    </div>

                    {/* Tasks container */}
                    <div className="relative z-10">
                        {(() => {
                            // Show message if no tasks
                            if (tasks.length === 0) {
                                return (
                                    <div className="flex items-center justify-center h-40 text-neutral-500">
                                        <p>No tasks yet. Click "Add Task" to create one.</p>
                                    </div>
                                );
                            }

                            return tasks.map((task, index) => {
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

                                // Get the color based on project
                                const taskColor = getProjectColorForTask(task);

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
                                        projectColor={taskColor}
                                        onReorder={(taskId: number, newOrder: number) => {
                                            reorderTask({
                                                id: taskId,
                                                order: newOrder
                                            });
                                        }}
                                        isAllProjectsView={!projectId} // Show project info when no specific project is selected
                                    />
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
