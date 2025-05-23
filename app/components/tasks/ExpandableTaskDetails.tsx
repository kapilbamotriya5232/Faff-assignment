// app/components/tasks/ExpandedTaskDetails.tsx
'use client';

import { useState, useEffect } from 'react';
import { Task, UserMin } from './TaskItem'; // Assuming Task and UserMin are exported from TaskItem

interface ExpandedTaskDetailsProps {
  task: Task;
  allUsers: UserMin[];
  onTaskUpdate: (updatedTask: Task) => void; // To propagate updates
}

const TASK_STATUSES = ['Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const getInitials = (name?: string | null, email?: string): string => {
    if (name && name.trim().length > 0) {
      return name.trim()[0].toUpperCase();
    }
    if (email && email.trim().length > 0) {
      return email.trim()[0].toUpperCase();
    }
    return '?'; // Fallback for no name/email
  };

const priorityStyles: { [key: string]: { base: string; icon: string; label: string; } } = {
  Low:    { base: 'border-sky-500 text-sky-600 bg-sky-50',    icon: '↓', label: 'Low' },
  Medium: { base: 'border-amber-500 text-amber-600 bg-amber-50', icon: '↔', label: 'Medium' },
  High:   { base: 'border-red-500 text-red-600 bg-red-50',     icon: '↑', label: 'High' },
};

const statusStyles: { [key: string]: { base: string; dot: string; textStrong: string } } = {
  Logged:   { base: 'text-slate-700 bg-slate-200',   dot: 'bg-slate-500', textStrong: 'text-slate-800'},
  Ongoing:  { base: 'text-blue-700 bg-blue-100',    dot: 'bg-blue-500', textStrong: 'text-blue-800'},
  Reviewed: { base: 'text-purple-700 bg-purple-100', dot: 'bg-purple-500', textStrong: 'text-purple-800'},
  Done:     { base: 'text-green-700 bg-green-100',   dot: 'bg-green-500', textStrong: 'text-green-800'},
  Blocked:  { base: 'text-red-700 bg-red-100',      dot: 'bg-red-500', textStrong: 'text-red-800'},
};


export default function ExpandedTaskDetails({ task, allUsers, onTaskUpdate }: ExpandedTaskDetailsProps) {
  const [isDetailsSectionCollapsed, setIsDetailsSectionCollapsed] = useState(false); // Start expanded

  // States for the editable fields, mirroring TaskItem's local states for controls
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [currentAssignedToId, setCurrentAssignedToId] = useState(task.assignedToId || '');
  const [currentPriority, setCurrentPriority] = useState(task.priority || '');

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local states if the task prop updates (e.g., from WebSocket via parent)
  useEffect(() => {
    if (task.status !== currentStatus) setCurrentStatus(task.status);
    if ((task.assignedToId || '') !== currentAssignedToId) setCurrentAssignedToId(task.assignedToId || '');
    if ((task.priority || '') !== currentPriority) setCurrentPriority(task.priority || '');
  }, [task.status, task.assignedToId, task.priority, currentStatus, currentAssignedToId, currentPriority]);

  const formatDate = (dateString: string, includeTime: boolean = false) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleUpdate = async (field: 'status' | 'assignedToId' | 'priority', value: string | null) => {
    setIsUpdating(true); setError(null);
    const payload: Partial<Pick<Task, 'status' | 'assignedToId' | 'priority'>> = {
         [field]: value === '' ? null : value
    };

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json(); throw new Error(errData.error || `Failed to update task`);
      }
      const updatedTaskData: Task = await response.json();
      onTaskUpdate(updatedTaskData); // Propagate update to parent (TaskList)
      console.log(`ExpandedTaskDetails: Task ${task.id} ${field} updated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed in details view');
      // Revert optimistic updates in local state
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
  const prioStyle = currentPriority && priorityStyles[currentPriority] ? priorityStyles[currentPriority] : null;
  const statStyle = statusStyles[currentStatus] || statusStyles['Logged'];

  const DetailRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="py-1.5 grid grid-cols-3 gap-2 items-center">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-xs text-slate-700 col-span-2">{children}</dd>
    </div>
  );

  return (
    <div className={`mt-1 p-3 border border-slate-200 rounded-md bg-white shadow ${isUpdating ? 'opacity-75' : ''}`}>
      <button
        onClick={() => setIsDetailsSectionCollapsed(!isDetailsSectionCollapsed)}
        className="w-full flex justify-between items-center py-2 px-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded focus:outline-none"
      >
        <span>Task Information</span>
        <svg className={`w-4 h-4 transform transition-transform duration-200 ${isDetailsSectionCollapsed ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {!isDetailsSectionCollapsed && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Title">
                <span className="font-semibold text-slate-800">{task.title}</span>
            </DetailRow>
            <DetailRow label="Status">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statStyle.base} ${statStyle.textStrong}`}>
                <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${statStyle.dot}`}></span>
                {currentStatus}
              </span>
            </DetailRow>
            <DetailRow label="Priority">
              {prioStyle ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${prioStyle.base}`}>
                  <span className="mr-1 font-bold">{prioStyle.icon}</span>{prioStyle.label}
                </span>
              ) : <span className="italic">Not set</span>}
            </DetailRow>
            <DetailRow label="Assigned To">
              {assignedUser ? (
                <div className="flex items-center space-x-1.5">
                  <div className={`w-5 h-5 rounded-full ${assignedUser.name ? 'bg-blue-500' : 'bg-slate-300'} text-white flex items-center justify-center text-xxs font-bold`}>
                    {getInitials(assignedUser.name, assignedUser.email)}
                  </div>
                  <span>{assignedUser.name || assignedUser.email}</span>
                </div>
              ) : <span className="italic">Unassigned</span>}
            </DetailRow>
            <DetailRow label="Requester">{task.requestedBy.name || task.requestedBy.email}</DetailRow>
            <DetailRow label="Created At">{formatDate(task.createdAt, true)}</DetailRow>
            <DetailRow label="Last Updated">{formatDate(task.updatedAt, true)}</DetailRow>
            {task.tags && task.tags.length > 0 && (
              <DetailRow label="Tags">
                <div className="flex flex-wrap gap-1">
                  {task.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 text-xxs bg-slate-200 text-slate-700 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
              </DetailRow>
            )}
          </dl>

          {/* Action Controls within Expanded Details */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <h5 className="text-xs font-semibold text-slate-600 mb-2">Manage Task:</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label htmlFor={`detail-status-${task.id}`} className="block text-xxs font-medium text-slate-500 mb-0.5">Status</label>
                <select id={`detail-status-${task.id}`} value={currentStatus} onChange={(e) => handleLocalChange('status', e.target.value)} disabled={isUpdating} className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}>
                  {TASK_STATUSES.map(statusVal => (<option key={statusVal} value={statusVal}>{statusVal}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor={`detail-assignee-${task.id}`} className="block text-xxs font-medium text-slate-500 mb-0.5">Assignee</label>
                <select id={`detail-assignee-${task.id}`} value={currentAssignedToId} onChange={(e) => handleLocalChange('assignedToId', e.target.value)} disabled={isUpdating || allUsers.length === 0} className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}>
                  <option value="">Unassigned</option>
                  {allUsers.map(user => (<option key={user.id} value={user.id}>{user.name || user.email}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor={`detail-priority-${task.id}`} className="block text-xxs font-medium text-slate-500 mb-0.5">Priority</label>
                <select id={`detail-priority-${task.id}`} value={currentPriority} onChange={(e) => handleLocalChange('priority', e.target.value)} disabled={isUpdating} className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}>
                  <option value="">None</option>
                  {PRIORITIES.map(prio => (<option key={prio} value={prio}>{prio}</option>))}
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        </div>
      )}
       {isDetailsSectionCollapsed && (
        <div className="mt-1 pt-1 text-xs text-slate-500 flex items-center space-x-3 overflow-hidden whitespace-nowrap">
            {/* Collapsed View: Icons/minimal text */}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xxs font-medium ${statStyle.base} ${statStyle.textStrong}`}>
                <span className={`w-1.5 h-1.5 mr-1 rounded-full ${statStyle.dot}`}></span>{currentStatus}
            </span>
            {prioStyle && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xxs font-semibold border ${prioStyle.base}`}>
                <span className="mr-0.5 font-bold">{prioStyle.icon}</span>{prioStyle.label}
                </span>
            )}
            {assignedUser && (
                 <div className="flex items-center space-x-1 text-xxs">
                    <div className={`w-4 h-4 rounded-full ${assignedUser.name ? 'bg-blue-500' : 'bg-slate-300'} text-white flex items-center justify-center text-xxs font-bold`}>
                        {getInitials(assignedUser.name, assignedUser.email)}
                    </div>
                    <span className="truncate">{assignedUser.name || assignedUser.email}</span>
                </div>
            )}
            {!assignedUser && <span className="text-xxs italic">Unassigned</span>}
        </div>
      )}
    </div>
  );
}