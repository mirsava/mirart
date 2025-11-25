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
import { useAuth } from '../contexts/AuthContext';
import joinCommunityBg from '../assets/images/bg/join_our_community.png';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [featuredPaintings, setFeaturedPaintings] = useState<Painting[]>([]);
  const [featuredWoodworking, setFeaturedWoodworking] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [paintingPlaceholders, setPaintingPlaceholders] = useState(0);
  const [woodworkingPlaceholders, setWoodworkingPlaceholders] = useState(0);

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const convertListingToPainting = (listing: Listing, category: 'Painting' | 'Woodworking' = 'Painting'): Painting & { artistEmail?: string } => {
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
      likeCount: listing.like_count || 0,
      isLiked: listing.is_liked || false,
      artistEmail: (listing as any).artist_email,
    };
  };

  const heroImage = 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&h=1080&fit=crop&q=80';


  useEffect(() => {
    const fetchFeaturedListings = async () => {
      try {
        const [paintingsResponse, woodworkingResponse] = await Promise.all([
          apiService.getListings({ status: 'active', category: 'Painting', limit: 3, cognitoUsername: user?.id }),
          apiService.getListings({ status: 'active', category: 'Woodworking', limit: 3, cognitoUsername: user?.id }),
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
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${heroImage})`,
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
              background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.5) 100%)',
            },
          }}
        />
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={8}>
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
                      onClick={() => navigate('/gallery?category=Painting')}
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
            
          </Grid>
        </Container>

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
                <PaintingCard 
                  painting={painting} 
                  artistEmail={(painting as any).artistEmail}
                />
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
            onClick={() => navigate('/gallery?category=Painting')}
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
              onClick={() => navigate('/gallery?category=Woodworking')}
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
                  backgroundImage: `url(${joinCommunityBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 2,
                  boxShadow: 3,
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

