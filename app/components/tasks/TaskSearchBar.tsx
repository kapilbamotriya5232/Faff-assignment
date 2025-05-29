// app/components/tasks/TaskSearchBar.tsx
'use client';

import { useEffect, useState } from 'react';

interface TaskSearchBarProps {
  onQueryChange: (query: string) => void;
  initialQuery?: string;
}

export default function TaskSearchBar({ onQueryChange, initialQuery = '' }: TaskSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onQueryChange(newQuery);
  };

  const handleClear = () => {
    setQuery('');
    onQueryChange('');
  };

  return (
    <div className="relative">
      <label htmlFor="taskSearch" className="block text-xs font-medium text-slate-500 mb-1">Search Tasks & Messages</label>
      <div className="relative">
        <input
          id="taskSearch"
          type="search"
          value={query}
          onChange={handleInputChange}
          placeholder="Type for semantic search..."
          className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
        />
        {query.length > 0 && (
            <button 
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
            >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
        )}
      </div>
    </div>
  );
}