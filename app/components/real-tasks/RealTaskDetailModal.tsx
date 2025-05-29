'use client';

import React from 'react';
import { RealMessageType, RealTaskType } from '../../real-tasks/page'; // Adjusted import path

interface RealTaskDetailModalProps {
  isOpen: boolean;
  task: RealTaskType | null;
  onClose: () => void;
}

// Helper to format date string (basic example)
const formatDate = (dateString: string, includeTime = false) => {
  try {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'long', day: 'numeric'
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (e) {
    return dateString; // Fallback if parsing fails
  }
};

const RealTaskDetailModal: React.FC<RealTaskDetailModalProps> = ({ isOpen, task, onClose }) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow"
        onClick={e => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">{task.name}</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Task Details Section */}
        <div className="space-y-5 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</h3>
              <p className="text-sm text-slate-700 bg-slate-50 px-2 py-1 rounded-md inline-block">{task.category}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Created At</h3>
              <p className="text-sm text-slate-700">{formatDate(task.createdAt, true)}</p>
            </div>
          </div>

          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages Section */}
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-200">Messages ({task.realMessages?.length || 0})</h3>
          {task.realMessages && task.realMessages.length > 0 ? (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 simple-scrollbar">
              {task.realMessages.map((message: RealMessageType) => (
                <div key={message.id} className="p-3 bg-slate-50 rounded-lg shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-blue-600">{message.senderId}</p>
                    <p className="text-xs text-slate-400">{formatDate(message.createdAt, true)}</p>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No messages for this task.</p>
          )}
        </div>

        {/* Modal Footer Actions - Simplified */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      <style jsx global>{`
        .animate-modalShow {
          animation: modalShow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
        }
        @keyframes modalShow {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .simple-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .simple-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1; /* slate-300 */
          border-radius: 10px;
        }
        .simple-scrollbar::-webkit-scrollbar-track {
          background-color: #f1f5f9; /* slate-100 */
        }
      `}</style>
    </div>
  );
};

export default RealTaskDetailModal; 