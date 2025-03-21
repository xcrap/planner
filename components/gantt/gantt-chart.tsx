'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button"
import { addDays, format, differenceInDays, isWeekend } from 'date-fns';
import { TaskBar } from '@/components/gantt/task-bar';
import { Timeline } from '@/components/gantt/timeline';
import { Plus, ZoomIn, ZoomOut, ArrowDownUp } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Task, Project } from '@/types/task';
import { ProjectHeader } from '@/components/gantt/project-header';
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

// Move the function outside the component so it's not recreated on each render
const normalizeToUTCDate = (date: string) => {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

type GanttChartProps = {
    projects: Project[];
    projectId: number | null;
    onTasksChanged?: () => void;
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
    // Add sorting mode state
    const [sortingMode, setSortingMode] = useState(false);

    // New state for tracking preview offsets
    const [dragPreviewOffset, setDragPreviewOffset] = useState<number>(0);
    const [resizePreviewOffset, setResizePreviewOffset] = useState<number>(0);

    // Access store data with proper selectors
    const updateTask = useAppStore(state => state.updateTask);
    const reorderTasks = useAppStore(state => state.reorderTasks);

    // Get the store state directly using a ref to prevent dependency cycles
    // This is a stable reference to the store functions
    const storeRef = useRef({
        getAllTasks: useAppStore.getState().getAllTasks,
        getTasksByProjectId: useAppStore.getState().getTasksByProjectId,
        getProjectById: useAppStore.getState().getProjectById
    });

    // This will hold our derived tasks without causing re-renders
    const tasksRef = useRef<Task[]>([]);
    // This state is just to trigger re-renders when tasks change
    const [taskVersion, setTaskVersion] = useState(0);

    // Subscribe to store changes
    useEffect(() => {
        return useAppStore.subscribe((state) => {
            const newTasks = projectId
                ? state.getTasksByProjectId(projectId)
                : state.getAllTasks();
            // Compare tasks and update if they've changed
            if (JSON.stringify(newTasks) !== JSON.stringify(tasksRef.current)) {
                tasksRef.current = newTasks;
                setTaskVersion(v => v + 1); // Trigger re-render
            }
        });
    }, [projectId]);

    // Initialize tasks on first render and when projectId changes
    useEffect(() => {
        tasksRef.current = projectId
            ? storeRef.current.getTasksByProjectId(projectId)
            : storeRef.current.getAllTasks();
        setTaskVersion(v => v + 1);
    }, [projectId]);

    // Access tasks from the ref
    const tasks = tasksRef.current;

    // Get current project with the same pattern
    const currentProjectRef = useRef<Project | null>(null);
    const [projectVersion, setProjectVersion] = useState(0);

    useEffect(() => {
        if (projectId) {
            currentProjectRef.current = storeRef.current.getProjectById(projectId) || null;
            setProjectVersion(v => v + 1);
        } else {
            currentProjectRef.current = null;
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            return useAppStore.subscribe((state) => {
                const newProject = state.getProjectById(projectId);
                if (JSON.stringify(newProject) !== JSON.stringify(currentProjectRef.current)) {
                    currentProjectRef.current = newProject || null;
                    setProjectVersion(v => v + 1);
                }
            });
        }
    }, [projectId]);

    const currentProject = currentProjectRef.current;

    // Prepare data for rendering with drag and drop
    // Group tasks by project for rendering with drag and drop
    const tasksByProject = useMemo(() => {
        const taskGroups: Record<number, Task[]> = {};

        if (projectId) {
            // If viewing a single project, only include tasks from that project
            taskGroups[projectId] = tasks.filter(t => t.projectId === projectId)
                .sort((a, b) => {
                    if (a.order !== undefined && b.order !== undefined) {
                        return a.order - b.order;
                    }
                    return a.id - b.id;
                });
        } else {
            // If viewing all projects, group tasks by projectId
            for (const task of tasks) {
                if (!taskGroups[task.projectId]) {
                    taskGroups[task.projectId] = [];
                }
                taskGroups[task.projectId].push(task);
            }

            // Sort tasks within each project
            for (const projectIdKey of Object.keys(taskGroups)) {
                const projectIdNum = Number.parseInt(projectIdKey);
                taskGroups[projectIdNum].sort((a, b) => {
                    if (a.order !== undefined && b.order !== undefined) {
                        return a.order - b.order;
                    }
                    return a.id - b.id;
                });
            }
        }

        return taskGroups;
    }, [tasks, projectId]);

    // Sorted project IDs for rendering
    const sortedProjectIds = useMemo(() => {
        return projects
            .slice()
            .sort((a, b) => {
                // Sort by order (higher values first)
                if (a.order !== undefined && b.order !== undefined) {
                    return b.order - a.order;
                }
                return a.id - b.id;
            })
            .map(p => p.id)
            .filter(id => tasksByProject[id] && tasksByProject[id].length > 0);
    }, [projects, tasksByProject]);

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
    }, []); // Empty dependency array is correct here

    // Simplified effect to update time range when tasks change
    useEffect(() => {
        calculateTimeRange(tasks);
    }, [tasks, calculateTimeRange]);

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

                // Use store action to update task with silentUpdate=true to prevent re-rendering
                await updateTask({
                    id: draggingTaskId,
                    startDate: `${startDateFormatted}T00:00:00.000Z`,
                    endDate: `${endDateFormatted}T00:00:00.000Z`,
                }, true); // Pass true for silentUpdate
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

                // Use store action to update task with silentUpdate=true to prevent re-rendering
                await updateTask({
                    id: resizingTaskId,
                    startDate: `${startDateFormatted}T00:00:00.000Z`,
                    endDate: `${endDateFormatted}T00:00:00.000Z`,
                }, true); // Pass true for silentUpdate
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

    // Add this function to handle toggling sorting mode
    const toggleSortingMode = () => {
        setSortingMode(prev => !prev);
    };

    // Add function to handle task reordering
    const handleReorderTask = async (taskId: number, projectId: number, newOrder: number) => {
        await updateTask({
            id: taskId,
            order: newOrder
        });
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
        const todayUTC = new Date(Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        ));

        return date.getUTCFullYear() === todayUTC.getUTCFullYear() &&
            date.getUTCMonth() === todayUTC.getUTCMonth() &&
            date.getUTCDate() === todayUTC.getUTCDate();
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

    // Handle drop for task reordering
    const handleDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        // Exit if dropped outside a droppable area or didn't change position
        if (!destination ||
            (source.droppableId === destination.droppableId &&
                source.index === destination.index)) {
            return;
        }

        // Extract project ID from the droppableId (format: "project-{projectId}")
        const projectId = Number.parseInt(source.droppableId.split('-')[1]);

        // Extract task IDs for the project
        const projectTasks = tasks.filter(t => t.projectId === projectId)
            .sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                return a.id - b.id;
            });

        // Create a copy of the task IDs array
        const taskIds = projectTasks.map(t => t.id);

        // Get the task ID that was dragged
        const taskId = Number.parseInt(draggableId.split('-')[1]);

        // Remove the task from its original position
        taskIds.splice(source.index, 1);

        // Insert the task at its new position
        taskIds.splice(destination.index, 0, taskId);

        // Update task orders using the reorderTasks function
        reorderTasks(projectId, taskIds);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{chartTitle}</h2>
                <div className="flex items-center space-x-4">
                    <Button
                        // variant={sortingMode ? "default" : "secondary"}
                        variant="secondary"
                        onClick={toggleSortingMode}
                        className={sortingMode ? "bg-neutral-800 text-white hover:bg-black" : "hover:bg-neutral-200"}
                    >
                        <ArrowDownUp className="h-4 w-4 mr-1" /> Sort
                    </Button>
                    <Button variant="secondary" className="hover:bg-neutral-200" onClick={handleAddTask}>
                        <Plus className="h-4 w-4 mr-1" /> Add Task
                    </Button>
                    <div className="flex items-center space-x-2">
                        <Button variant="secondary" className="hover:bg-neutral-200" size="icon" onClick={() => setDayWidth(prev => Math.max(30, prev - 10))}>
                            <ZoomOut size={20} />
                        </Button>
                        <Button variant="secondary" className="hover:bg-neutral-200" size="icon" onClick={() => setDayWidth(prev => Math.min(120, prev + 10))}>
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
                            const bgColorClass = isCurrentDay ? 'bg-yellow-50' : (isWeekend(date) ? 'bg-neutral-50' : 'bg-white');
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

                    {/* Tasks container - with DragDropContext when in sorting mode */}
                    <div className="relative z-10">
                        {tasks.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-neutral-500">
                                <p>No tasks yet. Click "Add Task" to create one.</p>
                            </div>
                        ) : (
                            sortingMode ? (
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    {sortedProjectIds.map(projectIdNum => {
                                        const project = projects.find(p => p.id === projectIdNum);
                                        const projectColor = project?.color || '#3498db';
                                        const projectTasks = tasksByProject[projectIdNum];

                                        if (!projectTasks || projectTasks.length === 0) return null;

                                        return (
                                            <div key={`project-${projectIdNum}`} className="mb-2">
                                                <ProjectHeader
                                                    key={`project-header-${projectIdNum}`}
                                                    projectId={projectIdNum}
                                                    projectName={project?.name || ''}
                                                    projectColor={projectColor}
                                                />

                                                <Droppable
                                                    droppableId={`project-${projectIdNum}`}
                                                    type="TASK"
                                                    direction="vertical"
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                        >
                                                            {projectTasks.map((task, index) => {
                                                                // Calculate task bar positioning
                                                                const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
                                                                const endDateParts = task.endDate.split('T')[0].split('-').map(Number);
                                                                const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
                                                                const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));
                                                                const timeRangeStartParts = timeRange[0].toISOString().split('T')[0].split('-').map(Number);
                                                                const timeRangeStartUTC = new Date(Date.UTC(timeRangeStartParts[0], timeRangeStartParts[1] - 1, timeRangeStartParts[2]));
                                                                const startOffset = differenceInDays(startDate, timeRangeStartUTC);
                                                                const duration = differenceInDays(endDate, startDate) + 1;

                                                                return (
                                                                    <Draggable
                                                                        key={`task-${task.id}`}
                                                                        draggableId={`task-${task.id}`}
                                                                        index={index}
                                                                    >
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                className={`${snapshot.isDragging ? 'bg-neutral-100' : ''
                                                                                    }`}
                                                                            >
                                                                                <TaskBar
                                                                                    task={task}
                                                                                    index={index}
                                                                                    startOffset={startOffset}
                                                                                    duration={duration}
                                                                                    dayWidth={dayWidth}
                                                                                    isDragging={false} // Force this to false in sorting mode
                                                                                    isResizing={false} // Force this to false in sorting mode
                                                                                    resizeEdge={null}  // Force this to null in sorting mode
                                                                                    timeRange={timeRange}
                                                                                    onDragStart={() => { }} // Empty function in sorting mode
                                                                                    onDrag={() => { }}     // Empty function in sorting mode
                                                                                    onDragEnd={() => { }}  // Empty function in sorting mode
                                                                                    onResizeStart={() => { }} // Empty function in sorting mode
                                                                                    onResize={() => { }}     // Empty function in sorting mode
                                                                                    onResizeEnd={() => { }}  // Empty function in sorting mode
                                                                                    onTaskClick={() => { }}  // Empty function in sorting mode
                                                                                    projectColor={projectColor}
                                                                                    sortingMode={true}
                                                                                    dragHandleProps={provided.dragHandleProps}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        );
                                    })}
                                </DragDropContext>
                            ) : (
                                // Regular non-sorting mode rendering
                                sortedProjectIds.map(projectIdNum => {
                                    const project = projects.find(p => p.id === projectIdNum);
                                    const projectColor = project?.color || '#3498db';
                                    const projectTasks = tasksByProject[projectIdNum];

                                    if (!projectTasks || projectTasks.length === 0) return null;

                                    return (
                                        <div key={`project-${projectIdNum}`} className="mb-2">
                                            <ProjectHeader
                                                projectId={projectIdNum}
                                                projectName={project?.name || ''}
                                                projectColor={projectColor}
                                            />

                                            {projectTasks.map((task, index) => {
                                                // Calculate task bar positioning
                                                const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
                                                const endDateParts = task.endDate.split('T')[0].split('-').map(Number);
                                                const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
                                                const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));
                                                const timeRangeStartParts = timeRange[0].toISOString().split('T')[0].split('-').map(Number);
                                                const timeRangeStartUTC = new Date(Date.UTC(timeRangeStartParts[0], timeRangeStartParts[1] - 1, timeRangeStartParts[2]));
                                                const startOffset = differenceInDays(startDate, timeRangeStartUTC);
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
                                                        projectColor={projectColor}
                                                        sortingMode={false} // Force to false in normal mode
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
