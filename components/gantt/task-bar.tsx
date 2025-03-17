import { useState, useRef, useEffect } from 'react';
import type { Task } from '@/types/task';
import { Check } from 'lucide-react';

type TaskBarProps = {
    task: Task;
    index: number;
    startOffset: number;
    duration: number;
    dayWidth: number;
    isDragging: boolean;
    isResizing: boolean;
    resizeEdge: 'start' | 'end' | null;
    projectColor: string;
    timeRange: Date[];
    onDragStart: (taskId: number) => void;
    onDrag: (taskId: number, daysOffset: number) => void;
    onDragEnd: () => void;
    onResizeStart: (taskId: number, edge: 'start' | 'end') => void;
    onResize: (taskId: number, daysOffset: number) => void;
    onResizeEnd: () => void;
    onTaskClick: (task: Task) => void;
    onReorder: (taskId: number, newOrder: number) => void;
    isAllProjectsView?: boolean; // Add this new prop
};

export function TaskBar({
    task,
    startOffset,
    duration,
    dayWidth,
    isDragging,
    isResizing,
    resizeEdge,
    projectColor,
    onDragStart,
    onDrag,
    onDragEnd,
    onResizeStart,
    onResize,
    onResizeEnd,
    onTaskClick,
    isAllProjectsView = false
}: TaskBarProps) {
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [initialX, setInitialX] = useState<number>(0);
    const [hasMovement, setHasMovement] = useState<boolean>(false);
    const [hoverEdge, setHoverEdge] = useState<'start' | 'end' | null>(null);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const barRef = useRef<HTMLDivElement>(null);

    // The startOffset and duration props now include preview values from parent
    const left = startOffset * dayWidth;
    const width = duration * dayWidth;

    // Normalize date to UTC
    const normalizeToUTCDate = (dateString: string) => {
        const parts = dateString.split('T')[0].split('-').map(Number);
        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    };

    // Format date in UTC explicitly
    const formatUTCDate = (dateString: string) => {
        if (!dateString) return '';
        const date = normalizeToUTCDate(dateString);
        const month = date.toLocaleString('en', { month: 'short', timeZone: 'UTC' });
        const day = date.getUTCDate();
        return `${month} ${day}`;
    };

    // Handle dragging the task
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = barRef.current?.getBoundingClientRect();
        setDragStartX(e.clientX);
        setInitialX(rect?.left || 0);
        setHasMovement(false);
        onDragStart(task.id);
    };

    // Handle resizing from either edge
    const handleResizeStart = (e: React.MouseEvent, side: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        setDragStartX(e.clientX);
        setHasMovement(false);
        onResizeStart(task.id, side);
    };

    // Handle clicking to edit
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hasMovement) {
            onTaskClick(task);
        }
    };

    // Handle mouse enter/leave on task bar
    const handleMouseEnter = () => {
        setIsHovering(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        setHoverEdge(null);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Calculate the delta X movement
            const deltaX = e.clientX - dragStartX;

            if (deltaX !== 0) {
                setHasMovement(true);
            }

            // Convert pixel movement to days
            const exactDaysOffset = deltaX / dayWidth;
            const daysOffset = Math.round(exactDaysOffset);

            if (isDragging) {
                onDrag(task.id, daysOffset);
            } else if (isResizing && resizeEdge) {
                onResize(task.id, daysOffset);
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                onDragEnd();
            }
            if (isResizing) {
                onResizeEnd();
            }

            // Reset movement flag after a short delay
            setTimeout(() => setHasMovement(false), 100);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragStartX, dayWidth, resizeEdge, task.id, onDrag, onResize, onDragEnd, onResizeEnd]);

    // Detect which edge is being hovered
    const handleResizeHover = (edge: 'start' | 'end' | null) => {
        setHoverEdge(edge);
    };

    const getTaskStyle = () => ({
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: task.completed ? '#a3e635' : projectColor,
        opacity: isDragging || isResizing ? 0.7 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease',
    });

    // Determine if resize handles should be visible
    const showResizeHandles = isHovering || isResizing;

    return (
        <div className="relative flex items-center h-16 mb-1 group border-b border-gray-200 last:border-b-0">
            <div className="px-4 w-60 truncate font-medium text-base">
                {/* Show project name when in All Projects view */}
                {isAllProjectsView ? (
                    <div className="flex flex-col space-y-1">
                        <span>{task.name}</span>
                        <span className="text-xs text-neutral-500 flex items-center">
                            <span
                                className="inline-block w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: projectColor }}
                            />
                            {task.projectName || `Project #${task.projectId}`}
                        </span>
                    </div>
                ) : (
                    task.name
                )}
            </div>

            <div
                ref={barRef}
                className={`relative rounded-full text-white px-4 py-1 flex items-center h-10 z-10
                    ${isResizing ? 'ring-2 ring-black' : ''} ${task.completed ? 'shadow-lime-400/50 shadow-lg border-1 border-lime-600' : ''}`}
                style={getTaskStyle()}
                onMouseDown={handleDragStart}
                onClick={handleClick}
                onKeyDown={(e) => {
                    e.preventDefault();
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Resize handle - left edge */}
                {showResizeHandles && (
                    <div
                        className={`absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-20
                            ${(isResizing && resizeEdge === 'start') || hoverEdge === 'start'
                                ? 'bg-black/20 w-4 -ml-1 rounded-l-full'
                                : 'opacity-0 hover:opacity-100'}`}
                        onMouseDown={(e) => handleResizeStart(e, 'start')}
                        onMouseEnter={() => handleResizeHover('start')}
                        onMouseLeave={() => handleResizeHover(null)}
                    >
                        {/* Visual grip for resize handle */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-4 border-l border-r border-white opacity-70 ml-[6px]" />
                        </div>
                    </div>
                )}

                <span className={`flex items-center truncate text-sm select-none ${task.completed ? 'text-black' : ''}`}>
                    {task.completed && (
                        <div className="absolute flex items-center justify-center size-7 border-2 border-black/50 bg-black/10 rounded-full -ml-2 mr-2 p-1 text-black"><Check /></div>
                    )}
                    <span className={`${task.completed ? 'pl-8' : ''}`}>{task.name}</span>
                </span>

                {/* Resize handle - right edge */}
                {
                    showResizeHandles && (
                        <div
                            className={`absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-20
                            ${(isResizing && resizeEdge === 'end') || hoverEdge === 'end'
                                    ? 'bg-black/20 w-4 -mr-1 rounded-r-full'
                                    : 'opacity-0 hover:opacity-100'}`}
                            onMouseDown={(e) => handleResizeStart(e, 'end')}
                            onMouseEnter={() => handleResizeHover('end')}
                            onMouseLeave={() => handleResizeHover(null)}
                        >
                            {/* Visual grip for resize handle */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-4 border-l border-r border-white opacity-70 mr-[6px]" />
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
