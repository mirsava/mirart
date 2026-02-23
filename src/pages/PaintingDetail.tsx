import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  Paper,
  Divider,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  Alert,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Favorite as FavoriteIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Email as EmailIcon,
  Chat as ChatIcon,
  Delete as DeleteIcon,
  InfoOutlined as InfoIcon,
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  StarHalf as StarHalfIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { artworks } from '../data/paintings';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useSnackbar } from 'notistack';
import apiService, { Listing, Review } from '../services/api';
import { Rating } from '@mui/material';
import ContactSellerDialog from '../components/ContactSellerDialog';
import { UserRole } from '../types/userRoles';
import { useFavorites } from '../contexts/FavoritesContext';
import PageHeader from '../components/PageHeader';
import { Painting } from '../types';
import SEO from '../components/SEO';

const PaintingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openChat, chatEnabled } = useChat();
  const { enqueueSnackbar } = useSnackbar();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [painting, setPainting] = useState<(Painting & { shipping_info?: string; returns_info?: string; special_instructions?: string; likeCount?: number; isLiked?: boolean; userId?: number; allow_comments?: boolean }) | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultSpecialInstructions, setDefaultSpecialInstructions] = useState<string>('');
  const isLiked = painting ? isFavorite(painting.id) : false;
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null);
  const [newReviewRating, setNewReviewRating] = useState<number | null>(0);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [editingReview, setEditingReview] = useState(false);

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const convertListingToPainting = (listing: Listing): Painting & { shipping_info?: string; returns_info?: string; special_instructions?: string; likeCount?: number; isLiked?: boolean; userId?: number; allow_comments?: boolean } => {
    return {
      id: listing.id,
      title: listing.title,
      artist: listing.artist_name || 'Unknown Artist',
      artistUsername: listing.cognito_username,
      artistSignatureUrl: listing.signature_url,
      price: listing.price,
      image: getImageUrl(listing.primary_image_url) || '',
      description: listing.description || '',
      category: listing.category as 'Painting' | 'Woodworking' | 'Prints',
      userId: listing.user_id,
      subcategory: listing.subcategory || '',
      dimensions: listing.dimensions || '',
      medium: listing.medium || '',
      year: listing.year || new Date().getFullYear(),
      inStock: listing.in_stock,
      quantityAvailable: listing.quantity_available ?? 1,
      shipping_info: listing.shipping_info,
      returns_info: listing.returns_info,
      special_instructions: listing.special_instructions,
      likeCount: listing.like_count || 0,
      isLiked: listing.is_liked || false,
      allow_comments: listing.allow_comments !== false && listing.allow_comments !== 0,
    };
  };

  const fetchReviews = async (listingId: number) => {
    setLoadingReviews(true);
    try {
      const response = await apiService.getListingReviews(listingId);
      setReviews(response.reviews || []);
      setAverageRating(response.averageRating || 0);
      setReviewCount(response.reviewCount || 0);
      if (user?.id) {
        setUserHasReviewed(response.reviews.some(r => r.cognito_username === user.id));
      }
    } catch {
    } finally {
      setLoadingReviews(false);
    }
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
            const url = user?.id 
              ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/listings/${listingId}?cognitoUsername=${user.id}`
              : `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/listings/${listingId}`;
            const response = await fetch(url);
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
              throw new Error(errorData.error || `Failed to fetch listing: ${response.status}`);
            }
            const listing: Listing = await response.json();
            
            if (!listing || !listing.id) {
              throw new Error('Invalid listing data received');
            }
            
            const convertedPainting = convertListingToPainting(listing);
            
            // Always fetch artist's default special instructions to combine with listing instructions
            try {
              const artistUsername = convertedPainting.artistUsername;
              if (artistUsername) {
                const settingsUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/users/${artistUsername}/settings`;
                const settingsResponse = await fetch(settingsUrl);
                if (settingsResponse.ok) {
                  const settingsData = await settingsResponse.json();
                  if (settingsData.default_special_instructions && settingsData.default_special_instructions.trim()) {
                    setDefaultSpecialInstructions(settingsData.default_special_instructions);
                  }
                }
              }
            } catch (err) {
              // Silently fail, use empty default
            }
            
            setPainting(convertedPainting);
            setLikeCount(convertedPainting.likeCount || 0);
            
            const images: string[] = [];
            const seenUrls = new Set<string>();
            
            const addImage = (url: string | null | undefined) => {
              if (!url) return;
              const fullUrl = getImageUrl(url);
              if (fullUrl && !seenUrls.has(fullUrl)) {
                seenUrls.add(fullUrl);
                images.push(fullUrl);
              }
            };
            
            addImage(listing.primary_image_url);
            
            if (listing.image_urls) {
              let imageUrlsArray: string[] = [];
              
              if (Array.isArray(listing.image_urls)) {
                listing.image_urls.forEach((item: any) => {
                  if (typeof item === 'string') {
                    if (item.includes(',')) {
                      const split = item.split(',').map(url => url.trim()).filter(url => url);
                      imageUrlsArray.push(...split);
                    } else {
                      imageUrlsArray.push(item);
                    }
                  }
                });
              } else if (typeof listing.image_urls === 'string') {
                const imageUrlsStr = listing.image_urls.trim();
                
                if (imageUrlsStr.startsWith('[') || imageUrlsStr.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(imageUrlsStr);
                    if (Array.isArray(parsed)) {
                      if (parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].includes(',')) {
                        imageUrlsArray = parsed[0].split(',').map(url => url.trim()).filter(url => url);
                      } else {
                        imageUrlsArray = parsed.filter((url: any) => url && typeof url === 'string');
                      }
                    } else if (typeof parsed === 'string' && parsed.includes(',')) {
                      imageUrlsArray = parsed.split(',').map(url => url.trim()).filter(url => url);
                    }
                  } catch (e) {
                    if (imageUrlsStr.includes(',')) {
                      imageUrlsArray = imageUrlsStr.split(',').map(url => url.trim()).filter(url => url);
                    } else {
                      imageUrlsArray = [imageUrlsStr];
                    }
                  }
                } else if (imageUrlsStr.includes(',')) {
                  imageUrlsArray = imageUrlsStr.split(',').map(url => url.trim()).filter(url => url);
                } else {
                  imageUrlsArray = [imageUrlsStr];
                }
              }
              
              imageUrlsArray.forEach(url => {
                if (url && typeof url === 'string' && url.trim()) {
                  addImage(url.trim());
                }
              });
            }
            setAllImages(images.length > 0 ? images : [convertedPainting.image || '']);
            setCurrentImageIndex(0);
            setLoading(false);
            
            if (listing.allow_comments !== false && listing.allow_comments !== 0) {
              fetchReviews(listingId);
            }
            return;
          } catch (apiError: any) {
            const errorMessage = apiError?.message || 'Failed to load listing. Please try again.';
            setError(errorMessage);
            setLoading(false);
            return;
          }
        }

        setError('Invalid listing ID');
        setLoading(false);
      } catch (err: any) {
        console.error('Error in fetchPainting:', err);
        setError(err.message || 'Failed to load listing');
        setLoading(false);
      }
    };

    fetchPainting();
  }, [id, user?.id]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !painting) {
    return (
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 8, textAlign: 'center' }}>
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
      </Box>
    );
  }

  const handleContactSeller = (): void => {
    setContactDialogOpen(true);
  };

  const handleStartChat = async (): Promise<void> => {
    if (!isAuthenticated || !user?.id) {
      navigate('/artist-signin');
      return;
    }

    if (!painting?.userId) {
      enqueueSnackbar('Unable to start chat. User information not available.', { variant: 'error' });
      return;
    }

    try {
      const message = `Hi! I'm interested in "${painting.title}".`;
      const response = await apiService.createChatConversation(
        user.id,
        painting.userId,
        painting.id,
        message
      );
      
      openChat(response.conversationId);
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to start chat', { variant: 'error' });
    }
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

  const handleLike = async (): Promise<void> => {
    if (!isAuthenticated || !user?.id) {
      navigate('/artist-signin');
      return;
    }

    if (liking || !painting) return;

    setLiking(true);
    const previousCount = likeCount;

    try {
      if (isLiked) {
        const result = await removeFavorite(painting.id);
        if (result) setLikeCount(result.likeCount);
      } else {
        const result = await addFavorite(painting.id);
        if (result) setLikeCount(result.likeCount);
      }
    } catch {
      setLikeCount(previousCount);
      enqueueSnackbar('Failed to update favorite', { variant: 'error' });
    } finally {
      setLiking(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !user?.id) {
      enqueueSnackbar('Please sign in to leave a review', { variant: 'info' });
      return;
    }
    if (!newReviewRating || !painting) return;

    setSubmittingReview(true);
    try {
      const response = await apiService.createReview(painting.id, user.id, newReviewRating, newReviewComment.trim() || undefined);
      if (response.updated) {
        setReviews(prev => prev.map(r => r.id === response.review.id ? response.review : r));
        enqueueSnackbar('Review updated', { variant: 'success' });
      } else {
        setReviews(prev => [response.review, ...prev]);
        enqueueSnackbar('Review posted', { variant: 'success' });
      }
      setNewReviewRating(0);
      setNewReviewComment('');
      setUserHasReviewed(true);
      setEditingReview(false);
      fetchReviews(painting.id);
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to post review', { variant: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!user?.id || !painting) return;
    try {
      await apiService.deleteReview(reviewId, user.id);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      setUserHasReviewed(false);
      enqueueSnackbar('Review deleted', { variant: 'success' });
      fetchReviews(painting.id);
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to delete review', { variant: 'error' });
    }
  };

  const renderStars = (value: number, size: 'small' | 'medium' = 'small') => {
    const stars = [];
    const fontSize = size === 'small' ? '1rem' : '1.25rem';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(value)) {
        stars.push(<StarIcon key={i} sx={{ color: '#faaf00', fontSize }} />);
      } else if (i - 0.5 <= value) {
        stars.push(<StarHalfIcon key={i} sx={{ color: '#faaf00', fontSize }} />);
      } else {
        stars.push(<StarBorderIcon key={i} sx={{ color: '#faaf00', fontSize }} />);
      }
    }
    return stars;
  };

  const handlePreviousImage = (): void => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = (): void => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const imageUrl = painting.image?.startsWith('http') ? painting.image : (typeof window !== 'undefined' ? `${window.location.origin}${painting.image}` : painting.image);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: painting.title,
    description: painting.description?.slice(0, 200) || painting.title,
    image: imageUrl,
    offers: {
      '@type': 'Offer',
      price: painting.price,
      priceCurrency: 'USD',
      availability: painting.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <Box sx={{ pb: 4 }}>
      <SEO
        title={painting.title}
        description={painting.description?.slice(0, 160) || `${painting.title} by ${painting.artist} - Original art for sale`}
        image={imageUrl}
        url={`/painting/${painting.id}`}
        type="product"
        structuredData={structuredData}
      />
      <PageHeader
        title={painting.title}
        subtitle={`By ${painting.artist}`}
        disablePattern={true}
      />
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <MuiLink
            component="button"
            variant="body2"
            onClick={() => navigate('/')}
            sx={{ textDecoration: 'none' }}
          >
            Home
          </MuiLink>
          <MuiLink
            component="button"
            variant="body2"
            onClick={() => navigate('/gallery')}
            sx={{ textDecoration: 'none' }}
          >
            Gallery
          </MuiLink>
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
                  borderRadius: 1,
                  position: 'relative',
                }}
              >
                {!painting.inStock && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        transform: 'rotate(-25deg)',
                        fontSize: { xs: '4.5rem', md: '6rem' },
                        fontWeight: 700,
                        color: 'rgba(180, 50, 50, 0.25)',
                        letterSpacing: '0.2em',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      SOLD
                    </Typography>
                  </Box>
                )}
                {(allImages[currentImageIndex] || painting.image) ? (
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
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: { xs: 400, md: 600 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.200',
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No Image
                    </Typography>
                  </Box>
                )}
                
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
                      borderRadius: 1,
                    },
                  }}
                >
                  {allImages.map((image, index) => (
                    <Box
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      sx={{
                        minWidth: 60,
                        width: 60,
                        height: 60,
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
                    color: 'grey.800',
                  }}
                  onClick={handleShare}
                >
                  <ShareIcon />
                </IconButton>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={painting.category} color="primary" size="small" />
                  <Typography variant="body2" color="text.secondary">
                    {painting.year}
                  </Typography>
                  {isAuthenticated && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5,
                      ml: 'auto',
                    }}>
                      <IconButton
                        size="small"
                        sx={{
                          color: isLiked ? 'error.main' : 'text.secondary',
                        }}
                        onClick={handleLike}
                        disabled={liking}
                      >
                        {isLiked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                      </IconButton>
                    </Box>
                  )}
                </Box>

                <Typography variant="h4" component="h1" gutterBottom>
                  {painting.title}
                </Typography>

                <Typography variant="h6" color="text.secondary" gutterBottom>
                  by{' '}
                  {painting.artistUsername ? (
                    <MuiLink
                      component="button"
                      variant="h6"
                      onClick={() => navigate(`/artist/${painting.artistUsername}`)}
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: 'primary.main',
                        },
                      }}
                    >
                      {painting.artist}
                    </MuiLink>
                  ) : (
                    painting.artist
                  )}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Typography variant="h4" color="primary">
                    ${painting.price ?? 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {painting.inStock
                      ? `${painting.quantityAvailable ?? 1} available`
                      : '0 available'}
                  </Typography>
                  {!painting.inStock && (
                    <Chip label="Sold" color="default" sx={{ fontWeight: 600 }} />
                  )}
                </Box>

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
                    {painting.subcategory && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Subcategory
                        </Typography>
                        <Typography variant="body1">
                          {painting.subcategory}
                        </Typography>
                      </Box>
                    )}
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

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Shipping & Returns
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
                        Shipping
                      </Typography>
                      {painting.shipping_info && /free\s+shipping/i.test(painting.shipping_info) && (
                        <Chip label="Free shipping" size="small" color="success" />
                      )}
                    </Box>
                    {painting.shipping_info && painting.shipping_info.trim() ? (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                        {painting.shipping_info}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                        No shipping information provided by the artist.
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Returns & Refunds
                    </Typography>
                    {painting.returns_info && painting.returns_info.trim() ? (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                        {painting.returns_info}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                        No returns and refunds policy provided by the artist.
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: 'primary.main',
                        color: 'white',
                      }}
                    >
                      <InfoIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Special Instructions
                    </Typography>
                  </Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3.5,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      position: 'relative',
                    }}
                  >
                    {(() => {
                      const listingInstructions = painting.special_instructions && painting.special_instructions.trim() 
                        ? painting.special_instructions.trim() 
                        : '';
                      const defaultInstructions = defaultSpecialInstructions && defaultSpecialInstructions.trim() 
                        ? defaultSpecialInstructions.trim() 
                        : '';
                      
                      // Combine both instructions
                      let combinedInstructions = '';
                      if (listingInstructions && defaultInstructions) {
                        // Both exist - combine them with a separator
                        combinedInstructions = `${defaultInstructions}\n\n${listingInstructions}`;
                      } else if (listingInstructions) {
                        // Only listing instructions
                        combinedInstructions = listingInstructions;
                      } else if (defaultInstructions) {
                        // Only default instructions
                        combinedInstructions = defaultInstructions;
                      }
                      
                      return combinedInstructions ? (
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            whiteSpace: 'pre-line',
                            lineHeight: 1.8,
                            color: 'text.primary',
                            fontSize: '0.95rem',
                            pl: 1,
                            fontWeight: 400,
                          }}
                        >
                          {combinedInstructions}
                        </Typography>
                      ) : (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontStyle: 'italic',
                            opacity: 0.65,
                            pl: 1,
                            lineHeight: 1.7,
                          }}
                        >
                          No special instructions provided by the artist.
                        </Typography>
                      );
                    })()}
                  </Paper>
                </Box>
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
                {(painting.artistUsername === user?.id || user?.userRole === UserRole.SITE_ADMIN) && (
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/edit-listing/${painting.id}`)}
                    sx={{ flexGrow: { xs: 1, sm: 0 } }}
                  >
                    Edit Listing
                  </Button>
                )}
                {isAuthenticated && (
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<EmailIcon />}
                    onClick={handleContactSeller}
                    sx={{ flexGrow: { xs: 1, sm: 0 } }}
                  >
                    Contact Seller
                  </Button>
                )}
                {isAuthenticated && painting?.userId && chatEnabled && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ChatIcon />}
                    onClick={handleStartChat}
                    sx={{ flexGrow: { xs: 1, sm: 0 } }}
                  >
                    Start Chat
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <ContactSellerDialog
          open={contactDialogOpen}
          onClose={() => setContactDialogOpen(false)}
          listingTitle={painting.title}
          artistName={painting.artist}
          listingId={painting.id}
        />

        <Box id="reviews-section" sx={{ mt: 6 }}>
          <Divider sx={{ mb: 4 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Typography variant="h5" fontWeight={600}>Reviews</Typography>
            {reviewCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {renderStars(averageRating, 'medium')}
                <Typography variant="body1" fontWeight={600} sx={{ ml: 0.5 }}>{averageRating}</Typography>
                <Typography variant="body2" color="text.secondary">({reviewCount})</Typography>
              </Box>
            )}
          </Box>

          {painting.allow_comments === true ? (
            <>
              {isAuthenticated && (!userHasReviewed || editingReview) && painting.userId !== user?.id && (
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {editingReview ? 'Edit Your Review' : 'Write a Review'}
                    </Typography>
                    {editingReview && (
                      <Button size="small" onClick={() => { setEditingReview(false); setNewReviewRating(0); setNewReviewComment(''); }}>
                        Cancel
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Your rating:</Typography>
                    <Rating
                      value={newReviewRating}
                      onChange={(_, val) => setNewReviewRating(val)}
                      size="large"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Share your experience (optional)"
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmitReview}
                      disabled={!newReviewRating || submittingReview}
                      startIcon={<StarIcon />}
                    >
                      {submittingReview ? 'Submitting...' : editingReview ? 'Update Review' : 'Submit Review'}
                    </Button>
                  </Box>
                </Paper>
              )}

              {!isAuthenticated && (
                <Alert severity="info" sx={{ mb: 3 }}>Please sign in to leave a review.</Alert>
              )}

              {loadingReviews ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : reviews.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No reviews yet. Be the first to review!
                </Typography>
              ) : (
                <List disablePadding>
                  {reviews.map((review) => (
                    <ListItem
                      key={review.id}
                      sx={{
                        bgcolor: 'background.paper',
                        mb: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        px: 2,
                        py: 2,
                        alignItems: 'flex-start',
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar src={review.profile_image_url}>
                          {review.user_name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" fontWeight={600}>{review.user_name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>{renderStars(review.rating)}</Box>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(review.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        {review.comment && (
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{review.comment}</Typography>
                        )}
                      </Box>
                      {user?.id === review.cognito_username && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingReview(true);
                            setNewReviewRating(review.rating);
                            setNewReviewComment(review.comment || '');
                            window.scrollTo({ top: document.getElementById('reviews-section')?.offsetTop || 0, behavior: 'smooth' });
                          }}
                          sx={{ ml: 1 }}
                          title="Edit review"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {(user?.id === review.cognito_username || painting.userId === user?.id) && (
                        <IconButton
                          size="small"
                          onClick={() => { setReviewToDelete(review.id); setDeleteDialogOpen(true); }}
                          title="Delete review"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>Reviews are disabled for this listing.</Alert>
          )}
        </Box>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Review</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this review? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => reviewToDelete && handleDeleteReview(reviewToDelete)} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PaintingDetail;
