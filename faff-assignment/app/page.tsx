// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SimpleLogin from './components/SimpleLogin'; // Assuming this path is correct
import CreateTaskForm from './components/createTaskForm';


// Import TaskList later if needed
// import TaskList from '@/components/TaskList';

interface User {
  id: string;
  email: string;
  name?: string | null;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false); // State for form visibility

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoadingUser(false);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setShowCreateTaskForm(false); // Hide form on logout
  };

  const toggleCreateTaskForm = () => {
    setShowCreateTaskForm(!showCreateTaskForm);
  };

  // This function will be passed to CreateTaskForm
  // For now, it will close the form. Later, it can also refresh the task list.
  const handleTaskCreated = () => {
    setShowCreateTaskForm(false);
    // Here you might want to add logic to refresh a task list if it's displayed
    console.log("Task created, form closed.");
    // Example: refreshTasks();
  };

  if (isLoadingUser) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!currentUser) {
    return <SimpleLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6 pb-2 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Internal Ticketing</h1>
        <div>
          <span className="text-gray-600 mr-3">Welcome, {currentUser.name || currentUser.email}!</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Button to toggle the Create Task Form */}
      <div className="mb-6">
        <button
          onClick={toggleCreateTaskForm}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {showCreateTaskForm ? 'Cancel' : 'Create New Task'}
        </button>
      </div>

      {/* Conditionally render the Create Task Form */}
      {showCreateTaskForm && (
        <CreateTaskForm
          currentUser={currentUser}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* Placeholder for Task List - will be added next */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Tasks</h2>
        <p className="text-center text-gray-500">
          Task list will appear here.
        </p>
        {/* <TaskList /> */} {/* You'll add your TaskList component here */}
      </div>
    </div>
  );
}