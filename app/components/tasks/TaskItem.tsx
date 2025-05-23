// src/components/tasks/TaskItem.tsx
'use client';

import { useState } from 'react';

// Minimal User interface for props
interface UserMin {
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
  allUsers: UserMin[]; // For assignee dropdown
  onTaskUpdate: (updatedTask: Task) => void; // Callback to inform parent of an update
}

const TASK_STATUSES = ['Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'];

export default function TaskItem({ task, allUsers, onTaskUpdate }: TaskItemProps) {
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [currentAssignedToId, setCurrentAssignedToId] = useState(task.assignedToId || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUpdate = async (field: 'status' | 'assignedToId', value: string) => {
    setIsUpdating(true);
    setError(null);
    
    const payload: Partial<Task> = {};
    if (field === 'status') {
      payload.status = value;
    } else if (field === 'assignedToId') {
      payload.assignedToId = value === '' ? null : value; // Handle "Unassigned"
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to update task`);
      }
      const updatedTask: Task = await response.json();
      
      // Update local state immediately for responsiveness
      if (field === 'status') setCurrentStatus(updatedTask.status);
      if (field === 'assignedToId') setCurrentAssignedToId(updatedTask.assignedToId || '');
      
      onTaskUpdate(updatedTask); // Notify parent component
      console.log(`Task ${task.id} ${field} updated to ${value}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      // Optionally revert local state if needed, or rely on parent to refresh
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out ${isUpdating ? 'opacity-70' : ''}`}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-blue-600 mb-1 flex-grow">{task.title}</h3>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full
            ${currentStatus === 'Done' ? 'bg-green-100 text-green-700' :
              currentStatus === 'Ongoing' ? 'bg-yellow-100 text-yellow-700' :
              currentStatus === 'Blocked' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'}`}>
            {currentStatus}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
        <p><strong>ID:</strong> {task.id.substring(0, 8)}...</p>
        <p><strong>Requested by:</strong> {task.requestedBy?.name || task.requestedBy?.email}</p>
        <p><strong>Priority:</strong> {task.priority || <span className="italic">Not set</span>}</p>
        <p><strong>Created:</strong> {formatDate(task.createdAt)}</p>
        {task.tags && task.tags.length > 0 && (
          <p className="md:col-span-2"><strong>Tags:</strong> {task.tags.join(', ')}</p>
        )}
         <p className="md:col-span-2"><strong>Last Updated:</strong> {formatDate(task.updatedAt)}</p>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">Error: {error}</p>}
      
      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
        {/* Status Update Dropdown */}
        <div className="flex items-center space-x-1">
          <label htmlFor={`status-${task.id}`} className="text-xs font-medium text-gray-500">Status:</label>
          <select
            id={`status-${task.id}`}
            value={currentStatus}
            onChange={(e) => handleUpdate('status', e.target.value)}
            disabled={isUpdating}
            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50"
          >
            {TASK_STATUSES.map(statusVal => (
              <option key={statusVal} value={statusVal}>{statusVal}</option>
            ))}
          </select>
        </div>

        {/* Assignee Update Dropdown */}
        <div className="flex items-center space-x-1">
          <label htmlFor={`assignee-${task.id}`} className="text-xs font-medium text-gray-500">Assignee:</label>
          <select
            id={`assignee-${task.id}`}
            value={currentAssignedToId}
            onChange={(e) => handleUpdate('assignedToId', e.target.value)}
            disabled={isUpdating}
            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50"
          >
            <option value="">Unassigned</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>{user.name || user.email}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}