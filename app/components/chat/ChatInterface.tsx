// app/components/chat/ChatInterface.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessageItem, { MessageType } from './ChatMessageItem';
import { UserMin } from '../tasks/TaskItem'; // Or a shared types file

interface ChatInterfaceProps {
  taskId: string;
  currentUser: UserMin;
  // allUsers: UserMin[]; // Might not be needed if sender info comes with message
}

export default function ChatInterface({ taskId, currentUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null); // For auto-scrolling

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    setIsLoadingMessages(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/messages`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch messages');
      }
      const fetchedMessages: MessageType[] = await response.json();
      setMessages(fetchedMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (newMessageContent.trim() === '' || isSending) return;

    setIsSending(true);
    const optimisticMessage: MessageType = { // Create an optimistic message for instant UI update
      id: `temp-${Date.now()}`, // Temporary ID
      content: newMessageContent.trim(),
      createdAt: new Date().toISOString(),
      sender: currentUser, // Current user is the sender
      senderId: currentUser.id,
    };

    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessageContent(''); // Clear input field immediately

    try {
      const response = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: optimisticMessage.content,
          senderId: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to send message');
      }
      const savedMessage: MessageType = await response.json();
      
      // Replace optimistic message with the actual saved message from server
      setMessages(prevMessages => 
        prevMessages.map(msg => msg.id === optimisticMessage.id ? savedMessage : msg)
      );
      // WebSocket will handle broadcasting to other clients in Phase 4

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove optimistic message on error
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessageContent(optimisticMessage.content); // Optionally restore content to input
    } finally {
      setIsSending(false);
      // scrollToBottom(); // Already handled by useEffect on messages change
    }
  };
  
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      handleSendMessage();
    }
  };

  if (isLoadingMessages) {
    return <div className="p-4 text-center text-sm text-slate-500">Loading messages...</div>;
  }
  if (error && messages.length === 0) { // Show error only if no messages loaded
    return <div className="p-4 text-center text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col h-[400px] bg-white border border-slate-200 rounded-md shadow"> {/* Fixed height for chat area */}
      {/* Message Display Area */}
      <div className="flex-grow p-3 space-y-1 overflow-y-auto">
        {messages.length === 0 && !isLoadingMessages && (
          <p className="text-sm text-slate-400 text-center py-4">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => (
          <ChatMessageItem key={msg.id} message={msg} currentUser={currentUser} />
        ))}
        <div ref={messagesEndRef} /> {/* Anchor for auto-scrolling */}
      </div>

      {/* Message Input Area */}
      {error && messages.length > 0 && <p className="text-xs text-red-500 px-3 py-1">{error}</p>}
      <div className="border-t border-slate-200 p-2.5 bg-slate-50">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <textarea
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Type your message..."
            rows={1} // Start with 1 row, expands automatically
            className="flex-grow p-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-slate-100"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={newMessageContent.trim() === '' || isSending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}