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

export function GanttChart({ project, onTasksChanged }: GanttChartProps) {
    const [timeRange, setTimeRange] = useState<Date[]>([]);
    const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
    const [resizingTaskId, setResizingTaskId] = useState<number | null>(null);
    const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
    const [throttle, setThrottle] = useState<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dayWidth, setDayWidth] = useState(60);
    const { setSelectedTask } = useTaskContext();

    // Normalize date to UTC
    const normalizeToUTCDate = (date: string) => {
        const d = new Date(date);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };

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
    };

    const handleTaskDrag = (taskId: number, daysOffset: number) => {
        if (!project) return;

        const task = project.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (throttle) {
            clearTimeout(throttle);
        }

        console.log(`Dragging task ${taskId} by ${daysOffset} days`);

        // Extract dates from the string format and create new Date objects
        const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
        const endDateParts = task.endDate.split('T')[0].split('-').map(Number);
        
        // Create UTC dates using the exact year, month, and day from the strings
        const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
        const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));

        // Create new Date objects for updating to avoid mutation
        const newStartDate = new Date(startDate);
        const newEndDate = new Date(endDate);
        
        // Add the offset directly to the day component
        newStartDate.setUTCDate(newStartDate.getUTCDate() + daysOffset);
        newEndDate.setUTCDate(newEndDate.getUTCDate() + daysOffset);

        console.log(`Original dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`New dates: ${newStartDate.toISOString()} to ${newEndDate.toISOString()}`);

        // Update with a short delay
        setThrottle(setTimeout(() => {
            updateTaskDates(taskId, newStartDate, newEndDate);
        }, 50)); // Reduced throttle time for more responsive drag
    };

    const handleTaskDragEnd = () => {
        if (throttle) {
            clearTimeout(throttle);
            setThrottle(null);
        }
        setDraggingTaskId(null);
        onTasksChanged();
    };

    const handleTaskResizeStart = (taskId: number, edge: 'start' | 'end') => {
        setResizingTaskId(taskId);
        setResizeEdge(edge);
    };

    const handleTaskResize = (taskId: number, daysOffset: number) => {
        if (!project) return;

        const task = project.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (throttle) {
            clearTimeout(throttle);
        }

        console.log(`Resizing task ${taskId} edge ${resizeEdge} by ${daysOffset} days`);

        // Extract dates from the string format and create new Date objects
        const startDateParts = task.startDate.split('T')[0].split('-').map(Number);
        const endDateParts = task.endDate.split('T')[0].split('-').map(Number);
        
        // Create UTC dates using the exact year, month, and day from the strings
        const startDate = new Date(Date.UTC(startDateParts[0], startDateParts[1] - 1, startDateParts[2]));
        const endDate = new Date(Date.UTC(endDateParts[0], endDateParts[1] - 1, endDateParts[2]));

        // Create new Date objects for updating to avoid mutation
        let newStartDate = new Date(startDate);
        let newEndDate = new Date(endDate);

        // Apply the offset consistently for resize operations using UTC
        if (resizeEdge === 'start') {
            // Adjust the start date directly
            newStartDate.setUTCDate(startDate.getUTCDate() + daysOffset);
            
            // Make sure start date is not after end date
            if (newStartDate >= endDate) {
                newStartDate = new Date(endDate);
                newStartDate.setUTCDate(endDate.getUTCDate() - 1);
            }
            
            console.log(`Resizing start from ${startDate.toISOString()} to ${newStartDate.toISOString()}`);
        } else if (resizeEdge === 'end') {
            // Adjust the end date directly
            newEndDate.setUTCDate(endDate.getUTCDate() + daysOffset);
            
            // Make sure end date is not before start date
            if (newEndDate <= startDate) {
                newEndDate = new Date(startDate);
                newEndDate.setUTCDate(startDate.getUTCDate() + 1);
            }
            
            console.log(`Resizing end from ${endDate.toISOString()} to ${newEndDate.toISOString()}`);
        }

        setThrottle(setTimeout(() => {
            updateTaskDates(taskId, newStartDate, newEndDate);
        }, 100));
    };

    const handleTaskResizeEnd = () => {
        if (throttle) {
            clearTimeout(throttle);
            setThrottle(null);
        }
        setResizingTaskId(null);
        setResizeEdge(null);
        onTasksChanged();
    };

    const updateTaskDates = async (taskId: number, startDate: Date, endDate: Date) => {
        try {
            // Format dates in UTC for the API request using ISO string and extracting the date part
            const startDateFormatted = startDate.toISOString().split('T')[0];
            const endDateFormatted = endDate.toISOString().split('T')[0];
            
            console.log("Updating task dates to:", startDateFormatted, endDateFormatted);
            
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: `${startDateFormatted}T00:00:00.000Z`,
                    endDate: `${endDateFormatted}T00:00:00.000Z`,
                })
            });
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
                        {timeRange.map((date, i) => (
                            <div
                                key={i}
                                className={`absolute top-0 bottom-0 ${i === 0 ? 'border-l' : ''} border-r border-neutral-200 ${
                                    isWeekend(date) ? 'bg-gray-50' : ''
                                }`}
                                style={{
                                    left: `${i * dayWidth}px`,
                                    width: `${dayWidth}px`,
                                }}
                            />
                        ))}
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

                                    return (
                                        <TaskBar
                                            key={task.id}
                                            task={task}
                                            index={index}
                                            startOffset={startOffset}
                                            duration={duration}
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
