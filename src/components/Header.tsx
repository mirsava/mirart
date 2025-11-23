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
  Container,
  Fade,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ShoppingCart as ShoppingCartIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/images/logo.png';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const { getTotalItems } = useCart();
  const { user, signOut, isAuthenticated } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [artistMenuAnchor, setArtistMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const artistMenuItems = isAuthenticated
    ? [
        { label: 'My Dashboard', path: '/artist-dashboard' },
        { label: 'Create Listing', path: '/create-listing' },
        { label: 'Messages', path: '/messages' },
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
              component="img"
              src={logo}
              alt="ArtZyla Logo"
              sx={{
                height: 90,
                width: 'auto',
                objectFit: 'contain',
                py: 1,
              }}
            />
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
        elevation={scrolled ? 4 : 0}
        sx={{
          bgcolor: scrolled 
            ? 'background.paper' 
            : isDarkMode 
              ? 'rgba(18,18,18,0.95)' 
              : 'rgba(255,255,255,0.95)',
          backdropFilter: scrolled ? 'blur(20px)' : 'blur(10px)',
          transition: 'all 0.3s ease-in-out',
          borderBottom: scrolled ? 1 : 0,
          borderColor: 'divider',
          zIndex: 1300,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ px: { xs: 0, sm: 2 } }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { md: 'none' },
                color: isDarkMode ? 'white' : 'text.primary',
              }}
            >
              <MenuIcon />
            </IconButton>

            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                flexGrow: 1,
                cursor: 'pointer',
              }}
              onClick={() => navigate('/')}
            >
              <Box
                component="img"
                src={logo}
                alt="ArtZyla Logo"
                sx={{
                  height: 90,
                  width: 'auto',
                  objectFit: 'contain',
                  py: 1,
                  transition: 'opacity 0.3s ease',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              />
            </Box>

            {!isMobile && (
              <Fade in={true} timeout={800}>
                <Box sx={{ display: 'flex', gap: 1, mr: 3, alignItems: 'center' }}>
                  {menuItems.map((item) => (
                    <Button
                      key={item.label}
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        color: isDarkMode ? 'white' : 'text.primary',
                        fontWeight: location.pathname === item.path ? 600 : 400,
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: -4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: location.pathname === item.path ? '100%' : 0,
                          height: 2,
                          bgcolor: isDarkMode ? 'primary.light' : 'primary.main',
                          transition: 'width 0.3s ease',
                        },
                        '&:hover::after': {
                          width: '100%',
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isAuthenticated && user ? (
                <>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/create-listing')}
                    startIcon={<AddIcon />}
                    sx={{
                      mr: 1,
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Create Listing
                  </Button>
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
                      px: 2,
                      py: 0.5,
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    {user.name || user.id || 'User'}
                  </Button>
                </>
              ) : null}
              
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
                  color="secondary"
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: 'error.main',
                      color: 'white',
                      fontWeight: 600,
                    },
                  }}
                >
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Menu
        anchorEl={artistMenuAnchor}
        open={Boolean(artistMenuAnchor)}
        onClose={handleArtistMenuClose}
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
            '&:hover': { bgcolor: 'primary.light', color: 'white' },
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
            '&:hover': { bgcolor: 'primary.light', color: 'white' },
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
            '&:hover': { bgcolor: 'primary.light', color: 'white' },
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
            '&:hover': { bgcolor: 'primary.light', color: 'white' },
          }}
        >
          <EmailIcon sx={{ mr: 2, fontSize: 20 }} />
          Messages
        </MenuItem>
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

