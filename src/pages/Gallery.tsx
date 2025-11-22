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
  Pagination,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Palette as PaletteIcon, Brush as BrushIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaintingCard from '../components/PaintingCard';
import apiService, { Listing } from '../services/api';
import { Artwork } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'All');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(searchParams.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC');
  const [paintings, setPaintings] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [itemsPerPage, setItemsPerPage] = useState<number>(parseInt(searchParams.get('limit') || '5', 10));
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } | null>(null);

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    return baseUrl + url;
  };

  const convertListingToPainting = (listing: Listing): Artwork => {
    return {
      id: listing.id,
      title: listing.title,
      artist: listing.artist_name || 'Unknown Artist',
      artistUsername: listing.cognito_username,
      artistSignatureUrl: listing.signature_url,
      price: listing.price,
      image: getImageUrl(listing.primary_image_url) || '',
      description: listing.description || '',
      category: (listing.category === 'Painting' || listing.category === 'Woodworking') ? listing.category : 'Painting',
      subcategory: listing.subcategory || '',
      dimensions: listing.dimensions || '',
      medium: listing.medium || '',
      year: listing.year || new Date().getFullYear(),
      inStock: listing.in_stock,
      likeCount: listing.like_count || 0,
      isLiked: listing.is_liked || false,
    };
  };

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const filters: any = {
          status: 'active',
          page,
          limit: itemsPerPage,
          sortBy,
          sortOrder,
        };
        
        if (selectedCategory !== 'All') {
          filters.category = selectedCategory;
        }
        
        if (searchTerm) {
          filters.search = searchTerm;
        }
        
        if (user?.id) {
          filters.cognitoUsername = user.id;
        }
        
        const response = await apiService.getListings(filters);
        const dbPaintings = response.listings.map(convertListingToPainting);
        setPaintings(dbPaintings);
        if (response.pagination) {
          setPagination(response.pagination);
        } else {
          setPagination({
            page: page,
            limit: itemsPerPage,
            total: dbPaintings.length,
            totalPages: Math.ceil(dbPaintings.length / itemsPerPage),
            hasNext: false,
            hasPrev: false
          });
        }
        
      } catch (error) {
        console.error('Error fetching listings:', error);
        setPaintings([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [page, itemsPerPage, selectedCategory, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum !== page) {
        setPage(pageNum);
      }
    }
    
    if (limitParam) {
      const limitNum = parseInt(limitParam, 10);
      if (!isNaN(limitNum) && [2, 5, 10].includes(limitNum) && limitNum !== itemsPerPage) {
        setItemsPerPage(limitNum);
        if (page !== 1) {
          setPage(1);
        }
      }
    }
  }, [searchParams]);

  const categories = ['All', 'Painting', 'Woodworking', 'Other'];

  const handleCategoryClick = (category: string): void => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleItemsPerPageChange = (value: number): void => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('limit', value.toString());
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
    setItemsPerPage(value);
    setPage(1);
  };

  const handleSortChange = (newSortBy: string): void => {
    if (newSortBy === 'price-low') {
      setSortBy('price');
      setSortOrder('ASC');
    } else if (newSortBy === 'price-high') {
      setSortBy('price');
      setSortOrder('DESC');
    } else if (newSortBy === 'title') {
      setSortBy('title');
      setSortOrder('ASC');
    } else if (newSortBy === 'year') {
      setSortBy('year');
      setSortOrder('DESC');
    } else {
      setSortBy('created_at');
      setSortOrder('DESC');
    }
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number): void => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Box 
          sx={{ 
            mb: 6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              py: 6,
              px: 3,
              background: (theme) => 
                theme.palette.mode === 'dark'
                  ? `radial-gradient(ellipse at center, ${theme.palette.primary.dark}25 0%, transparent 70%)`
                  : `radial-gradient(ellipse at center, ${theme.palette.primary.light}20 0%, transparent 70%)`,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: (theme) => 
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(45deg, transparent 30%, ${theme.palette.primary.main}08 50%, transparent 70%)`
                    : `linear-gradient(45deg, transparent 30%, ${theme.palette.primary.main}05 50%, transparent 70%)`,
                pointerEvents: 'none',
              },
            }}
          >
            <Container maxWidth="md">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
                <PaletteIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'primary.main',
                    opacity: 0.8,
                    transform: 'rotate(-15deg)',
                  }} 
                />
                <Typography 
                  variant="h2" 
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'primary.main',
                    textShadow: (theme) => 
                      theme.palette.mode === 'dark'
                        ? `0 2px 8px ${theme.palette.primary.main}30`
                        : `0 2px 4px ${theme.palette.primary.main}20`,
                  }}
                >
                  Art Gallery
                </Typography>
                <BrushIcon 
                  sx={{ 
                    fontSize: 48, 
                    color: 'primary.main',
                    opacity: 0.8,
                    transform: 'rotate(15deg)',
                  }} 
                />
              </Box>
              
              <Box sx={{ textAlign: 'center', maxWidth: '700px', mx: 'auto' }}>
                <Typography 
                  variant="h6" 
                  color="text.secondary"
                  sx={{ 
                    fontWeight: 400,
                    lineHeight: 1.8,
                    mb: 1,
                  }}
                >
                  Discover Unique Artwork
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    opacity: 0.9,
                  }}
                >
                  Explore our curated collection of original paintings and handcrafted woodworking pieces. 
                  Each piece tells a unique story from talented artists around the world.
                </Typography>
              </Box>
            </Container>
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search artwork..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchChange((e.target as HTMLInputElement).value);
                  }
                }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ maxWidth: 400 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Items per page</InputLabel>
                  <Select
                    value={itemsPerPage}
                    label="Items per page"
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  >
                    <MenuItem value={2}>2</MenuItem>
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort by</InputLabel>
                  <Select
                    value={sortBy === 'price' && sortOrder === 'ASC' ? 'price-low' : 
                           sortBy === 'price' && sortOrder === 'DESC' ? 'price-high' :
                           sortBy === 'title' ? 'title' :
                           sortBy === 'year' ? 'year' : 'created_at'}
                    label="Sort by"
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <MenuItem value="created_at">Newest First</MenuItem>
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
            {pagination ? (
              <>
                Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, pagination.total)} of {pagination.total} pieces
                {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                {searchTerm && ` matching "${searchTerm}"`}
              </>
            ) : (
              'Loading...'
            )}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : paintings.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No artwork found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search criteria or browse all categories
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={4}>
              {paintings.map((painting) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={painting.id}>
                  <PaintingCard painting={painting} />
                </Grid>
              ))}
              {pagination && pagination.page === pagination.totalPages && (
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
              )}
            </Grid>
            
            {pagination && pagination.total > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <Pagination
                  count={pagination.totalPages || 1}
                  page={pagination.page || page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default Gallery;
