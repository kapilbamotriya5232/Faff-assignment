// app/components/chat/ChatMessageItem.tsx
'use client';

import { UserMin } from '../tasks/TaskItem'; // Assuming UserMin is exported here or make a shared types file

export interface MessageType {
  id: string;
  content: string;
  createdAt: string;
  sender: UserMin; // Assuming API returns sender with id, name, email
  senderId: string;
  // parentId?: string | null; // For threading later
}

interface ChatMessageItemProps {
  message: MessageType;
  currentUser: UserMin; // To determine if the message is from the current user
}

// Updated getInitials function (single letter)
const getInitials = (name?: string | null, email?: string): string => {
  if (name && name.trim().length > 0) return name.trim()[0].toUpperCase();
  if (email && email.trim().length > 0) return email.trim()[0].toUpperCase();
  return '?';
};

// Simple hash function to get a color class for avatar based on senderId
const PREDETERMINED_AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-indigo-500',
  'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
];
const getAvatarColor = (senderId: string) => {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % PREDETERMINED_AVATAR_COLORS.length;
  return PREDETERMINED_AVATAR_COLORS[index];
};


export default function ChatMessageItem({ message, currentUser }: ChatMessageItemProps) {
  const isCurrentUserMessage = message.senderId === currentUser.id;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const avatarColor = getAvatarColor(message.senderId);
  const initials = getInitials(message.sender.name, message.sender.email);

  return (
    <div className={`flex mb-3 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end max-w-[70%] ${isCurrentUserMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isCurrentUserMessage && (
          <div className={`w-7 h-7 rounded-full ${avatarColor} text-white flex items-center justify-center text-sm font-semibold mr-2 flex-shrink-0`}>
            {initials}
          </div>
        )}
        {isCurrentUserMessage && ( // Add margin for current user's messages if avatar is not shown or shown differently
            <div className="w-7 h-7 mr-2 flex-shrink-0"></div> // Placeholder for alignment or different avatar style
        )}

        {/* Message Bubble */}
        <div
          className={`p-2.5 rounded-lg ${
            isCurrentUserMessage
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-slate-200 text-slate-800 rounded-bl-none'
          }`}
        >
          {!isCurrentUserMessage && (
            <p className="text-xs font-semibold mb-0.5 opacity-80">
              {message.sender.name || message.sender.email}
            </p>
          )}
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          <p className={`text-xxs mt-1 ${isCurrentUserMessage ? 'text-blue-200 text-right' : 'text-slate-500 text-left'}`}>
            {formatDate(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}