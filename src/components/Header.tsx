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
  Box,
  useMediaQuery,
  useTheme,
  Container,
  Chip,
  Fade,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ShoppingCart as ShoppingCartIcon,
  Palette as PaletteIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const { getTotalItems } = useCart();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [artistMenuAnchor, setArtistMenuAnchor] = useState<null | HTMLElement>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const artistMenuItems = [
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

  const drawer = (
    <Box sx={{ width: 280, height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PaletteIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              MirArt
            </Typography>
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
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  transition: 'all 0.3s ease',
                }}
              >
                <PaletteIcon sx={{ mr: 1, color: 'white' }} />
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ 
                    fontWeight: 700,
                    color: 'white',
                    letterSpacing: '0.5px',
                  }}
                >
                  MirArt
                </Typography>
              </Box>
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
                </Box>
              </Fade>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

