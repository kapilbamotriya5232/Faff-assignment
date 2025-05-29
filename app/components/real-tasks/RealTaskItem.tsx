'use client';

import React from 'react';
import { RealTaskType } from '../../real-tasks/page'; // Adjusted import path

interface RealTaskItemProps {
  task: RealTaskType;
  onOpenTask: (task: RealTaskType) => void;
}

// Helper to format date string (basic example)
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch (e) {
    return dateString; // Fallback to original string if parsing fails
  }
};

const RealTaskItem: React.FC<RealTaskItemProps> = ({ task, onOpenTask }) => {
  return (
    <div 
      className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-slate-200"
      onClick={() => onOpenTask(task)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-700">{task.name}</h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {task.category}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-3 truncate">
        {task.description}
      </p>
      <div className="mb-3">
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs text-slate-400 flex justify-between items-center">
        <span>Created: {formatDate(task.createdAt)}</span>
        <span>Messages: {task.realMessages?.length || 0}</span>
      </div>
    </div>
  );
};

export default RealTaskItem; 