// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SimpleLogin from './components/SimpleLogin';
import CreateTaskForm from './components/CreateTaskForm';
import TaskList from './components/tasks/TaskList';
import TaskSearchBar from './components/tasks/TaskSearchBar';
import TaskItem, { Task as TaskType } from './components/tasks/TaskItem';

export interface UserMin {
  id: string;
  email: string;
  name?: string | null;
}

const TASK_STATUSES_FOR_FILTER = [
  'All', 'Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked',
];

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
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  // New state for expanded task ID within search results
  const [expandedSearchTaskId, setExpandedSearchTaskId] = useState<string | null>(null);

  const fetchAllUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users/all');
      if (response.ok) setAllUsers(await response.json());
      else { console.error('Failed to fetch all users'); setAllUsers([]); }
    } catch (err) { console.error('Error fetching all users:', err); setAllUsers([]); }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        fetchAllUsers();
      } catch (e) { console.error('Failed to parse stored user:', e); localStorage.removeItem('currentUser'); }
    }
    setIsLoadingUser(false);
  }, [fetchAllUsers]);

  const handleLoginSuccess = useCallback((user: UserMin) => {
    setCurrentUser(user);
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null); setAllUsers([]); setShowCreateTaskForm(false);
    setStatusFilter(''); setAssignedToMeFilter(false);
    setSearchResults([]); setIsSearching(false); setActiveSearchQuery('');
    setExpandedSearchTaskId(null); // Reset on logout
  };

  const toggleCreateTaskForm = () => setShowCreateTaskForm(!showCreateTaskForm);

  const handleTaskCreated = () => {
    setShowCreateTaskForm(false);
    setListRefreshKey(prevKey => prevKey + 1);
  };

  const handleSearchResults = useCallback((results: TaskType[], query: string) => {
    setSearchResults(results);
    setActiveSearchQuery(query);
    setIsSearching(true);
    setExpandedSearchTaskId(null); // Collapse any previously expanded search item
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchResults([]);
    setIsSearching(false);
    setActiveSearchQuery('');
    setExpandedSearchTaskId(null); // Collapse on clear
  }, []);

  const taskListFilters = {
    status: statusFilter === 'All' || statusFilter === '' ? undefined : statusFilter,
    assignedToId: assignedToMeFilter && currentUser ? currentUser.id : undefined,
  };

  const handleTaskUpdateInList = useCallback((updatedTask: TaskType) => {
    setListRefreshKey(prevKey => prevKey + 1);
    setSearchResults(prevResults =>
      prevResults.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    // If the updated task was the one expanded in search, its details will update.
    // No need to directly manage expandedSearchTaskId here unless the update makes it invalid.
  }, []);

  // Handler for expanding tasks within search results
  const handleToggleSearchTaskExpand = (taskId: string) => {
    setExpandedSearchTaskId(prevId => (prevId === taskId ? null : taskId));
  };


  if (isLoadingUser) {
    return (
      <div className='flex justify-center items-center h-screen bg-slate-100'>
        <p className='text-lg text-slate-600'>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <SimpleLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className='min-h-screen bg-slate-100'>
      <header className='bg-white shadow-md sticky top-0 z-50'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-3'>
            <h1 className='text-2xl font-bold text-slate-700'>Task Management</h1>
            <div className='flex items-center space-x-4'>
              <span className='text-sm text-slate-600 hidden sm:block'>
                Welcome, <span className='font-medium'>{currentUser.name || currentUser.email}</span>!
              </span>
              <button
                onClick={handleLogout}
                className='px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150'
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className='container mx-auto p-4 sm:p-6 lg:p-8'>
        <section className='mb-6 flex justify-end'>
          <button
            onClick={toggleCreateTaskForm}
            className='px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-150 flex items-center space-x-2'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 6v6m0 0v6m0-6h6m-6 0H6'></path></svg>
            <span>{showCreateTaskForm ? 'Cancel' : 'Create New Task'}</span>
          </button>
        </section>

        {showCreateTaskForm && (
          <section className='mb-8 p-6 bg-white rounded-xl shadow-lg'>
            <h2 className='text-xl font-semibold text-slate-700 mb-4'>Add New Task</h2>
            <CreateTaskForm currentUser={currentUser} onTaskCreated={handleTaskCreated} />
          </section>
        )}

        <section className='mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
            <div className='md:col-span-1'>
              <TaskSearchBar onSearchResults={handleSearchResults} onClearSearch={handleClearSearch} />
            </div>
            <div className='min-w-0'>
              <label htmlFor='statusFilter' className='block text-xs font-medium text-slate-500 mb-1'>Status</label>
              <select
                id='statusFilter' value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); handleClearSearch(); setExpandedSearchTaskId(null);}}
                className='w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150'
              >
                {TASK_STATUSES_FOR_FILTER.map(status => (
                  <option key={status} value={status === 'All' ? '' : status}>{status}</option>
                ))}
              </select>
            </div>
            <div className='min-w-0 flex items-center pt-4 md:pt-0 justify-self-start md:justify-self-auto'>
              <label className='flex items-center space-x-2 cursor-pointer group'>
                <input
                  type='checkbox' checked={assignedToMeFilter}
                  onChange={e => { setAssignedToMeFilter(e.target.checked); handleClearSearch(); setExpandedSearchTaskId(null);}}
                  className='h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 group-hover:border-blue-500 transition duration-150'
                />
                <span className='text-sm font-medium text-slate-700 group-hover:text-blue-600 transition duration-150'>Assigned to me</span>
              </label>
            </div>
          </div>
        </section>

        <section className='mt-8'>
          {isSearching ? (
            <>
              <h2 className='text-xl font-semibold text-slate-700 mb-4'>
                {searchResults.length > 0 ? `Search Results (${searchResults.length})`
                  : activeSearchQuery.length > 0 ? `No results for "${activeSearchQuery}"`
                  : 'Search'}
              </h2>
              {searchResults.length > 0 && (
                <div className='space-y-4'>
                  {searchResults.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      allUsers={allUsers}
                      currentUser={currentUser!}
                      onTaskUpdate={handleTaskUpdateInList}
                      isExpanded={expandedSearchTaskId === task.id} // Use new state for search results
                      onToggleExpand={() => handleToggleSearchTaskExpand(task.id)} // Use new handler
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className='text-xl font-semibold text-slate-700 mb-4'>All Tasks</h2>
              <TaskList
                filters={taskListFilters}
                allUsers={allUsers}
                currentUser={currentUser!}
                listRefreshKey={listRefreshKey}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}