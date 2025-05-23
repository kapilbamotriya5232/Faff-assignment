// app/components/tasks/TaskList.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import TaskItem, { Task } from './TaskItem'
import { useSocket } from '@/app/context/SocketContext'
import { UserMin as CurrentUserType } from '@/app/page' // For currentUser prop type

interface UserMin {
  id: string
  name?: string | null
  email: string
}

const PAGE_LIMIT = 5

interface TaskListResponse {
  tasks: Task[]
  currentPage: number
  totalPages: number
  totalTasks: number
}

interface TaskListProps {
  filters: { status?: string; assignedToId?: string }
  allUsers: UserMin[]
  currentUser: CurrentUserType // <<<< ADD THIS
  listRefreshKey: number
}

export default function TaskList({
  filters,
  allUsers,
  currentUser,
  listRefreshKey,
}: TaskListProps) {
  // <<<< ADD currentUser here
  const { socket, isConnected: isSocketConnected } = useSocket()

  const [tasks, setTasks] = useState<Task[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New state for managing which task item is expanded
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const fetchTasks = useCallback(
    async (page: number, currentFilters: typeof filters) => {
      setIsLoading(true)
      setError(null)
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      })
      if (currentFilters.status)
        queryParams.append('status', currentFilters.status)
      if (currentFilters.assignedToId)
        queryParams.append('assignedToId', currentFilters.assignedToId)

      try {
        const response = await fetch(`/api/tasks?${queryParams.toString()}`)
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || `Error: ${response.statusText}`)
        }
        const data: TaskListResponse = await response.json()
        setTasks(data.tasks)
        setCurrentPage(data.currentPage)
        setTotalPages(data.totalPages)
        setTotalTasks(data.totalTasks)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An unknown error occurred fetching tasks.',
        )
        setTasks([])
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchTasks(currentPage, filters)
  }, [fetchTasks, currentPage, filters, listRefreshKey])

  useEffect(() => {
    setCurrentPage(1)
    setExpandedTaskId(null) // Collapse any open task when filters change
  }, [filters])

  useEffect(() => {
    if (socket && isSocketConnected) {
      console.log('TaskList: Socket.IO connected, binding events.')
      const handleNewTask = (newTask: Task) => {
        console.log('Socket.IO event: newTask received', newTask)
        if (currentPage === 1 && !filters.status && !filters.assignedToId) {
          setTasks(prev => {
            if (prev.find(t => t.id === newTask.id)) return prev
            const newList = [newTask, ...prev]
            return newList.slice(0, PAGE_LIMIT)
          })
          setTotalTasks(prev => prev + 1)
        } else {
          console.log(
            'New task received (Socket.IO), but not on page 1 or filters active. Consider UI notification or list refresh trigger.',
          )
        }
      }
      const handleTaskUpdated = (updatedTask: Task) => {
        console.log('Socket.IO event: taskUpdated received', updatedTask)
        setTasks(prev =>
          prev.map(t => (t.id === updatedTask.id ? updatedTask : t)),
        )
      }
      const handleTaskDeleted = (data: { id: string }) => {
        console.log('Socket.IO event: taskDeleted received for id:', data.id)
        setTasks(prev => prev.filter(t => t.id !== data.id))
        setTotalTasks(prev => prev - 1)
        if (tasks.length === 1 && currentPage > 1) {
          fetchTasks(currentPage - 1, filters)
        }
      }

      socket.on('newTask', handleNewTask)
      socket.on('taskUpdated', handleTaskUpdated)
      socket.on('taskDeleted', handleTaskDeleted)
      return () => {
        console.log('TaskList: Unbinding Socket.IO events.')
        socket.off('newTask', handleNewTask)
        socket.off('taskUpdated', handleTaskUpdated)
        socket.off('taskDeleted', handleTaskDeleted)
      }
    }
  }, [
    socket,
    isSocketConnected,
    currentPage,
    filters,
    tasks.length,
    fetchTasks,
  ])

  const handleTaskUpdateInListItem = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task)),
    )
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      setExpandedTaskId(null)
    }
  }
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
      setExpandedTaskId(null)
    }
  }

  // Function to handle toggling the expanded task
  const handleToggleExpandTask = (taskId: string) => {
    setExpandedTaskId(prevExpandedId =>
      prevExpandedId === taskId ? null : taskId,
    )
  }

  if (isLoading && tasks.length === 0 && currentPage === 1) {
    return (
      <div className='text-center p-10 flex flex-col items-center justify-center h-64'>
        <svg
          className='animate-spin h-8 w-8 text-blue-500 mb-3'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
        >
          <circle
            className='opacity-25'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          ></circle>
          <path
            className='opacity-75'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
          ></path>
        </svg>
        <p className='text-slate-500'>Loading tasks...</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className='text-center p-10 text-red-600 bg-red-50 border border-red-200 rounded-lg'>
        {error}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {!isSocketConnected && (
        <div className='p-3 text-center text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-md'>
          Real-time updates are currently disconnected. Attempting to
          reconnect...
        </div>
      )}

      {tasks.length === 0 && !isLoading && (
        <div className='text-center p-10 text-slate-500 bg-white rounded-lg shadow'>
          No tasks found matching your current filters.
        </div>
      )}

      {isLoading && tasks.length > 0 && (
        <div className='text-xs text-slate-400 text-center py-1'>
          Updating list...
        </div>
      )}

      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          allUsers={allUsers}
          currentUser={currentUser} // <<<< PASS currentUser HERE
          onTaskUpdate={handleTaskUpdateInListItem}
          isExpanded={expandedTaskId === task.id}
          onToggleExpand={() => handleToggleExpandTask(task.id)}
        />
      ))}

      {totalPages > 0 && (
        <div className='mt-8 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0'>
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || isLoading}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed transition duration-150'
          >
            Previous
          </button>
          <span className='text-sm text-slate-600'>
            Page <span className='font-semibold'>{currentPage}</span> of{' '}
            <span className='font-semibold'>{totalPages}</span>
            <span className='hidden sm:inline'>
              {' '}
              (Total: {totalTasks} tasks)
            </span>
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed transition duration-150'
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
