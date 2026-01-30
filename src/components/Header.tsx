import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  useMediaQuery,
  useTheme,
  Fade,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminIcon,
  Chat as ChatIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useCart } from '../contexts/CartContext';
import apiService from '../services/api';
import { UserRole } from '../types/userRoles';
import logo from '../assets/images/logo.png';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const { user, signOut, isAuthenticated, refreshUser } = useAuth();
  const { openChat } = useChat();
  const { getTotalItems } = useCart();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [artistMenuAnchor, setArtistMenuAnchor] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Pricing', path: '/subscription-plans' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const artistMenuItems = isAuthenticated
    ? [
        { label: 'My Dashboard', path: '/artist-dashboard' },
        { label: 'Create Listing', path: '/create-listing' },
        { label: 'Messages', path: '/messages' },
        { label: 'Chat', path: null, onClick: () => openChat() },
      ]
    : [
        { label: 'Sell Art', path: '/artist-signup' },
        { label: 'Artist Sign In', path: '/artist-signin' },
      ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async (): Promise<void> => {
      if (!isAuthenticated || !user?.id) {
        setUnreadCount(0);
        return;
      }

      try {
        const response = await apiService.getMessages(user.id, 'received');
        const unreadMessages = response.messages.filter(m => m.status === 'sent');
        setUnreadCount(unreadMessages.length);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };

    // Initial fetch
    fetchUnreadCount();
    
    // Poll for new messages more frequently (every 10 seconds)
    const interval = setInterval(fetchUnreadCount, 10000);
    
    // Listen for messages being marked as read
    const handleMessagesRead = () => {
      // Small delay to ensure backend has processed the update
      setTimeout(() => {
        fetchUnreadCount();
      }, 500);
    };
    window.addEventListener('messagesRead', handleMessagesRead);
    
    // Also refresh more frequently when on messages page
    let messagesPageInterval: ReturnType<typeof setInterval> | null = null;
    if (location.pathname === '/messages') {
      messagesPageInterval = setInterval(() => {
        fetchUnreadCount();
      }, 2000);
    }
    
    return () => {
      clearInterval(interval);
      if (messagesPageInterval) {
        clearInterval(messagesPageInterval);
      }
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, [isAuthenticated, user?.id, location.pathname]);

  const handleDrawerToggle = (): void => {
    if (!drawerOpen && isAuthenticated) {
      refreshUser();
    }
    setDrawerOpen(!drawerOpen);
  };

  const handleNavigation = (path: string): void => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleArtistMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setArtistMenuAnchor(event.currentTarget);
  };

  const handleArtistMenuClose = (): void => {
    setArtistMenuAnchor(null);
  };

  const handleArtistMenuClick = (path: string): void => {
    navigate(path);
    handleArtistMenuClose();
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    if (isAuthenticated) {
      refreshUser();
    }
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = (): void => {
    setUserMenuAnchor(null);
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      handleUserMenuClose();
      navigate('/');
    } catch (error) {
      // Silently handle sign out errors
    }
  };

  const drawer = (
    <Box sx={{ width: 280, height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => {
              navigate('/');
              handleDrawerToggle();
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-block',
                px: isDarkMode ? 1.5 : 0,
                py: isDarkMode ? 0.5 : 0,
                borderRadius: isDarkMode ? 1 : 0,
                bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              }}
            >
              <Box
                component="img"
                src={logo}
                alt="ArtZyla Logo"
                sx={{
                  height: 100,
                  width: 'auto',
                  objectFit: 'contain',
                  py: 1,
                  display: 'block',
                }}
              />
            </Box>
          </Box>
          <IconButton onClick={handleDrawerToggle} color="inherit">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      <List sx={{ px: 2, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem 
            key={item.label} 
            onClick={() => handleNavigation(item.path)}
            sx={{
              borderRadius: 2,
              mb: 1,
              cursor: 'pointer',
              bgcolor: location.pathname === item.path ? 'primary.main' : 'transparent',
              color: location.pathname === item.path ? 'white' : 'inherit',
              '&:hover': {
                bgcolor: location.pathname === item.path ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: location.pathname === item.path ? 600 : 400,
              }}
            />
          </ListItem>
        ))}
        
        {!isAuthenticated && (
          <>
            <Box sx={{ my: 2, borderTop: 1, borderColor: 'divider' }} />
            {artistMenuItems.map((item) => (
              <ListItem 
                key={item.label} 
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.path) {
                    handleNavigation(item.path);
                  }
                }}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  cursor: 'pointer',
                  bgcolor: item.path && location.pathname === item.path ? 'primary.main' : 'transparent',
                  color: item.path && location.pathname === item.path ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: item.path && location.pathname === item.path ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 400,
                  }}
                />
              </ListItem>
            ))}
          </>
        )}
        
        {isAuthenticated && user && (
          <>
            <Box sx={{ my: 2, borderTop: 1, borderColor: 'divider' }} />
            <Box sx={{ px: 2, py: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {user.name?.charAt(0).toUpperCase() || user.id?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {user.name || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                    @{user.id || 'username'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <ListItem 
              onClick={() => {
                handleNavigation('/artist-dashboard');
                handleDrawerToggle();
              }}
              sx={{
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                bgcolor: location.pathname === '/artist-dashboard' ? 'primary.main' : 'transparent',
                color: location.pathname === '/artist-dashboard' ? 'white' : 'inherit',
                '&:hover': {
                  bgcolor: location.pathname === '/artist-dashboard' ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText 
                primary="My Dashboard"
                primaryTypographyProps={{
                  fontWeight: location.pathname === '/artist-dashboard' ? 600 : 400,
                }}
              />
            </ListItem>
            <ListItem 
              onClick={() => {
                handleNavigation('/messages');
                handleDrawerToggle();
              }}
              sx={{
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                bgcolor: location.pathname === '/messages' ? 'primary.main' : 'transparent',
                color: location.pathname === '/messages' ? 'white' : 'inherit',
                '&:hover': {
                  bgcolor: location.pathname === '/messages' ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                <EmailIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Messages"
                primaryTypographyProps={{
                  fontWeight: location.pathname === '/messages' ? 600 : 400,
                }}
              />
            </ListItem>
            <ListItem 
              onClick={() => {
                openChat();
                handleDrawerToggle();
              }}
              sx={{
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                bgcolor: 'transparent',
                color: 'inherit',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                <ChatIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Chat"
                primaryTypographyProps={{
                  fontWeight: 400,
                }}
              />
            </ListItem>
            {user?.userRole === UserRole.SITE_ADMIN && (
              <ListItem 
                onClick={() => {
                  handleNavigation('/admin');
                  handleDrawerToggle();
                }}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  cursor: 'pointer',
                  bgcolor: location.pathname === '/admin' ? 'error.main' : 'transparent',
                  color: location.pathname === '/admin' ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: location.pathname === '/admin' ? 'error.dark' : 'error.light',
                    color: 'white',
                  },
                }}
              >
                <ListItemIcon>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Admin Dashboard"
                  primaryTypographyProps={{
                    fontWeight: location.pathname === '/admin' ? 600 : 400,
                  }}
                />
              </ListItem>
            )}
            <ListItem 
              onClick={async () => {
                await handleSignOut();
                handleDrawerToggle();
              }}
              sx={{
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'white',
                },
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Sign Out" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          background: theme.palette.background.paper,
          transition: 'all 0.3s ease-in-out',
          borderBottom: '1px solid',
          borderColor: 'primary.main',
          boxShadow: 'none',
          zIndex: 1300,
          width: '100vw',
          maxWidth: '100%',
          left: 0,
          right: 0,
          margin: 0,
          paddingLeft: { xs: 2, sm: 3, md: 4 },
          paddingRight: { xs: 2, sm: 3, md: 4 },
          position: 'fixed',
          top: 0,
        }}
      >
          <Toolbar 
            disableGutters
            sx={{ 
              width: '100%',
              minHeight: { xs: 64, sm: 70 },
              justifyContent: 'space-between',
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { md: 'none' },
                color: isDarkMode ? 'white' : 'text.primary',
                ml: 0,
              }}
            >
              <MenuIcon />
            </IconButton>

            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                flex: { xs: 0, md: 0 },
              }}
              onClick={() => navigate('/')}
            >
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-block',
                  px: isDarkMode ? 1.5 : 0,
                  py: isDarkMode ? 0.5 : 0,
                  borderRadius: isDarkMode ? 1 : 0,
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  },
                }}
              >
                <Box
                  component="img"
                  src={logo}
                  alt="ArtZyla Logo"
                  sx={{
                    height: { xs: 100, md: 120 },
                    width: 'auto',
                    objectFit: 'contain',
                    py: 1,
                    display: 'block',
                    transition: 'opacity 0.3s ease',
                    '&:hover': {
                      opacity: 0.9,
                    },
                  }}
                />
              </Box>
            </Box>

            {!isMobile && (
              <Fade in={true} timeout={800}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: { md: 0.15, lg: 0.3, xl: 0.5 },
                    alignItems: 'center',
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 3,
                    p: { md: 0.2, lg: 0.3, xl: 0.5 },
                    border: '1px solid',
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                    maxWidth: { md: 'calc(100% - 320px)', lg: 'calc(100% - 380px)', xl: 'none' },
                    zIndex: 1,
                  }}
                >
                  {menuItems.map((item) => (
                    <Button
                      key={item.label}
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        color: location.pathname === item.path 
                          ? (isDarkMode ? 'white' : 'primary.main')
                          : (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'),
                        fontWeight: location.pathname === item.path ? 600 : 500,
                        fontSize: { md: '0.75rem', lg: '0.85rem', xl: '0.9rem' },
                        textTransform: 'none',
                        px: { md: 1, lg: 1.5, xl: 2.5 },
                        py: { md: 0.4, lg: 0.6, xl: 0.75 },
                        borderRadius: 2.5,
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        minWidth: 'auto',
                        whiteSpace: 'nowrap',
                        bgcolor: location.pathname === item.path 
                          ? (isDarkMode 
                              ? 'linear-gradient(135deg, rgba(83, 75, 174, 0.3) 0%, rgba(25, 118, 210, 0.3) 100%)'
                              : 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(156, 39, 176, 0.12) 100%)')
                          : 'transparent',
                        '&:hover': {
                          bgcolor: location.pathname === item.path
                            ? (isDarkMode 
                                ? 'linear-gradient(135deg, rgba(83, 75, 174, 0.4) 0%, rgba(25, 118, 210, 0.4) 100%)'
                                : 'linear-gradient(135deg, rgba(25, 118, 210, 0.18) 0%, rgba(156, 39, 176, 0.18) 100%)')
                            : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                          color: location.pathname === item.path 
                            ? (isDarkMode ? 'white' : 'primary.main')
                            : (isDarkMode ? 'white' : 'text.primary'),
                          transform: 'scale(1.05)',
                        },
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                  
                  {!isAuthenticated && (
                    <Button
                      onClick={handleArtistMenuOpen}
                      endIcon={<ExpandMoreIcon />}
                      sx={{
                        color: isDarkMode ? 'white' : 'text.primary',
                        fontWeight: 500,
                        position: 'relative',
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        '&:hover': {
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                        },
                      }}
                    >
                      <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                      Artists
                    </Button>
                  )}
                </Box>
              </Fade>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 0.5, md: 0.75, lg: 0.75, xl: 1 }, ml: 'auto', flexShrink: 0 }}>
              {isAuthenticated && user ? (
                <>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/create-listing')}
                    startIcon={<AddIcon />}
                    sx={{
                      mr: { xs: 0.5, sm: 0.5, md: 0.5, lg: 0.5, xl: 1 },
                      textTransform: 'none',
                      fontWeight: 500,
                      display: { xs: 'none', md: 'none', lg: 'flex' },
                      whiteSpace: 'nowrap',
                      fontSize: { lg: '0.875rem', xl: '0.9375rem' },
                      px: { lg: 1.5, xl: 2 },
                    }}
                  >
                    Create Listing
                  </Button>
                  <IconButton
                    onClick={() => navigate('/create-listing')}
                    sx={{
                      mr: { xs: 0.5, sm: 0.5, md: 0.5, lg: 0 },
                      display: { xs: 'flex', md: 'flex', lg: 'none' },
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }}
                    aria-label="Create Listing"
                  >
                    <AddIcon />
                  </IconButton>
                  <Button
                    onClick={handleUserMenuOpen}
                    startIcon={<Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                      {user.name?.charAt(0).toUpperCase() || user.id?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>}
                    endIcon={<ExpandMoreIcon />}
                    sx={{
                      color: isDarkMode ? 'white' : 'text.primary',
                      fontWeight: 500,
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                      borderRadius: 2,
                      px: { xs: 1, sm: 2 },
                      py: 0.5,
                      textTransform: 'none',
                      display: { xs: 'none', md: 'none', lg: 'flex' },
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    {user.name || user.id || 'User'}
                  </Button>
                  <IconButton
                    onClick={handleUserMenuOpen}
                    sx={{
                      display: { xs: 'flex', md: 'flex', lg: 'none' },
                      color: isDarkMode ? 'white' : 'text.primary',
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                      '&:hover': {
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                      },
                    }}
                    aria-label="User menu"
                  >
                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                      {user.name?.charAt(0).toUpperCase() || user.id?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                  </IconButton>
                </>
              ) : null}
              
              <IconButton
                onClick={() => navigate('/cart')}
                sx={{ 
                  color: isDarkMode ? 'white' : 'text.primary',
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'action.hover',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'action.selected',
                  },
                }}
              >
                <Badge 
                  badgeContent={getTotalItems()} 
                  color="primary"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      fontWeight: 600,
                    },
                  }}
                >
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
              {isAuthenticated && (
                <IconButton
                  onClick={() => {
                    const fetchUnreadCount = async (): Promise<void> => {
                      if (!isAuthenticated || !user?.id) {
                        setUnreadCount(0);
                        return;
                      }
                      try {
                        const response = await apiService.getMessages(user.id, 'received');
                        const unreadMessages = response.messages.filter(m => m.status === 'sent');
                        setUnreadCount(unreadMessages.length);
                      } catch (error) {
                        console.error('Error fetching unread messages:', error);
                      }
                    };
                    fetchUnreadCount();
                    navigate('/messages');
                  }}
                  sx={{ 
                    color: isDarkMode ? 'white' : 'text.primary',
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'action.hover',
                    '&:hover': {
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'action.selected',
                    },
                  }}
                >
                  <Badge 
                    badgeContent={unreadCount} 
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        bgcolor: 'error.main',
                        color: 'white',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              )}
              <IconButton 
                onClick={toggleTheme}
                sx={{ 
                  color: isDarkMode ? 'white' : 'text.primary',
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'action.hover',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'action.selected',
                  },
                }}
              >
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>

            </Box>
          </Toolbar>
      </AppBar>

      <Menu
        anchorEl={artistMenuAnchor}
        open={Boolean(artistMenuAnchor)}
        onClose={handleArtistMenuClose}
        disableScrollLock={true}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem 
          onClick={() => handleArtistMenuClick('/artist-signup')}
          sx={{ 
            py: 1.5,
            px: 2,
            '&:hover': { bgcolor: 'secondary.main', color: 'white' },
          }}
        >
          <PersonIcon sx={{ mr: 2, fontSize: 20 }} />
          Sell Art
        </MenuItem>
        <MenuItem 
          onClick={() => handleArtistMenuClick('/artist-signin')}
          sx={{ 
            py: 1.5,
            px: 2,
            '&:hover': { bgcolor: 'secondary.main', color: 'white' },
          }}
        >
          <PersonIcon sx={{ mr: 2, fontSize: 20 }} />
          Artist Sign In
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        disableScrollLock={true}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            @{user?.id || 'username'}
          </Typography>
        </Box>
        <Divider />
        <MenuItem 
          onClick={() => {
            handleUserMenuClose();
            navigate('/artist-dashboard');
          }}
          sx={{ 
            py: 1.5,
            px: 2,
            '&:hover': { bgcolor: 'secondary.main', color: 'white' },
          }}
        >
          <PersonIcon sx={{ mr: 2, fontSize: 20 }} />
          My Dashboard
        </MenuItem>
        <MenuItem 
          onClick={() => {
            handleUserMenuClose();
            navigate('/messages');
          }}
          sx={{ 
            py: 1.5,
            px: 2,
            '&:hover': { bgcolor: 'secondary.main', color: 'white' },
          }}
        >
          <EmailIcon sx={{ mr: 2, fontSize: 20 }} />
          Messages
        </MenuItem>
        {user?.userRole === UserRole.SITE_ADMIN && (
          <>
            <Divider />
            <MenuItem 
              onClick={() => {
                handleUserMenuClose();
                navigate('/admin');
              }}
              sx={{ 
                py: 1.5,
                px: 2,
                '&:hover': { bgcolor: 'error.light', color: 'white' },
              }}
            >
              <AdminIcon sx={{ mr: 2, fontSize: 20 }} />
              Admin Dashboard
            </MenuItem>
          </>
        )}
        <Divider />
        <MenuItem 
          onClick={handleSignOut}
          sx={{ 
            py: 1.5,
            px: 2,
            '&:hover': { bgcolor: 'error.light', color: 'white' },
          }}
        >
          <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
          Sign Out
        </MenuItem>
      </Menu>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Header;

