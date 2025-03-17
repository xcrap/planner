import { useEffect, useState, useRef, useCallback } from 'react';
import { addDays, format, differenceInDays, parseISO, isWeekend } from 'date-fns';
import { TaskBar } from '@/components/gantt/task-bar';
import { Timeline } from '@/components/gantt/timeline';
import { useTaskContext } from '@/contexts/task-context';
import type { Task, Project } from '@/types/task';

// Move the function outside the component so it's not recreated on each render
const normalizeToUTCDate = (date: string) => {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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

    // Check if this is the "All Projects" virtual project
    const isAllProjectsView = project?.id === -1;
    const [allProjects, setAllProjects] = useState<Project[]>([]);

    // Add a function to fetch all projects when in "All Projects" view
    const fetchAllProjects = useCallback(async () => {
        if (!isAllProjectsView) return;

        try {
            const response = await fetch('/api/projects');
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const projectsArray = Array.isArray(data) ? data :
                (data.projects && Array.isArray(data.projects) ? data.projects : []);

            setAllProjects(projectsArray);
        } catch (error) {
            console.error('Error fetching all projects:', error);
            setAllProjects([]);
        }
    }, [isAllProjectsView]);

    // Immediately fetch all projects when component mounts or when refreshed
    useEffect(() => {
        if (isAllProjectsView || !project) {
            fetchAllProjects();
        }
    }, [isAllProjectsView, project, fetchAllProjects]);

    useEffect(() => {
        const handleRefreshGantt = () => {
            // Always call onTasksChanged to refresh data
            onTasksChanged();

            // If in global view, also refresh all projects
            if (isAllProjectsView) {
                fetchAllProjects();
            }
        };

        window.addEventListener('refresh-gantt', handleRefreshGantt);

        return () => {
            window.removeEventListener('refresh-gantt', handleRefreshGantt);
        };
    }, [onTasksChanged, isAllProjectsView, fetchAllProjects]);

    // Modify the timeRange calculation to include tasks from all projects when in "All Projects" view
    useEffect(() => {
        if (!project) {
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

        let tasks: Task[] = [];

        // Use tasks from all projects when in "All Projects" view
        if (isAllProjectsView && allProjects.length > 0) {
            for (const proj of allProjects) {
                if (proj.tasks && Array.isArray(proj.tasks)) {
                    tasks = [...tasks, ...proj.tasks];
                }
            }
        } else if (project.tasks && project.tasks.length > 0) {
            // Use tasks from the selected project
            tasks = project.tasks;
        } else {
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

        if (tasks.length === 0) {
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
        let earliestDate = normalizeToUTCDate(tasks[0].startDate);
        let latestDate = normalizeToUTCDate(tasks[0].endDate);

        for (const task of tasks) {
            const taskStartDate = normalizeToUTCDate(task.startDate);
            const taskEndDate = normalizeToUTCDate(task.endDate);

            if (taskStartDate < earliestDate) {
                earliestDate = taskStartDate;
            }

            if (taskEndDate > latestDate) {
                latestDate = taskEndDate;
            }
        }

        earliestDate = addDays(earliestDate, -3);
        latestDate = addDays(latestDate, 3);

        const range: Date[] = [];
        let current = new Date(earliestDate);

        while (current <= latestDate) {
            range.push(new Date(current));
            current = addDays(current, 1);
        }

        setTimeRange(range);
    }, [project, isAllProjectsView, allProjects]);

    // Add this useEffect to log and monitor the width calculation
    useEffect(() => {
        if (timeRange.length > 0) {
            // console.log(`Chart width calculation: ${timeRange.length} days × ${dayWidth}px + 200px = ${timeRange.length * dayWidth + 200}px`);
        }
    }, [timeRange]);

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
            // Find the task from either project tasks or all projects
            const task = isAllProjectsView
                ? allProjects.flatMap(p => p.tasks).find(t => t.id === draggingTaskId)
                : project?.tasks.find(t => t.id === draggingTaskId);

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
            // Find the task from either project tasks or all projects
            const task = isAllProjectsView
                ? allProjects.flatMap(p => p.tasks).find(t => t.id === resizingTaskId)
                : project?.tasks.find(t => t.id === resizingTaskId);

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

                await updateTaskDates(resizingTaskId, newStartDate, newEndDate);

                // Force refresh of all projects if in All Projects view
                if (isAllProjectsView) {
                    await fetchAllProjects();
                }
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
            const startDateFormatted = startDate.toISOString().split('T')[0];
            const endDateFormatted = endDate.toISOString().split('T')[0];

            let projectId: number | undefined;
            if (isAllProjectsView) {
                const task = allProjects
                    .flatMap(p => p.tasks)
                    .find(t => t.id === taskId);
                projectId = task?.projectId;
            } else {
                projectId = project?.id;
            }

            if (!projectId) {
                console.error('Could not find project ID for task:', taskId);
                return;
            }

            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    startDate: `${startDateFormatted}T00:00:00.000Z`,
                    endDate: `${endDateFormatted}T00:00:00.000Z`,
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update task: ${response.status}`);
            }

            // Force refresh data
            onTasksChanged();
            if (isAllProjectsView) {
                await fetchAllProjects();
            }
            window.dispatchEvent(new Event('tasks-changed'));
            window.dispatchEvent(new Event('refresh-gantt'));
        } catch (error) {
            console.error('Error updating task dates:', error);
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
    };

    // handleAddTask needs to be updated for "All Projects" view
    const handleAddTask = async () => {
        if (!project) return;

        const today = new Date();
        // Create UTC dates
        const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const utcTomorrow = addDays(utcToday, 1);

        // For "All Projects" view, we need a default project
        const targetProjectId = isAllProjectsView && allProjects.length > 0 ?
            allProjects[0].id : project.id;

        const newTask = {
            id: undefined, // Changed from not setting id at all
            name: 'New Task',
            description: '',
            startDate: format(utcToday, 'yyyy-MM-dd'),
            endDate: format(utcTomorrow, 'yyyy-MM-dd'),
            completed: false,
            projectId: targetProjectId,
            order: isAllProjectsView ? 0 : project.tasks.length // Add order to maintain consistency
        };

        setSelectedTask(newTask as Task); // Cast to Task since we know this is a new task
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

    // Get the project color for a task based on its projectId
    const getProjectColorForTask = (taskProjectId: number): string => {
        if (!isAllProjectsView) {
            return project?.color || '#3498db';
        }

        // Find the project that owns this task
        const taskProject = allProjects.find(p => p.id === taskProjectId);
        return taskProject?.color || '#3498db';
    };

    // Update the default view text
    if (!project) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                    <h3 className="text-xl font-semibold">Select a project or view all tasks</h3>
                </div>
            </div>
        );
    }

    if (!timeRange.length) {
        return <div className="p-4">Loading timeline...</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{project.name}</h2>
                <div className="flex items-center space-x-4">
                    <button
                        type="button"
                        onClick={handleAddTask}
                        className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
                    >
                        Add Task
                    </button>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => setDayWidth(prev => Math.max(30, prev - 10))}
                            className="p-1 rounded hover:bg-neutral-200"
                        >
                            Zoom Out
                        </button>
                        <button
                            type="button"
                            onClick={() => setDayWidth(prev => Math.min(120, prev + 10))}
                            className="p-1 rounded hover:bg-neutral-200"
                        >
                            Zoom In
                        </button>
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
                            <div
                                className="absolute top-0 bottom-0 w-[2px] bg-yellow-500/30 z-5"
                                style={{
                                    left: `${(todayOffset * dayWidth) + (dayWidth / 2)}px`, // Center in column
                                }}
                            />
                        )}
                    </div>

                    {/* Tasks container */}
                    <div className="relative z-10">
                        {(() => {
                            // Determine which tasks to render
                            let tasksToRender: Task[] = [];

                            if (isAllProjectsView) {
                                // Collect tasks from all projects
                                for (const proj of allProjects) {
                                    if (proj.tasks) {
                                        tasksToRender = [...tasksToRender, ...proj.tasks];
                                    }
                                }
                                tasksToRender.sort((a, b) => {
                                    // First by project
                                    if (a.projectId !== b.projectId) {
                                        return a.projectId - b.projectId;
                                    }
                                    // Then by order within project
                                    return a.order - b.order;
                                });
                            } else if (project.tasks && project.tasks.length > 0) {
                                // Use tasks from the selected project
                                tasksToRender = project.tasks.sort((a, b) => a.order - b.order);
                            }

                            if (tasksToRender.length === 0) {
                                return (
                                    <div className="flex items-center justify-center h-40 text-neutral-500">
                                        <p>No tasks yet. Click "Add Task" to create one.</p>
                                    </div>
                                );
                            }

                            return tasksToRender.map((task, index) => {
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
                                const taskColor = getProjectColorForTask(task.projectId);

                                // Create a new variable for the task with optional project info
                                let taskToRender = task;

                                // Add project info to the task when in All Projects view
                                if (isAllProjectsView) {
                                    const taskProject = allProjects.find(p => p.id === task.projectId);
                                    taskToRender = {
                                        ...task,
                                        projectName: taskProject?.name || 'Unknown Project'
                                    };
                                }

                                return (
                                    <TaskBar
                                        key={task.id}
                                        task={taskToRender}
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
                                            console.log("Reordering task", taskId, "to", newOrder);
                                        }}
                                        isAllProjectsView={isAllProjectsView}
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
