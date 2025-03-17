export type Task = {
    _projectSortKey: number;
    id: number;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    completed: boolean;
    order: number;
    projectId: number;
    projectName?: string;
    projectColor?: string;
};

export type Project = {
    id: number;
    name: string;
    description: string | null;
    color: string;
    tasks: Task[];
};
