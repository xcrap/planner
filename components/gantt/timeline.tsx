import { isWeekend, isToday } from 'date-fns';

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

    // Check if a date is today (comparing in UTC)
    const isDateToday = (date: Date) => {
        const today = new Date();
        return date.getUTCFullYear() === today.getUTCFullYear() &&
            date.getUTCMonth() === today.getUTCMonth() &&
            date.getUTCDate() === today.getUTCDate();
    };

    return (
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <div className="flex">
                {/* Empty space for task names */}
                <div className="w-48 shrink-0 border-r border-gray-200" />

                {/* Days */}
                <div className="flex">
                    {timeRange.map((date, i) => {
                        const isCurrentDay = isDateToday(date);
                        // Today's styling takes precedence over weekend styling
                        const bgColorClass = isCurrentDay ? 'bg-blue-50' : (isWeekend(date) ? 'bg-gray-50' : '');

                        return (
                            <div
                                key={i}
                                className={`flex flex-col items-center justify-center border-r ${i === 0 ? 'border-l' : ''} border-gray-200 
                                    ${bgColorClass} ${isCurrentDay ? 'border-blue-300' : ''}`}
                                style={{ width: `${dayWidth}px`, height: '60px' }}
                            >
                                <div className={`text-xs font-medium ${isCurrentDay ? 'text-blue-700' : ''}`}>
                                    {getUTCDayOfWeek(date)}
                                </div>
                                <div className={`text-sm font-bold ${isCurrentDay ? 'text-blue-700' : ''}`}>
                                    {formatUTCDate(date, 'month')} {formatUTCDate(date, 'day')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
