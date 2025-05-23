// app/components/tasks/TaskDetailModal.tsx
'use client';

import { useEffect } from 'react';
// Assuming these are exported from TaskItem or a shared types file


import { UserMin as CurrentUserType, UserMin } from '@/app/page'; // Or your defined currentUser type
import ExpandedTaskDetails from '@/app/components/tasks/ExpandableTaskDetails';
import ChatInterface from '@/app/components/chat/ChatInterface';
import { Task } from '@/app/components/tasks/TaskItem';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  allUsers: UserMin[];
  currentUser: CurrentUserType; // Use the specific type for currentUser
  onTaskUpdate: (updatedTask: Task) => void; // To refresh list if details change
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  allUsers,
  currentUser,
  onTaskUpdate,
}: TaskDetailModalProps) {
  if (!isOpen || !task) {
    return null;
  }

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);


  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose} // Close on backdrop click
    >
      <div 
        className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] max-h-[700px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking inside modal content
      >
        {/* Modal Header / Collapsible Task Details */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white rounded-t-xl">
          <ExpandedTaskDetails
            task={task}
            allUsers={allUsers}
            onTaskUpdate={onTaskUpdate}
          />
        </div>

        {/* Chat Interface */}
        <div className="flex-grow overflow-y-auto"> {/* This div will contain the scrolling chat */}
          <ChatInterface taskId={task.id} currentUser={currentUser} />
        </div>
        
        {/* Optional: Modal Footer with a close button */}
        <div className="p-3 border-t border-slate-200 bg-slate-100 text-right rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-50 transition duration-150"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}