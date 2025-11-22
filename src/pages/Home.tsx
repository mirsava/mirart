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
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { artworks } from '../data/paintings';
import PaintingCard from '../components/PaintingCard';
import apiService, { Listing } from '../services/api';
import { Painting } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [featuredPaintings, setFeaturedPaintings] = useState<Painting[]>([]);
  const [featuredWoodworking, setFeaturedWoodworking] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [paintingPlaceholders, setPaintingPlaceholders] = useState(0);
  const [woodworkingPlaceholders, setWoodworkingPlaceholders] = useState(0);
  const [currentImage, setCurrentImage] = useState<number>(0);
  const [shape1Animation, setShape1Animation] = useState({ translateY: 0, rotate: -15 });
  const [shape2Animation, setShape2Animation] = useState({ translateY: 0, rotate: 20 });
  const [shape3Animation, setShape3Animation] = useState({ translateY: 0, rotate: 10 });

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const convertListingToPainting = (listing: Listing, category: 'Painting' | 'Woodworking' = 'Painting'): Painting => {
    return {
      id: listing.id,
      title: listing.title,
      artist: listing.artist_name || 'Unknown Artist',
      artistUsername: listing.cognito_username,
      artistSignatureUrl: listing.signature_url,
      price: listing.price,
      image: getImageUrl(listing.primary_image_url) || '',
      description: listing.description || '',
      category: category,
      subcategory: listing.subcategory || '',
      dimensions: listing.dimensions || '',
      medium: listing.medium || '',
      year: listing.year || new Date().getFullYear(),
      inStock: listing.in_stock,
    };
  };

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

  useEffect(() => {
    let timeout1: NodeJS.Timeout;
    let timeout2: NodeJS.Timeout;

    const scheduleUpdate1 = () => {
      const randomY = Math.random() * 100 - 50;
      const randomRotate = -15 + (Math.random() * 30 - 15);
      setShape1Animation({ translateY: randomY, rotate: randomRotate });
      const nextDelay = 2000 + Math.random() * 2000;
      timeout1 = setTimeout(scheduleUpdate1, nextDelay);
    };

    const scheduleUpdate2 = () => {
      const randomY = Math.random() * 100 - 50;
      const randomRotate = 20 + (Math.random() * 30 - 15);
      setShape2Animation({ translateY: randomY, rotate: randomRotate });
      const nextDelay = 2000 + Math.random() * 2000;
      timeout2 = setTimeout(scheduleUpdate2, nextDelay);
    };

    let timeout3: NodeJS.Timeout;
    const scheduleUpdate3 = () => {
      const randomY = Math.random() * 100 - 50;
      const randomRotate = 10 + (Math.random() * 30 - 15);
      setShape3Animation({ translateY: randomY, rotate: randomRotate });
      const nextDelay = 2000 + Math.random() * 2000;
      timeout3 = setTimeout(scheduleUpdate3, nextDelay);
    };

    scheduleUpdate1();
    scheduleUpdate2();
    scheduleUpdate3();

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  useEffect(() => {
    const fetchFeaturedListings = async () => {
      try {
        const [paintingsResponse, woodworkingResponse] = await Promise.all([
          apiService.getListings({ status: 'active', category: 'Painting', limit: 3 }),
          apiService.getListings({ status: 'active', category: 'Woodworking', limit: 3 }),
        ]);
        
        const dbPaintings = paintingsResponse.listings.map(listing => convertListingToPainting(listing, 'Painting'));
        const dbWoodworking = woodworkingResponse.listings.map(listing => convertListingToPainting(listing, 'Woodworking'));
        
        // Calculate how many placeholders are needed (up to 3 total items)
        const remainingPaintingSlots = Math.max(0, 3 - dbPaintings.length);
        const remainingWoodworkingSlots = Math.max(0, 3 - dbWoodworking.length);
        
        setFeaturedPaintings(dbPaintings.slice(0, 3));
        setFeaturedWoodworking(dbWoodworking.slice(0, 3));
        setPaintingPlaceholders(remainingPaintingSlots);
        setWoodworkingPlaceholders(remainingWoodworkingSlots);
      } catch (error) {
        console.error('Error fetching featured listings:', error);
        // On error, show all placeholders
        setFeaturedPaintings([]);
        setFeaturedWoodworking([]);
        setPaintingPlaceholders(3);
        setWoodworkingPlaceholders(3);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedListings();
  }, []);


  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 'calc(85vh - 45px)', md: 'calc(90vh - 45px)' },
          minHeight: 600,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #e8e8e8 100%)',
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
            transform: 'scale(1.05)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.5) 100%)',
            },
          }}
        />
        
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          {/* Top-left red circle */}
          <Box
            sx={{
              position: 'absolute',
              top: '3%',
              left: '5%',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              bgcolor: 'rgba(26,35,126,0.4)',
              filter: 'blur(60px)',
            }}
          />
          
          {/* Top-left teal triangle (cut off) */}
          <Box
            sx={{
              position: 'absolute',
              top: '-5%',
              left: '-8%',
              width: '550px',
              height: '550px',
              bgcolor: 'rgba(83,75,174,0.32)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              transform: 'rotate(25deg)',
              filter: 'blur(63px)',
            }}
          />
          
          {/* Top-left red hexagon (cut off) */}
          <Box
            sx={{
              position: 'absolute',
              top: '1%',
              left: '-12%',
              width: '520px',
              height: '520px',
              bgcolor: 'rgba(26,35,126,0.3)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              filter: 'blur(62px)',
              transform: 'rotate(15deg)',
            }}
          />
          
          {/* Top-left teal triangle */}
          <Box
            sx={{
              position: 'absolute',
              top: '8%',
              left: '2%',
              width: '480px',
              height: '480px',
              bgcolor: 'rgba(83,75,174,0.28)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              transform: 'rotate(-20deg)',
              filter: 'blur(61px)',
            }}
          />
          
          {/* Top-left red hexagon */}
          <Box
            sx={{
              position: 'absolute',
              top: '12%',
              left: '8%',
              width: '500px',
              height: '500px',
              bgcolor: 'rgba(26,35,126,0.26)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              filter: 'blur(64px)',
              transform: 'rotate(45deg)',
            }}
          />
          
          {/* Top-left teal triangle (cut off top) */}
          <Box
            sx={{
              position: 'absolute',
              top: '-3%',
              left: '15%',
              width: '460px',
              height: '460px',
              bgcolor: 'rgba(83,75,174,0.3)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              transform: 'rotate(35deg)',
              filter: 'blur(63px)',
            }}
          />
          
          {/* Top-left red hexagon (cut off) */}
          <Box
            sx={{
              position: 'absolute',
              top: '5%',
              left: '-5%',
              width: '490px',
              height: '490px',
              bgcolor: 'rgba(26,35,126,0.28)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              filter: 'blur(65px)',
              transform: 'rotate(-30deg)',
            }}
          />
          
          {/* Top-center teal square */}
          <Box
            sx={{
              position: 'absolute',
              top: '5%',
              left: '45%',
              width: '580px',
              height: '580px',
              bgcolor: 'rgba(83,75,174,0.32)',
              transform: 'rotate(45deg)',
              filter: 'blur(65px)',
            }}
          />
          
          {/* Top-right red triangle */}
          <Box
            sx={{
              position: 'absolute',
              top: '4%',
              right: '8%',
              width: '600px',
              height: '600px',
              bgcolor: 'rgba(26,35,126,0.32)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              filter: 'blur(62px)',
              transform: 'rotate(60deg)',
            }}
          />
          
          {/* Upper-left red triangle */}
          <Box
            sx={{
              position: 'absolute',
              top: '12%',
              left: '-2%',
              width: 0,
              height: 0,
              borderLeft: '300px solid transparent',
              borderRight: '300px solid transparent',
              borderBottom: '500px solid rgba(26,35,126,0.3)',
              filter: 'blur(60px)',
              transform: 'rotate(30deg)',
            }}
          />
          
          {/* Upper-center teal circle */}
          <Box
            sx={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              width: '520px',
              height: '520px',
              borderRadius: '50%',
              bgcolor: 'rgba(83,75,174,0.38)',
              filter: 'blur(62px)',
            }}
          />
          
          {/* Upper-right red rounded square */}
          <Box
            sx={{
              position: 'absolute',
              top: '18%',
              right: '15%',
              width: '540px',
              height: '540px',
              bgcolor: 'rgba(26,35,126,0.28)',
              borderRadius: '70px',
              transform: 'rotate(-20deg)',
              filter: 'blur(63px)',
            }}
          />
          
          {/* Mid-left teal rounded square */}
          <Box
            sx={{
              position: 'absolute',
              top: '35%',
              left: '12%',
              width: '500px',
              height: '500px',
              bgcolor: 'rgba(83,75,174,0.3)',
              borderRadius: '60px',
              transform: 'rotate(25deg)',
              filter: 'blur(63px)',
            }}
          />
          
          {/* Mid-center red circle */}
          <Box
            sx={{
              position: 'absolute',
              top: '42%',
              left: '48%',
              width: '480px',
              height: '480px',
              borderRadius: '50%',
              bgcolor: 'rgba(26,35,126,0.36)',
              filter: 'blur(63px)',
            }}
          />
          
          {/* Mid-right teal pentagon */}
          <Box
            sx={{
              position: 'absolute',
              top: '38%',
              right: '10%',
              width: '490px',
              height: '490px',
              bgcolor: 'rgba(83,75,174,0.29)',
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              filter: 'blur(66px)',
              transform: 'rotate(-45deg)',
            }}
          />
          
          {/* Lower-left red square */}
          <Box
            sx={{
              position: 'absolute',
              top: '55%',
              left: '8%',
              width: '550px',
              height: '550px',
              bgcolor: 'rgba(26,35,126,0.32)',
              transform: 'rotate(45deg)',
              filter: 'blur(65px)',
            }}
          />
          
          {/* Lower-center teal triangle */}
          <Box
            sx={{
              position: 'absolute',
              top: '58%',
              left: '52%',
              width: '530px',
              height: '530px',
              bgcolor: 'rgba(83,75,174,0.26)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              filter: 'blur(64px)',
              transform: 'rotate(-15deg)',
            }}
          />
          
          {/* Lower-right red rounded square */}
          <Box
            sx={{
              position: 'absolute',
              top: '60%',
              right: '12%',
              width: '580px',
              height: '580px',
              bgcolor: 'rgba(198,40,40,0.33)',
              borderRadius: '80px',
              transform: 'rotate(-20deg)',
              filter: 'blur(65px)',
            }}
          />
          
          {/* Upper-left-center red rounded square */}
          <Box
            sx={{
              position: 'absolute',
              top: '15%',
              left: '25%',
              width: '510px',
              height: '510px',
              bgcolor: 'rgba(198,40,40,0.25)',
              borderRadius: '50px',
              transform: 'rotate(-30deg)',
              filter: 'blur(60px)',
            }}
          />
          
          {/* Mid-left-center teal circle */}
          <Box
            sx={{
              position: 'absolute',
              top: '48%',
              left: '28%',
              width: '470px',
              height: '470px',
              borderRadius: '50%',
              bgcolor: 'rgba(0,151,167,0.35)',
              filter: 'blur(63px)',
            }}
          />
          
          {/* Mid-right-center red rounded square */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              right: '28%',
              width: '460px',
              height: '460px',
              bgcolor: 'rgba(198,40,40,0.25)',
              borderRadius: '60px',
              transform: 'rotate(35deg)',
              filter: 'blur(61px)',
            }}
          />
          
          {/* Bottom-right teal triangle (off-screen) */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '12%',
              right: '-2%',
              width: '500px',
              height: '500px',
              bgcolor: 'rgba(83,75,174,0.3)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              filter: 'blur(62px)',
              transform: 'rotate(-60deg)',
            }}
          />
          
          {/* Upper-right-center red circle */}
          <Box
            sx={{
              position: 'absolute',
              top: '22%',
              right: '38%',
              width: '490px',
              height: '490px',
              borderRadius: '50%',
              bgcolor: 'rgba(198,40,40,0.34)',
              filter: 'blur(61px)',
            }}
          />
          
          {/* Bottom-center-left teal rounded square */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '18%',
              left: '20%',
              width: '480px',
              height: '480px',
              bgcolor: 'rgba(0,151,167,0.31)',
              borderRadius: '65px',
              transform: 'rotate(40deg)',
              filter: 'blur(62px)',
            }}
          />
          
          {/* Mid-center-right red octagon */}
          <Box
            sx={{
              position: 'absolute',
              top: '32%',
              right: '42%',
              width: '550px',
              height: '550px',
              bgcolor: 'rgba(26,35,126,0.3)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
              filter: 'blur(68px)',
              transform: 'rotate(15deg)',
            }}
          />
          
          {/* Bottom-left teal rounded square */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '8%',
              left: '-1%',
              width: '520px',
              height: '520px',
              bgcolor: 'rgba(83,75,174,0.29)',
              borderRadius: '70px',
              transform: 'rotate(-25deg)',
              filter: 'blur(64px)',
            }}
          />
          
          {/* Bottom-center-right red triangle */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '10%',
              right: '35%',
              width: '500px',
              height: '500px',
              bgcolor: 'rgba(198,40,40,0.27)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              filter: 'blur(62px)',
              transform: 'rotate(20deg)',
            }}
          />
          
          {/* Bottom-center teal circle */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '15%',
              left: '50%',
              width: '550px',
              height: '550px',
              borderRadius: '50%',
              bgcolor: 'rgba(0,151,167,0.37)',
              filter: 'blur(65px)',
            }}
          />
          
          {/* Top-right teal circle */}
          <Box
            sx={{
              position: 'absolute',
              top: '10%',
              right: '25%',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              bgcolor: 'rgba(0,151,167,0.36)',
              filter: 'blur(62px)',
            }}
          />
          
          {/* Mid-right red circle */}
          <Box
            sx={{
              position: 'absolute',
              top: '55%',
              right: '20%',
              width: '520px',
              height: '520px',
              borderRadius: '50%',
              bgcolor: 'rgba(198,40,40,0.35)',
              filter: 'blur(64px)',
            }}
          />
        </Box>
        
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
                        bgcolor: 'rgba(198,40,40,0.2)',
                        color: 'white',
                        border: '1px solid rgba(198,40,40,0.4)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        px: 2,
                        py: 0.5,
                        letterSpacing: '0.5px',
                      }}
                    />
                  </Box>
                  <Typography
                    variant={isMobile ? 'h2' : 'h1'}
                    component="h1"
                    gutterBottom
                    sx={{ 
                      fontWeight: 300, 
                      mb: 3,
                      color: 'white',
                      fontSize: { xs: '3rem', md: '4.5rem' },
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                      textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    Discover
                    <br />
                    <Box component="span" sx={{ 
                      fontWeight: 700,
                      color: '#ffffff',
                    }}>
                      Handmade Art
                    </Box>
                  </Typography>
                  <Typography
                    variant={isMobile ? 'body1' : 'h6'}
                    component="p"
                    sx={{ 
                      mb: 5, 
                      maxWidth: '520px',
                      color: 'rgba(255,255,255,0.95)',
                      fontWeight: 300,
                      lineHeight: 1.7,
                      fontSize: { xs: '1rem', md: '1.25rem' },
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    A curated marketplace for original paintings and handcrafted woodworking. 
                    Connect with talented artists and discover unique creations.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 4, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        px: 5,
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '1rem',
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 20px rgba(198,40,40,0.25)',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 30px rgba(198,40,40,0.35)',
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
                        borderWidth: 1.5,
                        color: 'white',
                        px: 5,
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '1rem',
                        letterSpacing: '0.5px',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        '&:hover': {
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
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
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: { xs: 280, md: 350 },
                          height: { xs: 280, md: 350 },
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: `rotate(${shape1Animation.rotate}deg) translateY(${shape1Animation.translateY}px)`,
                          transition: 'transform 2s ease-in-out',
                        }}
                      >
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(26,35,126,0.3) 0%, rgba(83,75,174,0.25) 100%)',
                          position: 'relative',
                          boxShadow: '0 20px 60px rgba(26,35,126,0.15)',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '20%',
                            left: '20%',
                            width: '60%',
                            height: '60%',
                            borderRadius: '50%',
                            background: 'rgba(83,75,174,0.12)',
                            filter: 'blur(20px)',
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: '30%',
                            right: '20%',
                            width: '40%',
                            height: '40%',
                            borderRadius: '50%',
                            background: 'rgba(26,35,126,0.15)',
                            filter: 'blur(15px)',
                          },
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '15%',
                          left: '15%',
                          width: '30%',
                          height: '30%',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.1)',
                          filter: 'blur(10px)',
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        width: { xs: 280, md: 350 },
                        height: { xs: 280, md: 350 },
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `rotate(${shape2Animation.rotate}deg) translateY(${shape2Animation.translateY}px)`,
                        transition: 'transform 2s ease-in-out',
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                          background: 'linear-gradient(45deg, rgba(255,152,0,0.3) 0%, rgba(255,193,7,0.25) 100%)',
                          position: 'relative',
                          boxShadow: '0 20px 60px rgba(255,152,0,0.15)',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '25%',
                            left: '25%',
                            width: '50%',
                            height: '50%',
                            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                            background: 'rgba(255,193,7,0.12)',
                            filter: 'blur(20px)',
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: '20%',
                            right: '20%',
                            width: '35%',
                            height: '35%',
                            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                            background: 'rgba(255,152,0,0.15)',
                            filter: 'blur(15px)',
                          },
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '20%',
                          right: '20%',
                          width: '25%',
                          height: '25%',
                          clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                          background: 'rgba(255,255,255,0.1)',
                          filter: 'blur(8px)',
                        }}
                      />
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        width: { xs: 280, md: 350 },
                        height: { xs: 280, md: 350 },
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `rotate(${shape3Animation.rotate}deg) translateY(${shape3Animation.translateY}px)`,
                        transition: 'transform 2s ease-in-out',
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                          background: 'linear-gradient(60deg, rgba(26,35,126,0.3) 0%, rgba(83,75,174,0.25) 100%)',
                          position: 'relative',
                          boxShadow: '0 20px 60px rgba(26,35,126,0.15)',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: '20%',
                            left: '20%',
                            width: '60%',
                            height: '60%',
                            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                            background: 'rgba(83,75,174,0.12)',
                            filter: 'blur(20px)',
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: '15%',
                            left: '30%',
                            width: '40%',
                            height: '40%',
                            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                            background: 'rgba(26,35,126,0.15)',
                            filter: 'blur(15px)',
                          },
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '25%',
                          left: '35%',
                          width: '30%',
                          height: '30%',
                          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                          background: 'rgba(255,255,255,0.1)',
                          filter: 'blur(8px)',
                        }}
                      />
                    </Box>
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
                bgcolor: index === currentImage ? 'primary.main' : (index % 2 === 0 ? 'rgba(26,35,126,0.3)' : 'rgba(83,75,174,0.3)'),
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: index === currentImage ? 'primary.dark' : (index % 2 === 0 ? 'rgba(26,35,126,0.5)' : 'rgba(83,75,174,0.5)'),
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

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Loading featured paintings...
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {featuredPaintings.map((painting) => (
              <Grid item xs={12} sm={6} md={4} key={painting.id}>
                <PaintingCard painting={painting} />
              </Grid>
            ))}
            {Array.from({ length: paintingPlaceholders }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={`placeholder-${index}`}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '2px dashed',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      height: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <AddIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
                  </Box>
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" gutterBottom color="text.secondary">
                      Your Artwork Here
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Share your paintings with our community
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/artist-signup')}
                      sx={{
                        textTransform: 'none',
                      }}
                    >
                      Add Your Listing
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

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
            {Array.from({ length: woodworkingPlaceholders }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={`placeholder-woodworking-${index}`}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '2px dashed',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      height: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <AddIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
                  </Box>
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" gutterBottom color="text.secondary">
                      Your Woodworking Here
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Showcase your handcrafted pieces
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/artist-signup')}
                      sx={{
                        textTransform: 'none',
                      }}
                    >
                      Add Your Listing
                    </Button>
                  </CardContent>
                </Card>
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
                    Simple pricing: $10 activation fee per listing
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
                    Direct connection between artists and buyers
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

