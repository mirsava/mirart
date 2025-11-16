import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  CircularProgress,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { artworks } from '../data/paintings';
import PaintingCard from '../components/PaintingCard';
import apiService, { Listing } from '../services/api';
import { Painting } from '../types';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('title');
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const convertListingToPainting = (listing: Listing): Painting => {
    return {
      id: listing.id,
      title: listing.title,
      artist: listing.artist_name || 'Unknown Artist',
      artistUsername: listing.cognito_username,
      price: listing.price,
      listing_type: listing.listing_type,
      starting_bid: listing.starting_bid,
      current_bid: listing.current_bid,
      reserve_price: listing.reserve_price,
      auction_end_date: listing.auction_end_date,
      bid_count: listing.bid_count,
      image: getImageUrl(listing.primary_image_url) || '',
      description: listing.description || '',
      category: listing.category as 'Painting' | 'Woodworking',
      subcategory: listing.subcategory || '',
      dimensions: listing.dimensions || '',
      medium: listing.medium || '',
      year: listing.year || new Date().getFullYear(),
      inStock: listing.in_stock,
    };
  };

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const listings = await apiService.getListings({ status: 'active' });
        const dbPaintings = listings.map(convertListingToPainting);
        setPaintings(dbPaintings);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setPaintings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const categories = ['All', ...new Set(paintings.map(p => p.category))];

  const filteredPaintings = paintings
    .filter(painting => {
      const matchesSearch = painting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           painting.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           painting.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || painting.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'year':
          return b.year - a.year;
        default:
          return 0;
      }
    });

  const handleCategoryClick = (category: string): void => {
    setSelectedCategory(category);
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Art Gallery
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            Browse our complete collection of original paintings and handcrafted woodworking pieces from talented artists. 
            Use filters to find the perfect piece for your space.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search artwork..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ maxWidth: 400 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort by"
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="title">Title</MenuItem>
                    <MenuItem value="price-low">Price: Low to High</MenuItem>
                    <MenuItem value="price-high">Price: High to Low</MenuItem>
                    <MenuItem value="year">Year (Newest)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Categories:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => handleCategoryClick(category)}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  variant={selectedCategory === category ? 'filled' : 'outlined'}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredPaintings.length} of {paintings.length} pieces
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            {searchTerm && ` matching "${searchTerm}"`}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredPaintings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No artwork found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search criteria or browse all categories
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {filteredPaintings.map((painting) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={painting.id}>
                <PaintingCard painting={painting} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4} lg={3}>
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
                    Join our community and showcase your work
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
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Gallery;
