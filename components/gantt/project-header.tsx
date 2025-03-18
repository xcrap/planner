import React from 'react';

type ProjectHeaderProps = {
    projectName: string;
    projectColor: string;
    projectId: number;
};

export function ProjectHeader({ projectName, projectColor, projectId }: ProjectHeaderProps) {
    return (
        <div className="relative flex items-center h-8 rounded-xl overflow-hidden">
            <div className="absolute inset-0" style={{ backgroundColor: projectColor, opacity: 0.20 }}>&nbsp;</div>
            <div className="px-4 w-full font-medium text-neutral-700 flex items-center">
                <span
                    className="inline-block size-2 rounded-full mr-2"
                    style={{ backgroundColor: projectColor }}
                />
                <span className="text-sm">{projectName || `Project #${projectId}`}</span>
            </div>
        </div>
    );
}