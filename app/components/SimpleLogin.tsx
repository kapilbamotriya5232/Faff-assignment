// src/components/SimpleLogin.tsx
'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface SimpleLoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function SimpleLogin({ onLoginSuccess }: SimpleLoginProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const user: User = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(user));
        onLoginSuccess(user);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Login failed. User not found.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xs mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
            Enter your seeded email:
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., alice@example.com"
          />
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}