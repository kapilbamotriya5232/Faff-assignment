// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import SimpleLogin from './components/SimpleLogin';
import CreateTaskForm from './components/CreateTaskForm';
import TaskList from './components/tasks/TaskList';
import TaskSearchBar from './components/tasks/TaskSearchBar';
import TaskItem, { Task as TaskType } from './components/tasks/TaskItem'; // TaskItem for search results
import TaskDetailModal from './api/tasks/TaskDetailModel';


export interface UserMin { // Export if TaskList or other components import it from here
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
  
  // State for the Modal
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TaskType | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // expandedSearchTaskId is no longer needed if search items also open the modal.

  const fetchAllUsers = useCallback(async () => { /* ... same as before ... */ 
    try {
      const response = await fetch('/api/users/all');
      if (response.ok) setAllUsers(await response.json());
      else { console.error('Failed to fetch all users'); setAllUsers([]); }
    } catch (err) { console.error('Error fetching all users:', err); setAllUsers([]); }
  }, []);

  useEffect(() => { /* ... same as before ... */ 
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

  const handleLoginSuccess = useCallback((user: UserMin) => { /* ... same ... */ 
    setCurrentUser(user);
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleLogout = () => { /* ... same, also close modal ... */
    localStorage.removeItem('currentUser');
    setCurrentUser(null); setAllUsers([]); setShowCreateTaskForm(false);
    setStatusFilter(''); setAssignedToMeFilter(false);
    setSearchResults([]); setIsSearching(false); setActiveSearchQuery('');
    setIsTaskModalOpen(false); setSelectedTaskForModal(null); // Close modal on logout
  };

  const toggleCreateTaskForm = () => setShowCreateTaskForm(!showCreateTaskForm);

  const handleTaskCreated = () => { /* ... same ... */ 
    setShowCreateTaskForm(false);
    setListRefreshKey(prevKey => prevKey + 1);
  };

  const handleSearchResults = useCallback((results: TaskType[], query: string) => { /* ... same ... */ 
    setSearchResults(results);
    setActiveSearchQuery(query);
    setIsSearching(true);
    // No need to manage expandedSearchTaskId here anymore
  }, []);

  const handleClearSearch = useCallback(() => { /* ... same ... */ 
    setSearchResults([]);
    setIsSearching(false);
    setActiveSearchQuery('');
    // No need to manage expandedSearchTaskId here
  }, []);

  const taskListFilters = {
    status: statusFilter === 'All' || statusFilter === '' ? undefined : statusFilter,
    assignedToId: assignedToMeFilter && currentUser ? currentUser.id : undefined,
  };

  // This function is called when a task is updated (e.g., from the modal)
  const handleTaskUpdate = useCallback((updatedTask: TaskType) => {
    setListRefreshKey(prevKey => prevKey + 1); // Refresh main list
    setSearchResults(prevResults => // Update in search results too
      prevResults.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
    // If the updated task is the one in the modal, update it
    if (selectedTaskForModal && selectedTaskForModal.id === updatedTask.id) {
      setSelectedTaskForModal(updatedTask);
    }
  }, [selectedTaskForModal]);

  // Functions to control the modal
  const openTaskModal = (task: TaskType) => {
    setSelectedTaskForModal(task);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskForModal(null);
  };

  if (isLoadingUser) { /* ... loading UI ... */ }
  if (!currentUser) { return <SimpleLogin onLoginSuccess={handleLoginSuccess} />; }

  return (
    <div className='min-h-screen bg-slate-100'>
      <header className='bg-white shadow-md sticky top-0 z-40'> {/* Modal will be z-50 */}
        {/* ... header content same ... */}
      </header>

      <main className='container mx-auto p-4 sm:p-6 lg:p-8'>
        {/* ... create task button and form sections same ... */}

        <section className='mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg'>
          {/* ... search and filter controls same ... */}
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
                  {searchResults.map(task => ( // Search results also open the modal
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
                onOpenTaskModal={openTaskModal} // Pass handler to TaskList
              />
            </>
          )}
        </section>
      </main>

      {/* Render the Modal */}
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