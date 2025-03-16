import { isWeekend } from 'date-fns';

type TimelineProps = {
    timeRange: Date[];
    dayWidth: number;
};

export function Timeline({ timeRange, dayWidth }: TimelineProps) {
    // Format date in UTC explicitly using standard JavaScript methods
    const formatUTCDate = (date: Date, format: 'day' | 'month') => {
        if (format === 'day') {
            return date.toLocaleString('en', { day: 'numeric', timeZone: 'UTC' });
        } else if (format === 'month') {
            return date.toLocaleString('en', { month: 'short', timeZone: 'UTC' });
        }
        return '';
    };

    // Get day of week in UTC
    const getUTCDayOfWeek = (date: Date) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getUTCDay()];
    };

    return (
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex">
                {/* Empty space for task names */}
                <div className="w-48 shrink-0 border-r border-gray-200" />

                {/* Days */}
                <div className="flex">
                    {timeRange.map((date, i) => (
                        <div
                            key={i}
                            className={`flex flex-col items-center justify-center border-r ${i === 0 ? 'border-l' : ''} border-gray-200 ${isWeekend(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))) ? 'bg-gray-50' : ''}`}
                            style={{ width: `${dayWidth}px`, height: '60px' }}
                        >
                            <div className="text-xs font-medium">
                                {getUTCDayOfWeek(date)}
                            </div>
                            <div className="text-sm font-bold">
                                {formatUTCDate(date, 'month')} {formatUTCDate(date, 'day')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
