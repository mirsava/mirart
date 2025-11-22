import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Chip,
  Avatar,
  Paper,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import apiService, { DashboardData, Listing, Order, User } from '../services/api';
import { CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import SignatureInput from '../components/SignatureInput';

const dataURLtoBlob = (dataURL: string): Promise<Blob> => {
  return new Promise((resolve) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    resolve(new Blob([u8arr], { type: mime }));
  });
};

const getImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const baseUrl = API_BASE_URL.replace('/api', '');
  return baseUrl + url;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ArtistDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistStats, setArtistStats] = useState({
    totalListings: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(null);
  const [profileFormData, setProfileFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    phone: '',
    country: '',
    website: '',
    specialties: [] as string[],
    experience: '',
    bio: '',
    signatureUrl: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
      if (tabValue === 3) {
        fetchProfile();
      }
    }
  }, [user?.id, tabValue]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data: DashboardData = await apiService.getDashboardData(user.id);
      setArtistStats(data.stats);
      setRecentListings(data.recentListings || []);
      setRecentOrders(data.recentOrders || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      // Set default values on error
      setArtistStats({
        totalListings: 0,
        totalSales: 0,
        totalRevenue: 0,
        pendingOrders: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      const data = await apiService.getUser(user.id);
      setProfileData(data);
      setProfileFormData({
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        businessName: data.business_name || '',
        phone: data.phone || '',
        country: data.country || '',
        website: data.website || '',
        specialties: data.specialties ? (typeof data.specialties === 'string' ? JSON.parse(data.specialties) : data.specialties) : [],
        experience: data.experience_level || '',
        bio: data.bio || '',
        signatureUrl: data.signature_url || '',
      });
    } catch (err: any) {
      setProfileError(err.message || 'Failed to load profile');
    }
  };

  const handleProfileInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    if (profileError) setProfileError(null);
    if (profileSuccess) setProfileSuccess(false);
  };

  const handleSpecialtyChange = (specialty: string) => {
    setProfileFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleProfileSelectChange = (event: any) => {
    setProfileFormData(prev => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      setProfileError('You must be logged in to update your profile');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      let signatureUrl = profileFormData.signatureUrl || null;
      
      if (signatureUrl && signatureUrl.startsWith('data:')) {
        try {
          const blob = await dataURLtoBlob(signatureUrl);
          const formData = new FormData();
          formData.append('image', blob, 'signature.png');

          const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload signature');
          }

          const data = await response.json();
          signatureUrl = data.url;
        } catch (error) {
          console.error('Error uploading signature:', error);
          setProfileError('Failed to upload signature. Please try again.');
          setSavingProfile(false);
          return;
        }
      }

      await apiService.updateUser(user.id, {
        first_name: profileFormData.firstName,
        last_name: profileFormData.lastName,
        business_name: profileFormData.businessName,
        phone: profileFormData.phone || null,
        country: profileFormData.country,
        website: profileFormData.website || null,
        specialties: profileFormData.specialties,
        experience_level: profileFormData.experience,
        bio: profileFormData.bio || null,
        signature_url: signatureUrl,
      });

      setProfileSuccess(true);
      enqueueSnackbar('Profile saved successfully!', { variant: 'success' });
      await fetchProfile();
      
      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteClick = (listing: Listing) => {
    setListingToDelete(listing);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listingToDelete) return;

    setDeleting(true);
    try {
      await apiService.deleteListing(listingToDelete.id);
      setDeleteDialogOpen(false);
      setListingToDelete(null);
      enqueueSnackbar('Listing deleted successfully!', { variant: 'success' });
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete listing');
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setListingToDelete(null);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      // Silently handle sign out errors
    }
  };

  return (
    <Box sx={{ py: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome back, {user?.name || 'Artist'}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your listings, track sales, and grow your art business.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
            sx={{ ml: 2 }}
          >
            Sign Out
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Stats Overview */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.totalListings}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Listings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <TrendingUpIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.totalSales}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sales
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <MoneyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">${artistStats.totalRevenue}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <CartIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.pendingOrders}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Orders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="My Listings" />
              <Tab label="Orders" />
              <Tab label="Analytics" />
              <Tab label="Profile" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Your Artwork</Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => navigate('/create-listing')}
              >
                Add New Listing
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {recentListings.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      No listings yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Start selling your art by creating your first listing
                    </Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/create-listing')}
                    >
                      Add New Listing
                    </Button>
                  </Paper>
                </Grid>
              ) : (
                recentListings.map((listing) => (
                <Grid item xs={12} sm={6} md={4} key={listing.id}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 'none',
                      '& .MuiCardMedia-root': {
                        margin: 0,
                        padding: 0,
                        width: '100%',
                      },
                    }}
                  >
                    {listing.primary_image_url ? (
                      <Box
                        component="img"
                        src={getImageUrl(listing.primary_image_url)}
                        alt={listing.title}
                        sx={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          display: 'block',
                          margin: 0,
                          padding: 0,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 200,
                          width: '100%',
                          bgcolor: 'grey.200',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: 0,
                          padding: 0,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No Image
                        </Typography>
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" noWrap>
                          {listing.title}
                        </Typography>
                        <Chip 
                          label={listing.status === 'active' ? 'Active' : listing.status} 
                          color={listing.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="h6" color="primary" gutterBottom>
                        ${listing.price ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {listing.views} views
                      </Typography>
                      {listing.status === 'draft' && (
                        <Box sx={{ mb: 2 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="small"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!user?.id) return;
                              
                              try {
                                // In a real implementation, this would process payment first
                                // For now, we'll activate directly (payment processing would happen before this)
                                await apiService.activateListing(listing.id, user.id);
                                enqueueSnackbar('Listing activated successfully!', { variant: 'success' });
                                await fetchDashboardData();
                              } catch (err: any) {
                                enqueueSnackbar(err.message || 'Failed to activate listing', { variant: 'error' });
                              }
                            }}
                            sx={{ mb: 1 }}
                          >
                            Activate Listing ($10)
                          </Button>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                            Pay $10 to make this listing active
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit-listing/${listing.id}`);
                          }}
                          title="Edit listing"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/painting/${listing.id}`);
                          }}
                          title="View listing"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(listing);
                          }}
                          title="Delete listing"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                ))
              )}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Recent Orders
            </Typography>
            <List>
              {recentOrders.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No orders yet"
                    secondary="Your orders will appear here once customers make purchases"
                  />
                </ListItem>
              ) : (
                recentOrders.map((order) => (
                  <ListItem key={order.id} divider>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <CartIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={order.listing_title || 'Artwork'}
                      secondary={`Sold to ${order.buyer_email || 'Customer'} on ${new Date(order.created_at).toLocaleDateString()}`}
                    />
                    <Typography variant="h6" color="primary">
                      ${order.artist_earnings || order.total_price}
                    </Typography>
                  </ListItem>
                ))
              )}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Sales Analytics
            </Typography>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Analytics dashboard coming soon! Track your sales performance, 
                popular items, and customer insights.
              </Typography>
            </Paper>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Artist Profile
            </Typography>

            {profileError && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setProfileError(null)}>
                {profileError}
              </Alert>
            )}

            {profileSuccess && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setProfileSuccess(false)}>
                Profile updated successfully!
              </Alert>
            )}

            <Paper sx={{ p: 4 }}>
              <form onSubmit={handleProfileSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileFormData.firstName}
                      onChange={handleProfileInputChange('firstName')}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileFormData.lastName}
                      onChange={handleProfileInputChange('lastName')}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={profileData?.email || user?.email || ''}
                      disabled
                      helperText="Email cannot be changed"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Business/Studio Name"
                      value={profileFormData.businessName}
                      onChange={handleProfileInputChange('businessName')}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={profileFormData.phone}
                      onChange={handleProfileInputChange('phone')}
                      placeholder="+1234567890"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      value={profileFormData.country}
                      onChange={handleProfileInputChange('country')}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={profileFormData.website}
                      onChange={handleProfileInputChange('website')}
                      placeholder="https://yourwebsite.com"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Experience Level</InputLabel>
                      <Select
                        name="experience"
                        value={profileFormData.experience}
                        onChange={handleProfileSelectChange}
                        label="Experience Level"
                      >
                        <MenuItem value="Just starting out">Just starting out</MenuItem>
                        <MenuItem value="1-2 years">1-2 years</MenuItem>
                        <MenuItem value="3-5 years">3-5 years</MenuItem>
                        <MenuItem value="6-10 years">6-10 years</MenuItem>
                        <MenuItem value="10+ years">10+ years</MenuItem>
                        <MenuItem value="Professional">Professional</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Specialties
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {['Painting', 'Woodworking', 'Other'].map((specialty) => (
                        <Chip
                          key={specialty}
                          label={specialty}
                          onClick={() => handleSpecialtyChange(specialty)}
                          color={profileFormData.specialties.includes(specialty) ? 'primary' : 'default'}
                          variant={profileFormData.specialties.includes(specialty) ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Bio"
                      value={profileFormData.bio}
                      onChange={handleProfileInputChange('bio')}
                      placeholder="Tell us about yourself and your artistic journey..."
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <SignatureInput
                      value={profileFormData.signatureUrl}
                      onChange={(url) => {
                        setProfileFormData(prev => ({
                          ...prev,
                          signatureUrl: url || '',
                        }));
                      }}
                      disabled={savingProfile}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={savingProfile}
                        startIcon={savingProfile ? <CircularProgress size={20} /> : <EditIcon />}
                      >
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </TabPanel>
        </Paper>
          </>
        )}
        </Container>

        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Delete Listing
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              Are you sure you want to delete "{listingToDelete?.title}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={20} /> : null}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };
  
  export default ArtistDashboard;
