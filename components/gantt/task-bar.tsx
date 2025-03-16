import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

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

type TaskBarProps = {
    task: Task;
    index: number;
    startOffset: number;
    duration: number;
    dayWidth: number;
    isDragging: boolean;
    isResizing: boolean;
    projectColor: string;
    onDragStart: (taskId: number) => void;
    onDrag: (taskId: number, daysOffset: number) => void;
    onDragEnd: () => void;
    onResizeStart: (taskId: number, edge: 'start' | 'end') => void;
    onResize: (taskId: number, daysOffset: number) => void;
    onResizeEnd: () => void;
    onReorder: (taskId: number, newOrder: number) => void;
    onTaskClick: (task: Task) => void;
};

export function TaskBar({
    task,
    index,
    startOffset,
    duration,
    dayWidth,
    isDragging,
    isResizing,
    projectColor,
    onDragStart,
    onDrag,
    onDragEnd,
    onResizeStart,
    onResize,
    onResizeEnd,
    onTaskClick,
    onReorder
}: TaskBarProps) {
    const [dragStartX, setDragStartX] = useState(0);
    const [initialLeft, setInitialLeft] = useState(0);
    const [mouseDragActive, setMouseDragActive] = useState(false);
    const [mouseResizeActive, setMouseResizeActive] = useState(false);
    const [resizeSide, setResizeSide] = useState<'start' | 'end' | null>(null);
    const [hasMovement, setHasMovement] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);

    const left = startOffset * dayWidth;
    const width = duration * dayWidth;

    // Handle dragging the entire task
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart(task.id);
        setDragStartX(e.clientX);
        setInitialLeft(left);
        setMouseDragActive(true);
        setHasMovement(false);
    };

    // Handle resizing from either edge
    const handleResizeStart = (e: React.MouseEvent, side: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(task.id, side);
        setDragStartX(e.clientX);
        setInitialLeft(left);
        setMouseResizeActive(true);
        setResizeSide(side);
        setHasMovement(false);
    };

    // Handle clicking to edit
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only trigger click if there was no movement
        if (!hasMovement) {
            onTaskClick(task);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (mouseDragActive) {
                const deltaX = e.clientX - dragStartX;
                const daysOffset = Math.round(deltaX / dayWidth);
                if (daysOffset !== 0) {
                    setHasMovement(true);
                    onDrag(task.id, daysOffset);
                }
            } else if (mouseResizeActive && resizeSide) {
                const deltaX = e.clientX - dragStartX;
                const daysOffset = Math.round(deltaX / dayWidth);
                if (daysOffset !== 0) {
                    setHasMovement(true);
                    onResize(task.id, daysOffset);
                }
            }
        };

        const handleMouseUp = () => {
            if (mouseDragActive) {
                setMouseDragActive(false);
                onDragEnd();
            }
            if (mouseResizeActive) {
                setMouseResizeActive(false);
                setResizeSide(null);
                onResizeEnd();
            }
            // Reset movement flag after a short delay
            setTimeout(() => {
                setHasMovement(false);
            }, 100);
        };

        if (mouseDragActive || mouseResizeActive) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [mouseDragActive, mouseResizeActive, dragStartX, dayWidth, resizeSide, task.id, onDrag, onDragEnd, onResize, onResizeEnd]);

    const getTaskStyle = () => {
        return {
            left: `${left}px`,
            width: `${width}px`,
            backgroundColor: task.completed ? '#8dac97' : projectColor,
            opacity: isDragging || isResizing ? 0.7 : 1,
            cursor: isDragging ? 'grabbing' : 'grab',
        };
    };

    return (
        <div className="relative flex items-center h-14 mb-1 group border-b border-neutral-200">
            <div className="px-4 w-48 truncate font-medium">{task.name}</div>

            <div
                ref={barRef}
                className="relative rounded-md shadow-xs border border-gray-400 text-white px-2 py-1 flex items-center h-10"
                style={getTaskStyle()}
                onMouseDown={handleDragStart}
                onClick={handleClick}
            >
                {/* Resize handle - left edge */}
                <div
                    className="absolute left-0 top-0 w-3 h-full cursor-ew-resize hover:bg-black hover:bg-opacity-20 z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'start')}
                />

                <span className="truncate text-sm select-none">
                    {task.name} ({format(parseISO(task.startDate), 'MMM d')} - {format(parseISO(task.endDate), 'MMM d')})
                </span>

                {/* Resize handle - right edge */}
                <div
                    className="absolute right-0 top-0 w-3 h-full cursor-ew-resize hover:bg-black hover:bg-opacity-20 z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'end')}
                />
            </div>
        </div>
    );
}
