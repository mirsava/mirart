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
  Divider,
  alpha,
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
import SEO from '../components/SEO';

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
      quantityAvailable: listing.quantity_available ?? 1,
      likeCount: listing.like_count || 0,
      isLiked: listing.is_liked || false,
      artistEmail: (listing as any).artist_email,
      imageCount: getListingImageCount(listing),
      avgRating: listing.avg_rating ? parseFloat(Number(listing.avg_rating).toFixed(1)) : null,
      reviewCount: listing.review_count || 0,
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


  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'ArtZyla',
        description: 'Discover original paintings, woodworking, and handmade art from independent artists.',
        url: siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/gallery?search={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'ArtZyla',
        url: siteUrl,
        description: 'Online art marketplace connecting collectors with independent artists and makers.',
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What can I buy on ArtZyla?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You can buy original paintings, handcrafted woodworking pieces, and other handmade art directly from independent artists.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is ArtZyla a marketplace for independent artists?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. ArtZyla is built for independent artists and makers who want to sell directly to art collectors and design-minded buyers.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I find artwork by style or category?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Use the gallery filters and search to browse by category, medium, price, and keywords so you can quickly discover artwork that matches your style.',
            },
          },
        ],
      },
    ],
  };

  return (
    <Box>
      <SEO
        title="Discover Original Paintings & Handmade Art"
        description="ArtZyla connects talented artists with art lovers. Browse unique paintings, woodworking, prints, and handmade art from independent creators worldwide."
        structuredData={structuredData}
      />
      <Box
        sx={{
          position: 'relative',
          height: { xs: 'calc(72vh - 45px)', md: 'calc(78vh - 45px)' },
          minHeight: { xs: 460, md: 520 },
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          borderRadius: { xs: 3, md: 4 },
          border: '2px solid',
          borderColor: 'rgba(16,12,30,0.9)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: '#4f5f7f',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(138deg, ${theme.palette.primary.dark} 0%, ${alpha(theme.palette.primary.main, 0.92)} 52%, ${alpha(theme.palette.primary.light, 0.86)} 100%)`,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: alpha(theme.palette.primary.dark, 0.22),
              backgroundImage: `
                linear-gradient(33deg, ${alpha(theme.palette.primary.light, 0.5)} 14%, transparent 14.5%, transparent 84%, ${alpha(theme.palette.primary.light, 0.5)} 84.5%, ${alpha(theme.palette.primary.light, 0.5)}),
                linear-gradient(147deg, ${alpha(theme.palette.primary.main, 0.44)} 12%, transparent 12.4%, transparent 88%, ${alpha(theme.palette.primary.main, 0.44)} 88.4%, ${alpha(theme.palette.primary.main, 0.44)}),
                linear-gradient(27deg, ${alpha(theme.palette.primary.dark, 0.56)} 16%, transparent 16.3%, transparent 82%, ${alpha(theme.palette.primary.dark, 0.56)} 82.3%, ${alpha(theme.palette.primary.dark, 0.56)}),
                linear-gradient(153deg, ${alpha(theme.palette.primary.light, 0.34)} 10%, transparent 10.4%, transparent 90%, ${alpha(theme.palette.primary.light, 0.34)} 90.4%, ${alpha(theme.palette.primary.light, 0.34)}),
                linear-gradient(64deg, ${alpha(theme.palette.primary.main, 0.46)} 24%, transparent 24.5%, transparent 76%, ${alpha(theme.palette.primary.main, 0.46)} 76.5%, ${alpha(theme.palette.primary.main, 0.46)}),
                linear-gradient(118deg, ${alpha(theme.palette.primary.dark, 0.5)} 18%, transparent 18.4%, transparent 82%, ${alpha(theme.palette.primary.dark, 0.5)} 82.4%, ${alpha(theme.palette.primary.dark, 0.5)}),
                linear-gradient(92deg, ${alpha(theme.palette.primary.light, 0.3)} 22%, transparent 22.4%, transparent 78%, ${alpha(theme.palette.primary.light, 0.3)} 78.4%, ${alpha(theme.palette.primary.light, 0.3)})
              `,
              backgroundSize: { xs: '138px 228px, 124px 210px, 164px 256px, 112px 186px, 144px 232px, 172px 268px, 130px 214px', md: '188px 304px, 172px 280px, 226px 352px, 158px 250px, 194px 314px, 238px 372px, 182px 292px' },
              backgroundPosition: '0 0, 42px 26px, 84px 132px, 18px 154px, 102px 44px, 136px 186px, 56px 96px',
              backgroundRepeat: 'repeat',
              opacity: 0.74,
              mixBlendMode: 'normal',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: -300, md: -390 },
              left: { xs: '-4%', md: '4%' },
              width: { xs: 500, md: 740 },
              height: { xs: 760, md: 1100 },
              clipPath: 'polygon(48% 0%, 100% 100%, 8% 94%)',
              backgroundImage: `
                linear-gradient(96deg, ${alpha('#ffffff', 0.22)} 0%, transparent 46%),
                conic-gradient(from 212deg at 50% 24%, ${alpha(theme.palette.primary.light, 0.44)}, ${alpha(theme.palette.primary.main, 0.68)}, ${alpha(theme.palette.primary.dark, 0.86)}, ${alpha(theme.palette.primary.light, 0.44)}),
                linear-gradient(182deg, ${alpha(theme.palette.primary.light, 0.52)} 0%, ${alpha(theme.palette.primary.main, 0.7)} 52%, ${alpha(theme.palette.primary.dark, 0.86)} 100%)
              `,
              backgroundBlendMode: 'screen, normal, normal',
              transform: 'rotate(39deg) scaleX(0.93)',
              filter: 'drop-shadow(0 14px 30px rgba(6, 14, 40, 0.44))',
              opacity: 0.78,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: { xs: -330, md: -450 },
              left: { xs: '-10%', md: '6%' },
              width: { xs: 560, md: 820 },
              height: { xs: 860, md: 1240 },
              clipPath: 'polygon(54% 0%, 96% 100%, 2% 90%)',
              backgroundImage: `
                linear-gradient(92deg, ${alpha('#ffffff', 0.2)} 0%, transparent 48%),
                conic-gradient(from 36deg at 50% 22%, ${alpha(theme.palette.primary.light, 0.46)}, ${alpha(theme.palette.primary.main, 0.66)}, ${alpha(theme.palette.primary.dark, 0.88)}, ${alpha(theme.palette.primary.light, 0.46)}),
                linear-gradient(186deg, ${alpha(theme.palette.primary.light, 0.44)} 0%, ${alpha(theme.palette.primary.main, 0.62)} 52%, ${alpha(theme.palette.primary.dark, 0.88)} 100%)
              `,
              backgroundBlendMode: 'screen, normal, normal',
              transform: 'rotate(34deg) scaleX(1.02)',
              filter: 'drop-shadow(0 16px 34px rgba(6, 14, 40, 0.46))',
              opacity: 0.72,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: -420, md: -560 },
              right: { xs: '-16%', md: '-8%' },
              width: { xs: 700, md: 1040 },
              height: { xs: 1040, md: 1500 },
              clipPath: 'polygon(44% 0%, 92% 100%, 0% 96%)',
              backgroundImage: `
                linear-gradient(94deg, ${alpha('#ffffff', 0.18)} 0%, transparent 46%),
                conic-gradient(from 204deg at 50% 24%, ${alpha(theme.palette.primary.light, 0.38)}, ${alpha(theme.palette.primary.main, 0.62)}, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.primary.light, 0.38)}),
                linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.54)} 0%, ${alpha(theme.palette.primary.dark, 0.74)} 54%, ${alpha('#0b1a43', 0.9)} 100%)
              `,
              backgroundBlendMode: 'screen, normal, normal',
              transform: 'rotate(-6deg) scaleX(1.12)',
              filter: 'drop-shadow(0 18px 38px rgba(6, 14, 40, 0.5))',
              opacity: 0.84,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(128deg, ${alpha(theme.palette.primary.light, 0.62)} 0%, ${alpha(theme.palette.primary.main, 0.38)} 36%, transparent 74%),
                linear-gradient(308deg, ${alpha(theme.palette.primary.dark, 0.62)} 0%, ${alpha(theme.palette.primary.main, 0.32)} 44%, transparent 80%),
                radial-gradient(760px 460px at 20% 24%, ${alpha(theme.palette.primary.light, 0.46)}, transparent 70%)
              `,
              backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
              opacity: 0.72,
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                radial-gradient(980px 520px at 100% 0%, ${alpha(theme.palette.primary.light, 0.3)}, transparent 62%),
                radial-gradient(760px 460px at 0% 100%, ${alpha(theme.palette.primary.main, 0.24)}, transparent 68%)
              `,
              backgroundSize: 'auto, auto',
              backgroundRepeat: 'no-repeat, no-repeat',
              opacity: 0.72,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(9,18,46,0.36) 0%, rgba(14,32,78,0.16) 46%, rgba(8,18,42,0.12) 100%)',
              pointerEvents: 'none',
            }}
          />
        </Box>
        
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={12}>
              <Fade in={true} timeout={1000}>
                <Box sx={{ textAlign: 'center', maxWidth: 760, mx: 'auto' }}>
                  <Box sx={{ mb: 3 }}>
                    <Chip
                      label="Curated Art Marketplace"
                      sx={{ 
                        mb: 2.5, 
                        bgcolor: 'rgba(255, 106, 142, 0.2)',
                        color: '#ffeaf1',
                        border: '1px solid rgba(255, 106, 142, 0.5)',
                        backdropFilter: 'blur(12px)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        px: 2,
                        py: 0.35,
                        letterSpacing: '0.4px',
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
                      fontSize: { xs: '2.7rem', md: '4.3rem' },
                      lineHeight: 1.05,
                      letterSpacing: '-0.02em',
                      textShadow: '0 3px 12px rgba(0,0,0,0.35)',
                    }}
                  >
                    Collect
                    <br />
                    <Box component="span" sx={{ 
                      fontWeight: 700,
                      color: '#fff6ea',
                      textShadow: '0 6px 18px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)',
                      position: 'relative',
                    }}>
                      Art With Character
                    </Box>
                  </Typography>
                  <Typography
                    variant={isMobile ? 'body1' : 'h6'}
                    component="p"
                    sx={{ 
                      mb: 3.5,
                      maxWidth: '620px',
                      color: 'rgba(255,255,255,0.95)',
                      fontWeight: 300,
                      lineHeight: 1.65,
                      fontSize: { xs: '1rem', md: '1.18rem' },
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      mx: 'auto',
                    }}
                  >
                    Original paintings and handcrafted pieces from independent artists.
                    Shop thoughtfully, connect directly, and bring home work that feels personal.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        background: 'linear-gradient(135deg, #ffd27a 0%, #ffb347 48%, #ff9548 100%)',
                        color: '#3a2208',
                        px: 5,
                        py: 2,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1rem',
                        letterSpacing: '0.2px',
                        boxShadow: '0 8px 24px rgba(255, 149, 72, 0.45), 0 3px 10px rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 232, 188, 0.8)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #ffd98f 0%, #ffbd5e 48%, #ffa15d 100%)',
                          color: '#2f1b06',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 32px rgba(255, 149, 72, 0.58), 0 5px 14px rgba(0, 0, 0, 0.32)',
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
                        color: '#fff1f7',
                        borderColor: 'rgba(255, 122, 154, 0.65)',
                        px: 5,
                        py: 2,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        letterSpacing: '0.2px',
                        backdropFilter: 'blur(10px)',
                        bgcolor: 'rgba(255, 122, 154, 0.16)',
                        '&:hover': {
                          borderColor: 'rgba(255, 180, 198, 0.9)',
                          bgcolor: 'rgba(255, 122, 154, 0.24)',
                          color: 'white',
                        },
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


      <Box sx={{ bgcolor: 'background.paper', py: { xs: 6, md: 7 } }}>
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
          <Grid container spacing={4} alignItems="stretch">
            <Grid item xs={12} md={7}>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                Buy Original Art Online From Independent Artists
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2 }}>
                ArtZyla is a curated online art marketplace where collectors discover original paintings, handcrafted woodworking, and one-of-a-kind handmade art. Every listing comes from an independent artist or maker, so each piece has a direct story and a personal connection.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                Explore contemporary wall art, statement pieces for home decor, and handmade gifts with character. Whether you are decorating a new space or expanding your personal collection, ArtZyla makes it easy to shop unique art by category, style, and budget.
              </Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  p: { xs: 2.5, md: 3 },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Popular Art Categories
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Original paintings for living rooms and offices
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Handmade woodworking decor and functional pieces
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Unique wall art and collectible artisan work
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Giftable handmade art from verified independent creators
                </Typography>
              </Paper>
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
                        {plan.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {plan.description}
                          </Typography>
                        )}
                        <Box sx={{ my: 2 }}>
                          <Typography variant="h4" fontWeight={700} color="primary.main">
                            ${plan.price_monthly.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            per month
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {plan.max_listings >= 999999 ? 'Unlimited' : `Up to ${plan.max_listings}`} active listings
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

