// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SimpleLogin from './components/SimpleLogin';
import CreateTaskForm from './components/createTaskForm';
import TaskList from './components/tasks/TaskList';
import TaskSearchBar from './components/tasks/TaskSearchBar';
import TaskItem, { Task as TaskType } from './components/tasks/TaskItem';
import TaskDetailModal from './api/tasks/TaskDetailModel';


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
  
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TaskType | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

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
    setIsTaskModalOpen(false); setSelectedTaskForModal(null);
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
  }, []);

  const handleClearSearch = useCallback(() => { 
    setSearchResults([]);
    setIsSearching(false);
    setActiveSearchQuery('');
  }, []);

  const taskListFilters = {
    status: statusFilter === 'All' || statusFilter === '' ? undefined : statusFilter,
    assignedToId: assignedToMeFilter && currentUser ? currentUser.id : undefined,
  };

  const handleTaskUpdate = useCallback((updatedTask: TaskType) => {
    setListRefreshKey(prevKey => prevKey + 1);
    setSearchResults(prevResults =>
      prevResults.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    if (selectedTaskForModal && selectedTaskForModal.id === updatedTask.id) {
      setSelectedTaskForModal(updatedTask);
    }
  }, [selectedTaskForModal]);

  const openTaskModal = (task: TaskType) => {
    setSelectedTaskForModal(task);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskForModal(null);
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
      {/* Main Application Header */}
      <header className='bg-white shadow-md sticky top-0 z-40'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-3'>
            <h1 className='text-2xl font-bold text-slate-700'>
              Task Management
            </h1>
            <div className='flex items-center space-x-4'>
              {/* Create New Task Button - Moved to header for global access */}
              <button
                onClick={toggleCreateTaskForm}
                className='px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 flex items-center space-x-1.5'
              >
                <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 6v6m0 0v6m0-6h6m-6 0H6'></path></svg>
                <span>{showCreateTaskForm ? 'Cancel Task' : 'New Task'}</span>
              </button>
              <span className='text-sm text-slate-600 hidden sm:block'>
                Welcome,{' '}
                <span className='font-medium'>
                  {currentUser.name || currentUser.email}
                </span>
                !
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
        {/* Create Task Form - Now shown below the header when toggled */}
        {showCreateTaskForm && (
          <section className='mb-8 p-6 bg-white rounded-xl shadow-lg animate-fadeInDown'> {/* Added a simple animation class */}
            <div className="flex justify-between items-center mb-4">
              <h2 className='text-xl font-semibold text-slate-700'>
                Add New Task
              </h2>
              <button onClick={toggleCreateTaskForm} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <CreateTaskForm currentUser={currentUser} onTaskCreated={handleTaskCreated} />
          </section>
        )}

        {/* Search and Filters Section */}
        <section className='mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg'>
           <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
            <div className='md:col-span-1'>
              <TaskSearchBar onSearchResults={handleSearchResults} onClearSearch={handleClearSearch} />
            </div>
            <div className='min-w-0'>
              <label htmlFor='statusFilter' className='block text-xs font-medium text-slate-500 mb-1'>Status</label>
              <select
                id='statusFilter' value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); handleClearSearch();}}
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
                  onChange={e => { setAssignedToMeFilter(e.target.checked); handleClearSearch();}}
                  className='h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 group-hover:border-blue-500 transition duration-150'
                />
                <span className='text-sm font-medium text-slate-700 group-hover:text-blue-600 transition duration-150'>Assigned to me</span>
              </label>
            </div>
          </div>
        </section>

        {/* Task List or Search Results Section */}
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
                      onOpenTask={() => openTaskModal(task)}
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
                currentUser={currentUser}
                listRefreshKey={listRefreshKey}
                onOpenTaskModal={openTaskModal}
              />
            </>
          )}
        </section>
      </main>

      <TaskDetailModal
        isOpen={isTaskModalOpen}
        task={selectedTaskForModal}
        onClose={closeTaskModal}
        allUsers={allUsers}
        currentUser={currentUser}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
}