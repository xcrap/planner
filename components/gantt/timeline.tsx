import { format, isWeekend } from 'date-fns';

type TimelineProps = {
    timeRange: Date[];
    dayWidth: number;
};

export function Timeline({ timeRange, dayWidth }: TimelineProps) {
    return (
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex">
                {/* Empty space for task names */}
                <div className="w-48 shrink-0" />

                {/* Days */}
                <div className="flex">
                    {timeRange.map((date, i) => (
                        <div
                            key={i}
                            className={`flex flex-col items-center justify-center border-r border-gray-200 ${isWeekend(date) ? 'bg-gray-50' : ''
                                }`}
                            style={{ width: `${dayWidth}px`, height: '60px' }}
                        >
                            <div className="text-xs font-medium">
                                {format(date, 'EEE')}
                            </div>
                            <div className="text-sm font-bold">
                                {format(date, 'MMM d')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
