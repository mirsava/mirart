import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Chip,
  Avatar,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { artworks } from '../data/paintings';
import PaintingCard from '../components/PaintingCard';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const featuredPaintings = artworks.filter(item => item.category === 'Painting').slice(0, 3);
  const featuredWoodworking = artworks.filter(item => item.category === 'Woodworking').slice(0, 3);
  const [currentImage, setCurrentImage] = useState<number>(0);

  const heroImages = [
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);


  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 'calc(80vh - 45px)', md: 'calc(75vh - 45px)' },
          minHeight: 500,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${heroImages[currentImage]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'opacity 1s ease-in-out',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(102,126,234,0.8) 0%, rgba(118,75,162,0.8) 100%)',
            },
          }}
        />
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Fade in={true} timeout={1000}>
                <Box>
                  <Box sx={{ mb: 4 }}>
                    <Chip
                      label="Art Marketplace"
                      sx={{ 
                        mb: 2, 
                        bgcolor: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        px: 2,
                        py: 1,
                      }}
                    />
                  </Box>
                  <Typography
                    variant={isMobile ? 'h2' : 'h1'}
                    component="h1"
                    gutterBottom
                    sx={{ 
                      fontWeight: 700, 
                      mb: 3,
                      color: 'white',
                      textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                      fontSize: { xs: '2.5rem', md: '3.5rem' },
                      lineHeight: 1.1,
                    }}
                  >
                    Discover
                    <br />
                    <Box component="span" sx={{ 
                      background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      display: 'inline-block',
                    }}>
                      Handmade Art
                    </Box>
                  </Typography>
                  <Typography
                    variant={isMobile ? 'h6' : 'h5'}
                    component="p"
                    sx={{ 
                      mb: 4, 
                      opacity: 0.95, 
                      maxWidth: '520px',
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      fontWeight: 300,
                      lineHeight: 1.6,
                    }}
                  >
                    A marketplace for original paintings and handcrafted woodworking. 
                    Buy from talented artists or sell your own creations.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        px: 5,
                        py: 2,
                        borderRadius: 4,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.3)',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onClick={() => navigate('/gallery')}
                    >
                      Browse Artwork
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      sx={{
                        borderColor: 'rgba(255,255,255,0.5)',
                        color: 'white',
                        px: 5,
                        py: 2,
                        borderRadius: 4,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        backdropFilter: 'blur(20px)',
                        '&:hover': {
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)',
                          transform: 'translateY(-3px)',
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onClick={() => navigate('/artist-signup')}
                    >
                      Sell Your Art
                    </Button>
                  </Box>
                </Box>
              </Fade>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Slide direction="left" in={true} timeout={1200}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: { xs: 200, md: 250 },
                        height: { xs: 200, md: 250 },
                        borderRadius: 4,
                        backgroundImage: `url(${heroImages[(currentImage + 1) % heroImages.length]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)',
                        },
                      }}
                    />
                    <Box
                      sx={{
                        width: { xs: 200, md: 250 },
                        height: { xs: 200, md: 250 },
                        borderRadius: 4,
                        backgroundImage: `url(${heroImages[(currentImage + 2) % heroImages.length]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)',
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Slide>
            </Grid>
          </Grid>
        </Container>

        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          {heroImages.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: index === currentImage ? 32 : 12,
                height: 12,
                borderRadius: 6,
                bgcolor: index === currentImage ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.8)',
                  transform: 'scale(1.1)',
                },
              }}
              onClick={() => setCurrentImage(index)}
            />
          ))}
        </Box>
      </Box>


      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Featured Paintings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            Discover original paintings from talented artists in our community.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {featuredPaintings.map((painting) => (
            <Grid item xs={12} sm={6} md={4} key={painting.id}>
              <PaintingCard painting={painting} />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
              '&:focus': {
                bgcolor: 'primary.dark',
              },
              transition: 'all 0.3s ease',
            }}
            onClick={() => navigate('/gallery')}
          >
            View All Paintings
          </Button>
        </Box>
      </Container>

      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h4" component="h2" gutterBottom>
              Featured Woodworking
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              Handcrafted woodworking pieces from skilled artisans in our marketplace.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {featuredWoodworking.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <PaintingCard painting={item} />
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'primary.dark',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                },
                '&:focus': {
                  bgcolor: 'primary.dark',
                },
                transition: 'all 0.3s ease',
              }}
              onClick={() => navigate('/gallery')}
            >
              View All Woodworking
            </Button>
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h2" gutterBottom>
                Join Our Community
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Whether you're an artist looking to sell your work or an art lover seeking 
                unique pieces, our marketplace connects creators with collectors. Join our 
                growing community of talented artists and art enthusiasts.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                    }}
                  />
                  <Typography variant="body2">
                    Artists keep 85% of their sales
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                    }}
                  />
                  <Typography variant="body2">
                    Easy listing and management tools
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                    }}
                  />
                  <Typography variant="body2">
                    Secure payments and worldwide shipping
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  height: 400,
                  backgroundImage: 'url(https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 2,
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;

