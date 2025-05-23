// app/components/tasks/TaskItem.tsx
'use client';

// Removed useState, useEffect as this component becomes simpler
// import { useState, useEffect } from 'react';

// ExpandedTaskDetails and ChatInterface are NO LONGER imported or used directly here
// import ExpandedTaskDetails from './ExpandedTaskDetails';
// import ChatInterface from '../chat/ChatInterface';

import { UserMin as CurrentUserType } from '@/app/page'; // For currentUser type if needed by other parts later

// Minimal User interface for props
export interface UserMin {
  id: string;
  name?: string | null;
  email: string;
}

// Full Task interface, matching API response
export interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  requestedById: string;
  requestedBy: UserMin;
  assignedToId?: string | null;
  assignedTo?: UserMin | null;
}

interface TaskItemProps {
  task: Task;
  allUsers: UserMin[]; // Still needed for displaying assignee in summary
  // currentUser: CurrentUserType; // No longer directly needed by TaskItem for chat if modal handles it
  // onTaskUpdate is now handled by the modal
  // isExpanded is removed
  onOpenTask: () => void; // New prop to open the modal
}

// Ensure this is the single-letter version
const getInitials = (name?: string | null, email?: string): string => {
  if (name && name.trim().length > 0) return name.trim()[0].toUpperCase();
  if (email && email.trim().length > 0) return email.trim()[0].toUpperCase();
  return '?';
};

const priorityStyles: { [key: string]: { base: string; icon: string; label: string; } } = {
  Low:    { base: 'border-sky-500 text-sky-600 bg-sky-50',    icon: '↓', label: 'Low' },
  Medium: { base: 'border-amber-500 text-amber-600 bg-amber-50', icon: '↔', label: 'Medium' },
  High:   { base: 'border-red-500 text-red-600 bg-red-50',     icon: '↑', label: 'High' },
};

const statusStyles: { [key: string]: { base: string; dot: string; } } = {
  Logged:   { base: 'text-slate-600 bg-slate-100',   dot: 'bg-slate-400' },
  Ongoing:  { base: 'text-blue-600 bg-blue-100',    dot: 'bg-blue-400' },
  Reviewed: { base: 'text-purple-600 bg-purple-100', dot: 'bg-purple-400' },
  Done:     { base: 'text-green-600 bg-green-100',   dot: 'bg-green-400' },
  Blocked:  { base: 'text-red-600 bg-red-100',      dot: 'bg-red-400' },
};

export default function TaskItem({ task, allUsers, onOpenTask }: TaskItemProps) {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-CA');
  
  const displayAssignedUser = task.assignedToId ? allUsers.find(u => u.id === task.assignedToId) : null;
  const displayPrioStyle = task.priority && priorityStyles[task.priority] ? priorityStyles[task.priority] : null;
  const displayStatStyle = statusStyles[task.status] || statusStyles['Logged'];

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group ring-1 ring-transparent hover:ring-blue-400 cursor-pointer"
      onClick={onOpenTask} // Call onOpenTask when the item is clicked
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-md font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
            {task.title}
          </h3>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {displayPrioStyle && (
              <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${displayPrioStyle.base}`}>
                <span className="mr-1 font-bold">{displayPrioStyle.icon}</span>
                {displayPrioStyle.label}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${displayStatStyle.base}`}>
              <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${displayStatStyle.dot}`}></span>
              {task.status}
            </span>
          </div>
        </div>
        <div className="mb-3 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center">
            <span className="font-medium text-slate-500 w-20 flex-shrink-0">Assigned:</span>
            {displayAssignedUser ? (
              <div className="flex items-center space-x-1.5">
                <div className={`w-5 h-5 rounded-full ${displayAssignedUser.name ? 'bg-blue-500' : 'bg-slate-300'} text-white flex items-center justify-center text-xxs font-bold`}>
                  {getInitials(displayAssignedUser.name, displayAssignedUser.email)}
                </div>
                <span className="text-slate-700 truncate" title={displayAssignedUser.name || displayAssignedUser.email}>{displayAssignedUser.name || displayAssignedUser.email}</span>
              </div>
            ) : (
              <span className="italic text-slate-400">Unassigned</span>
            )}
          </div>
          <div className="flex items-center">
            <span className="font-medium text-slate-500 w-20 flex-shrink-0">Requester:</span>
            <span className="text-slate-700 truncate" title={task.requestedBy?.name || task.requestedBy?.email}>{task.requestedBy?.name || task.requestedBy?.email}</span>
          </div>
          <div className="flex items-center">
             <span className="font-medium text-slate-500 w-20 flex-shrink-0">Created:</span>
             <span className="text-slate-700">{formatDate(task.createdAt)}</span>
          </div>
        </div>
        {task.tags && task.tags.length > 0 && (
          <div className="mb-1">
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 text-xxs bg-slate-200 text-slate-700 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Action controls and expanded section are REMOVED from here */}
    </div>
  );
}