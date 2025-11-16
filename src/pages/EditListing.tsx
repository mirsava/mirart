import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const EditListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Painting',
    subcategory: '',
    listing_type: 'fixed_price' as 'fixed_price' | 'auction',
    price: '',
    starting_bid: '',
    reserve_price: '',
    auction_end_date: '',
    primary_image_url: '',
    image_urls: [] as string[],
    dimensions: '',
    medium: '',
    year: '',
    in_stock: true,
    status: 'draft' as 'draft',
    shipping_info: '',
    returns_info: '',
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [hadOriginalImages, setHadOriginalImages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const categories = [
    'Painting',
    'Woodworking',
    'Other',
  ];

  const subcategories: Record<string, string[]> = {
    Painting: [
      'Oil Painting',
      'Acrylic Painting',
      'Watercolor',
      'Pastel',
      'Mixed Media Painting',
      'Digital Painting',
      'Abstract',
      'Portrait',
      'Landscape',
      'Still Life',
    ],
    Woodworking: [
      'Furniture',
      'Cabinetry',
      'Carving',
      'Turning',
      'Marquetry',
      'Wood Sculpture',
      'Decorative Items',
      'Kitchenware',
      'Jewelry Box',
      'Cutting Board',
    ],
    Other: [
      'Sculpture',
      'Photography',
      'Digital Art',
      'Ceramics',
      'Textiles',
      'Jewelry',
      'Mixed Media',
      'Printmaking',
      'Glass Art',
      'Metalwork',
    ],
  };

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const baseUrl = API_BASE_URL.replace('/api', '');
    // Ensure URL starts with / if it doesn't already
    const normalizedUrl = url.startsWith('/') ? url : '/' + url;
    return baseUrl + normalizedUrl;
  };

  const fetchListing = async () => {
    if (!id) {
      setError('Invalid listing ID');
      setFetching(false);
      return;
    }

    setFetching(true);
    setError(null);

    try {
      const listing = await apiService.getListing(parseInt(id));
      
        const listingType = listing.listing_type || 'fixed_price';
        const auctionEndDate = listing.auction_end_date 
          ? new Date(listing.auction_end_date).toISOString().slice(0, 16)
          : '';

        setFormData({
          title: listing.title || '',
          description: listing.description || '',
          category: listing.category || 'Painting',
          subcategory: listing.subcategory || '',
          listing_type: listingType,
          price: listing.price?.toString() || '',
          starting_bid: listing.starting_bid?.toString() || '',
          reserve_price: listing.reserve_price?.toString() || '',
          auction_end_date: auctionEndDate,
          primary_image_url: listing.primary_image_url || '',
          image_urls: listing.image_urls || [],
          dimensions: listing.dimensions || '',
          medium: listing.medium || '',
          year: listing.year?.toString() || '',
          in_stock: listing.in_stock !== undefined ? Boolean(listing.in_stock) : true,
          status: listing.status || 'draft',
          shipping_info: listing.shipping_info || '',
          returns_info: listing.returns_info || '',
        });

      const allImages = [];
      const existingUrls = [];
      
      if (listing.primary_image_url) {
        const url = listing.primary_image_url;
        allImages.push(getImageUrl(url));
        existingUrls.push(url);
      }
      if (listing.image_urls && Array.isArray(listing.image_urls) && listing.image_urls.length > 0) {
        listing.image_urls.forEach((url) => {
          // Handle case where URL might be a comma-separated string
          if (typeof url === 'string' && url.includes(',')) {
            // Split comma-separated string into individual URLs
            const splitUrls = url.split(',').map(u => u.trim()).filter(u => u);
            splitUrls.forEach(splitUrl => {
              allImages.push(getImageUrl(splitUrl));
              existingUrls.push(splitUrl);
            });
          } else {
            allImages.push(getImageUrl(url));
            existingUrls.push(url);
          }
        });
      }
      
      setImagePreviews(allImages);
      setExistingImageUrls(existingUrls);
      setImageFiles([]);
      setHadOriginalImages(existingUrls.length > 0 || (listing.image_urls && listing.image_urls.length > 0));
    } catch (err: any) {
      setError(err.message || 'Failed to load listing');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'price' || name === 'year' ? value : value,
      };
      // Reset subcategory when category changes
      if (name === 'category') {
        updated.subcategory = '';
      }
      return updated;
    });
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.checked,
    }));
  };

  const processFiles = async (files: File[]) => {
    const filteredFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (filteredFiles.length === 0) {
      setError('Please select image files only');
      return;
    }

    const newFiles = Array.from(filteredFiles);
    const currentTotal = imagePreviews.length;
    const totalAfterAdd = currentTotal + newFiles.length;
    
    if (totalAfterAdd > 10) {
      setError(`You can only add ${10 - currentTotal} more image(s)`);
      return;
    }

    const previewPromises = newFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    const newPreviews = await Promise.all(previewPromises);
    setImageFiles((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setError(null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await processFiles(Array.from(files));
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (imagePreviews.length >= 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const removeImage = (index: number) => {
    const newPreviews = [...imagePreviews];
    const newExistingUrls = [...existingImageUrls];
    
    if (index < existingImageUrls.length) {
      const removedUrl = existingImageUrls[index];
      newExistingUrls.splice(index, 1);
      setExistingImageUrls(newExistingUrls);
      
      if (index === 0 && formData.primary_image_url === removedUrl) {
        setFormData(prev => ({ ...prev, primary_image_url: '' }));
      } else if (formData.image_urls && formData.image_urls.includes(removedUrl)) {
        const newImageUrls = formData.image_urls.filter(url => url !== removedUrl);
        setFormData(prev => ({ ...prev, image_urls: newImageUrls }));
      }
    } else {
      const fileIndex = index - existingImageUrls.length;
      const newFiles = [...imageFiles];
      newFiles.splice(fileIndex, 1);
      setImageFiles(newFiles);
    }
    
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    const formData = new FormData();
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/upload/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const data = await response.json();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const baseUrl = API_BASE_URL.replace('/api', '');
      
      if (data.files && Array.isArray(data.files)) {
        return data.files.map((file: any) => {
          const url = file.url || file.path || file;
          if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
            return url;
          }
          return baseUrl + url;
        });
      }
      if (data.urls && Array.isArray(data.urls)) {
        return data.urls.map((url: string) => {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
          }
          return baseUrl + url;
        });
      }
      return [];
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || !id) {
      setError('You must be logged in to edit a listing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let uploadedImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        uploadedImageUrls = await uploadImages();
      }

      const normalizeUrl = (url: string): string => {
        if (!url) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const baseUrl = API_BASE_URL.replace('/api', '');
          if (url.startsWith(baseUrl)) {
            const relativeUrl = url.replace(baseUrl, '');
            // Ensure it starts with /
            return relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl;
          }
          // If it's an absolute URL but not from our server, return as-is
          return url;
        }
        // If it's already a relative URL, ensure it starts with /
        return url.startsWith('/') ? url : '/' + url;
      };

      const allImageUrls = [...existingImageUrls, ...uploadedImageUrls].map(normalizeUrl);
      const primaryImage = allImageUrls.length > 0 ? allImageUrls[0] : null;
      const additionalImages = allImageUrls.length > 1 ? allImageUrls.slice(1) : [];
      
      const listingData: any = {
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        listing_type: formData.listing_type,
        primary_image_url: primaryImage,
        dimensions: formData.dimensions || undefined,
        medium: formData.medium || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        in_stock: formData.in_stock,
        status: formData.status,
        shipping_info: formData.shipping_info || undefined,
        returns_info: formData.returns_info || undefined,
      };

      if (formData.listing_type === 'fixed_price') {
        listingData.price = parseFloat(formData.price);
      } else {
        listingData.starting_bid = parseFloat(formData.starting_bid);
        if (formData.reserve_price) {
          listingData.reserve_price = parseFloat(formData.reserve_price);
        }
        if (formData.auction_end_date) {
          listingData.auction_end_date = new Date(formData.auction_end_date).toISOString();
        }
      }
      
      if (hadOriginalImages || uploadedImageUrls.length > 0 || additionalImages.length > 0) {
        listingData.image_urls = additionalImages;
      }

      await apiService.updateListing(parseInt(id), listingData);
      enqueueSnackbar('Listing updated successfully!', { variant: 'success' });
      await fetchListing();
    } catch (err: any) {
      setError(err.message || 'Failed to update listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box sx={{ py: 8, minHeight: '100vh', bgcolor: 'background.default', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Edit Listing
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Update your artwork listing
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Sunset Over Mountains"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your artwork..."
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleSelectChange}
                    label="Category"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Subcategory</InputLabel>
                  <Select
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleSelectChange}
                    label="Subcategory"
                    disabled={!formData.category}
                  >
                    {formData.category && subcategories[formData.category]?.map((subcat) => (
                      <MenuItem key={subcat} value={subcat}>
                        {subcat}
                      </MenuItem>
                    ))}
                    {formData.category && (
                      <MenuItem value="Other">Other</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Listing Type</InputLabel>
                  <Select
                    name="listing_type"
                    value={formData.listing_type}
                    onChange={handleSelectChange}
                    label="Listing Type"
                  >
                    <MenuItem value="fixed_price">Fixed Price ($10 fee)</MenuItem>
                    <MenuItem value="auction">Auction (10% commission)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {formData.listing_type === 'fixed_price' ? (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Price ($)"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Starting Bid ($)"
                      name="starting_bid"
                      value={formData.starting_bid}
                      onChange={handleChange}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Reserve Price ($) - Optional"
                      name="reserve_price"
                      value={formData.reserve_price}
                      onChange={handleChange}
                      inputProps={{ min: 0, step: 0.01 }}
                      helperText="Minimum price you're willing to accept"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="datetime-local"
                      label="Auction End Date & Time"
                      name="auction_end_date"
                      value={formData.auction_end_date}
                      onChange={handleChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="e.g., 2024"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Images ({imagePreviews.length}/10)
                </Typography>
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    bgcolor: isDragging ? 'action.hover' : 'transparent',
                    transition: 'all 0.2s ease-in-out',
                    cursor: imagePreviews.length >= 10 || uploadingImages ? 'not-allowed' : 'pointer',
                    mb: 2,
                    '&:hover': {
                      borderColor: imagePreviews.length >= 10 || uploadingImages ? 'divider' : 'primary.main',
                      bgcolor: imagePreviews.length >= 10 || uploadingImages ? 'transparent' : 'action.hover',
                    },
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-upload"
                    multiple
                    type="file"
                    onChange={handleImageChange}
                    disabled={imagePreviews.length >= 10 || uploadingImages}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body1"
                      color={isDragging ? 'primary.main' : 'text.secondary'}
                      sx={{ fontWeight: isDragging ? 600 : 400 }}
                    >
                      {isDragging
                        ? 'Drop images here'
                        : imagePreviews.length === 0
                        ? 'Drag and drop images here, or click to browse'
                        : `Drag and drop more images here, or click to browse (${imagePreviews.length}/10)`}
                    </Typography>
                    <label htmlFor="image-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<AddIcon />}
                        disabled={imagePreviews.length >= 10 || uploadingImages}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {imagePreviews.length >= 10 ? 'Maximum 10 images' : `Browse Files`}
                      </Button>
                    </label>
                  </Box>
                </Box>

                {imagePreviews.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      mt: 1,
                    }}
                  >
                    {imagePreviews.map((preview, index) => (
                      <Box
                        key={index}
                        sx={{
                          position: 'relative',
                          width: { xs: 'calc(50% - 6px)', sm: 'calc(33.333% - 10px)', md: 'calc(20% - 12px)' },
                          paddingTop: { xs: 'calc(50% - 6px)', sm: 'calc(33.333% - 10px)', md: 'calc(20% - 12px)' },
                          borderRadius: 2,
                          overflow: 'hidden',
                          bgcolor: 'background.paper',
                        }}
                      >
                          <Box
                            component="img"
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeImage(index)}
                            disabled={uploadingImages}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(0, 0, 0, 0.5)',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {uploadingImages && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                      Uploading images...
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dimensions"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleChange}
                  placeholder="e.g., 24x36 inches"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Medium"
                  name="medium"
                  value={formData.medium}
                  onChange={handleChange}
                  placeholder="e.g., Oil on Canvas"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Shipping Information"
                  name="shipping_info"
                  value={formData.shipping_info}
                  onChange={handleChange}
                  placeholder="e.g., Free worldwide shipping, Estimated delivery: 5-7 business days, Secure packaging with insurance"
                  helperText="Provide details about shipping options, costs, and delivery times"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Returns & Refunds Policy"
                  name="returns_info"
                  value={formData.returns_info}
                  onChange={handleChange}
                  placeholder="e.g., 30-day return policy, Full refund if returned in original condition, Buyer pays return shipping"
                  helperText="Specify your return and refund policy"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleSelectChange}
                    label="Status"
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.in_stock}
                      onChange={handleSwitchChange}
                      name="in_stock"
                    />
                  }
                  label="In Stock"
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/artist-dashboard')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || uploadingImages}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? 'Updating...' : uploadingImages ? 'Uploading...' : 'Update Listing'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default EditListing;

