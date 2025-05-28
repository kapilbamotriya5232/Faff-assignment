// app/components/tasks/TaskSearchBar.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Task } from './TaskItem';

interface TaskSearchBarProps {
  onSearchResults: (tasks: Task[], query: string) => void;
  onClearSearch: () => void;
}

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) clearTimeout(timeout);
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
      if (currentQuery.trim().length === 0) {
        onClearSearch(); setIsLoading(false); setError(null); return;
      }
      if (currentQuery.trim().length < 2) {
        onSearchResults([], currentQuery); setIsLoading(false); setError(null); return;
      }

      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/tasks/search/?q=${encodeURIComponent(currentQuery)}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Search failed');
        }
        const results: Task[] = await response.json();
        onSearchResults(results, currentQuery);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        onSearchResults([], currentQuery);
      } finally {
        setIsLoading(false);
      }
    }, 700), // 700ms debounce
    [onSearchResults, onClearSearch]
  );

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="relative">
      <label htmlFor="taskSearch" className="block text-xs font-medium text-slate-500 mb-1">Search by Title/Tag</label>
      <div className="relative">
        <input
          id="taskSearch"
          type="search"
          value={query}
          onChange={handleInputChange}
          placeholder="Type to search..."
          className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        {!isLoading && query.length > 0 && (
            <button 
                onClick={() => { setQuery(''); onClearSearch(); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
            >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        )}
      </div>
       {error && !isLoading && query.trim().length > 0 && (
         <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}