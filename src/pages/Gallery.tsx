import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Divider,
  Drawer,
  InputAdornment,
  Badge,
  alpha,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Add as AddIcon, 
  Palette as PaletteIcon, 
  Brush as BrushIcon,
  Tune as FilterIcon,
  Close as CloseIcon,
  Clear as ClearIcon,
  AttachMoney as PriceIcon,
  CalendarMonth as YearIcon,
  ColorLens as MediumIcon,
  Inventory as StockIcon,
  Category as CategoryIcon,
  CheckCircleOutline as CheckIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaintingCard from '../components/PaintingCard';
import apiService, { Listing } from '../services/api';
import { getListingImageCount } from '../utils/listingUtils';
import { Artwork } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import SEO from '../components/SEO';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('search') || '');
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.get('category')?.split(',').filter(Boolean) || []);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(searchParams.get('subcategory')?.split(',').filter(Boolean) || []);
  const [selectedArtist, setSelectedArtist] = useState<string>(searchParams.get('artist') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(searchParams.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC');
  const [paintings, setPaintings] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [itemsPerPage, setItemsPerPage] = useState<number>(parseInt(searchParams.get('limit') || '25', 10));
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } | null>(null);
  const [filterPinned, setFilterPinnedRaw] = useState<boolean>(() => {
    try { return localStorage.getItem('galleryFilterPinned') === 'true'; } catch { return false; }
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(filterPinned);
  const setFilterPinned = (pinned: boolean) => {
    setFilterPinnedRaw(pinned);
    try { localStorage.setItem('galleryFilterPinned', String(pinned)); } catch {}
  };
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isApplyingFiltersRef = useRef(false);
  
  const [pendingSelectedCategories, setPendingSelectedCategories] = useState<string[]>([]);
  const [pendingSelectedSubcategories, setPendingSelectedSubcategories] = useState<string[]>([]);
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
      shippingInfo: listing.shipping_info,
      avgRating: listing.avg_rating ? parseFloat(Number(listing.avg_rating).toFixed(1)) : null,
      reviewCount: listing.review_count || 0,
    };
  };

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const catsFromUrl = categoryFromUrl ? categoryFromUrl.split(',').filter(Boolean) : [];
    if (JSON.stringify(catsFromUrl) !== JSON.stringify(selectedCategories)) {
      setSelectedCategories(catsFromUrl);
      setPage(1);
    }

    const subFromUrl = searchParams.get('subcategory');
    const subsFromUrl = subFromUrl ? subFromUrl.split(',').filter(Boolean) : [];
    if (JSON.stringify(subsFromUrl) !== JSON.stringify(selectedSubcategories)) {
      setSelectedSubcategories(subsFromUrl);
    }
    
    const artistFromUrl = searchParams.get('artist') || '';
    if (artistFromUrl !== selectedArtist) {
      setSelectedArtist(artistFromUrl);
      setPage(1);
    }
    
    const searchFromUrl = searchParams.get('search') || '';
    if (searchFromUrl !== searchTerm) {
      setSearchInput(searchFromUrl);
      setSearchTerm(searchFromUrl);
    }
  }, [searchParams]);

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
    categories?: string[];
    subcategories?: string[];
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
      
      const catsToUse = filterValues.categories !== undefined ? filterValues.categories : selectedCategories;
      const subsToUse = filterValues.subcategories !== undefined ? filterValues.subcategories : selectedSubcategories;
      
      if (catsToUse.length > 0) {
        filters.category = catsToUse.join(',');
      }
      
      if (subsToUse.length > 0) {
        filters.subcategory = subsToUse.join(',');
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
  }, [page, itemsPerPage, selectedCategories, selectedSubcategories, selectedArtist, searchTerm, sortBy, sortOrder, minPrice, maxPrice, minYear, maxYear, selectedMedium, inStockOnly, user?.id]);

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
    } else if (limitNum !== null && limitNum !== itemsPerPage) {
      setItemsPerPage(limitNum);
    }
  }, []);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const catsFromUrl = categoryFromUrl ? categoryFromUrl.split(',').filter(Boolean) : [];
    if (JSON.stringify(catsFromUrl) !== JSON.stringify(selectedCategories)) {
      setSelectedCategories(catsFromUrl);
    }

    const subFromUrl = searchParams.get('subcategory');
    const subsFromUrl = subFromUrl ? subFromUrl.split(',').filter(Boolean) : [];
    if (JSON.stringify(subsFromUrl) !== JSON.stringify(selectedSubcategories)) {
      setSelectedSubcategories(subsFromUrl);
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

  const categoryStructure: Record<string, string[]> = {
    'All': [],
    'Painting': ['Abstract', 'Figurative', 'Impressionism', 'Realism', 'Pop Art'],
    'Woodworking': ['Furniture', 'Decorative Items', 'Kitchenware', 'Outdoor', 'Storage', 'Lighting', 'Toys & Games'],
    'Prints': ['Giclée', 'Screen Print', 'Lithograph', 'Offset', 'Digital Print', 'Fine Art Print'],
    'Other': []
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
      selectedCategories.length > 0 ||
      selectedSubcategories.length > 0 ||
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
    count += selectedCategories.length;
    count += selectedSubcategories.length;
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
    
    let newCategories = [...selectedCategories];
    let newSubcategories = [...selectedSubcategories];
    let newArtist = selectedArtist;
    let newMinPrice = minPrice;
    let newMaxPrice = maxPrice;
    let newMinYear = minYear;
    let newMaxYear = maxYear;
    let newSelectedMedium = [...selectedMedium];
    let newInStockOnly = inStockOnly;
    
    switch (filterType) {
      case 'category':
        if (value) {
          newCategories = newCategories.filter(c => c !== value);
          newSubcategories = newSubcategories.filter(s => {
            const catSubs = categoryStructure[value as keyof typeof categoryStructure] || [];
            return !catSubs.includes(s);
          });
        } else {
          newCategories = [];
          newSubcategories = [];
        }
        setSelectedCategories(newCategories);
        setSelectedSubcategories(newSubcategories);
        break;
      case 'subcategory':
        if (value) {
          newSubcategories = newSubcategories.filter(s => s !== value);
        } else {
          newSubcategories = [];
        }
        setSelectedSubcategories(newSubcategories);
        break;
      case 'artist':
        newArtist = '';
        setSelectedArtist('');
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

    const newParams = new URLSearchParams();
    newParams.set('page', '1');
    newParams.set('limit', itemsPerPage.toString());
    if (newCategories.length > 0) newParams.set('category', newCategories.join(','));
    if (newSubcategories.length > 0) newParams.set('subcategory', newSubcategories.join(','));
    if (newArtist) newParams.set('artist', newArtist);
    if (searchTerm) newParams.set('search', searchTerm);
    setSearchParams(newParams, { replace: true });

    await fetchListingsWithFilters({
      categories: newCategories,
      subcategories: newSubcategories,
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

  const drawerShift = filterPinned && filterDrawerOpen && !isSmallScreen;

  return (
    <Box sx={{
      bgcolor: 'background.default',
      ml: drawerShift ? '380px' : 0,
      transition: 'margin-left 225ms cubic-bezier(0, 0, 0.2, 1)',
    }}>
      <SEO
        title="Art Gallery"
        description="Explore original paintings, woodworking, prints, and handmade art from talented independent artists. Browse and buy unique artwork worldwide."
        url="/gallery"
      />
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

      <Box sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        pb: { xs: 4, sm: 5, md: 6 },
      }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search artwork..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: searchInput && (
                <InputAdornment position="end">
                  <IconButton edge="end" onClick={() => handleSearchChange('')} size="small">
                    <ClearIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 200, maxWidth: 360 }}
          />
          <Badge badgeContent={hasActiveFilters() ? getActiveFilterCount() : 0} color="primary">
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setPendingSelectedCategories([...selectedCategories]);
                setPendingSelectedSubcategories([...selectedSubcategories]);
                setPendingMinPrice(minPrice);
                setPendingMaxPrice(maxPrice);
                setPendingMinYear(minYear);
                setPendingMaxYear(maxYear);
                setPendingSelectedMedium(selectedMedium);
                setPendingInStockOnly(inStockOnly);
                setFilterDrawerOpen(true);
              }}
              size="small"
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 2, py: 0.75 }}
            >
              Filters
            </Button>
          </Badge>
          <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto' }}>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Show</InputLabel>
              <Select value={itemsPerPage} label="Show" onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
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
        </Box>

        {hasActiveFilters() && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {selectedCategories.map((cat) => (
              <Chip key={cat} label={cat} onDelete={() => handleRemoveFilter('category', cat)} color="primary" variant="outlined" size="small" />
            ))}
            {selectedSubcategories.map((sub) => (
              <Chip key={sub} label={sub} onDelete={() => handleRemoveFilter('subcategory', sub)} color="primary" variant="outlined" size="small" />
            ))}
            {selectedArtist && (
              <Chip label={`Artist: ${selectedArtist}`} onDelete={() => handleRemoveFilter('artist')} color="primary" variant="outlined" size="small" />
            )}
            {minPrice && (
              <Chip label={`$${minPrice}+`} onDelete={() => handleRemoveFilter('minPrice')} color="primary" variant="outlined" size="small" />
            )}
            {maxPrice && (
              <Chip label={`Up to $${maxPrice}`} onDelete={() => handleRemoveFilter('maxPrice')} color="primary" variant="outlined" size="small" />
            )}
            {minYear && (
              <Chip label={`From ${minYear}`} onDelete={() => handleRemoveFilter('minYear')} color="primary" variant="outlined" size="small" />
            )}
            {maxYear && (
              <Chip label={`Until ${maxYear}`} onDelete={() => handleRemoveFilter('maxYear')} color="primary" variant="outlined" size="small" />
            )}
            {selectedMedium.map((medium) => (
              <Chip key={medium} label={medium} onDelete={() => handleRemoveFilter('medium', medium)} color="primary" variant="outlined" size="small" />
            ))}
            {inStockOnly && (
              <Chip label="In Stock" onDelete={() => handleRemoveFilter('inStock')} color="success" variant="outlined" size="small" />
            )}
            <Chip
              label="Clear all"
              onClick={async () => {
                setSelectedCategories([]);
                setSelectedSubcategories([]);
                setSelectedArtist('');
                setMinPrice('');
                setMaxPrice('');
                setMinYear('');
                setMaxYear('');
                setSelectedMedium([]);
                setInStockOnly(false);
                setPage(1);
                const cleanParams = new URLSearchParams();
                cleanParams.set('page', '1');
                cleanParams.set('limit', itemsPerPage.toString());
                setSearchParams(cleanParams, { replace: true });
                isApplyingFiltersRef.current = true;
                await fetchListingsWithFilters({
                  categories: [], subcategories: [], minPrice: '', maxPrice: '',
                  minYear: '', maxYear: '', selectedMedium: [], inStockOnly: false, pageNum: 1,
                });
              }}
              size="small"
              variant="outlined"
              color="error"
              icon={<ClearIcon sx={{ fontSize: 14 }} />}
            />
          </Stack>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {pagination ? (
              <>
                Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, pagination.total)} of {pagination.total} pieces
                {selectedCategories.length > 0 && ` in ${selectedCategories.join(', ')}${selectedSubcategories.length > 0 ? ` > ${selectedSubcategories.join(', ')}` : ''}`}
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
                        onClick={() => navigate(user ? '/create-listing' : '/artist-signup')}
                        sx={{
                          textTransform: 'none',
                        }}
                      >
                        {user ? 'Create Listing' : 'Add Your Listing'}
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
        variant={filterPinned && !isSmallScreen ? 'persistent' : 'temporary'}
        open={filterDrawerOpen}
        onClose={() => { if (!filterPinned) setFilterDrawerOpen(false); }}
        disableScrollLock
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 380 },
            bgcolor: 'background.default',
            top: { xs: 76, md: 72 },
            height: { xs: 'calc(100vh - 76px)', md: 'calc(100vh - 72px)' },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FilterIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={700}>Filters</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {!isSmallScreen && (
                <Tooltip title={filterPinned ? 'Unpin sidebar' : 'Pin sidebar'}>
                  <IconButton
                    onClick={() => setFilterPinned(!filterPinned)}
                    size="small"
                    sx={{
                      color: filterPinned ? 'primary.main' : 'text.secondary',
                      transform: filterPinned ? 'rotate(0deg)' : 'rotate(45deg)',
                      transition: 'transform 0.2s ease, color 0.2s ease',
                    }}
                  >
                    {filterPinned ? <PinIcon fontSize="small" /> : <PinOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
              <IconButton onClick={() => { setFilterDrawerOpen(false); setFilterPinned(false); }} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 3 }}>
            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CategoryIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} fontSize="0.75rem">Category</Typography>
              </Box>
              <Stack spacing={0.5}>
                {Object.keys(categoryStructure).filter(c => c !== 'All').map((category) => {
                  const isSelected = pendingSelectedCategories.includes(category);
                  const subcategories = categoryStructure[category as keyof typeof categoryStructure];
                  return (
                    <Box key={category}>
                      <Box
                        onClick={() => {
                          setPendingSelectedCategories((prev) =>
                            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
                          );
                          if (isSelected) {
                            setPendingSelectedSubcategories((prev) =>
                              prev.filter(s => !subcategories.includes(s))
                            );
                          }
                        }}
                        sx={{
                          px: 2, py: 1, borderRadius: 1.5, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          bgcolor: isSelected ? (th) => alpha(th.palette.primary.main, 0.1) : 'transparent',
                          color: isSelected ? 'primary.main' : 'text.primary',
                          transition: 'all 0.15s ease',
                          '&:hover': { bgcolor: (th) => alpha(th.palette.primary.main, 0.06) },
                        }}
                      >
                        <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>{category}</Typography>
                        {isSelected && <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
                      </Box>
                      {subcategories.length > 0 && isSelected && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ pl: 2, pt: 1, pb: 0.5 }}>
                          {subcategories.map((sub) => (
                            <Chip
                              key={sub}
                              label={sub}
                              size="small"
                              onClick={() => setPendingSelectedSubcategories((prev) =>
                                prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
                              )}
                              color={pendingSelectedSubcategories.includes(sub) ? 'primary' : 'default'}
                              variant={pendingSelectedSubcategories.includes(sub) ? 'filled' : 'outlined'}
                              sx={{ fontSize: '0.7rem', height: 26 }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PriceIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} fontSize="0.75rem">Price Range</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                  label="Min"
                  type="number"
                  value={pendingMinPrice}
                  onChange={(e) => setPendingMinPrice(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
                <Typography color="text.disabled" fontWeight={300} fontSize="1.2rem">/</Typography>
                <TextField
                  label="Max"
                  type="number"
                  value={pendingMaxPrice}
                  onChange={(e) => setPendingMaxPrice(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <YearIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} fontSize="0.75rem">Year</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                  label="From"
                  type="number"
                  value={pendingMinYear}
                  onChange={(e) => setPendingMinYear(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1900, max: new Date().getFullYear() }}
                />
                <Typography color="text.disabled" fontWeight={300} fontSize="1.2rem">/</Typography>
                <TextField
                  label="To"
                  type="number"
                  value={pendingMaxYear}
                  onChange={(e) => setPendingMaxYear(e.target.value)}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1900, max: new Date().getFullYear() }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MediumIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} fontSize="0.75rem">Medium</Typography>
              </Box>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {['Oil', 'Acrylic', 'Watercolor', 'Pastel', 'Charcoal', 'Pencil', 'Mixed Media', 'Wood', 'Metal', 'Other'].map((medium) => (
                  <Chip
                    key={medium}
                    label={medium}
                    size="small"
                    onClick={() => setPendingSelectedMedium((prev) => prev.includes(medium) ? prev.filter((m) => m !== medium) : [...prev, medium])}
                    color={pendingSelectedMedium.includes(medium) ? 'primary' : 'default'}
                    variant={pendingSelectedMedium.includes(medium) ? 'filled' : 'outlined'}
                    sx={{ fontWeight: pendingSelectedMedium.includes(medium) ? 600 : 400 }}
                  />
                ))}
              </Stack>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StockIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5} fontSize="0.75rem">Availability</Typography>
              </Box>
              <Chip
                label="In Stock Only"
                onClick={() => setPendingInStockOnly(!pendingInStockOnly)}
                color={pendingInStockOnly ? 'success' : 'default'}
                variant={pendingInStockOnly ? 'filled' : 'outlined'}
                icon={pendingInStockOnly ? <CheckIcon sx={{ fontSize: 16 }} /> : undefined}
                sx={{ fontWeight: pendingInStockOnly ? 600 : 400 }}
              />
            </Box>
          </Box>

          <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', gap: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={async () => {
                setPendingSelectedCategories([]);
                setPendingSelectedSubcategories([]);
                setPendingMinPrice('');
                setPendingMaxPrice('');
                setPendingMinYear('');
                setPendingMaxYear('');
                setPendingSelectedMedium([]);
                setPendingInStockOnly(false);
                setSelectedCategories([]);
                setSelectedSubcategories([]);
                setMinPrice('');
                setMaxPrice('');
                setMinYear('');
                setMaxYear('');
                setSelectedMedium([]);
                setInStockOnly(false);
                setPage(1);
                if (!filterPinned) setFilterDrawerOpen(false);
                const cleanParams = new URLSearchParams();
                cleanParams.set('page', '1');
                cleanParams.set('limit', itemsPerPage.toString());
                setSearchParams(cleanParams, { replace: true });
                isApplyingFiltersRef.current = true;
                await fetchListingsWithFilters({
                  categories: [], subcategories: [], minPrice: '', maxPrice: '',
                  minYear: '', maxYear: '', selectedMedium: [], inStockOnly: false, pageNum: 1,
                });
              }}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1.25 }}
            >
              Clear
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={async () => {
                isApplyingFiltersRef.current = true;
                const newFilters = {
                  categories: pendingSelectedCategories,
                  subcategories: pendingSelectedSubcategories,
                  minPrice: pendingMinPrice || '',
                  maxPrice: pendingMaxPrice || '',
                  minYear: pendingMinYear || '',
                  maxYear: pendingMaxYear || '',
                  selectedMedium: pendingSelectedMedium,
                  inStockOnly: pendingInStockOnly,
                  pageNum: 1,
                };
                setSelectedCategories([...pendingSelectedCategories]);
                setSelectedSubcategories([...pendingSelectedSubcategories]);
                setMinPrice(newFilters.minPrice);
                setMaxPrice(newFilters.maxPrice);
                setMinYear(newFilters.minYear);
                setMaxYear(newFilters.maxYear);
                setSelectedMedium(newFilters.selectedMedium.length > 0 ? [...newFilters.selectedMedium] : []);
                setInStockOnly(newFilters.inStockOnly);
                setPage(1);
                if (!filterPinned) setFilterDrawerOpen(false);
                const newParams = new URLSearchParams();
                newParams.set('page', '1');
                newParams.set('limit', itemsPerPage.toString());
                if (pendingSelectedCategories.length > 0) newParams.set('category', pendingSelectedCategories.join(','));
                if (pendingSelectedSubcategories.length > 0) newParams.set('subcategory', pendingSelectedSubcategories.join(','));
                if (searchTerm) newParams.set('search', searchTerm);
                if (selectedArtist) newParams.set('artist', selectedArtist);
                setSearchParams(newParams, { replace: true });
                await fetchListingsWithFilters(newFilters);
              }}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, py: 1.25 }}
            >
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Gallery;
