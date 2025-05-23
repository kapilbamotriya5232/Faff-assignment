// app/components/tasks/TaskItem.tsx
'use client';

import { useState, useEffect } from 'react';

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
  allUsers: UserMin[];
  onTaskUpdate: (updatedTask: Task) => void;
}

const TASK_STATUSES = ['Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const getInitials = (name?: string | null, email?: string) => {
  if (name) {
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '??';
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

export default function TaskItem({ task, allUsers, onTaskUpdate }: TaskItemProps) {
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [currentAssignedToId, setCurrentAssignedToId] = useState(task.assignedToId || '');
  const [currentPriority, setCurrentPriority] = useState(task.priority || '');

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task.status !== currentStatus) setCurrentStatus(task.status);
    if ((task.assignedToId || '') !== currentAssignedToId) setCurrentAssignedToId(task.assignedToId || '');
    if ((task.priority || '') !== currentPriority) setCurrentPriority(task.priority || '');
  }, [task.status, task.assignedToId, task.priority, currentStatus, currentAssignedToId, currentPriority]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-CA');

  const handleUpdate = async (field: 'status' | 'assignedToId' | 'priority', value: string | null) => {
    setIsUpdating(true); setError(null);
    const payload: Partial<Task> = { [field]: value === '' ? null : value };
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json(); throw new Error(errData.error || `Failed to update task`);
      }
      const updatedTaskData: Task = await response.json();
      onTaskUpdate(updatedTaskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      setCurrentStatus(task.status); 
      setCurrentAssignedToId(task.assignedToId || '');
      setCurrentPriority(task.priority || '');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLocalChange = (field: 'status' | 'assignedToId' | 'priority', value: string) => {
    if (field === 'status') setCurrentStatus(value);
    else if (field === 'assignedToId') setCurrentAssignedToId(value);
    else if (field === 'priority') setCurrentPriority(value);
    handleUpdate(field, value);
  };
  
  const assignedUser = currentAssignedToId ? allUsers.find(u => u.id === currentAssignedToId) : null;
  const prioStyle = currentPriority && priorityStyles[currentPriority] 
                    ? priorityStyles[currentPriority] 
                    : null;
  const statStyle = statusStyles[currentStatus] || statusStyles['Logged'];

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 group ${isUpdating ? 'opacity-60 animate-pulse' : ''}`}>
      <div className="p-4"> {/* Reduced padding slightly from p-5 */}
        {/* Top section: Title, Priority, Status */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-md font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
            {task.title}
          </h3>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {prioStyle && (
              <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${prioStyle.base}`}>
                <span className="mr-1 font-bold">{prioStyle.icon}</span>
                {prioStyle.label}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statStyle.base}`}>
              <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${statStyle.dot}`}></span>
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Middle section: Assignee, Requester, Dates, Tags */}
        <div className="mb-3 text-xs text-slate-600 space-y-1.5"> {/* Reduced mb and space-y */}
          <div className="flex items-center">
            <span className="font-medium text-slate-500 w-20 flex-shrink-0">Assigned:</span>
            {assignedUser ? (
              <div className="flex items-center space-x-1.5">
                <div className={`w-5 h-5 rounded-full ${assignedUser.name ? 'bg-blue-500' : 'bg-slate-300'} text-white flex items-center justify-center text-xxs font-bold`}>
                  {getInitials(assignedUser.name, assignedUser.email)}
                </div>
                <span className="text-slate-700 truncate" title={assignedUser.name || assignedUser.email}>{assignedUser.name || assignedUser.email}</span>
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
          <div className="mb-3"> {/* Reduced mb */}
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 text-xxs bg-slate-200 text-slate-700 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
         {error && <p className="text-xs text-red-500 mb-2 py-1 px-2 bg-red-50 rounded-md">Error: {error}</p>}
      </div>

      {/* Actions Section - More Compact */}
      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200"> {/* Reduced padding */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"> {/* Reduced gap */}
          <div>
            <label htmlFor={`status-${task.id}`} className="sr-only">Status</label> {/* Screen reader only label */}
            <select
              id={`status-${task.id}`}
              title="Change Status"
              value={currentStatus}
              onChange={(e) => handleLocalChange('status', e.target.value)}
              disabled={isUpdating}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 disabled:bg-slate-100 appearance-none"
              style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}
            >
              {TASK_STATUSES.map(statusVal => (
                <option key={statusVal} value={statusVal}>{statusVal}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`assignee-${task.id}`} className="sr-only">Assignee</label>
            <select
              id={`assignee-${task.id}`}
              title="Assign To"
              value={currentAssignedToId}
              onChange={(e) => handleLocalChange('assigneeId', e.target.value)}
              disabled={isUpdating || allUsers.length === 0}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 disabled:bg-slate-100 appearance-none"
              style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}
            >
              <option value="">Unassigned</option>
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>{user.name || user.email}</option>
              ))}
            </select>
          </div>
           <div>
            <label htmlFor={`priority-${task.id}`} className="sr-only">Priority</label>
            <select
              id={`priority-${task.id}`}
              title="Set Priority"
              value={currentPriority}
              onChange={(e) => handleLocalChange('priority', e.target.value)}
              disabled={isUpdating}
              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition duration-150 disabled:bg-slate-100 appearance-none"
              style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}
            >
              <option value="">None</option>
              {PRIORITIES.map(prio => (
                <option key={prio} value={prio}>{prio}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}