import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

type AppState = {
    selectedProjectId: number | null;
    setSelectedProjectId: (id: number | null) => void;
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            selectedProjectId: null,
            setSelectedProjectId: (id) => set({ selectedProjectId: id }),
        }),
        {
            name: 'gantt-app-storage',
        }
    )
);
