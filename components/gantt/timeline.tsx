import { isWeekend } from 'date-fns';
import { normalizeToUTCDate } from '@/lib/utils';

type TimelineProps = {
    timeRange: Date[];
    dayWidth: number;
};

export function Timeline({ timeRange, dayWidth }: TimelineProps) {
    // Format date in UTC explicitly using standard JavaScript methods
    const formatUTCDate = (date: Date, format: 'day' | 'month') => {
        if (format === 'day') {
            return date.toLocaleString('en', { day: 'numeric', timeZone: 'UTC' });
        }
        if (format === 'month') {
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
        const todayUTC = normalizeToUTCDate(today);
        return date.getTime() === todayUTC.getTime();
    };

    return (
        <div className="sticky top-0 z-10">
            <div className="flex">
                {/* Empty space for task names */}
                <div className="w-60 shrink-0" />

                {/* Days */}
                <div className="flex border-b border-neutral-200">
                    {timeRange.map((date) => {
                        const isCurrentDay = isDateToday(date);
                        // Today's styling takes precedence over weekend styling
                        const bgColorClass = isCurrentDay ? 'bg-yellow-50' : (isWeekend(date) ? 'bg-neutral-100' : 'bg-white');

                        return (
                            <div
                                key={date.getTime()}
                                className={`flex flex-col items-center justify-center rounded-t-md 
                                    ${bgColorClass} `}
                                style={{ width: `${dayWidth}px`, height: '60px' }}
                            >
                                <div className={`text-xs  ${isCurrentDay ? 'text-yellow-700' : 'text-neutral-600'}`}>
                                    {getUTCDayOfWeek(date)}
                                </div>
                                <div className={`text-xs font-bold mt-0.5  ${isCurrentDay ? 'text-yellow-700' : 'text-neutral-800'}`}>
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
