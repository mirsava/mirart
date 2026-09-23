import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  useTheme,
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
import { Artwork, Painting } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBillingStatus } from '../hooks/useBillingStatus';
import { Check as CheckIcon, Star as StarIcon } from '@mui/icons-material';
import SEO from '../components/SEO';
import { brandNavy } from '../theme';
import { useFaqItems } from '../hooks/useFaqItems';

const Home: React.FC = () => {
  const faqItems = useFaqItems();
  const navigate = useNavigate();
  const { user } = useAuth();
  const billing = useBillingStatus();
  const freeLaunch = billing ? !billing.billing_enabled : false;
  const theme = useTheme();
  const [featuredPaintings, setFeaturedPaintings] = useState<Painting[]>([]);
  const [featuredWoodworking, setFeaturedWoodworking] = useState<Painting[]>([]);
  const [spotlight, setSpotlight] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [paintingPlaceholders, setPaintingPlaceholders] = useState(0);
  const [woodworkingPlaceholders, setWoodworkingPlaceholders] = useState(0);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const isDarkMode = theme.palette.mode === 'dark';
  const heroFrames = [
    {
      gridRow: '1 / span 2',
      gridColumn: '1',
      art: 'radial-gradient(circle at 66% 30%, #e6a888 0 15%, transparent 16%), linear-gradient(180deg, #1f2a44 0 64%, #b5573a 64% 100%)',
    },
    {
      gridRow: '1',
      gridColumn: '2',
      art: 'linear-gradient(90deg, #eadfce 0 52%, #b5573a 52% 76%, #1f2a44 76% 100%)',
    },
    {
      gridRow: '2',
      gridColumn: '2',
      art: 'radial-gradient(ellipse at 50% 100%, #d9825f 0 46%, transparent 47%), linear-gradient(180deg, #efe6d8 0 100%)',
    },
  ];

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
      artistUsername: listing.auth_user_id,
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
      shipping_preference: listing.shipping_preference,
      shipping_carrier: listing.shipping_carrier,
      fixed_shipping_fee: listing.fixed_shipping_fee,
      avgRating: listing.avg_rating ? parseFloat(Number(listing.avg_rating).toFixed(1)) : null,
      reviewCount: listing.review_count || 0,
      isFeatured: listing.is_featured === true,
    };
  };

  useEffect(() => {
    const fetchFeaturedListings = async () => {
      try {
        // Featured listings must show ALL artists - do NOT pass authUserId
        const listingFilters = (category: string) => {
          // Paid featured listings go in the spotlight above, so the category rows leave them out.
          const f: { status: string; category: string; limit: number; featured: 'exclude'; requestingUser?: string } = { status: 'active', category, limit: 3, featured: 'exclude' };
          if (user?.id) f.requestingUser = user.id;
          return f;
        };
        const [paintingsResponse, woodworkingResponse, spotlightResponse] = await Promise.all([
          apiService.getListings(listingFilters('Painting')),
          apiService.getListings(listingFilters('Woodworking')),
          apiService.getListings({ status: 'active', featured: 'only', limit: 6 }).catch(() => ({ listings: [] as Listing[] })),
        ]);
        setSpotlight(spotlightResponse.listings.map((listing) => ({
          ...convertListingToPainting(listing),
          category: listing.category === 'Woodworking' || listing.category === 'Prints' ? listing.category : 'Painting',
        })));
        
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
        mainEntity: faqItems.slice(0, 3).map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  const heroPieces = [...spotlight, ...featuredPaintings, ...featuredWoodworking].filter((piece) => piece.image).slice(0, 3);

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
          overflow: 'hidden',
          bgcolor: 'background.default',
          backgroundImage: `radial-gradient(900px 520px at 88% 8%, ${alpha(theme.palette.primary.main, isDarkMode ? 0.16 : 0.1)}, transparent 62%), radial-gradient(700px 420px at 0% 100%, ${alpha(theme.palette.primary.main, isDarkMode ? 0.08 : 0.05)}, transparent 65%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 5, md: 9 } }}>
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Fade in timeout={900}>
                <Box sx={{ maxWidth: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ width: 36, height: 2, bgcolor: 'primary.main' }} />
                    <Typography
                      component="p"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Curated art marketplace
                    </Typography>
                  </Box>
                  <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                      fontSize: { xs: '2.75rem', sm: '3.4rem', md: '4.4rem' },
                      lineHeight: 1.04,
                      letterSpacing: '-0.02em',
                      mb: 3,
                    }}
                  >
                    Collect art
                    <br />
                    <Box component="span" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                      with character
                    </Box>
                  </Typography>
                  <Typography
                    variant="body1"
                    component="p"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '1rem', md: '1.125rem' }, lineHeight: 1.75, maxWidth: 520, mb: 4.5 }}
                  >
                    Original paintings and handcrafted pieces from independent artists. Shop
                    thoughtfully, connect directly with the maker, and bring home work that feels personal.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 5 }}>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate('/gallery?category=Painting')}
                      sx={{ px: 4, py: 1.6, fontWeight: 600, fontSize: '1rem', borderRadius: 1.5, boxShadow: 'none', '&:hover': { boxShadow: `0 10px 24px -10px ${alpha(theme.palette.primary.main, 0.7)}` } }}
                    >
                      Browse artwork
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => navigate('/signup')}
                      sx={{
                        px: 4,
                        py: 1.6,
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderRadius: 1.5,
                        color: isDarkMode ? 'text.primary' : brandNavy,
                        borderColor: isDarkMode ? 'divider' : alpha(brandNavy, 0.4),
                        '&:hover': { borderColor: isDarkMode ? 'text.primary' : brandNavy, bgcolor: alpha(isDarkMode ? '#f3efe9' : brandNavy, 0.06) },
                      }}
                    >
                      Sell your art
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1 }}>
                    {['Original works', 'Independent artists', 'Direct from the maker'].map((label) => (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Fade>
            </Grid>

            <Grid item xs={12} md={6}>
              <Fade in timeout={1300}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: { xs: 1.5, md: 2.5 },
                    height: { xs: 300, sm: 400, md: 500 },
                  }}
                >
                  {heroFrames.map((frame, index) => {
                    const piece = heroPieces[index];
                    return (
                      <Box
                        key={index}
                        onClick={piece ? () => navigate(`/painting/${piece.id}`) : undefined}
                        sx={{
                          gridRow: frame.gridRow,
                          gridColumn: frame.gridColumn,
                          p: { xs: 0.75, md: 1.25 },
                          bgcolor: isDarkMode ? '#2a2622' : '#ffffff',
                          border: '1px solid',
                          borderColor: 'divider',
                          boxShadow: isDarkMode ? '0 24px 40px -22px rgba(0,0,0,0.7)' : '0 24px 40px -22px rgba(31,42,68,0.35)',
                          cursor: piece ? 'pointer' : 'default',
                          transition: 'transform 0.3s ease',
                          '&:hover': piece ? { transform: 'translateY(-4px)' } : undefined,
                          minHeight: 0,
                        }}
                      >
                        {piece ? (
                          <Box
                            component="img"
                            src={getImageUrl(piece.image)}
                            alt={piece.title}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Box sx={{ width: '100%', height: '100%', background: frame.art }} />
                        )}
                      </Box>
                    );
                  })}
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

      {spotlight.length > 0 && (
        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pt: 8 }}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <StarIcon sx={{ color: 'warning.main', fontSize: { xs: 32, md: 40 }, mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{ fontWeight: 600, color: 'text.primary', fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }, mb: 1 }}
              >
                Artist Spotlight
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '800px', lineHeight: 1.6 }}>
                Featured pieces from artists across every category.
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={4}>
            {spotlight.map((piece) => (
              <Grid item xs={12} sm={6} md={4} key={piece.id}>
                <PaintingCard painting={piece} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

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
                      onClick={() => navigate('/signup')}
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
                      onClick={() => navigate('/signup')}
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
              {!freeLaunch && <CreditCardIcon sx={{ color: 'primary.main', fontSize: { xs: 28, md: 36 } }} />}
              <Typography 
                variant="h4" 
                component="h2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                }}
              >
                {freeLaunch ? 'Free to list' : 'Simple, Transparent Pricing'}
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
              {freeLaunch && billing
                ? `List up to ${billing.free_listing_limit} artworks at no cost, with no subscription and no card needed.`
                : 'Choose a subscription plan that fits your needs. No hidden fees, no per-listing charges.'}
            </Typography>
          </Box>

          {freeLaunch && billing ? (
            <Paper
              elevation={0}
              sx={{ maxWidth: 900, mx: 'auto', mb: 6, p: { xs: 3, md: 4 }, border: '1px solid', borderColor: 'primary.main', borderRadius: 1 }}
            >
              <Grid container spacing={2.5}>
                {[
                  `List up to ${billing.free_listing_limit} artworks`,
                  'No subscription, no card needed',
                  'Buyers contact you directly',
                  'Full sales analytics included',
                ].map((benefit) => (
                  <Grid item xs={12} sm={6} key={benefit}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CheckIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {benefit}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          ) : loadingPlans ? (
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
            {freeLaunch ? (
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate(user ? '/dashboard' : '/signup')}
                sx={{ textTransform: 'none', fontWeight: 600, px: 4 }}
              >
                Start listing for free
              </Button>
            ) : (
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
            )}
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
                    {freeLaunch ? 'No listing fees, no subscription needed' : 'Simple pricing: Choose a subscription plan that fits your needs'}
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
              <Box
                aria-hidden
                sx={{
                  position: 'relative',
                  height: { xs: 320, md: 400 },
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: brandNavy,
                  backgroundImage: 'radial-gradient(520px 320px at 85% 10%, rgba(217,130,95,0.28), transparent 65%), radial-gradient(420px 300px at 0% 100%, rgba(234,223,206,0.10), transparent 70%)',
                }}
              >
                <Box sx={{ position: 'absolute', top: { xs: -40, md: -50 }, right: { xs: -30, md: -40 }, width: { xs: 170, md: 230 }, height: { xs: 170, md: 230 }, borderRadius: '50%', bgcolor: '#e6a888' }} />
                <Box sx={{ position: 'absolute', left: { xs: 24, md: 40 }, bottom: 0, width: { xs: 150, md: 200 }, height: { xs: 190, md: 250 }, borderRadius: '999px 999px 0 0', bgcolor: '#b5573a' }} />
                <Box sx={{ position: 'absolute', left: { xs: 150, md: 230 }, bottom: { xs: 70, md: 90 }, width: { xs: 64, md: 84 }, height: { xs: 64, md: 84 }, borderRadius: '50%', bgcolor: '#eadfce' }} />
                <Box sx={{ position: 'absolute', right: { xs: 20, md: 36 }, bottom: { xs: 22, md: 32 }, textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                    {[
                      'linear-gradient(135deg, #e6a888, #b5573a)',
                      'linear-gradient(135deg, #eadfce, #c9b89e)',
                      'linear-gradient(135deg, #d9825f, #94432b)',
                      'linear-gradient(135deg, #8896b8, #4a5b85)',
                      'linear-gradient(135deg, #f3efe9, #eadfce)',
                    ].map((background, index) => (
                      <Box
                        key={index}
                        sx={{
                          width: { xs: 44, md: 56 },
                          height: { xs: 44, md: 56 },
                          borderRadius: '50%',
                          background,
                          border: `3px solid ${brandNavy}`,
                          ml: index === 0 ? 0 : -1.5,
                        }}
                      />
                    ))}
                  </Box>
                  <Typography
                    component="p"
                    sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', color: '#f3efe9', fontSize: { xs: '1.05rem', md: '1.25rem' } }}
                  >
                    Artists, makers &amp; collectors
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;

