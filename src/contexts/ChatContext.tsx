import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  chatOpen: boolean;
  openChat: (conversationId?: number | null) => void;
  closeChat: () => void;
  initialConversationId: number | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<number | null>(null);

  const openChat = (conversationId?: number | null) => {
    setInitialConversationId(conversationId || null);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setInitialConversationId(null);
  };

  return (
    <ChatContext.Provider value={{ chatOpen, openChat, closeChat, initialConversationId }}>
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

