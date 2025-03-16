import { useState, useRef, useEffect } from 'react';

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
};

export function TaskBar({
    task,
    index,
    startOffset,
    duration,
    dayWidth,
    isDragging,
    isResizing,
    resizeEdge,
    projectColor,
    timeRange,
    onDragStart,
    onDrag,
    onDragEnd,
    onResizeStart,
    onResize,
    onResizeEnd,
    onTaskClick,
    onReorder
}: TaskBarProps) {
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [initialX, setInitialX] = useState<number>(0);
    const [lastDragOffset, setLastDragOffset] = useState<number>(0);
    const [lastResizeOffset, setLastResizeOffset] = useState<number>(0);
    const [mouseDragActive, setMouseDragActive] = useState<boolean>(false);
    const [mouseResizeActive, setMouseResizeActive] = useState<boolean>(false);
    const [resizeSide, setResizeSide] = useState<'start' | 'end' | null>(null);
    const [hasMovement, setHasMovement] = useState<boolean>(false);
    const barRef = useRef<HTMLDivElement>(null);

    // Calculate position with preview offsets during drag/resize
    const previewOffset = mouseDragActive ? lastDragOffset : 0;
    const previewResizeOffset = mouseResizeActive && resizeSide === 'start' ? lastResizeOffset : 0;
    const previewResizeEndOffset = mouseResizeActive && resizeSide === 'end' ? lastResizeOffset : 0;
    
    // Position calculations with visual feedback
    const left = (startOffset + previewOffset + previewResizeOffset) * dayWidth;
    const width = (duration - previewResizeOffset + previewResizeEndOffset) * dayWidth;

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
        setLastDragOffset(0);
        setMouseDragActive(true);
        setHasMovement(false);
        onDragStart(task.id);
    };

    // Handle resizing from either edge
    const handleResizeStart = (e: React.MouseEvent, side: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        setDragStartX(e.clientX);
        setLastResizeOffset(0);
        setMouseResizeActive(true);
        setResizeSide(side);
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

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (mouseDragActive) {
                const deltaX = e.clientX - dragStartX;
                // Convert pixel movement to days with proper rounding
                const exactDaysOffset = deltaX / dayWidth;
                const daysOffset = Math.round(exactDaysOffset);
                
                // Only trigger if days changed
                if (daysOffset !== lastDragOffset) {
                    console.log(`Mouse drag: deltaX=${deltaX}, exactDaysOffset=${exactDaysOffset}, rounded=${daysOffset}`);
                    setLastDragOffset(daysOffset);
                    setHasMovement(true);
                    onDrag(task.id, daysOffset);
                }
            } else if (mouseResizeActive && resizeSide) {
                const deltaX = e.clientX - dragStartX;
                // Convert pixel movement to days with proper rounding
                const exactDaysOffset = deltaX / dayWidth;
                const daysOffset = Math.round(exactDaysOffset);
                
                // Only trigger if days changed
                if (daysOffset !== lastResizeOffset) {
                    console.log(`Mouse resize: side=${resizeSide}, deltaX=${deltaX}, exactDaysOffset=${exactDaysOffset}, rounded=${daysOffset}`);
                    setLastResizeOffset(daysOffset);
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
            
            // Reset tracking variables
            setLastDragOffset(0);
            setLastResizeOffset(0);
            
            // Reset movement flag after a short delay
            setTimeout(() => setHasMovement(false), 100);
        };

        if (mouseDragActive || mouseResizeActive) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [mouseDragActive, mouseResizeActive, dragStartX, initialX, dayWidth, resizeSide, task.id, onDrag, onResize, onDragEnd, onResizeEnd, lastDragOffset, lastResizeOffset]);

    const getTaskStyle = () => ({
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: task.completed ? '#8dac97' : projectColor,
        opacity: isDragging || isResizing ? 0.7 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    });

    // Extract readable dates for display
    const startDateDisplay = formatUTCDate(task.startDate);
    const endDateDisplay = formatUTCDate(task.endDate);

    return (
        <div className="relative flex items-center h-14 mb-1 group">
            <div className="px-4 w-48 truncate font-medium">{task.name}</div>

            <div
                ref={barRef}
                className="relative rounded-md border border-gray-400 text-white px-2 py-1 flex items-center h-10 z-10"
                style={getTaskStyle()}
                onMouseDown={handleDragStart}
                onClick={handleClick}
            >
                {/* Resize handle - left edge */}
                <div
                    className="absolute left-0 top-0 w-3 h-full cursor-ew-resize hover:bg-black hover:bg-opacity-20"
                    onMouseDown={(e) => handleResizeStart(e, 'start')}
                />

                <span className="truncate text-sm select-none">
                    {task.name} ({startDateDisplay} - {endDateDisplay})
                </span>

                {/* Resize handle - right edge */}
                <div
                    className="absolute right-0 top-0 w-3 h-full cursor-ew-resize hover:bg-black hover:bg-opacity-20"
                    onMouseDown={(e) => handleResizeStart(e, 'end')}
                />
            </div>
        </div>
    );
}
