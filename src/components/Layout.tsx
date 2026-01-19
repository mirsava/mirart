import React, { ReactNode } from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import ChatWidget from './ChatWidget';
import DeactivatedUserBanner from './DeactivatedUserBanner';
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
      <DeactivatedUserBanner />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          pt: { xs: '72px', sm: '80px' },
        }}
      >
        {children}
      </Box>
      <Footer />
      <ChatWidget 
        open={chatOpen} 
        onClose={closeChat}
        initialConversationId={initialConversationId}
      />
    </Box>
  );
};

export default Layout;

