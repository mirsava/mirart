import React, { useState, useEffect, useRef } from 'react';
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
  Popover,
  Card,
  CardActionArea,
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
  Receipt as ReceiptIcon,
  InfoOutlined as InfoIcon,
  WarningAmber as WarningIcon,
  CheckCircle as SuccessIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useCart } from '../contexts/CartContext';
import { useNotifications } from '../contexts/NotificationContext';
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
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, dismissNotification } = useNotifications();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [artistMenuAnchor, setArtistMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [galleryMenuAnchor, setGalleryMenuAnchor] = useState<null | HTMLElement>(null);
  const galleryCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [artists, setArtists] = useState<Array<{ id: number; cognito_username: string; artist_name: string; profile_image_url?: string }>>([]);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const gallerySubcategories = {
    'Painting': ['Abstract', 'Figurative', 'Impressionism', 'Realism', 'Pop Art'],
    'Woodworking': ['Furniture', 'Decorative Items', 'Kitchenware', 'Outdoor', 'Storage', 'Lighting', 'Toys & Games'],
    'Prints': ['Giclée', 'Screen Print', 'Lithograph', 'Offset', 'Digital Print', 'Fine Art Print'],
  };

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        console.log('Fetching artists...');
        const response = await apiService.getArtists();
        console.log('Fetched artists response:', response);
        console.log('Artists array:', response.artists);
        console.log('Artists length:', response.artists?.length || 0);
        setArtists(response.artists || []);
        console.log('Artists state set, length:', response.artists?.length || 0);
      } catch (error) {
        console.error('Error fetching artists:', error);
        setArtists([]);
      }
    };
    fetchArtists();
  }, []);

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Gallery', path: '/gallery', hasSubmenu: true },
    { label: 'Pricing', path: '/subscription-plans' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const galleryButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleGalleryMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (galleryCloseTimeoutRef.current) {
      clearTimeout(galleryCloseTimeoutRef.current);
      galleryCloseTimeoutRef.current = null;
    }
    const target = event.currentTarget.querySelector('button') || event.currentTarget;
    setGalleryMenuAnchor(target as HTMLElement);
  };

  const handleGalleryMouseLeave = () => {
    galleryCloseTimeoutRef.current = setTimeout(() => {
      setGalleryMenuAnchor(null);
    }, 150);
  };

  const handleGalleryMenuMouseEnter = () => {
    if (galleryCloseTimeoutRef.current) {
      clearTimeout(galleryCloseTimeoutRef.current);
      galleryCloseTimeoutRef.current = null;
    }
  };

  const handleGalleryMenuMouseLeave = () => {
    galleryCloseTimeoutRef.current = setTimeout(() => {
      setGalleryMenuAnchor(null);
    }, 150);
  };

  const handleGallerySubcategoryClick = (category: string, subcategory?: string) => {
    if (subcategory) {
      navigate(`/gallery?category=${category}&subcategory=${subcategory}`);
    } else {
      navigate(`/gallery?category=${category}`);
    }
    setGalleryMenuAnchor(null);
  };

  const handleArtistClick = (cognitoUsername: string) => {
    navigate(`/gallery?artist=${cognitoUsername}`);
    setGalleryMenuAnchor(null);
  };

  const groupArtistsByLetter = () => {
    const grouped: Record<string, Array<{ id: number; cognito_username: string; artist_name: string; profile_image_url?: string }>> = {};
    artists.forEach(artist => {
      const firstLetter = artist.artist_name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(artist);
    });
    return grouped;
  };

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
                handleDrawerToggle();
                setNotificationDrawerOpen(true);
                fetchNotifications();
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
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </ListItemIcon>
              <ListItemText 
                primary="Notifications"
                primaryTypographyProps={{
                  fontWeight: 400,
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
          boxShadow: 'none',
          zIndex: 1300,
          width: '100%',
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
                    maxWidth: { md: 'calc(100% - 320px)', lg: 'calc(100% - 380px)', xl: 'none' },
                    zIndex: 1,
                    willChange: 'auto',
                  }}
                >
                  {menuItems.map((item) => (
                    <Box
                      key={item.label}
                      sx={{ 
                        position: 'relative', 
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                      onMouseEnter={item.hasSubmenu ? handleGalleryMouseEnter : undefined}
                      onMouseLeave={item.hasSubmenu ? handleGalleryMouseLeave : undefined}
                    >
                      <Button
                        ref={item.hasSubmenu && item.label === 'Gallery' ? galleryButtonRef : undefined}
                        onClick={() => !item.hasSubmenu && handleNavigation(item.path)}
                        sx={{
                          color: location.pathname === item.path 
                            ? 'primary.main'
                            : (isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary'),
                          fontWeight: location.pathname === item.path ? 600 : 500,
                          fontSize: { md: '0.75rem', lg: '0.85rem', xl: '0.9rem' },
                          textTransform: 'none',
                          px: { md: 1, lg: 1.5, xl: 2.5 },
                          py: { md: 0.4, lg: 0.6, xl: 0.75 },
                          position: 'relative',
                          transition: 'color 0.2s ease, border-color 0.2s ease',
                          minWidth: 'auto',
                          whiteSpace: 'nowrap',
                          bgcolor: 'transparent',
                          borderBottom: location.pathname === item.path ? '2px solid' : '2px solid transparent',
                          borderColor: location.pathname === item.path ? 'primary.main' : 'transparent',
                          borderRadius: 0,
                          flexShrink: 0,
                          contain: 'layout style',
                          '&:hover': {
                            bgcolor: 'transparent',
                            color: location.pathname === item.path 
                              ? 'primary.main'
                              : (isDarkMode ? 'white' : 'text.primary'),
                          },
                        }}
                      >
                        {item.label}
                        {item.hasSubmenu && <ExpandMoreIcon sx={{ ml: 0.5, fontSize: 16, flexShrink: 0 }} />}
                      </Button>
                      {item.hasSubmenu && (
                        <Popover
                          open={Boolean(galleryMenuAnchor)}
                          anchorEl={galleryMenuAnchor || galleryButtonRef.current}
                          onClose={() => setGalleryMenuAnchor(null)}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                          }}
                          transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                          }}
                          disableRestoreFocus
                          disableAutoFocus
                          disableEnforceFocus
                          disableScrollLock
                          PaperProps={{
                            onMouseEnter: handleGalleryMenuMouseEnter,
                            onMouseLeave: handleGalleryMenuMouseLeave,
                            sx: {
                              mt: 0.5,
                              minWidth: 800,
                              maxWidth: 1000,
                              borderRadius: 2,
                              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            },
                          }}
                          slotProps={{
                            root: {
                              style: {
                                position: 'fixed',
                              },
                            },
                          }}
                        >
                          <Box sx={{ py: 2, px: 2 }}>
                            <MenuItem 
                              onClick={() => handleNavigation('/gallery')} 
                              sx={{ 
                                py: 1.5, 
                                mb: 2, 
                                borderRadius: 1,
                                borderBottom: '2px solid',
                                borderColor: 'primary.main',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              <ListItemText 
                                primary="All Artwork"
                                primaryTypographyProps={{ 
                                  fontWeight: 600,
                                  fontSize: '0.95rem',
                                }}
                              />
                            </MenuItem>
                            <Box sx={{ display: 'flex', gap: 4 }}>
                              {Object.entries(gallerySubcategories).map(([category, subcategories]) => (
                                <Box key={category} sx={{ flex: 1, minWidth: 180 }}>
                                  <MenuItem 
                                    onClick={() => handleGallerySubcategoryClick(category)}
                                    sx={{ 
                                      py: 1.25, 
                                      fontWeight: 700, 
                                      px: 2,
                                      mb: 0.5,
                                      color: 'primary.main',
                                      borderRadius: 1,
                                      transition: 'all 0.2s ease',
                                      '&:hover': {
                                        bgcolor: 'primary.light',
                                        color: 'primary.contrastText',
                                        transform: 'translateX(4px)',
                                      },
                                    }}
                                  >
                                    <ListItemText 
                                      primary={category}
                                      primaryTypographyProps={{ 
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        letterSpacing: '0.5px',
                                      }}
                                    />
                                  </MenuItem>
                                  {subcategories.map((subcategory) => (
                                    <MenuItem
                                      key={subcategory}
                                      onClick={() => handleGallerySubcategoryClick(category, subcategory)}
                                      sx={{ 
                                        py: 0.875, 
                                        pl: 3.5,
                                        borderRadius: 1,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                          bgcolor: 'action.hover',
                                          transform: 'translateX(4px)',
                                          pl: 4,
                                        },
                                      }}
                                    >
                                      <ListItemText 
                                        primary={subcategory}
                                        primaryTypographyProps={{
                                          fontSize: '0.875rem',
                                          color: 'text.secondary',
                                        }}
                                      />
                                    </MenuItem>
                                  ))}
                                </Box>
                              ))}
                              <Box sx={{ flex: 1, minWidth: 200 }}>
                                <MenuItem 
                                  sx={{ 
                                    py: 1.25, 
                                    fontWeight: 700, 
                                    px: 2,
                                    mb: 0.5,
                                    color: 'primary.main',
                                    borderRadius: 1,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      bgcolor: 'primary.light',
                                      color: 'primary.contrastText',
                                      transform: 'translateX(4px)',
                                    },
                                  }}
                                >
                                  <ListItemText 
                                    primary="Shop by Artist"
                                    primaryTypographyProps={{ 
                                      fontWeight: 700,
                                      fontSize: '0.9rem',
                                      letterSpacing: '0.5px',
                                    }}
                                  />
                                </MenuItem>
                                {artists.length > 0 ? (
                                  <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                                    {Object.entries(groupArtistsByLetter())
                                      .sort(([a], [b]) => a.localeCompare(b))
                                      .map(([letter, letterArtists]) => (
                                        <Box key={letter}>
                                          <MenuItem 
                                            sx={{ 
                                              py: 0.75, 
                                              pl: 2.5,
                                              mt: 0.5,
                                              fontWeight: 600,
                                              color: 'text.disabled',
                                              borderRadius: 1,
                                            }}
                                            disabled
                                          >
                                            <ListItemText 
                                              primary={letter}
                                              primaryTypographyProps={{ 
                                                fontSize: '0.7rem', 
                                                fontWeight: 700,
                                                letterSpacing: '1px',
                                                textTransform: 'uppercase',
                                              }}
                                            />
                                          </MenuItem>
                                          {letterArtists.map((artist) => (
                                            <MenuItem
                                              key={artist.id}
                                              onClick={() => handleArtistClick(artist.cognito_username)}
                                              sx={{ 
                                                py: 0.875, 
                                                pl: 3.5,
                                                borderRadius: 1,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                  bgcolor: 'action.hover',
                                                  transform: 'translateX(4px)',
                                                  pl: 4,
                                                },
                                              }}
                                            >
                                              <ListItemText 
                                                primary={artist.artist_name}
                                                primaryTypographyProps={{
                                                  fontSize: '0.875rem',
                                                  color: 'text.secondary',
                                                }}
                                              />
                                            </MenuItem>
                                          ))}
                                        </Box>
                                      ))}
                                  </Box>
                                ) : (
                                  <MenuItem disabled sx={{ py: 0.875, pl: 2.5 }}>
                                    <ListItemText 
                                      primary="Loading artists..."
                                      primaryTypographyProps={{ 
                                        fontSize: '0.875rem', 
                                        color: 'text.disabled',
                                        fontStyle: 'italic',
                                      }}
                                    />
                                  </MenuItem>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </Popover>
                      )}
                    </Box>
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
                <>
                  <IconButton
                    onClick={() => {
                      setNotificationDrawerOpen(true);
                      fetchNotifications();
                    }}
                    aria-label="Notifications"
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
                  <Drawer
                    anchor="right"
                    open={notificationDrawerOpen}
                    onClose={() => setNotificationDrawerOpen(false)}
                    PaperProps={{
                      sx: {
                        width: { xs: '100%', sm: 380 },
                        top: { xs: 100, sm: 120 },
                        height: { xs: 'calc(100vh - 100px)', sm: 'calc(100vh - 120px)' },
                        maxHeight: '100vh',
                        overflow: 'hidden',
                        zIndex: 1400,
                      },
                    }}
                  >
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <Box sx={{ px: 2, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h6" fontWeight={600}>Notifications</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {unreadCount > 0 && (
                            <Button size="small" onClick={() => { markAllAsRead(); setNotificationDrawerOpen(false); }}>
                              Mark all read
                            </Button>
                          )}
                          <IconButton size="small" onClick={() => setNotificationDrawerOpen(false)}>
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 3, pb: 3, px: 2 }}>
                        {notifications.length === 0 ? (
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'text.secondary' }}>
                            <NotificationsIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                            <Typography variant="body2">No notifications</Typography>
                          </Box>
                        ) : (
                          notifications.map((n) => {
                            const sev = n.severity || 'info';
                            const severityColors: Record<string, { border: string; icon: string }> = {
                              info: { border: '#0d47a1', icon: '#0d47a1' },
                              warning: { border: '#e65100', icon: '#e65100' },
                              success: { border: '#1b5e20', icon: '#1b5e20' },
                              error: { border: '#b71c1c', icon: '#b71c1c' },
                            };
                            const colors = severityColors[sev] || severityColors.info;
                            const severityIcon = sev === 'warning' ? <WarningIcon fontSize="small" /> : sev === 'success' ? <SuccessIcon fontSize="small" /> : sev === 'error' ? <ErrorIcon fontSize="small" /> : n.type === 'message' ? <EmailIcon fontSize="small" /> : n.type === 'order' ? <ReceiptIcon fontSize="small" /> : <InfoIcon fontSize="small" />;
                            const timeAgo = n.created_at ? (() => {
                              const d = new Date(n.created_at);
                              const now = new Date();
                              const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
                              if (mins < 1) return 'Just now';
                              if (mins < 60) return `${mins}m ago`;
                              const hrs = Math.floor(mins / 60);
                              if (hrs < 24) return `${hrs}h ago`;
                              const days = Math.floor(hrs / 24);
                              return `${days}d ago`;
                            })() : null;
                            return (
                              <Card
                                key={n.id}
                                sx={{
                                  mb: 1.5,
                                  overflow: 'hidden',
                                  borderLeft: 3,
                                  borderLeftColor: n.read_at ? 'transparent' : colors.border,
                                  boxShadow: 1,
                                }}
                              >
                                <CardActionArea
                                  onClick={async () => {
                                    if (!n.read_at) await markAsRead(n.id);
                                    setNotificationDrawerOpen(false);
                                    if (n.link) navigate(n.link);
                                  }}
                                  sx={{ p: 2, alignItems: 'flex-start', display: 'block' }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ color: colors.icon, mt: 0.25 }}>{severityIcon}</Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography variant="subtitle2" fontWeight={n.read_at ? 500 : 700} color="text.primary">
                                        {n.title}
                                          </Typography>
                                          {n.body && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} display="block">
                                              {n.body}
                                            </Typography>
                                          )}
                                          {n.link && (
                                            <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block', textDecoration: 'underline' }}>
                                              {n.link}
                                            </Typography>
                                          )}
                                          {timeAgo && (
                                            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                                              {timeAgo}
                                            </Typography>
                                          )}
                                        </Box>
                                        <IconButton
                                          size="small"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await dismissNotification(n.id);
                                          }}
                                          sx={{ mt: -0.5, mr: -0.5 }}
                                          aria-label="Dismiss"
                                        >
                                          <CloseIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                  </Box>
                                </CardActionArea>
                              </Card>
                            );
                          })
                        )}
                      </Box>
                    </Box>
                  </Drawer>
                </>
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
        <MenuItem 
          onClick={() => {
            handleUserMenuClose();
            navigate('/orders');
          }}
          sx={{ 
            py: 1.5,
            px: 2,
            '&:hover': { bgcolor: 'secondary.main', color: 'white' },
          }}
        >
          <ReceiptIcon sx={{ mr: 2, fontSize: 20 }} />
          Orders
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

