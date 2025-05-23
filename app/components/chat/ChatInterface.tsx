// app/components/chat/ChatInterface.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UserMin } from '../tasks/TaskItem'; // Or a shared types file
import ChatMessageItem, { MessageType } from './ChatMessageItem';

interface ChatInterfaceProps {
  taskId: string;
  currentUser: UserMin;
}

export default function ChatInterface({ taskId, currentUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);


  const scrollToBottom = () => {
    if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    setIsLoadingMessages(true); setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/messages`);
      if (!response.ok) {
        const errData = await response.json();
        console.error("Fetch messages API error:", errData);
        throw new Error(errData.error || 'Failed to fetch messages');
      }
      const fetchedMessages: MessageType[] = await response.json();
      setMessages(fetchedMessages);
      setTimeout(() => scrollToBottom(), 0); 
    } catch (err) {
      console.error("Error in fetchMessages:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred fetching messages');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (newMessageContent.trim() === '' || isSending) return;

    // ***** IMPORTANT LOGGING *****
    console.log('[ChatInterface] Attempting to send message. Current User:', currentUser);
    if (!currentUser || !currentUser.id) {
        console.error('[ChatInterface] Cannot send message: currentUser or currentUser.id is missing!');
        setError('User information is missing. Cannot send message.');
        setIsSending(false); // Should also set this
        return;
    }
    // ***************************

    setIsSending(true); setError(null); // Clear previous errors before sending
    const optimisticMessage: MessageType = {
      id: `temp-${Date.now()}`, content: newMessageContent.trim(),
      createdAt: new Date().toISOString(),
      sender: currentUser, // Ensure currentUser has id, name, email
      senderId: currentUser.id,
    };

    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessageContent('');

    try {
      const payload = {
        content: optimisticMessage.content,
        senderId: currentUser.id, // This is the ID being sent
      };
      console.log('[ChatInterface] Sending payload to backend:', payload);

      const response = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("[ChatInterface] Send message API error response:", errData);
        throw new Error(errData.error || 'Failed to send message');
      }
      const savedMessage: MessageType = await response.json();
      setMessages(prevMessages => 
        prevMessages.map(msg => msg.id === optimisticMessage.id ? savedMessage : msg)
      );
    } catch (err) {
      console.error('[ChatInterface] Error in handleSendMessage catch block:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessageContent(optimisticMessage.content);
    } finally {
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  // UI Rendering (no changes from your provided code, just ensuring it's complete)
  if (isLoadingMessages) {
    return <div className="p-4 text-center text-sm text-slate-500">Loading messages...</div>;
  }
  // Show error more prominently if messages couldn't load
  if (error && messages.length === 0) {
    return <div className="p-4 text-center text-sm text-red-500 bg-red-50 rounded-md">Error loading messages: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div ref={messageListRef} className="flex-grow p-3 space-y-2 overflow-y-auto">
        {messages.length === 0 && !isLoadingMessages && (
          <p className="text-sm text-slate-400 text-center py-4">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => (
          <ChatMessageItem key={msg.id} message={msg} currentUser={currentUser} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && messages.length > 0 && <p className="text-xs text-red-500 px-3 py-1 text-center">{error}</p>}
      <div className="flex-shrink-0 border-t border-slate-200 p-2.5 bg-slate-50">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <textarea
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Type your message..."
            rows={1}
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