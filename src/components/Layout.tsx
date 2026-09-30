import React, { ReactNode } from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import ChatWidget from './ChatWidget';
import SupportChatWidget from './SupportChatWidget';
import DeactivatedUserBanner from './DeactivatedUserBanner';
import AnnouncementBanner from './AnnouncementBanner';
import { useChat } from '../contexts/ChatContext';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

// Account, checkout and admin pages: keep them out of search results even if something links to them.
const PRIVATE_PATHS = [
  '/admin', '/dashboard', '/artist-dashboard', '/create-listing', '/edit-listing', '/messages', '/chat', '/orders',
  '/cart', '/checkout', '/order-success', '/promotion-success', '/unsubscribe', '/confirm-signup', '/forgot-password',
  '/signin', '/artist-signin',
];
const isPrivatePath = (pathname: string) => PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { chatOpen, closeChat, initialConversationId } = useChat();
  const { pathname } = useLocation();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {isPrivatePath(pathname) && (
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
      )}
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

