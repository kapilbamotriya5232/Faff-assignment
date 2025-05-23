// src/components/tasks/TaskSearchBar.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task } from './TaskItem'; // Assuming Task interface is exported from TaskItem

interface TaskSearchBarProps {
  onSearchResults: (tasks: Task[]) => void; // Callback to pass results to parent
  onClearSearch: () => void; // Callback to notify parent to clear search results display
}

// Debounce utility function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      // timeout = null; // Not strictly necessary to nullify here
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced;
}

export default function TaskSearchBar({ onSearchResults, onClearSearch }: TaskSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const performSearch = useCallback(
    debounce(async (currentQuery: string) => {
      if (currentQuery.trim().length === 0) { // Check if query is empty after debouncing
        onSearchResults([]);
        setError(null);
        onClearSearch(); // Notify parent if query is truly empty
        return;
      }
      if (currentQuery.trim().length < 2) {
        onSearchResults([]); // Clear results if query is too short but not empty
        setError(null); 
        // Optionally call onClearSearch() if you want the list to revert immediately
        // for short queries too, or just show "query too short" message.
        return;
      }


      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tasks/search?q=${encodeURIComponent(currentQuery)}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Search failed');
        }
        const results: Task[] = await response.json();
        onSearchResults(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        onSearchResults([]); // Clear results on error
      } finally {
        setIsLoading(false);
      }
    }, 1000), // <<<<<<< Adjusted debounce delay to 1000ms (1 second)
    [onSearchResults, onClearSearch] // Dependencies for useCallback
  );

  useEffect(() => {
    // This effect calls performSearch when the query changes.
    // performSearch itself is debounced.
    if (query.trim().length > 0 && query.trim().length < 2) {
        // Handle "query too short" message if desired, without hitting API
        setIsLoading(false);
        setError("Search query must be at least 2 characters.");
        onSearchResults([]); // Clear previous results
    } else {
        setError(null); // Clear "too short" error if query becomes valid or empty
        performSearch(query);
    }
  }, [query, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // if (e.target.value.trim().length === 0) {
    //   onClearSearch(); // Handled by performSearch now if query is empty after debounce
    // }
  };

  return (
    <div className="relative mb-4">
      <label htmlFor="taskSearch" className="sr-only">Search Tasks</label>
      <input
        id="taskSearch"
        type="search"
        value={query}
        onChange={handleInputChange}
        placeholder="Search tasks by title or tag (min 2 chars)..."
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
          Searching...
        </div>
      )}
      {error && !isLoading && query.trim().length > 0 && ( // Only show error if there's a query
         <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}