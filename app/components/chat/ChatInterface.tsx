// app/components/chat/ChatInterface.tsx
'use client';

import { useSocket } from '@/app/context/SocketContext'; // Make sure this path is correct
import { useCallback, useEffect, useRef, useState } from 'react';
import { UserMin } from '../tasks/TaskItem'; // Or a shared types file
import ChatMessageItem, { MessageType } from './ChatMessageItem'; //

interface ChatInterfaceProps {
  taskId: string; //
  currentUser: UserMin; //
  onInputFocus?: () => void; //
}

export default function ChatInterface({ taskId, currentUser, onInputFocus }: ChatInterfaceProps) {
  const { socket, isConnected: isSocketConnected } = useSocket(); //
  
  const [messages, setMessages] = useState<MessageType[]>([]); //
  const [newMessageContent, setNewMessageContent] = useState(''); //
  const [isLoadingMessages, setIsLoadingMessages] = useState(true); //
  const [error, setError] = useState<string | null>(null); //
  const [isSending, setIsSending] = useState(false); //

  const messagesEndRef = useRef<HTMLDivElement | null>(null); //
  const messageListRef = useRef<HTMLDivElement | null>(null); //

  const scrollToBottom = useCallback(() => { // Wrapped in useCallback
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); //
  }, []);
  
  const fetchMessages = useCallback(async () => { //
    if (!taskId) return;
    setIsLoadingMessages(true); setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/messages/`); //
      if (!response.ok) {
        const errData = await response.json();
        console.error("Fetch messages API error:", errData);
        throw new Error(errData.error || 'Failed to fetch messages');
      }
      const fetchedMessages: MessageType[] = await response.json();
      setMessages(fetchedMessages);
      setTimeout(() => scrollToBottom(), 50); //
    } catch (err) {
      console.error("Error in fetchMessages:", err); //
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoadingMessages(false); //
    }
  }, [taskId, scrollToBottom]);

  useEffect(() => { //
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => { //
    if (!isLoadingMessages) { // Only scroll if not initially loading
        scrollToBottom();
    }
  }, [messages, isLoadingMessages, scrollToBottom]);

  useEffect(() => { //
    if (socket && isSocketConnected && taskId) {
      const roomName = `task-chat-${taskId}`;
      console.log(`[ChatInterface] Joining room: ${roomName}`);
      socket.emit('join-task-chat', taskId); //

      const handleNewChatMessage = (incomingMessage: MessageType) => {
        // Ignore own messages (optimistic + broadcast) to prevent duplicates
        if (incomingMessage.senderId === currentUser.id) {
          console.log('[ChatInterface] Ignoring own message broadcast', incomingMessage.id);
          return;
        }
        console.log('[ChatInterface] WebSocket event: new-chat-message received', incomingMessage);
        if (!incomingMessage.taskId) {
            console.error("[ChatInterface] Received message via WebSocket without taskId:", incomingMessage);
            return;
        }
        if (incomingMessage.taskId === taskId) {
          setMessages(prevMessages => {
            if (prevMessages.find(m => m.id === incomingMessage.id)) {
              console.log('[ChatInterface] Message already exists, not re-adding:', incomingMessage.id);
              return prevMessages.map(m => m.id === incomingMessage.id ? incomingMessage : m);
            }
            console.log('[ChatInterface] Adding new message from WebSocket to state:', incomingMessage);
            return [...prevMessages, incomingMessage];
          });
        } else {
          console.log(`[ChatInterface] Received message for different task (${incomingMessage.taskId}), ignoring.`);
        }
      }; 

      socket.on('new-chat-message', handleNewChatMessage); //

      return () => {
        console.log(`[ChatInterface] Leaving room: ${roomName}`);
        socket.emit('leave-task-chat', taskId); //
        socket.off('new-chat-message', handleNewChatMessage); //
      };
    }
  }, [socket, isSocketConnected, taskId, currentUser.id]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => { //
    if (e) e.preventDefault();
    if (newMessageContent.trim() === '' || isSending) return;

    if (!currentUser || !currentUser.id) { //
        console.error('[ChatInterface] Cannot send message: currentUser or currentUser.id is missing!');
        setError('User information is missing. Cannot send message.');
        setIsSending(false);
        return;
    }
    
    setIsSending(true); setError(null);
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: MessageType = { //
      id: tempId, 
      content: newMessageContent.trim(),
      createdAt: new Date().toISOString(),
      sender: currentUser, 
      senderId: currentUser.id,
      taskId: taskId, // Ensure taskId is included
    };

    setMessages(prevMessages => [...prevMessages, optimisticMessage]); //
    const messageToSend = newMessageContent.trim();
    setNewMessageContent('');

    try {
      const payload = {
        content: messageToSend,
        senderId: currentUser.id,
      };
      const response = await fetch(`/api/tasks/${taskId}/messages/`, { //
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) { // Check response.ok before parsing JSON
        const errData = await response.json(); // Parse error response
        throw new Error(errData.error || 'Failed to send message'); 
      }

      const savedMessage: MessageType = await response.json(); // Parse success response

      setMessages(prevMessages =>  //
        prevMessages.map(msg => msg.id === tempId ? savedMessage : msg)
      );
    } catch (err) { //
      console.error('[ChatInterface] Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId));
      setNewMessageContent(messageToSend);
    } finally {
      setIsSending(false); //
    }
  };
  
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { //
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  if (isLoadingMessages) { //
    return <div className="p-4 text-center text-sm text-slate-500 animate-pulse">Loading messages...</div>;
  }
  if (error && messages.length === 0) { //
    return <div className="p-4 text-center text-sm text-red-500 bg-red-50 rounded-md">Error loading messages: {error}</div>;
  }

  return ( //
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
            onFocus={onInputFocus}
            placeholder="Type your message..."
            rows={1}
            className="flex-grow p-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-slate-100"
            disabled={isSending || !isSocketConnected}
          />
          <button
            type="submit"
            disabled={newMessageContent.trim() === '' || isSending || !isSocketConnected}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? ( <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}