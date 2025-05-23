// src/components/tasks/TaskList.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import TaskItem, { Task } from './TaskItem';
import { useSocket } from '@/app/context/SocketContext';


interface UserMin {
  id: string;
  name?: string | null;
  email: string;
}

const PAGE_LIMIT = 5;

interface TaskListResponse {
  tasks: Task[];
  currentPage: number;
  totalPages: number;
  totalTasks: number;
}

interface TaskListProps {
  filters: {
    status?: string;
    assignedToId?: string;
  };
  allUsers: UserMin[];
  listRefreshKey: number;
}

export default function TaskList({ filters, allUsers, listRefreshKey }: TaskListProps) {
  const { socket, isConnected } = useSocket(); // Get socket instance
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (page: number, currentFilters: typeof filters) => {
    setIsLoading(true);
    setError(null);
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
    });
    if (currentFilters.status) queryParams.append('status', currentFilters.status);
    if (currentFilters.assignedToId) queryParams.append('assignedToId', currentFilters.assignedToId);

    try {
      const response = await fetch(`/api/tasks?${queryParams.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to fetch tasks: ${response.statusText}`);
      }
      const data: TaskListResponse = await response.json();
      setTasks(data.tasks);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalTasks(data.totalTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(currentPage, filters);
  }, [fetchTasks, currentPage, filters, listRefreshKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // WebSocket event listeners
  useEffect(() => {
    if (socket && isConnected) {
      const handleNewTask = (newTask: Task) => {
        console.log('WebSocket event: newTask received', newTask);
        // Simple approach: Add to list if on page 1 and filters might match
        // More complex: Check if newTask matches current filters
        // For now, just re-fetch to ensure consistency if on page 1
        // Or, if sorted by newest and on page 1, prepend optimistically
        setTasks(prevTasks => {
            // Avoid duplicates if already fetched
            if (prevTasks.find(t => t.id === newTask.id)) return prevTasks;
            // Add to the beginning if on page 1 and sorted by newest (default)
            if (currentPage === 1) { 
                // This assumes default sort is newest first.
                // If filters are active, this new task might not belong.
                // A safer bet for filtered views is to show a notification or re-fetch.
                // Let's try adding it and then rely on filter changes to correct if needed.
                const newTaskList = [newTask, ...prevTasks];
                if (newTaskList.length > PAGE_LIMIT) newTaskList.pop(); // Keep page limit
                return newTaskList;
            }
            return prevTasks;
        });
        // Potentially update total tasks count and pages, or just re-fetch
        setTotalTasks(prev => prev + 1); 
        // A full re-fetch might be more robust with active filters:
        // fetchTasks(currentPage, filters);
      };

      const handleTaskUpdated = (updatedTask: Task) => {
        console.log('WebSocket event: taskUpdated received', updatedTask);
        setTasks(prevTasks =>
          prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
        );
        // If the updated task no longer matches filters, it will be gone on next filter change/re-fetch.
      };

      const handleTaskDeleted = (data: { id: string }) => {
        console.log('WebSocket event: taskDeleted received', data.id);
        setTasks(prevTasks => prevTasks.filter(task => task.id !== data.id));
        setTotalTasks(prev => prev -1);
      };

      socket.on('newTask', handleNewTask);
      socket.on('taskUpdated', handleTaskUpdated);
      socket.on('taskDeleted', handleTaskDeleted);

      return () => {
        socket.off('newTask', handleNewTask);
        socket.off('taskUpdated', handleTaskUpdated);
        socket.off('taskDeleted', handleTaskDeleted);
      };
    }
  }, [socket, isConnected, currentPage, filters, fetchTasks]); // Added fetchTasks to deps if used inside handlers

  const handleTaskUpdateInListItem = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev - 1);
  };

  if (isLoading && tasks.length === 0 && currentPage === 1) {
    return <div className="text-center p-10">Loading tasks...</div>;
  }
  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-1">
      {isLoading && <div className="text-xs text-gray-500 text-center py-1">Updating list...</div>}
      {!isConnected && <div className="text-xs text-orange-500 text-center py-1">Real-time updates disconnected. Reconnecting...</div>}
      
      {tasks.length === 0 && !isLoading && (
        <div className="text-center p-10 text-gray-500">No tasks match the current filters.</div>
      )}

      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          allUsers={allUsers}
          onTaskUpdate={handleTaskUpdateInListItem}
        />
      ))}

      {totalPages > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <button onClick={handlePreviousPage} disabled={currentPage === 1 || isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed w-full sm:w-auto">Previous</button>
          <span className="text-sm text-gray-700">Page {currentPage} of {totalPages} (Total Tasks: {totalTasks})</span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed w-full sm:w-auto">Next</button>
        </div>
      )}
    </div>
  );
}