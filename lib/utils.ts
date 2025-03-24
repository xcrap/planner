import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a date string to UTC midnight
 * @param date ISO date string or Date object
 * @returns Date object at UTC midnight
 */
export const normalizeToUTCDate = (date: string | Date): Date => {
    if (date instanceof Date) {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    }
    const parts = date.split('T')[0].split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
};
