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
  Comment as CommentIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  InfoOutlined as InfoIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { artworks } from '../data/paintings';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useSnackbar } from 'notistack';
import apiService, { Listing, Comment } from '../services/api';
import ContactSellerDialog from '../components/ContactSellerDialog';
import { UserRole } from '../types/userRoles';
import PageHeader from '../components/PageHeader';
import { Painting } from '../types';
import SEO from '../components/SEO';

const PaintingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openChat } = useChat();
  const { enqueueSnackbar } = useSnackbar();
  const [painting, setPainting] = useState<(Painting & { shipping_info?: string; returns_info?: string; special_instructions?: string; likeCount?: number; isLiked?: boolean; userId?: number; allow_comments?: boolean }) | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultSpecialInstructions, setDefaultSpecialInstructions] = useState<string>('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState<number | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

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

  const organizeComments = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  };

  const fetchComments = async (listingId: number) => {
    setLoadingComments(true);
    try {
      const response = await apiService.getListingComments(listingId);
      const organized = organizeComments(response.comments);
      setComments(organized);
    } catch (error: any) {
    } finally {
      setLoadingComments(false);
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
            setIsLiked(convertedPainting.isLiked || false);
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
              fetchComments(listingId);
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
    const wasLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!wasLiked);
    setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);

    try {
      if (wasLiked) {
        const result = await apiService.unlikeListing(painting.id, user.id);
        setLikeCount(result.likeCount);
      } else {
        const result = await apiService.likeListing(painting.id, user.id);
        setLikeCount(result.likeCount);
      }
    } catch (error) {
      setIsLiked(wasLiked);
      setLikeCount(previousCount);
      enqueueSnackbar('Failed to update like', { variant: 'error' });
    } finally {
      setLiking(false);
    }
  };

  const handleSubmitComment = async (parentCommentId?: number) => {
    if (!isAuthenticated || !user?.id) {
      enqueueSnackbar('Please sign in to comment', { variant: 'info' });
      return;
    }

    const commentText = parentCommentId ? replyText[parentCommentId] : newComment;
    if (!commentText?.trim() || !painting) return;

    if (parentCommentId) {
      setSubmittingReply(parentCommentId);
    } else {
      setSubmittingComment(true);
    }

    try {
      const response = await apiService.createComment(painting.id, user.id, commentText.trim(), parentCommentId);
      
      if (parentCommentId) {
        const updatedComments = comments.map(comment => {
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), response.comment],
            };
          }
          return comment;
        });
        setComments(updatedComments);
        setReplyText({ ...replyText, [parentCommentId]: '' });
        setReplyingTo(null);
        enqueueSnackbar('Reply posted successfully', { variant: 'success' });
      } else {
        setComments([...comments, response.comment]);
        setNewComment('');
        enqueueSnackbar('Comment posted successfully', { variant: 'success' });
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      let errorMessage = 'Failed to post comment';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      if (parentCommentId) {
        setSubmittingReply(null);
      } else {
        setSubmittingComment(false);
      }
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!user?.id) return;

    try {
      await apiService.deleteComment(commentId, user.id);
      setComments(comments.filter(c => c.id !== commentId));
      enqueueSnackbar('Comment deleted', { variant: 'success' });
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to delete comment', { variant: 'error' });
    }
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
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                      </Typography>
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
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<EmailIcon />}
                  onClick={handleContactSeller}
                  sx={{ flexGrow: { xs: 1, sm: 0 } }}
                >
                  Contact Seller
                </Button>
                {isAuthenticated && painting?.userId && (
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

        <Box sx={{ mt: 6 }}>
          <Divider sx={{ mb: 4 }} />
          <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            Comments
          </Typography>

          {painting.allow_comments === true ? (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Please be courteous:</strong> Comments are monitored and inappropriate content will be deleted.
                </Typography>
              </Alert>

              {isAuthenticated && (
                <Paper sx={{ p: 2, mb: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={() => handleSubmitComment()}
                      disabled={!newComment.trim() || submittingComment}
                      startIcon={<CommentIcon />}
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </Box>
                </Paper>
              )}

              {!isAuthenticated && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Please sign in to leave a comment.
                </Alert>
              )}

              {loadingComments ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No comments yet. Be the first to comment!
                </Typography>
              ) : (
                <List>
                  {comments.map((comment) => (
                    <Box key={comment.id}>
                      <ListItem
                        sx={{
                          bgcolor: 'background.paper',
                          mb: 1,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          px: 2,
                          py: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', gap: 2 }}>
                          <ListItemAvatar>
                            <Avatar src={comment.profile_image_url}>
                              {comment.user_name.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {comment.user_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                              {comment.comment}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {isAuthenticated && (
                                <Button
                                  size="small"
                                  startIcon={<ReplyIcon />}
                                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Reply
                                </Button>
                              )}
                              {(user?.id === comment.cognito_username || painting.userId === user?.id) && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setCommentToDelete(comment.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                            {replyingTo === comment.id && isAuthenticated && (
                              <Box sx={{ mt: 2, ml: 4, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={2}
                                  placeholder={`Reply to ${comment.user_name}...`}
                                  value={replyText[comment.id] || ''}
                                  onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                                  sx={{ mb: 1 }}
                                />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleSubmitComment(comment.id)}
                                    disabled={!replyText[comment.id]?.trim() || submittingReply === comment.id}
                                  >
                                    {submittingReply === comment.id ? 'Posting...' : 'Post Reply'}
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText({ ...replyText, [comment.id]: '' });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        {comment.replies && comment.replies.length > 0 && (
                          <Box sx={{ width: '100%', mt: 2, ml: 6, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                            {comment.replies.map((reply) => (
                              <Box key={reply.id} sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                  <Avatar sx={{ width: 32, height: 32 }} src={reply.profile_image_url}>
                                    {reply.user_name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                      <Typography variant="subtitle2" fontWeight={600} fontSize="0.875rem">
                                        {reply.user_name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                                        {new Date(reply.created_at).toLocaleDateString()}
                                      </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                                      {reply.comment}
                                    </Typography>
                                    {(user?.id === reply.cognito_username || painting.userId === user?.id) && (
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setCommentToDelete(reply.id);
                                          setDeleteDialogOpen(true);
                                        }}
                                        sx={{ mt: 0.5 }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </ListItem>
                    </Box>
                  ))}
                </List>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              Comments are disabled for this listing.
            </Alert>
          )}
        </Box>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Comment</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this comment? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => commentToDelete && handleDeleteComment(commentToDelete)}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PaintingDetail;
