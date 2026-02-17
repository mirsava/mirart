import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
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
  Menu,
  Drawer,
  IconButton,
  Divider,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  InputAdornment,
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Palette as PaletteIcon, 
  Brush as BrushIcon,
  Tune as FilterIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaintingCard from '../components/PaintingCard';
import apiService, { Listing } from '../services/api';
import { getListingImageCount } from '../utils/listingUtils';
import { Artwork } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('search') || '');
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(searchParams.get('subcategory') || '');
  const [selectedArtist, setSelectedArtist] = useState<string>(searchParams.get('artist') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(searchParams.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC');
  const [paintings, setPaintings] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [itemsPerPage, setItemsPerPage] = useState<number>(parseInt(searchParams.get('limit') || '25', 10));
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const isApplyingFiltersRef = useRef(false);
  
  const [pendingSelectedCategory, setPendingSelectedCategory] = useState<string>('All');
  const [pendingSelectedSubcategory, setPendingSelectedSubcategory] = useState<string>('');
  const [pendingSelectedMedium, setPendingSelectedMedium] = useState<string[]>([]);
  const [pendingInStockOnly, setPendingInStockOnly] = useState<boolean>(false);
  const [pendingMinPrice, setPendingMinPrice] = useState<string>('');
  const [pendingMaxPrice, setPendingMaxPrice] = useState<string>('');
  const [pendingMinYear, setPendingMinYear] = useState<string>('');
  const [pendingMaxYear, setPendingMaxYear] = useState<string>('');
  
  const [selectedMedium, setSelectedMedium] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minYear, setMinYear] = useState<string>('');
  const [maxYear, setMaxYear] = useState<string>('');

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
      category: (listing.category === 'Painting' || listing.category === 'Woodworking' || listing.category === 'Prints') ? listing.category : 'Painting',
      subcategory: listing.subcategory || '',
      dimensions: listing.dimensions || '',
      medium: listing.medium || '',
      year: listing.year || new Date().getFullYear(),
      inStock: listing.in_stock,
      quantityAvailable: listing.quantity_available ?? 1,
      likeCount: listing.like_count || 0,
      isLiked: listing.is_liked || false,
      imageCount: getListingImageCount(listing),
    };
  };

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
      setPage(1);
    }
    
    const artistFromUrl = searchParams.get('artist') || '';
    if (artistFromUrl !== selectedArtist) {
      setSelectedArtist(artistFromUrl);
      setPage(1);
    }
    
    const searchFromUrl = searchParams.get('search') || '';
    if (searchFromUrl !== searchInput) {
      setSearchInput(searchFromUrl);
      setSearchTerm(searchFromUrl);
    }
  }, [searchParams, selectedCategory, selectedArtist, searchInput]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchInput !== searchTerm) {
        setSearchTerm(searchInput);
        setPage(1);
        const newParams = new URLSearchParams(searchParams);
        if (searchInput.trim()) {
          newParams.set('search', searchInput.trim());
        } else {
          newParams.delete('search');
        }
        newParams.set('page', '1');
        setSearchParams(newParams, { replace: true });
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchInput, searchTerm, searchParams, setSearchParams]);

  const fetchListingsWithFilters = async (filterValues: {
    category?: string;
    subcategory?: string;
    cognitoUsername?: string;
    minPrice: string;
    maxPrice: string;
    minYear: string;
    maxYear: string;
    selectedMedium: string[];
    inStockOnly: boolean;
    pageNum: number;
  }) => {
    setLoading(true);
    try {
      const filters: any = {
        status: 'active',
        page: filterValues.pageNum,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      };
      
      const categoryToUse = filterValues.category !== undefined ? filterValues.category : selectedCategory;
      const subcategoryToUse = filterValues.subcategory !== undefined ? filterValues.subcategory : selectedSubcategory;
      
      if (categoryToUse !== 'All') {
        filters.category = categoryToUse;
      }
      
      if (subcategoryToUse) {
        filters.subcategory = subcategoryToUse;
      }
      
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      const artistToUse = filterValues.cognitoUsername !== undefined
        ? filterValues.cognitoUsername
        : searchParams.get('artist') || '';
      if (artistToUse) {
        filters.cognitoUsername = artistToUse;
      }
      
      if (filterValues.minPrice && filterValues.minPrice.trim() !== '') {
        const minPriceNum = parseFloat(filterValues.minPrice);
        if (!isNaN(minPriceNum)) {
          filters.minPrice = minPriceNum;
        }
      }
      
      if (filterValues.maxPrice && filterValues.maxPrice.trim() !== '') {
        const maxPriceNum = parseFloat(filterValues.maxPrice);
        if (!isNaN(maxPriceNum)) {
          filters.maxPrice = maxPriceNum;
        }
      }
      
      if (filterValues.minYear && filterValues.minYear.trim() !== '') {
        const minYearNum = parseInt(filterValues.minYear);
        if (!isNaN(minYearNum)) {
          filters.minYear = minYearNum;
        }
      }
      
      if (filterValues.maxYear && filterValues.maxYear.trim() !== '') {
        const maxYearNum = parseInt(filterValues.maxYear);
        if (!isNaN(maxYearNum)) {
          filters.maxYear = maxYearNum;
        }
      }
      
      if (filterValues.selectedMedium.length > 0) {
        filters.medium = filterValues.selectedMedium.join(',');
      }
      
      if (filterValues.inStockOnly) {
        filters.inStock = true;
      }
      
      if (user?.id) {
        filters.requestingUser = user.id;
      }
      
      const response = await apiService.getListings(filters);
      const dbPaintings = response.listings.map(convertListingToPainting);
      setPaintings(dbPaintings);
      if (response.pagination) {
        setPagination(response.pagination);
      } else {
        setPagination({
          page: filterValues.pageNum,
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

  const fetchListings = React.useCallback(async () => {
    await fetchListingsWithFilters({
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      selectedMedium,
      inStockOnly,
      pageNum: page
    });
  }, [page, itemsPerPage, selectedCategory, selectedSubcategory, selectedArtist, searchTerm, sortBy, sortOrder, minPrice, maxPrice, minYear, maxYear, selectedMedium, inStockOnly, user?.id]);

  useEffect(() => {
    if (!isApplyingFiltersRef.current) {
      fetchListings();
    } else {
      isApplyingFiltersRef.current = false;
    }
  }, [fetchListings]);

  useEffect(() => {
    const limitParam = searchParams.get('limit');
    const limitNum = limitParam ? parseInt(limitParam, 10) : null;
    
    if (!limitParam || isNaN(limitNum!) || ![10, 25, 50].includes(limitNum!)) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('limit', '25');
      setSearchParams(newParams, { replace: true });
      if (itemsPerPage !== 25) {
        setItemsPerPage(25);
      }
    } else if (limitNum !== itemsPerPage) {
      setItemsPerPage(limitNum);
    }
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const subcategoryFromUrl = searchParams.get('subcategory') || '';
    
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    }
    
    if (subcategoryFromUrl !== selectedSubcategory) {
      setSelectedSubcategory(subcategoryFromUrl);
    }
    
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
      if (!isNaN(limitNum) && [10, 25, 50].includes(limitNum) && limitNum !== itemsPerPage) {
        setItemsPerPage(limitNum);
        if (page !== 1) {
          setPage(1);
        }
      }
    }
  }, [searchParams]);

  const categoryStructure = {
    'All': [],
    'Painting': ['Abstract', 'Figurative', 'Impressionism', 'Realism', 'Pop Art'],
    'Woodworking': ['Furniture', 'Decorative Items', 'Kitchenware', 'Outdoor', 'Storage', 'Lighting', 'Toys & Games'],
    'Prints': ['Giclée', 'Screen Print', 'Lithograph', 'Offset', 'Digital Print', 'Fine Art Print'],
    'Other': []
  };

  const handleCategoryMenuOpen = (event: React.MouseEvent<HTMLElement>, category: string) => {
    setCategoryMenuAnchor(prev => ({ ...prev, [category]: event.currentTarget }));
  };

  const handleCategoryClick = (category: string): void => {
    if (category === 'All') {
      setSelectedCategory('All');
      setSelectedSubcategory('');
      setPage(1);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('category');
      newParams.delete('subcategory');
      newParams.set('page', '1');
      setSearchParams(newParams);
    } else {
      setSelectedCategory(category);
      setSelectedSubcategory('');
      setPage(1);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('category', category);
      newParams.delete('subcategory');
      newParams.set('page', '1');
      setSearchParams(newParams);
    }
  };


  const handleSearchChange = (value: string): void => {
    setSearchInput(value);
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

  const handleLikeChange = (listingId: number, liked: boolean, likeCount: number): void => {
    setPaintings(prevPaintings => 
      prevPaintings.map(p => 
        p.id === listingId 
          ? { ...p, isLiked: liked, likeCount }
          : p
      )
    );
  };

  const hasActiveFilters = (): boolean => {
    return (
      (selectedCategory !== 'All') ||
      selectedSubcategory !== '' ||
      selectedArtist !== '' ||
      minPrice !== '' ||
      maxPrice !== '' ||
      minYear !== '' ||
      maxYear !== '' ||
      selectedMedium.length > 0 ||
      inStockOnly
    );
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (selectedSubcategory !== '') count++;
    if (selectedArtist !== '') count++;
    if (minPrice !== '') count++;
    if (maxPrice !== '') count++;
    if (minYear !== '') count++;
    if (maxYear !== '') count++;
    if (selectedMedium.length > 0) count += selectedMedium.length;
    if (inStockOnly) count++;
    return count;
  };

  const handleRemoveFilter = async (filterType: string, value?: string) => {
    isApplyingFiltersRef.current = true;
    
    let newCategory = selectedCategory;
    let newSubcategory = selectedSubcategory;
    let newArtist = selectedArtist;
    let newMinPrice = minPrice;
    let newMaxPrice = maxPrice;
    let newMinYear = minYear;
    let newMaxYear = maxYear;
    let newSelectedMedium = [...selectedMedium];
    let newInStockOnly = inStockOnly;
    
    switch (filterType) {
      case 'category':
        newCategory = 'All';
        newSubcategory = '';
        setSelectedCategory('All');
        setSelectedSubcategory('');
        break;
      case 'subcategory':
        newSubcategory = '';
        setSelectedSubcategory('');
        break;
      case 'artist':
        newArtist = '';
        setSelectedArtist('');
        const artistParams = new URLSearchParams(searchParams);
        artistParams.delete('artist');
        artistParams.set('page', '1');
        setSearchParams(artistParams);
        break;
      case 'minPrice':
        newMinPrice = '';
        setMinPrice('');
        break;
      case 'maxPrice':
        newMaxPrice = '';
        setMaxPrice('');
        break;
      case 'minYear':
        newMinYear = '';
        setMinYear('');
        break;
      case 'maxYear':
        newMaxYear = '';
        setMaxYear('');
        break;
      case 'medium':
        if (value) {
          newSelectedMedium = selectedMedium.filter(m => m !== value);
          setSelectedMedium(newSelectedMedium);
        }
        break;
      case 'inStock':
        newInStockOnly = false;
        setInStockOnly(false);
        break;
    }
    
    setPage(1);
    
    await fetchListingsWithFilters({
      category: newCategory,
      subcategory: newSubcategory,
      cognitoUsername: newArtist,
      minPrice: newMinPrice,
      maxPrice: newMaxPrice,
      minYear: newMinYear,
      maxYear: newMaxYear,
      selectedMedium: newSelectedMedium,
      inStockOnly: newInStockOnly,
      pageNum: 1
    });
  };

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <PageHeader
        title="Art Gallery"
        subtitle="Explore our curated collection of original paintings and handcrafted woodworking pieces from talented artists around the world."
        icon={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <BrushIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
        }
        disablePattern={true}
      />

      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, sm: 5, md: 6 } }}>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Badge
                  badgeContent={hasActiveFilters() ? getActiveFilterCount() : 0}
                  color="primary"
                  sx={{
                    '& .MuiBadge-badge': {
                      right: 4,
                      top: 4,
                    },
                  }}
                >
                  <IconButton
                    onClick={() => {
                      setPendingSelectedCategory(selectedCategory);
                      setPendingSelectedSubcategory(selectedSubcategory);
                      setPendingMinPrice(minPrice);
                      setPendingMaxPrice(maxPrice);
                      setPendingMinYear(minYear);
                      setPendingMaxYear(maxYear);
                      setPendingSelectedMedium(selectedMedium);
                      setPendingInStockOnly(inStockOnly);
                      setFilterDrawerOpen(true);
                    }}
                    sx={{
                      border: '1px solid',
                      borderColor: hasActiveFilters() ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      height: '56px',
                      width: '56px',
                    }}
                  >
                    <FilterIcon sx={{ color: hasActiveFilters() ? 'primary.main' : 'inherit' }} />
                  </IconButton>
                </Badge>
                <TextField
                  fullWidth
                  placeholder="Search artwork..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchInput && (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => handleSearchChange('')}
                          sx={{ p: 0.5 }}
                        >
                          <ClearIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: 400 }}
                />
              </Box>
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
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
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

          {hasActiveFilters() && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                Active Filters:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedCategory !== 'All' && (
                  <Chip
                    label={`Category: ${selectedCategory}`}
                    onDelete={() => handleRemoveFilter('category')}
                    color="primary"
                    size="small"
                  />
                )}
                {selectedSubcategory && (
                  <Chip
                    label={`Subcategory: ${selectedSubcategory}`}
                    onDelete={() => handleRemoveFilter('subcategory')}
                    color="primary"
                    size="small"
                  />
                )}
                {selectedArtist && (
                  <Chip
                    label={`Artist: ${selectedArtist}`}
                    onDelete={() => handleRemoveFilter('artist')}
                    color="primary"
                    size="small"
                  />
                )}
                {minPrice && (
                  <Chip
                    label={`Min Price: $${minPrice}`}
                    onDelete={() => handleRemoveFilter('minPrice')}
                    color="primary"
                    size="small"
                  />
                )}
                {maxPrice && (
                  <Chip
                    label={`Max Price: $${maxPrice}`}
                    onDelete={() => handleRemoveFilter('maxPrice')}
                    color="primary"
                    size="small"
                  />
                )}
                {minYear && (
                  <Chip
                    label={`Min Year: ${minYear}`}
                    onDelete={() => handleRemoveFilter('minYear')}
                    color="primary"
                    size="small"
                  />
                )}
                {maxYear && (
                  <Chip
                    label={`Max Year: ${maxYear}`}
                    onDelete={() => handleRemoveFilter('maxYear')}
                    color="primary"
                    size="small"
                  />
                )}
                {selectedMedium.map((medium) => (
                  <Chip
                    key={medium}
                    label={`Medium: ${medium}`}
                    onDelete={() => handleRemoveFilter('medium', medium)}
                    color="primary"
                    size="small"
                  />
                ))}
                {inStockOnly && (
                  <Chip
                    label="In Stock Only"
                    onDelete={() => handleRemoveFilter('inStock')}
                    color="primary"
                    size="small"
                  />
                )}
              </Stack>
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Categories:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {Object.keys(categoryStructure).map((category) => {
                const isSelected = selectedCategory === category && !selectedSubcategory;
                
                return (
                  <Chip
                    key={category}
                    label={category}
                    onClick={() => handleCategoryClick(category)}
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{ mb: 1 }}
                  />
                );
              })}
            </Stack>
            {selectedSubcategory && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={`${selectedCategory} > ${selectedSubcategory}`}
                  onDelete={() => {
                    setSelectedSubcategory('');
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('subcategory');
                    newParams.set('page', '1');
                    setSearchParams(newParams);
                  }}
                  color="primary"
                  variant="filled"
                  sx={{ mb: 1 }}
                />
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {pagination ? (
              <>
                Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, pagination.total)} of {pagination.total} pieces
                {selectedCategory !== 'All' && ` in ${selectedCategory}${selectedSubcategory ? ` > ${selectedSubcategory}` : ''}`}
                {selectedArtist && ` by artist ${selectedArtist}`}
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
                  <PaintingCard 
                    painting={painting} 
                    onLikeChange={handleLikeChange}
                  />
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
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
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
      </Box>

      <Drawer
        anchor="left"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        hideBackdrop={false}
        ModalProps={{
          sx: {
            zIndex: 1299,
          },
        }}
        PaperProps={{
          sx: {
            width: { xs: '85%', sm: 400 },
            height: { xs: 'calc(100% - 114px)', sm: 'calc(100% - 120px)' },
            position: 'fixed',
            top: { xs: 114, sm: 120 },
            left: 0,
            boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box 
          sx={{ 
            px: 2.5, 
            py: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderBottom: '2px solid',
            borderColor: 'primary.dark',
            flexShrink: 0,
            minHeight: 56,
            width: '100%',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <FilterIcon sx={{ fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: '0.3px', fontSize: '1rem' }}>
              Filters
            </Typography>
            {hasActiveFilters() && (
              <Chip 
                label={getActiveFilterCount()} 
                size="small" 
                sx={{ 
                  bgcolor: 'primary.contrastText',
                  color: 'primary.main',
                  fontWeight: 700,
                  height: 22,
                  fontSize: '0.75rem',
                }} 
              />
            )}
          </Box>
          <IconButton 
            onClick={() => setFilterDrawerOpen(false)} 
            size="medium"
            sx={{
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>
        
        <Box sx={{ px: 3, py: 3, overflow: 'auto', maxHeight: { xs: 'calc(100vh - 200px)', sm: 'calc(100vh - 210px)' } }}>
          <Accordion 
            defaultExpanded
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&.Mui-expanded': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              },
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main', fontSize: 16 }} />}
              sx={{
                px: 1.5,
                py: 0.5,
                height: 35,
                minHeight: 35,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-expanded': {
                  bgcolor: 'action.selected',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  height: 35,
                  minHeight: 35,
                },
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'primary.main' }}>
                Category
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1,
                columnGap: 2
              }}>
                {Object.keys(categoryStructure).map((category) => {
                  const subcategories = categoryStructure[category as keyof typeof categoryStructure];
                  const hasSubcategories = subcategories.length > 0;
                  const isSelected = pendingSelectedCategory === category && !pendingSelectedSubcategory;
                  
                  return (
                    <Box key={category}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {
                              if (category === 'All') {
                                setPendingSelectedCategory('All');
                                setPendingSelectedSubcategory('');
                              } else {
                                setPendingSelectedCategory(category);
                                setPendingSelectedSubcategory('');
                              }
                            }}
                          />
                        }
                        label={category}
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                      />
                      {hasSubcategories && pendingSelectedCategory === category && (
                        <Box sx={{ pl: 4, pt: 1 }}>
                          {subcategories.map((subcategory) => (
                            <FormControlLabel
                              key={subcategory}
                              control={
                                <Checkbox
                                  checked={pendingSelectedSubcategory === subcategory}
                                  onChange={() => {
                                    setPendingSelectedSubcategory(subcategory);
                                  }}
                                />
                              }
                              label={subcategory}
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion 
            defaultExpanded
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&.Mui-expanded': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              },
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main', fontSize: 16 }} />}
              sx={{
                px: 1.5,
                py: 0.5,
                height: 35,
                minHeight: 35,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-expanded': {
                  bgcolor: 'action.selected',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  height: 35,
                  minHeight: 35,
                },
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'primary.main' }}>
                Price Range
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Min Price"
                  type="number"
                  value={pendingMinPrice}
                  onChange={(e) => setPendingMinPrice(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                    '& .MuiInputBase-input': { fontSize: '0.875rem' },
                  }}
                />
                <TextField
                  label="Max Price"
                  type="number"
                  value={pendingMaxPrice}
                  onChange={(e) => setPendingMaxPrice(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                    '& .MuiInputBase-input': { fontSize: '0.875rem' },
                  }}
                />
              </Box>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={() => {
                  setPendingMinPrice('');
                  setPendingMaxPrice('');
                }}
                sx={{ mt: 1 }}
              >
                Clear
              </Button>
            </AccordionDetails>
          </Accordion>

          <Accordion 
            defaultExpanded
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&.Mui-expanded': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              },
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main', fontSize: 16 }} />}
              sx={{
                px: 1.5,
                py: 0.5,
                height: 35,
                minHeight: 35,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-expanded': {
                  bgcolor: 'action.selected',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  height: 35,
                  minHeight: 35,
                },
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'primary.main' }}>
                Year Range
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Min Year"
                  type="number"
                  value={pendingMinYear}
                  onChange={(e) => setPendingMinYear(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1900, max: new Date().getFullYear() }}
                  sx={{
                    '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                    '& .MuiInputBase-input': { fontSize: '0.875rem' },
                  }}
                />
                <TextField
                  label="Max Year"
                  type="number"
                  value={pendingMaxYear}
                  onChange={(e) => setPendingMaxYear(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1900, max: new Date().getFullYear() }}
                  sx={{
                    '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                    '& .MuiInputBase-input': { fontSize: '0.875rem' },
                  }}
                />
              </Box>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={() => {
                  setPendingMinYear('');
                  setPendingMaxYear('');
                }}
                sx={{ mt: 1 }}
              >
                Clear
              </Button>
            </AccordionDetails>
          </Accordion>

          <Accordion
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&.Mui-expanded': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              },
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main', fontSize: 16 }} />}
              sx={{
                px: 1.5,
                py: 0.5,
                height: 35,
                minHeight: 35,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-expanded': {
                  bgcolor: 'action.selected',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  height: 35,
                  minHeight: 35,
                },
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'primary.main' }}>
                Medium
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, py: 2 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.5,
                columnGap: 2
              }}>
                {['Oil', 'Acrylic', 'Watercolor', 'Pastel', 'Charcoal', 'Pencil', 'Mixed Media', 'Wood', 'Metal', 'Other'].map((medium) => (
                  <FormControlLabel
                    key={medium}
                    control={
                      <Checkbox
                        checked={pendingSelectedMedium.includes(medium)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPendingSelectedMedium([...pendingSelectedMedium, medium]);
                          } else {
                            setPendingSelectedMedium(pendingSelectedMedium.filter(m => m !== medium));
                          }
                        }}
                      />
                    }
                    label={medium}
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                  />
                ))}
              </Box>
              {pendingSelectedMedium.length > 0 && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setPendingSelectedMedium([]);
                  }}
                  sx={{ mt: 2 }}
                >
                  Clear
                </Button>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion
            sx={{
              mb: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&.Mui-expanded': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              },
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main', fontSize: 16 }} />}
              sx={{
                px: 1.5,
                py: 0.5,
                height: 35,
                minHeight: 35,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&.Mui-expanded': {
                  bgcolor: 'action.selected',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  height: 35,
                  minHeight: 35,
                },
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'primary.main' }}>
                Availability
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, py: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={pendingInStockOnly}
                    onChange={(e) => {
                      setPendingInStockOnly(e.target.checked);
                    }}
                  />
                }
                label="In Stock Only"
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
              />
            </AccordionDetails>
          </Accordion>

          <Box 
            sx={{ 
              mt: 3, 
              px: 1,
              pb: 1,
              position: 'sticky',
              bottom: 0,
              bgcolor: 'background.paper',
              borderTop: '2px solid',
              borderColor: 'divider',
              pt: 2.5,
              boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <Stack spacing={1.5}>
              <Button
                variant="contained"
                fullWidth
                onClick={async () => {
                  isApplyingFiltersRef.current = true;
                  
                  const newFilters = {
                    category: pendingSelectedCategory,
                    subcategory: pendingSelectedSubcategory,
                    minPrice: pendingMinPrice || '',
                    maxPrice: pendingMaxPrice || '',
                    minYear: pendingMinYear || '',
                    maxYear: pendingMaxYear || '',
                    selectedMedium: pendingSelectedMedium,
                    inStockOnly: pendingInStockOnly,
                    pageNum: 1
                  };
                  
                  setSelectedCategory(pendingSelectedCategory);
                  setSelectedSubcategory(pendingSelectedSubcategory);
                  setMinPrice(newFilters.minPrice);
                  setMaxPrice(newFilters.maxPrice);
                  setMinYear(newFilters.minYear);
                  setMaxYear(newFilters.maxYear);
                  setSelectedMedium(newFilters.selectedMedium.length > 0 ? [...newFilters.selectedMedium] : []);
                  setInStockOnly(newFilters.inStockOnly);
                  setPage(1);
                  setFilterDrawerOpen(false);
                  
                  await fetchListingsWithFilters(newFilters);
                }}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                  },
                }}
              >
                Apply Filters
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={async () => {
                  setPendingSelectedCategory('All');
                  setPendingSelectedSubcategory('');
                  setPendingMinPrice('');
                  setPendingMaxPrice('');
                  setPendingMinYear('');
                  setPendingMaxYear('');
                  setPendingSelectedMedium([]);
                  setPendingInStockOnly(false);
                  setSelectedCategory('All');
                  setSelectedSubcategory('');
                  setMinPrice('');
                  setMaxPrice('');
                  setMinYear('');
                  setMaxYear('');
                  setSelectedMedium([]);
                  setInStockOnly(false);
                  setPage(1);
                  
                  isApplyingFiltersRef.current = true;
                  await fetchListingsWithFilters({
                    category: 'All',
                    subcategory: '',
                    minPrice: '',
                    maxPrice: '',
                    minYear: '',
                    maxYear: '',
                    selectedMedium: [],
                    inStockOnly: false,
                    pageNum: 1
                  });
                }}
                sx={{
                  py: 1.25,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    bgcolor: 'action.hover',
                  },
                }}
              >
                Clear All Filters
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Gallery;
