import { useEffect, useState, useRef } from 'react';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';
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

    useEffect(() => {
        if (!project || !project.tasks.length) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const range: Date[] = [];

            let current = start;
            while (current <= end) {
                range.push(new Date(current));
                current = addDays(current, 1);
            }

            setTimeRange(range);
            return;
        }

        let earliestDate = parseISO(project.tasks[0].startDate);
        let latestDate = parseISO(project.tasks[0].endDate);

        project.tasks.forEach(task => {
            const taskStartDate = parseISO(task.startDate);
            const taskEndDate = parseISO(task.endDate);

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
        let current = earliestDate;

        while (current <= latestDate) {
            range.push(new Date(current));
            current = addDays(current, 1);
        }

        setTimeRange(range);
    }, [project]);

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

        const startDate = parseISO(task.startDate);
        const endDate = parseISO(task.endDate);
        const newStartDate = addDays(startDate, daysOffset);
        const newEndDate = addDays(endDate, daysOffset);

        setThrottle(setTimeout(() => {
            updateTaskDates(taskId, newStartDate, newEndDate);
        }, 100));
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

        const startDate = parseISO(task.startDate);
        const endDate = parseISO(task.endDate);

        let newStartDate = startDate;
        let newEndDate = endDate;

        if (resizeEdge === 'start') {
            newStartDate = addDays(startDate, daysOffset);
            if (newStartDate >= endDate) {
                newStartDate = addDays(endDate, -1);
            }
        } else if (resizeEdge === 'end') {
            newEndDate = addDays(endDate, daysOffset);
            if (newEndDate <= startDate) {
                newEndDate = addDays(startDate, 1);
            }
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
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd')
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
        const tomorrow = addDays(today, 1);

        const newTask = {
            id: undefined, // Changed from not setting id at all
            name: 'New Task',
            description: '',
            startDate: format(today, 'yyyy-MM-dd'),
            endDate: format(tomorrow, 'yyyy-MM-dd'),
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

            <div className="flex flex-grow overflow-auto" ref={containerRef}>
                <div
                    className="relative flex flex-col"
                    style={{
                        width: `${timeRange.length * dayWidth + 200}px`,
                    }}
                >
                
                    <Timeline timeRange={timeRange} dayWidth={dayWidth} />

                    <div className="flex flex-col flex-1">
                        {project.tasks.length > 0 ? (
                            project.tasks
                                .sort((a, b) => a.order - b.order)
                                .map((task, index) => {
                                    const startDate = parseISO(task.startDate);
                                    const endDate = parseISO(task.endDate);
                                    const startOffset = differenceInDays(startDate, timeRange[0]);
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
                                            onDragStart={handleTaskDragStart}
                                            onDrag={handleTaskDrag}
                                            onDragEnd={handleTaskDragEnd}
                                            onResizeStart={handleTaskResizeStart}
                                            onResize={handleTaskResize}
                                            onResizeEnd={handleTaskResizeEnd}
                                            onTaskClick={handleTaskClick}
                                            projectColor={project.color} 
                                            onReorder={function (taskId: number, newOrder: number): void {
                                                throw new Error('Function not implemented.');
                                            } }                                        />
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
