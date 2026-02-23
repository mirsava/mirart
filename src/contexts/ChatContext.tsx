import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/api';

interface ChatContextType {
  chatOpen: boolean;
  chatEnabled: boolean;
  openChat: (conversationId?: number | null) => void;
  closeChat: () => void;
  initialConversationId: number | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<number | null>(null);

  useEffect(() => {
    apiService.getUserChatEnabled()
      .then(({ enabled }) => setChatEnabled(enabled))
      .catch(() => setChatEnabled(false));
  }, []);

  const openChat = (conversationId?: number | null) => {
    if (!chatEnabled) return;
    setInitialConversationId(conversationId || null);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setInitialConversationId(null);
  };

  return (
    <ChatContext.Provider value={{ chatOpen, chatEnabled, openChat, closeChat, initialConversationId }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
