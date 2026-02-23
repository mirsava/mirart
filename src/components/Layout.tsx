import React, { ReactNode } from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import ChatWidget from './ChatWidget';
import SupportChatWidget from './SupportChatWidget';
import DeactivatedUserBanner from './DeactivatedUserBanner';
import AnnouncementBanner from './AnnouncementBanner';
import { useChat } from '../contexts/ChatContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { chatOpen, closeChat, initialConversationId } = useChat();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Header />
      <Box sx={{ pt: { xs: '76px', md: '72px' } }}>
        <AnnouncementBanner />
        <DeactivatedUserBanner />
      </Box>
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <Footer />
      <ChatWidget 
        open={chatOpen} 
        onClose={closeChat}
        initialConversationId={initialConversationId}
      />
      <SupportChatWidget />
    </Box>
  );
};

export default Layout;

