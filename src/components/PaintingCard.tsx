import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Painting } from '../types';

interface PaintingCardProps {
  painting: Painting;
}

const PaintingCard: React.FC<PaintingCardProps> = ({ painting }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const handleViewDetails = (): void => {
    navigate(`/painting/${painting.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent): void => {
    e.stopPropagation();
    addToCart(painting);
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
      onClick={handleViewDetails}
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
          by {painting.artist}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {painting.dimensions} • {painting.medium}
        </Typography>
        <Typography variant="h6" color="primary" fontWeight="bold">
          ${painting.price}
        </Typography>
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
          onClick={handleAddToCart}
          disabled={!painting.inStock}
        >
          Add to Cart
        </Button>
      </CardActions>
    </Card>
  );
};

export default PaintingCard;


