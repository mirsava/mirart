import React, { useEffect } from 'react';
import { Box, Button, CircularProgress, Grid, Paper, Typography } from '@mui/material';
import { FavoriteBorder as HeartIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../../contexts/FavoritesContext';
import PaintingCard from '../PaintingCard';
import { Artwork } from '../../types';

// Pieces the buyer has liked, as a grid of regular gallery cards.
const BuyerSaved: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, favoritesLoading, fetchFavorites } = useFavorites();

  useEffect(() => {
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (favoritesLoading && favorites.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  if (favorites.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <HeartIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h6" gutterBottom>No saved pieces yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Tap the heart on any artwork to save it here.</Typography>
        <Button variant="contained" onClick={() => navigate('/gallery')} sx={{ textTransform: 'none' }}>Browse the gallery</Button>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {favorites.map((f) => {
        const artwork: Artwork = {
          id: f.id,
          title: f.title,
          artist: f.artist_name,
          artistUsername: f.auth_user_id,
          price: f.price,
          image: f.primary_image_url || '',
          description: '',
          category: f.category as Artwork['category'],
          subcategory: '',
          dimensions: '',
          medium: '',
          year: new Date().getFullYear(),
          inStock: f.in_stock && f.status === 'active',
          likeCount: f.like_count,
          isLiked: true,
        };
        return (
          <Grid item xs={12} sm={6} md={4} key={f.id}>
            <PaintingCard painting={artwork} onLikeChange={(_id, liked) => !liked && fetchFavorites()} />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default BuyerSaved;
