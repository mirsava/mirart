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
  Divider,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Image as ImageIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const CreateListing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Painting',
    subcategory: '',
    price: '',
    primary_image_url: '',
    image_urls: [] as string[],
    dimensions: '',
    medium: '',
    year: '',
    in_stock: true,
    status: 'draft' as 'draft',
    shipping_info: '',
    returns_info: '',
    allow_comments: true,
  });

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user?.id) return;
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/users/${user.id}/settings`);
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            allow_comments: data.default_allow_comments !== false,
          }));
        }
      } catch (error) {
        // Silently fail, use default value
      }
    };

    fetchUserSettings();
  }, [user?.id]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Basic Information', 'Images', 'Details', 'Pricing & Status'];

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
    const currentTotal = imageFiles.length;
    const totalAfterAdd = currentTotal + newFiles.length;
    
    if (totalAfterAdd > 10) {
      setError(`You can only add ${10 - currentTotal} more image(s)`);
      return;
    }

    // Create previews using Promise.all
    const previewPromises = newFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
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
    
    // Reset input to allow selecting the same file again
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

    if (imageFiles.length >= 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index),
    }));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    const formData = new FormData();
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/upload/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const data = await response.json();
      return data.files.map((file: any) => {
        // Convert relative URL to absolute URL
        const baseUrl = API_BASE_URL.replace('/api', '');
        return baseUrl + file.url;
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('You must be logged in to create a listing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload images first
      let uploadedImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        uploadedImageUrls = await uploadImages();
      }

      // Use first image as primary image, rest go to image_urls
      const primaryImage = uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : (formData.primary_image_url || undefined);
      const additionalImages = uploadedImageUrls.length > 1 ? uploadedImageUrls.slice(1) : [];
      
      const listingData: any = {
        cognito_username: user.id,
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        primary_image_url: primaryImage,
        image_urls: additionalImages.length > 0 ? additionalImages : undefined,
        dimensions: formData.dimensions || undefined,
        medium: formData.medium || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        in_stock: formData.in_stock,
        status: 'draft',
        shipping_info: formData.shipping_info || undefined,
        returns_info: formData.returns_info || undefined,
        allow_comments: formData.allow_comments,
      };

      listingData.price = parseFloat(formData.price);

      await apiService.createListing(listingData);
      enqueueSnackbar('Listing created successfully!', { variant: 'success' });
      navigate('/artist-dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ py: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Paper
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            mb: 4,
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Create New Listing
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Add a new artwork listing to your portfolio. Fill in the details below to get started.
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <InfoIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Basic Information
                    </Typography>
                  </Box>
                  
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
                        sx={{ bgcolor: 'background.default' }}
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
                        sx={{ bgcolor: 'background.default' }}
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
                          sx={{ bgcolor: 'background.default' }}
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
                          sx={{ bgcolor: 'background.default' }}
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
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <SettingsIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Additional Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Dimensions"
                        name="dimensions"
                        value={formData.dimensions}
                        onChange={handleChange}
                        placeholder="e.g., 24x36 inches"
                        sx={{ bgcolor: 'background.default' }}
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
                        sx={{ bgcolor: 'background.default' }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Year"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        placeholder="e.g., 2024"
                        sx={{ bgcolor: 'background.default' }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <ImageIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Artwork Photos
                    </Typography>
                    <Chip label={`${imageFiles.length}/10`} size="small" color="primary" variant="outlined" />
                  </Box>
                  
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
                    cursor: imageFiles.length >= 10 || uploadingImages ? 'not-allowed' : 'pointer',
                    mb: 2,
                    '&:hover': {
                      borderColor: imageFiles.length >= 10 || uploadingImages ? 'divider' : 'primary.main',
                      bgcolor: imageFiles.length >= 10 || uploadingImages ? 'transparent' : 'action.hover',
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
                    disabled={imageFiles.length >= 10 || uploadingImages}
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
                        : imageFiles.length === 0
                        ? 'Drag and drop images here, or click to browse'
                        : `Drag and drop more images here, or click to browse (${imageFiles.length}/10)`}
                    </Typography>
                    <label htmlFor="image-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<AddIcon />}
                        disabled={imageFiles.length >= 10 || uploadingImages}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {imageFiles.length >= 10 ? 'Maximum 10 images' : `Browse Files`}
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
                    }}
                  >
                    {imagePreviews.map((preview, index) => (
                      <Box
                        key={index}
                        sx={{
                          position: 'relative',
                          width: { xs: 'calc(50% - 6px)', sm: 'calc(33.333% - 10px)', md: 'calc(20% - 12px)' },
                          paddingTop: { xs: 'calc(50% - 6px)', sm: 'calc(33.333% - 10px)', md: 'calc(20% - 12px)' },
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
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
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Shipping & Returns
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Optional information to help buyers understand shipping and return policies
                  </Typography>
                  
                  <Grid container spacing={3}>
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
                        sx={{ bgcolor: 'background.default' }}
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
                        sx={{ bgcolor: 'background.default' }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Pricing & Status
                  </Typography>
                  
                  <Grid container spacing={3} sx={{ mt: 1 }}>
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
                        sx={{ bgcolor: 'background.default' }}
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
                          sx={{ bgcolor: 'background.default' }}
                        >
                          <MenuItem value="draft">Draft</MenuItem>
                          <MenuItem value="active">Active</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.in_stock}
                            onChange={handleSwitchChange}
                            name="in_stock"
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              In Stock
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Toggle if this artwork is currently available
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.allow_comments}
                            onChange={handleSwitchChange}
                            name="allow_comments"
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              Allow Comments
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Enable comments on this listing
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/artist-dashboard')}
                    disabled={loading || uploadingImages}
                    sx={{ minWidth: 120 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading || uploadingImages}
                    startIcon={loading || uploadingImages ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                    sx={{ minWidth: 180 }}
                  >
                    {loading ? 'Creating...' : uploadingImages ? 'Uploading...' : 'Create Listing'}
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

export default CreateListing;

