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
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { paintings } from '../data/paintings';
import PaintingCard from '../components/PaintingCard';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const featuredPaintings = paintings.slice(0, 6);
  const [currentImage, setCurrentImage] = useState<number>(0);

  const heroImages = [
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Original Artworks', value: '500+', icon: <PaletteIcon /> },
    { label: 'Happy Customers', value: '2.5K+', icon: <StarIcon /> },
    { label: 'Featured Artists', value: '50+', icon: <TrendingIcon /> },
  ];

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 'calc(70vh - 45px)', md: 'calc(63vh - 45px)' },
          minHeight: 350,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
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
              background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
            },
          }}
        />
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Fade in={true} timeout={1000}>
                <Box>
                  <Chip
                    label="Premium Art Gallery"
                    color="primary"
                    sx={{ 
                      mb: 3, 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                    }}
                  />
                  <Typography
                    variant={isMobile ? 'h3' : 'h2'}
                    component="h1"
                    gutterBottom
                    sx={{ 
                      fontWeight: 700, 
                      mb: 3,
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    Discover
                    <br />
                    <Box component="span" sx={{ color: 'primary.light' }}>
                      Extraordinary Art
                    </Box>
                  </Typography>
                  <Typography
                    variant={isMobile ? 'h6' : 'h5'}
                    component="p"
                    sx={{ 
                      mb: 4, 
                      opacity: 0.9, 
                      maxWidth: '500px',
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    A curated marketplace where artists showcase their original works.
                    Discover unique paintings from talented creators worldwide.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
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
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                      onClick={() => navigate('/gallery')}
                    >
                      Explore Gallery
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      sx={{
                        borderColor: 'white',
                        color: 'white',
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                      onClick={() => navigate('/about')}
                    >
                      Learn More
                    </Button>
                  </Box>
                </Box>
              </Fade>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Slide direction="left" in={true} timeout={1200}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Card
                    sx={{
                      maxWidth: 400,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 4,
                      overflow: 'hidden',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    }}
                  >
                    <Box
                      sx={{
                        height: 300,
                        backgroundImage: `url(${heroImages[(currentImage + 1) % heroImages.length]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          p: 3,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        }}
                      >
                        <Typography variant="h6" color="white" fontWeight="600">
                          Artist Marketplace
                        </Typography>
                        <Typography variant="body2" color="rgba(255,255,255,0.8)">
                          Featuring works from talented artists
                        </Typography>
                      </Box>
                    </Box>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6" color="white" fontWeight="600">
                            Commission-Based Sales
                          </Typography>
                          <Typography variant="body2" color="rgba(255,255,255,0.7)">
                            Artists earn 85% of sales
                          </Typography>
                        </Box>
                        <IconButton
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
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
            gap: 1,
          }}
        >
          {heroImages.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: index === currentImage ? 'white' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.7)',
                },
              }}
              onClick={() => setCurrentImage(index)}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Fade in={true} timeout={1000 + index * 200}>
                  <Card
                    sx={{
                      textAlign: 'center',
                      p: 4,
                      borderRadius: 3,
                      bgcolor: 'background.paper',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: 'primary.main',
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      {stat.icon}
                    </Avatar>
                    <Typography variant="h4" component="div" fontWeight="bold" color="primary.main" gutterBottom>
                      {stat.value}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Featured Paintings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            Handpicked selections from our collection, showcasing the finest
            original artworks available for purchase.
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
            onClick={() => navigate('/gallery')}
          >
            View All Paintings
          </Button>
        </Box>
      </Container>

      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h2" gutterBottom>
                Why Choose MirArt?
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We believe that art has the power to transform spaces and inspire
                emotions. Our carefully curated collection features original paintings
                from talented artists, each piece authenticated and ready to grace
                your home or office.
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
                    Original artwork with certificates of authenticity
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
                    Secure packaging and worldwide shipping
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
                    30-day return policy for your peace of mind
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

