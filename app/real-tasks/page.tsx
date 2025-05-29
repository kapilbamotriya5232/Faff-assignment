'use client';

import { useCallback, useEffect, useState } from 'react';
// Removed SimpleLogin as API calls are removed, login becomes non-functional UI shell
// import CreateTaskForm from '../components/createTaskForm'; // Removed
// import TaskList from '../components/tasks/TaskList'; // Will render items directly
import RealTaskDetailModal from '../components/real-tasks/RealTaskDetailModal'; // New component
import RealTaskItem from '../components/real-tasks/RealTaskItem'; // New component
import TaskSearchBar from '../components/tasks/TaskSearchBar'; // We'll use its input value directly

// --- Type Definitions for RealTask and RealMessage ---
export interface RealMessageType {
  id: string;
  content: string;
  senderId: string; // Can be a generic ID or name for display
  createdAt: string; // Using string for simplicity with hardcoded data
  // parentId?: string | null; // Optional: for threading display
}

export interface RealTaskType {
  id: string;
  name: string;
  description: string;
  tags: string[];
  category: string;
  createdAt: string; // Using string for simplicity
  updatedAt: string; // Using string for simplicity
  realMessages: RealMessageType[];
  distance?: number; // Added for semantic search results
}
// --- End Type Definitions ---

// Hardcoded Sample Data Removed

export default function RealTasksPage() {
  // Simplified state - no currentUser, allUsers, isLoadingUser logic for functionality
  // Kept for potential UI elements that might expect them (e.g., header display)
  const [mockUser, setMockUser] = useState({ name: 'Demo User', email: 'demo@example.com' });
  
  // const [showCreateTaskForm, setShowCreateTaskForm] = useState(false); // Removed
  
  const [allRealTasks, setAllRealTasks] = useState<RealTaskType[]>([]); // Stores initial full list
  const [searchResults, setSearchResults] = useState<RealTaskType[]>([]); // Stores search results or initial list
  const [isLoading, setIsLoading] = useState(true); // For initial page load
  const [isSearchingApi, setIsSearchingApi] = useState(false); // For semantic search API calls
  const [error, setError] = useState<string | null>(null);

  const [searchQueryInput, setSearchQueryInput] = useState(''); // Raw input from search bar
  const [debouncedQuery, setDebouncedQuery] = useState(''); // Debounced query for API call
  
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<RealTaskType | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Fetch initial set of all tasks (or a subset if preferred for homepage)
  const fetchInitialTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/real-tasks'); // Your existing endpoint for all tasks
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch initial tasks: ${response.status}`);
      }
      const data: RealTaskType[] = await response.json();
      setAllRealTasks(data);
      setSearchResults(data); 
    } catch (err: any) {
      console.error("Error fetching initial tasks:", err);
      setError(err.message || 'An unexpected error occurred fetching initial tasks.');
      setAllRealTasks([]);
      setSearchResults([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialTasks();
  }, [fetchInitialTasks]);

  // Debounce effect for search query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQueryInput);
    }, 1000); // 1-second debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchQueryInput]);

  // Effect to call semantic search API when debouncedQuery changes
  useEffect(() => {
    if (debouncedQuery) {
      setIsSearchingApi(true);
      setError(null); // Clear previous errors
      const performSearch = async () => {
        try {
          const response = await fetch(`/api/search-real-entities?q=${encodeURIComponent(debouncedQuery)}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Search failed: ${response.status}`);
          }
          const data: RealTaskType[] = await response.json();
          setSearchResults(data);
        } catch (err: any) {
          console.error("Error during semantic search:", err);
          setError(err.message || 'Semantic search failed.');
          setSearchResults([]); // Clear results on error or show allRealTasks?
        }
        setIsSearchingApi(false);
      };
      performSearch();
    } else {
      // If debounced query is empty, show all tasks (or clear results)
      setSearchResults(allRealTasks);
      setIsSearchingApi(false); 
    }
  }, [debouncedQuery, allRealTasks]);

  const handleLogout = () => { 
    setMockUser({ name: 'Demo User', email: 'demo@example.com' });
    setAllRealTasks([]); 
    setSearchResults([]);
    setSearchQueryInput('');
    setDebouncedQuery('');
    setIsLoading(true); // To re-trigger initial fetch if desired, or set to a logged out state
    setIsSearchingApi(false);
    setSelectedTaskForModal(null);
    setIsTaskModalOpen(false);
    setError(null);
    fetchInitialTasks(); // Re-fetch initial tasks on mock logout/login cycle
    console.log("Logout clicked - clears data, re-fetches initial set");
  };

  // toggleCreateTaskForm and handleTaskCreated are removed.

  // TaskSearchBar will now directly update searchQueryInput via an onQueryChange prop
  const handleSearchQueryChange = (query: string) => {
    setSearchQueryInput(query);
  };

  // Filters are removed.

  // handleTaskUpdate is removed as tasks are static.

  const openTaskModal = (task: RealTaskType) => {
    setSelectedTaskForModal(task);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskForModal(null);
  };

  // Removed isLoadingUser check, page loads directly.
  // Removed !currentUser check (SimpleLogin). Page is always "logged in" with mockUser for UI.

  return (
    <div className='min-h-screen bg-slate-100'>
      <header className='bg-white shadow-md sticky top-0 z-40'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-3'>
            <h1 className='text-2xl font-bold text-slate-700'>
              RealTask Semantic Viewer
            </h1>
            <div className='flex items-center space-x-4'>
              {/* Create New Task Button Removed */}
              <span className='text-sm text-slate-600 hidden sm:block'>
                Welcome,{' '}
                <span className='font-medium'>
                  {mockUser.name || mockUser.email}
                </span>
                !
              </span>
              <button
                onClick={handleLogout}
                className='px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150'
              >
                Logout (Reloads Data)
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className='container mx-auto p-4 sm:p-6 lg:p-8'>
        {/* Create Task Form Section Removed */}

        {/* Search Bar Section - Filters Removed */}
        <section className='mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg'>
           <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'> {/* Adjusted grid for just search */}
            <div className='md:col-span-2'> {/* Search bar takes more space */}
              <TaskSearchBar 
                onQueryChange={handleSearchQueryChange} // Changed prop
                // onSearchResults and onClearSearch are no longer used directly from TaskSearchBar
                // The page now controls search based on debouncedQueryInput
              />
            </div>
            {/* Filter dropdowns and checkboxes removed */}
          </div>
        </section>

        {/* Task List or Search Results Section */}
        <section className='mt-8'>
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-slate-500 text-lg">Loading initial tasks...</p>
              {/* Optional: Add a spinner component here */}
            </div>
          ) : error && !isSearchingApi ? ( // Show general error only if not in midst of API search error
            <div className="text-center py-10 px-4">
              <p className="text-red-500 text-lg">Error loading tasks:</p>
              <p className="text-red-400 text-sm bg-red-50 p-3 rounded-md mt-2">{error}</p>
              <button 
                onClick={fetchInitialTasks} 
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <h2 className='text-xl font-semibold text-slate-700 mb-4'>
                {debouncedQuery ? 
                    (isSearchingApi ? `Searching for "${debouncedQuery}"...` 
                      : searchResults.length > 0 ? `Search Results for "${debouncedQuery}" (${searchResults.length})` 
                      : `No results for "${debouncedQuery}"`) 
                  : 'All RealTasks'}
              </h2>
              {isSearchingApi && !searchResults.length ? ( // Show loading for API search specifically if no results yet
                 <div className="text-center py-10"><p className="text-slate-500 text-lg">Performing semantic search...</p></div>
              ) : error && isSearchingApi ? ( // Show search-specific error
                 <div className="text-center py-10 px-4">
                    <p className="text-red-500 text-lg">Error during search:</p>
                    <p className="text-red-400 text-sm bg-red-50 p-3 rounded-md mt-2">{error}</p>
                 </div>
              ) : searchResults.length > 0 ? (
                <div className='space-y-4'>
                  {searchResults.map(task => (
                    <RealTaskItem // Using new RealTaskItem
                      key={task.id}
                      task={task}
                      // allUsers prop removed
                      onOpenTask={() => openTaskModal(task)}
                    />
                  ))}
                </div>
              ) : (
                <p className='text-slate-500'>
                  {debouncedQuery ? 'No tasks match your semantic search query.' 
                    : allRealTasks.length === 0 && !isLoading ? 'No tasks found in the database.' 
                    : 'Type to start a semantic search.'}
                </p>
              )}
            </>
          )}
        </section>
      </main>

      <RealTaskDetailModal // Using new RealTaskDetailModal
        isOpen={isTaskModalOpen}
        task={selectedTaskForModal}
        onClose={closeTaskModal}
        // allUsers and currentUser props removed
        // onTaskUpdate prop removed
      />
    </div>
  );
} 