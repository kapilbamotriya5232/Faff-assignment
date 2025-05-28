// src/components/CreateTaskForm.tsx
'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface CreateTaskFormProps {
  currentUser: User;
  onTaskCreated: () => void; // Callback to refresh task list
}

export default function CreateTaskForm({ currentUser, onTaskCreated }: CreateTaskFormProps) {
  const [title, setTitle] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState('');
  const [tags, setTags] = useState(''); // Comma-separated string for simplicity
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch all users to populate assignee dropdown
    const fetchUsers = async () => {
      try {
        // This reuses the GET /api/users route, or you can create a dedicated one
        // For now, we assume GET /api/users (if extended) returns all users
        // or create a specific GET /api/users/all
        const response = await fetch('/api/users/all/'); // You'll need to implement this endpoint
        if (response.ok) {
          setAllUsers(await response.json());
        } else {
          console.error('Failed to fetch users for assignment');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Endpoint for fetching all users: src/app/api/users/all/route.ts
  // async function GET() {
  //   const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  //   return NextResponse.json(users);
  // }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const taskData = {
      title,
      requestedById: currentUser.id,
      assignedToId: assignedToId || null,
      priority: priority || null,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag), // Convert to array
      status: 'Logged', // Default status
    };

    try {
      const response = await fetch('/api/tasks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        setTitle('');
        setAssignedToId('');
        setPriority('');
        setTags('');
        onTaskCreated(); // Notify parent to refresh list
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to create task.');
      }
    } catch (err) {
      setError('An unexpected error occurred while creating the task.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-8 p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Create New Task</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-600">Title*</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="assignedToId" className="block text-sm font-medium text-gray-600">Assign To</label>
          <select id="assignedToId" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">Unassigned</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>{user.name || user.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-600">Priority</label>
          <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">None</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-600">Tags (comma-separated)</label>
          <input type="text" id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}