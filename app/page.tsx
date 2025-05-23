// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SimpleLogin from './components/SimpleLogin';
import CreateTaskForm from './components/CreateTaskForm';
import TaskList from './components/tasks/TaskList';
import TaskSearchBar from './components/tasks/TaskSearchBar';
import TaskItem, { Task as TaskType } from './components/tasks/TaskItem';

interface UserMin {
  id: string;
  email: string;
  name?: string | null;
}

const TASK_STATUSES_FOR_FILTER = ['All', 'Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'];

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<UserMin | null>(null);
  const [allUsers, setAllUsers] = useState<UserMin[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');
  const [assignedToMeFilter, setAssignedToMeFilter] = useState(false);

  const [searchResults, setSearchResults] = useState<TaskType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(''); // To track if search is active

  const fetchAllUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users/all');
      if (response.ok) {
        setAllUsers(await response.json());
      } else {
        console.error('Failed to fetch all users');
        setAllUsers([]);
      }
    } catch (err) {
      console.error('Error fetching all users:', err);
      setAllUsers([]);
    }
  }, []); // Empty dependency array: function doesn't depend on component scope variables

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        fetchAllUsers();
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoadingUser(false);
  }, [fetchAllUsers]);

  const handleLoginSuccess = useCallback((user: UserMin) => {
    setCurrentUser(user);
    fetchAllUsers();
  }, [fetchAllUsers]); // Depends on fetchAllUsers

  const handleLogout = () => { // No need for useCallback if it only sets state and doesn't cause prop changes
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setAllUsers([]);
    setShowCreateTaskForm(false);
    setStatusFilter('');
    setAssignedToMeFilter(false);
    setSearchResults([]);
    setIsSearching(false);
    setCurrentSearchQuery('');
  };

  const toggleCreateTaskForm = () => { // No need for useCallback
    setShowCreateTaskForm(!showCreateTaskForm);
  };

  const handleTaskCreated = () => { // No need for useCallback
    setShowCreateTaskForm(false);
    setListRefreshKey(prevKey => prevKey + 1);
    console.log("Task created, form closed. Refreshing list.");
  };

  const handleSearchResults = useCallback((results: TaskType[]) => {
    setSearchResults(results);
    // Only set isSearching to true if there's an active query that yielded these results.
    // The TaskSearchBar now handles clearing results if the query becomes too short or empty.
    // We rely on the query length from TaskSearchBar to determine if search mode is active.
    // For now, if onSearchResults is called, we assume search is active.
    setIsSearching(true); 
  }, []); // Setter functions from useState are stable and don't need to be in deps

  const handleClearSearch = useCallback(() => {
    setSearchResults([]);
    setIsSearching(false);
  }, []); // Setter functions from useState are stable

  const taskListFilters = {
    status: statusFilter === 'All' || statusFilter === '' ? undefined : statusFilter,
    assignedToId: assignedToMeFilter && currentUser ? currentUser.id : undefined,
  };

  const handleTaskUpdateInList = useCallback((updatedTask: TaskType) => {
    setListRefreshKey(prevKey => prevKey + 1);
    setSearchResults(prevResults =>
      prevResults.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
  }, []); // Setter functions are stable

  // This effect helps manage the `isSearching` state more robustly
  // based on whether there are search results *and* if a query was actually made.
  // The `TaskSearchBar`'s `onClearSearch` will be the primary trigger to exit search mode.
  // `isSearching` state now primarily controls whether to *show* search results or the main list.

  const displaySearchResults = isSearching && searchResults.length > 0;
  const displayNoResultsMessage = isSearching && searchResults.length === 0;


  if (isLoadingUser) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!currentUser) {
    return <SimpleLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 sm:mb-0">Internal Ticketing</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">Welcome, {currentUser.name || currentUser.email}!</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded-md text-xs"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mb-6">
        <button
          onClick={toggleCreateTaskForm}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {showCreateTaskForm ? 'Cancel Task Creation' : '+ Create New Task'}
        </button>
      </section>

      {showCreateTaskForm && (
        <section className="mb-6">
          <CreateTaskForm
            currentUser={currentUser}
            onTaskCreated={handleTaskCreated}
          />
        </section>
      )}

      <section className="my-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Search Tasks</h2>
        <TaskSearchBar 
            onSearchResults={handleSearchResults} 
            onClearSearch={handleClearSearch}
        />
      </section>

      <section className="mt-8">
        {isSearching ? ( // Relies on TaskSearchBar calling onClearSearch or onSearchResults
          <>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              {searchResults.length > 0 ? `Search Results (${searchResults.length})` : 'Search'}
            </h2>
            {searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    allUsers={allUsers} 
                    onTaskUpdate={handleTaskUpdateInList}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tasks found matching your search criteria, or query too short (min 2 chars).</p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Task List</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-md flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
              <div className="flex-1 min-w-0">
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Filter by Status:</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); handleClearSearch(); }}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {TASK_STATUSES_FOR_FILTER.map(status => (
                    <option key={status} value={status === 'All' ? '' : status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0 flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer mt-1 sm:mt-0 pt-5 sm:pt-0">
                  <input
                    type="checkbox"
                    checked={assignedToMeFilter}
                    onChange={(e) => { setAssignedToMeFilter(e.target.checked); handleClearSearch(); }}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Assigned to me</span>
                </label>
              </div>
            </div>
            <TaskList
              filters={taskListFilters}
              allUsers={allUsers}
              listRefreshKey={listRefreshKey}
            />
          </>
        )}
      </section>
    </div>
  );
}