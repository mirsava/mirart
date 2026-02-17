import React, { useState } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Link as MuiLink,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Favorite, FavoriteBorder, Email as EmailIcon, Edit as EditIcon, PhotoLibrary as PhotoLibraryIcon, ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/userRoles';
import { useCart } from '../contexts/CartContext';
import { useSnackbar } from 'notistack';
import apiService from '../services/api';
import ContactSellerDialog from './ContactSellerDialog';
import { Artwork } from '../types';

interface PaintingCardProps {
  painting: Artwork;
  onLikeChange?: (listingId: number, liked: boolean, likeCount: number) => void;
}

const PaintingCard: React.FC<PaintingCardProps> = ({ painting, onLikeChange }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { enqueueSnackbar } = useSnackbar();
  const [isLiked, setIsLiked] = useState(painting.isLiked || false);
  const [likeCount, setLikeCount] = useState(painting.likeCount || 0);
  const [liking, setLiking] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const handleViewDetails = (): void => {
    navigate(`/painting/${painting.id}`);
  };

  const handleContactSeller = (e: React.MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    setContactDialogOpen(true);
  };

  const isOwnListing = Boolean(isAuthenticated && user?.id && painting.artistUsername && user.id === painting.artistUsername);
  const canEditListing = isOwnListing || user?.userRole === UserRole.SITE_ADMIN;

  const handleEdit = (e: React.MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/edit-listing/${painting.id}`);
  };

  const handleBuyNow = (e: React.MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    try {
      addToCart(painting, 'artwork', painting.id);
      enqueueSnackbar('Added to cart', { variant: 'success' });
      navigate('/checkout');
    } catch (err: unknown) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Could not add to cart', { variant: 'error' });
    }
  };

  const handleLike = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    
    if (!isAuthenticated || !user?.id) {
      navigate('/artist-signin');
      return;
    }

    if (liking) return;

    setLiking(true);
    const wasLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!wasLiked);
    setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);

    try {
      if (wasLiked) {
        await apiService.unlikeListing(painting.id, user.id);
      } else {
        const result = await apiService.likeListing(painting.id, user.id);
        setLikeCount(result.likeCount);
      }
      
      if (onLikeChange) {
        onLikeChange(painting.id, !wasLiked, wasLiked ? likeCount - 1 : likeCount + 1);
      }
    } catch (error) {
      setIsLiked(wasLiked);
      setLikeCount(previousCount);
    } finally {
      setLiking(false);
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
      }}
      onClick={contactDialogOpen ? undefined : handleViewDetails}
    >
      <Box sx={{ position: 'relative' }}>
        {painting.image ? (
          <CardMedia
            component="img"
            height="300"
            image={painting.image}
            alt={painting.title}
            sx={{
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            sx={{
              height: 300,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.200',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No Image
            </Typography>
          </Box>
        )}
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
            }}
          >
            <Typography
              sx={{
                transform: 'rotate(-25deg)',
                fontSize: '4rem',
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
        {painting.imageCount != null && painting.imageCount > 0 && (
          <Chip
            icon={<PhotoLibraryIcon sx={{ fontSize: 16 }} />}
            label={painting.imageCount}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h2" noWrap>
            {painting.title}
          </Typography>
          <Chip
            label={painting.category}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          by{' '}
          {painting.artistUsername ? (
            <MuiLink
              component="button"
              variant="body2"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/artist/${painting.artistUsername}`);
              }}
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'secondary.main',
                  },
                }}
            >
              {painting.artist}
            </MuiLink>
          ) : (
            painting.artist
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {painting.dimensions} • {painting.medium}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h6" color="primary" fontWeight="bold">
              ${painting.price ?? 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {painting.inStock
                ? `${painting.quantityAvailable ?? 1} available`
                : '0 available'}
            </Typography>
          </Box>
          {isAuthenticated && (
            <Tooltip title={isLiked ? 'Unlike' : 'Like'}>
              <IconButton
                size="small"
                onClick={handleLike}
                disabled={liking}
                sx={{
                  color: isLiked ? 'error.main' : 'action.disabled',
                  '&:hover': {
                    color: 'error.main',
                  },
                }}
              >
                {isLiked ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {likeCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0, flexWrap: 'wrap', gap: 0.5 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleViewDetails}
          sx={{ flexGrow: 1 }}
        >
          View Details
        </Button>
        {canEditListing ? (
          <Tooltip title="Edit listing">
            <IconButton size="small" onClick={handleEdit} color="primary" aria-label="Edit listing">
              <EditIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            {!painting.inStock ? (
              <Chip label="Sold" color="default" size="small" sx={{ fontWeight: 600 }} />
            ) : (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<ShoppingCartIcon />}
                onClick={handleBuyNow}
              >
                Buy Now
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<EmailIcon />}
              onClick={handleContactSeller}
            >
              Contact Seller
            </Button>
          </>
        )}
      </CardActions>
      
      {contactDialogOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ContactSellerDialog
            open={contactDialogOpen}
            onClose={() => setContactDialogOpen(false)}
            listingTitle={painting.title}
            artistName={painting.artist}
            listingId={painting.id}
          />
        </div>
      )}
    </Card>
  );
};

export default PaintingCard;


