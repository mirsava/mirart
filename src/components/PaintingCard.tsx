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
import { Favorite, FavoriteBorder, Email as EmailIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import ContactSellerDialog from './ContactSellerDialog';
import { Artwork } from '../types';

interface PaintingCardProps {
  painting: Artwork;
  onLikeChange?: (listingId: number, liked: boolean, likeCount: number) => void;
  artistEmail?: string;
}

const PaintingCard: React.FC<PaintingCardProps> = ({ painting, onLikeChange, artistEmail }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
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
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
        },
      }}
      onClick={contactDialogOpen ? undefined : handleViewDetails}
    >
      <CardMedia
        component="img"
        height="300"
        image={painting.image}
        alt={painting.title}
        sx={{
          objectFit: 'cover',
        }}
      />
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {painting.dimensions} • {painting.medium}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="primary" fontWeight="bold">
            ${painting.price ?? 'N/A'}
          </Typography>
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
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleViewDetails}
          sx={{ flexGrow: 1 }}
        >
          View Details
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<EmailIcon />}
          onClick={handleContactSeller}
        >
          Contact Seller
        </Button>
      </CardActions>
      
      {contactDialogOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ContactSellerDialog
            open={contactDialogOpen}
            onClose={() => setContactDialogOpen(false)}
            listingTitle={painting.title}
            artistName={painting.artist}
            artistEmail={artistEmail}
            listingId={painting.id}
          />
        </div>
      )}
    </Card>
  );
};

export default PaintingCard;


