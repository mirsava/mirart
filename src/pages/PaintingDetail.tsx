import React from 'react';
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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { artworks } from '../data/paintings';
import { useCart } from '../contexts/CartContext';

const PaintingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const painting = artworks.find(p => p.id === parseInt(id || '0'));

  if (!painting) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
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
                }}
              >
                <Box
                  component="img"
                  src={painting.image}
                  alt={painting.title}
                  sx={{
                    width: '100%',
                    height: { xs: 400, md: 600 },
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </Paper>
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'flex',
                  gap: 1,
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

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Shipping & Returns
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Free worldwide shipping on all orders
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Secure packaging with insurance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 30-day return policy
                  </Typography>
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
