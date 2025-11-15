import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Chip,
  Paper,
  Divider,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { artworks } from '../data/paintings';
import { useCart } from '../contexts/CartContext';
import apiService, { Listing } from '../services/api';
import { Painting } from '../types';

const PaintingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [painting, setPainting] = useState<(Painting & { shipping_info?: string; returns_info?: string }) | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const convertListingToPainting = (listing: Listing): Painting & { shipping_info?: string; returns_info?: string } => {
    return {
      id: listing.id,
      title: listing.title,
      artist: listing.artist_name || 'Unknown Artist',
      price: listing.price,
      image: getImageUrl(listing.primary_image_url) || '',
      description: listing.description || '',
      category: listing.category as 'Painting' | 'Woodworking',
      subcategory: listing.subcategory || '',
      dimensions: listing.dimensions || '',
      medium: listing.medium || '',
      year: listing.year || new Date().getFullYear(),
      inStock: listing.in_stock,
      shipping_info: listing.shipping_info,
      returns_info: listing.returns_info,
    };
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (allImages.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [allImages.length]);

  useEffect(() => {
    const fetchPainting = async () => {
      if (!id) {
        setError('Invalid painting ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try to fetch from database first
        const listingId = parseInt(id);
        if (!isNaN(listingId)) {
          try {
            const listing = await apiService.getListing(listingId);
            const convertedPainting = convertListingToPainting(listing);
            setPainting(convertedPainting);
            
            const images = [];
            if (listing.primary_image_url) {
              images.push(getImageUrl(listing.primary_image_url));
            }
            if (listing.image_urls && listing.image_urls.length > 0) {
              listing.image_urls.forEach(url => {
                images.push(getImageUrl(url));
              });
            }
            setAllImages(images.length > 0 ? images : [convertedPainting.image]);
            setCurrentImageIndex(0);
            setLoading(false);
            return;
          } catch (apiError) {
            // If API fails, fall back to mock data
            console.log('API fetch failed, trying mock data:', apiError);
          }
        }

        // Fallback to mock data
        const mockPainting = artworks.find(p => p.id === parseInt(id));
        if (mockPainting) {
          setPainting(mockPainting);
          setAllImages([mockPainting.image]);
          setCurrentImageIndex(0);
        } else {
          setError('Painting not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load painting');
      } finally {
        setLoading(false);
      }
    };

    fetchPainting();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !painting) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <Typography variant="h4" gutterBottom>
          Painting Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          The painting you're looking for doesn't exist or has been removed.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/gallery')}>
          Back to Gallery
        </Button>
      </Container>
    );
  }

  const handleAddToCart = (): void => {
    addToCart(painting);
  };

  const handleShare = (): void => {
    if (navigator.share) {
      navigator.share({
        title: painting.title,
        text: painting.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handlePreviousImage = (): void => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = (): void => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/')}
            sx={{ textDecoration: 'none' }}
          >
            Home
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/gallery')}
            sx={{ textDecoration: 'none' }}
          >
            Gallery
          </Link>
          <Typography variant="body2" color="text.primary">
            {painting.title}
          </Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative' }}>
              <Paper
                sx={{
                  overflow: 'hidden',
                  borderRadius: 2,
                  boxShadow: 3,
                  position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={allImages[currentImageIndex] || painting.image}
                  alt={`${painting.title} - Image ${currentImageIndex + 1}`}
                  sx={{
                    width: '100%',
                    height: { xs: 400, md: 600 },
                    objectFit: 'contain',
                    display: 'block',
                    bgcolor: 'background.paper',
                  }}
                />
                
                {allImages.length > 1 && (
                  <>
                    <IconButton
                      onClick={handlePreviousImage}
                      sx={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                      }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                    <IconButton
                      onClick={handleNextImage}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                      }}
                    >
                      <ChevronRightIcon />
                    </IconButton>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 0.5,
                      }}
                    >
                      {allImages.map((_, index) => (
                        <Box
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: index === currentImageIndex ? 'primary.main' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: index === currentImageIndex ? 'primary.dark' : 'rgba(255,255,255,0.8)',
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Paper>
              
              {allImages.length > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    mt: 2,
                    overflowX: 'auto',
                    pb: 1,
                    '&::-webkit-scrollbar': {
                      height: 6,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: 'divider',
                      borderRadius: 3,
                    },
                  }}
                >
                  {allImages.map((image, index) => (
                    <Box
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      sx={{
                        minWidth: 80,
                        width: 80,
                        height: 80,
                        borderRadius: 1,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: 2,
                        borderColor: index === currentImageIndex ? 'primary.main' : 'transparent',
                        opacity: index === currentImageIndex ? 1 : 0.7,
                        transition: 'all 0.2s',
                        '&:hover': {
                          opacity: 1,
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
              
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'flex',
                  gap: 1,
                  zIndex: 1,
                }}
              >
                <IconButton
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  }}
                  onClick={handleShare}
                >
                  <ShareIcon />
                </IconButton>
                <IconButton
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  }}
                >
                  <FavoriteBorderIcon />
                </IconButton>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip label={painting.category} color="primary" size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {painting.year}
                  </Typography>
                </Box>

                <Typography variant="h4" component="h1" gutterBottom>
                  {painting.title}
                </Typography>

                <Typography variant="h6" color="text.secondary" gutterBottom>
                  by {painting.artist}
                </Typography>

                <Typography variant="h4" color="primary" sx={{ mb: 3 }}>
                  ${painting.price}
                </Typography>

                <Typography variant="body1" paragraph>
                  {painting.description}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Dimensions
                      </Typography>
                      <Typography variant="body1">
                        {painting.dimensions}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Medium
                      </Typography>
                      <Typography variant="body1">
                        {painting.medium}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Category
                      </Typography>
                      <Typography variant="body1">
                        {painting.category}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Year
                      </Typography>
                      <Typography variant="body1">
                        {painting.year}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {(painting.shipping_info || painting.returns_info) && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Shipping & Returns
                    </Typography>
                    {painting.shipping_info && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Shipping
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                          {painting.shipping_info}
                        </Typography>
                      </Box>
                    )}
                    {painting.returns_info && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Returns & Refunds
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                          {painting.returns_info}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/gallery')}
                  sx={{ flexGrow: { xs: 1, sm: 0 } }}
                >
                  Back to Gallery
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleAddToCart}
                  disabled={!painting.inStock}
                  sx={{ flexGrow: { xs: 1, sm: 0 } }}
                >
                  Add to Cart
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default PaintingDetail;
