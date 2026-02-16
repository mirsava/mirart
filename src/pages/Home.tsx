import React, { useState, useEffect } from 'react';
import {
  Box,
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
  ArrowForward as ArrowForwardIcon,
  Palette as PaletteIcon,
  Build as BuildIcon,
  CreditCard as CreditCardIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { artworks } from '../data/paintings';
import PaintingCard from '../components/PaintingCard';
import apiService, { Listing, SubscriptionPlan } from '../services/api';
import { getListingImageCount } from '../utils/listingUtils';
import { Painting } from '../types';
import { useAuth } from '../contexts/AuthContext';
import joinCommunityBg from '../assets/images/bg/join_our_community.png';
import { Check as CheckIcon, Star as StarIcon } from '@mui/icons-material';

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
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

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
      imageCount: getListingImageCount(listing),
    };
  };

  useEffect(() => {
    const fetchFeaturedListings = async () => {
      try {
        // Featured listings must show ALL artists - do NOT pass cognitoUsername
        const listingFilters = (category: string) => {
          const f: { status: string; category: string; limit: number; requestingUser?: string } = { status: 'active', category, limit: 3 };
          if (user?.id) f.requestingUser = user.id;
          return f;
        };
        const [paintingsResponse, woodworkingResponse] = await Promise.all([
          apiService.getListings(listingFilters('Painting')),
          apiService.getListings(listingFilters('Woodworking')),
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
    
    const fetchPlans = async () => {
      try {
        const plans = await apiService.getSubscriptionPlans();
        if (plans && Array.isArray(plans) && plans.length > 0) {
          const formattedPlans = plans
            .map(plan => ({
              ...plan,
              price_monthly: typeof plan.price_monthly === 'number' ? plan.price_monthly : parseFloat(String(plan.price_monthly)) || 0,
              price_yearly: typeof plan.price_yearly === 'number' ? plan.price_yearly : parseFloat(String(plan.price_yearly)) || 0,
              max_listings: typeof plan.max_listings === 'number' ? plan.max_listings : parseInt(String(plan.max_listings)) || 0,
              display_order: typeof plan.display_order === 'number' ? plan.display_order : parseInt(String(plan.display_order)) || 0,
            }))
            .sort((a, b) => a.display_order - b.display_order)
            .slice(0, 3);
          setSubscriptionPlans(formattedPlans);
        }
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    
    fetchPlans();
  }, [user?.id]);


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
            bgcolor: 'primary.main',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url("https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=800&fit=crop&q=80")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.12,
              filter: 'blur(2px) grayscale(30%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cstyle%3E.polygon%7Bfill:none;stroke:rgba(255,255,255,0.08);stroke-width:1.5%7D%3C/style%3E%3C/defs%3E%3Cpolygon points='100,10 190,60 190,150 100,190 10,150 10,60' class='polygon'/%3E%3Cpolygon points='100,40 150,70 150,130 100,160 50,130 50,70' class='polygon'/%3E%3C/svg%3E"),
                url("data:image/svg+xml,%3Csvg width='150' height='150' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cstyle%3E.rect%7Bfill:none;stroke:rgba(255,112,67,0.12);stroke-width:2%7D%3C/style%3E%3C/defs%3E%3Crect x='25' y='25' width='100' height='100' transform='rotate(45 75 75)' class='rect'/%3E%3Crect x='50' y='50' width='50' height='50' transform='rotate(45 75 75)' class='rect'/%3E%3C/svg%3E")
              `,
              backgroundSize: '200px 200px, 150px 150px',
              backgroundPosition: '0 0, 100px 100px',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '15%',
              right: '10%',
              width: '200px',
              height: '200px',
              border: `2px solid rgba(255, 255, 255, 0.15)`,
              borderRadius: '20px',
              transform: 'rotate(25deg)',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              right: '15%',
              width: '120px',
              height: '120px',
              border: `2px solid rgba(255, 143, 0, 0.2)`,
              borderRadius: '20px',
              transform: 'rotate(-15deg)',
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '20%',
              left: '8%',
              width: '0',
              height: '0',
              borderLeft: '100px solid transparent',
              borderRight: '100px solid transparent',
              borderBottom: `180px solid ${theme.palette.primary.main}30`,
              borderTop: 'none',
              filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.12))',
              transform: 'rotate(30deg)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '15%',
              left: '12%',
              width: '0',
              height: '0',
              borderLeft: '60px solid transparent',
              borderRight: '60px solid transparent',
              borderBottom: `100px solid ${theme.palette.secondary.main}25`,
              borderTop: 'none',
              filter: 'drop-shadow(0 0 1.5px rgba(255, 143, 0, 0.18))',
              transform: 'rotate(-20deg)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              width: '150px',
              height: '150px',
              border: `2px solid rgba(255, 255, 255, 0.1)`,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '60%',
              right: '5%',
              width: '180px',
              height: '180px',
              border: `2px solid rgba(255, 143, 0, 0.15)`,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '10%',
              right: '20%',
              width: '140px',
              height: '140px',
              border: `2px solid rgba(255, 255, 255, 0.12)`,
              transform: 'rotate(45deg)',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
            }}
          />
        </Box>
        
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={8}>
              <Fade in={true} timeout={1000}>
                <Box>
                  <Box sx={{ mb: 4 }}>
                    <Chip
                      label="Art Marketplace"
                      sx={{ 
                        mb: 2, 
                        bgcolor: 'rgba(255, 143, 0, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 143, 0, 0.4)',
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
                      color: 'white',
                      textShadow: '0 4px 12px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)',
                      position: 'relative',
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
                        bgcolor: 'white',
                        color: 'primary.main',
                        px: 5,
                        py: 2,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
                        border: '2px solid white',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.95)',
                          color: 'primary.dark',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 30px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onClick={() => navigate('/gallery?category=Painting')}
                    >
                      Browse Artwork
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        bgcolor: 'secondary.main',
                        color: 'white',
                        px: 5,
                        py: 2,
                        borderRadius: 1,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '1rem',
                        letterSpacing: '0.5px',
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
        </Box>

      </Box>


      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 8 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PaletteIcon sx={{ color: 'primary.main', fontSize: { xs: 32, md: 40 }, mt: 0.5 }} />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography 
                variant="h4" 
                component="h2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                }}
              >
                Featured Paintings
              </Typography>
              <ArrowForwardIcon sx={{ color: 'primary.main', fontSize: { xs: 20, md: 24 }, opacity: 0.7 }} />
            </Box>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                maxWidth: '800px',
                lineHeight: 1.6,
              }}
            >
              Discover original paintings from talented artists in our community.
            </Typography>
          </Box>
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
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              '&:focus': {
                bgcolor: 'primary.dark',
              },
            }}
            onClick={() => navigate('/gallery?category=Painting')}
          >
            View All Paintings
          </Button>
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <CategoryIcon sx={{ color: 'primary.main', fontSize: { xs: 32, md: 40 }, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography 
                  variant="h4" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                  }}
                >
                  Featured Woodworking
                </Typography>
                <ArrowForwardIcon sx={{ color: 'primary.main', fontSize: { xs: 20, md: 24 }, opacity: 0.7 }} />
              </Box>
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: '800px',
                  lineHeight: 1.6,
                }}
              >
                Handcrafted woodworking pieces from skilled artisans in our marketplace.
              </Typography>
            </Box>
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
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 600,
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
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
              <CreditCardIcon sx={{ color: 'primary.main', fontSize: { xs: 28, md: 36 } }} />
              <Typography 
                variant="h4" 
                component="h2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                }}
              >
                Simple, Transparent Pricing
              </Typography>
              <ArrowForwardIcon sx={{ color: 'primary.main', fontSize: { xs: 20, md: 24 }, opacity: 0.7 }} />
            </Box>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                maxWidth: '800px',
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              Choose a subscription plan that fits your needs. No hidden fees, no per-listing charges.
            </Typography>
          </Box>

          {loadingPlans ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Loading pricing plans...
              </Typography>
            </Box>
          ) : subscriptionPlans.length > 0 ? (
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {subscriptionPlans.map((plan, index) => {
                const isPopular = index === 1;
                const features = plan.features ? plan.features.split('\n').filter(f => f.trim()) : [];
                
                return (
                  <Grid item xs={12} md={4} key={plan.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        border: '1px solid',
                        borderColor: isPopular ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        ...(isPopular && {
                          borderWidth: '2px',
                        }),
                      }}
                    >
                      {isPopular && (
                        <Chip
                          icon={<StarIcon />}
                          label="Most Popular"
                          color="primary"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <Box sx={{ p: 3, pt: isPopular ? 5 : 3 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                          {plan.name}
                        </Typography>
                        <Box sx={{ my: 2 }}>
                          <Typography variant="h4" fontWeight={700} color="primary.main">
                            ${plan.price_monthly.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            per month
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Up to {plan.max_listings} active listings
                        </Typography>
                        {features.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            {features.slice(0, 3).map((feature, idx) => (
                              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                                <CheckIcon sx={{ color: 'success.main', mr: 1, mt: 0.5, fontSize: 18 }} />
                                <Typography variant="body2">{feature.trim()}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                        <Button
                          variant={isPopular ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => navigate('/subscription-plans')}
                          sx={{ mt: 'auto' }}
                        >
                          View Plan
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ) : null}

          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/subscription-plans')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              View All Plans
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
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
                    Simple pricing: Choose a subscription plan that fits your needs
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
                  borderRadius: 1,
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;

