// app/components/tasks/ExpandedTaskDetails.tsx
'use client';

import { useEffect, useState } from 'react';
import { Task, UserMin } from './TaskItem'; // Assuming Task and UserMin are exported from TaskItem

interface ExpandedTaskDetailsProps {
  task: Task;
  allUsers: UserMin[];
  onTaskUpdate: (updatedTask: Task) => void;
}

const TASK_STATUSES = ['Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'];
const PRIORITIES = ['Low', 'Medium', 'High'];

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

const statusStyles: { [key: string]: { base: string; dot: string; textStrong: string } } = {
  Logged:   { base: 'text-slate-700 bg-slate-200',   dot: 'bg-slate-500', textStrong: 'text-slate-800'},
  Ongoing:  { base: 'text-blue-700 bg-blue-100',    dot: 'bg-blue-500', textStrong: 'text-blue-800'},
  Reviewed: { base: 'text-purple-700 bg-purple-100', dot: 'bg-purple-500', textStrong: 'text-purple-800'},
  Done:     { base: 'text-green-700 bg-green-100',   dot: 'bg-green-500', textStrong: 'text-green-800'},
  Blocked:  { base: 'text-red-700 bg-red-100',      dot: 'bg-red-500', textStrong: 'text-red-800'},
};

export default function ExpandedTaskDetails({ task, allUsers, onTaskUpdate }: ExpandedTaskDetailsProps) {
  const [isDetailsSectionCollapsed, setIsDetailsSectionCollapsed] = useState(true);  // Default to collapsed

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

  const formatDate = (dateString: string, includeTime: boolean = false) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleUpdate = async (field: 'status' | 'assignedToId' | 'priority', value: string | null) => {
    setIsUpdating(true); setError(null);
    // Ensure assignedToId is used for the payload consistently
    const fieldNameInPayload = field === 'assignedToId' ? 'assignedToId' : field;
    const payload: Partial<Pick<Task, 'status' | 'assignedToId' | 'priority'>> = {
         [fieldNameInPayload]: value === '' ? null : value
    };
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || `Update failed`); }
      const updatedTaskData: Task = await response.json();
      onTaskUpdate(updatedTaskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      setCurrentStatus(task.status); setCurrentAssignedToId(task.assignedToId || ''); setCurrentPriority(task.priority || '');
    } finally { setIsUpdating(false); }
  };

  const handleLocalChange = (field: 'status' | 'assignedToId' | 'priority', value: string) => {
    if (field === 'status') setCurrentStatus(value);
    // Ensure using 'assignedToId' for the field name passed to handleUpdate
    else if (field === 'assignedToId') setCurrentAssignedToId(value); 
    else if (field === 'priority') setCurrentPriority(value);
    handleUpdate(field, value); // 'field' here will be 'assignedToId'
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
    // Removed outer margin, shadow, and border as the modal will handle container styling
    <div className={`p-3 ${isUpdating ? 'opacity-75' : ''}`}> 
      <button
        onClick={() => setIsDetailsSectionCollapsed(!isDetailsSectionCollapsed)}
        className="w-full flex justify-between items-center py-2 px-1 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded focus:outline-none"
      >
        <span className="text-base font-bold">{task.title}</span> {/* Title prominent in header */}
        <div className="flex items-center space-x-2">
            {prioStyle && (
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${prioStyle.base}`}>
                <span className="mr-1 font-bold">{prioStyle.icon}</span>{prioStyle.label}
                </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statStyle.base} ${statStyle.textStrong}`}>
                <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${statStyle.dot}`}></span>
                {currentStatus}
            </span>
            <svg className={`w-5 h-5 transform transition-transform duration-200 text-slate-500 ${isDetailsSectionCollapsed ? 'rotate-0' : '-rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </button>

      {!isDetailsSectionCollapsed && (
        <div className="mt-2 pt-3 border-t border-slate-200">
          <dl className="divide-y divide-slate-100">
            {/* Removed Title from here as it's in the header now */}
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

          <div className="mt-4 pt-3 border-t border-slate-200">
            <h5 className="text-xs font-semibold text-slate-600 mb-2">Manage Task:</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label htmlFor={`detail-modal-status-${task.id}`} className="block text-xxs font-medium text-slate-500 mb-0.5">Status</label>
                <select id={`detail-modal-status-${task.id}`} value={currentStatus} onChange={(e) => handleLocalChange('status', e.target.value)} disabled={isUpdating} className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}>
                  {TASK_STATUSES.map(statusVal => (<option key={statusVal} value={statusVal}>{statusVal}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor={`detail-modal-assignee-${task.id}`} className="block text-xxs font-medium text-slate-500 mb-0.5">Assignee</label>
                <select id={`detail-modal-assignee-${task.id}`} value={currentAssignedToId} onChange={(e) => handleLocalChange('assignedToId', e.target.value)} disabled={isUpdating || allUsers.length === 0} className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}>
                  <option value="">Unassigned</option>
                  {allUsers.map(user => (<option key={user.id} value={user.id}>{user.name || user.email}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor={`detail-modal-priority-${task.id}`} className="block text-xxs font-medium text-slate-500 mb-0.5">Priority</label>
                <select id={`detail-modal-priority-${task.id}`} value={currentPriority} onChange={(e) => handleLocalChange('priority', e.target.value)} disabled={isUpdating} className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em'}}>
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
        <div className="mt-2 text-xs text-slate-500 flex items-center space-x-3 overflow-hidden whitespace-nowrap">
            {/* Minimal info when collapsed */}
             <span className="font-medium">ID: {task.id.substring(0,8)}...</span>
        </div>
      )}
    </div>
  );
}