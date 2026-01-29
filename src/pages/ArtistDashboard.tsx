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
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Favorite as FavoriteIcon,
  Email as EmailIcon,
  Description as DraftIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  ArtTrack as ArtTrackIcon,
  CheckCircle as CheckCircleIcon,
  Message as MessageIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import apiService, { DashboardData, Listing, Order, User, UserSubscription } from '../services/api';
import { CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, TextField, Switch, FormControlLabel, Divider } from '@mui/material';
import SignatureInput from '../components/SignatureInput';
import PageHeader from '../components/PageHeader';

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
      {value === index && <Box sx={{ p: 3, pb: 4 }}>{children}</Box>}
    </div>
  );
}

const ArtistDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { addToCart } = useCart();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistStats, setArtistStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    draftListings: 0,
    messagesReceived: 0,
    totalLikes: 0,
  });
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [listingsPage, setListingsPage] = useState(1);
  const [listingsStatusFilter, setListingsStatusFilter] = useState<string>('all');
  const [listingsPagination, setListingsPagination] = useState<{ page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } | null>(null);
  const [loadingListings, setLoadingListings] = useState(false);
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
  const [settings, setSettings] = useState({
    default_allow_comments: true,
    email_notifications: true,
    comment_notifications: true,
    default_special_instructions: '',
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [activatingListing, setActivatingListing] = useState<number | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
      fetchSubscription();
      if (tabValue === 2) {
        fetchProfile();
      }
      if (tabValue === 3) {
        fetchSettings();
      }
    }
  }, [user?.id, tabValue]);

  useEffect(() => {
    if (user?.id && tabValue === 0) {
      fetchListings();
    }
  }, [user?.id, listingsPage, listingsStatusFilter, tabValue]);

  useEffect(() => {
    // Reset to page 1 when filter changes
    if (tabValue === 0) {
      setListingsPage(1);
    }
  }, [listingsStatusFilter, tabValue]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data: DashboardData = await apiService.getDashboardData(user.id);
      setArtistStats(data.stats);
      // Don't set recentListings here anymore - we use paginated listings
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      // Set default values on error
      setArtistStats({
        totalListings: 0,
        activeListings: 0,
        totalViews: 0,
        draftListings: 0,
        messagesReceived: 0,
        totalLikes: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    if (!user?.id) return;
    
    try {
      const subscriptionData = await apiService.getUserSubscription(user.id);
      setSubscription(subscriptionData.subscription);
    } catch (err: any) {
      setSubscription(null);
    }
  };

  const fetchListings = async () => {
    if (!user?.id) return;
    
    setLoadingListings(true);
    try {
      const filters: any = {
        cognitoUsername: user.id,
        page: listingsPage,
        limit: 12,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      };
      
      // Add status filter if not 'all'
      if (listingsStatusFilter && listingsStatusFilter !== 'all') {
        filters.status = listingsStatusFilter;
      }
      
      const response = await apiService.getListings(filters);
      setRecentListings(response.listings || []);
      if (response.pagination) {
        setListingsPagination(response.pagination);
      } else {
        // Fallback pagination if API doesn't return it
        const total = response.listings?.length || 0;
        setListingsPagination({
          page: listingsPage,
          limit: 12,
          total: total,
          totalPages: Math.ceil(total / 12),
          hasNext: false,
          hasPrev: false,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load listings');
      setRecentListings([]);
      setListingsPagination(null);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleListingsPageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setListingsPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      // Refresh listings if on the listings tab
      if (tabValue === 0) {
        await fetchListings();
      }
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

  const fetchSettings = async () => {
    if (!user?.id) return;
    
    setLoadingSettings(true);
    setSettingsError(null);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings({
        default_allow_comments: data.default_allow_comments !== undefined ? data.default_allow_comments : true,
        email_notifications: data.email_notifications !== undefined ? data.email_notifications : true,
        comment_notifications: data.comment_notifications !== undefined ? data.comment_notifications : true,
        default_special_instructions: data.default_special_instructions !== undefined && data.default_special_instructions !== null
          ? String(data.default_special_instructions)
          : '',
      });
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to load settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSettingsChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement;
    setSettings({
      ...settings,
      [field]: target.type === 'checkbox' ? target.checked : target.value,
    });
    if (settingsError) setSettingsError(null);
    if (settingsSuccess) setSettingsSuccess(false);
  };

  const handleSettingsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);
    
    const payload = {
      default_allow_comments: settings.default_allow_comments,
      email_notifications: settings.email_notifications,
      comment_notifications: settings.comment_notifications,
      default_special_instructions: settings.default_special_instructions || '',
    };
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || `Failed to update settings: ${response.status}`);
      }

      const data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server');
      }
      const newSettings = {
        default_allow_comments: data.default_allow_comments !== undefined ? data.default_allow_comments : settings.default_allow_comments,
        email_notifications: data.email_notifications !== undefined ? data.email_notifications : settings.email_notifications,
        comment_notifications: data.comment_notifications !== undefined ? data.comment_notifications : settings.comment_notifications,
        default_special_instructions: data.default_special_instructions !== undefined && data.default_special_instructions !== null 
          ? String(data.default_special_instructions) 
          : (settings.default_special_instructions || ''),
      };
      setSettings(newSettings);
      setSettingsSuccess(true);
      enqueueSnackbar('Settings saved successfully!', { variant: 'success' });
      
      setTimeout(() => {
        setSettingsSuccess(false);
      }, 3000);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
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
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Artist'}!`}
        subtitle="Manage your listings, track engagement, and grow your art business."
        icon={<PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
      />
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
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
            <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.totalListings}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Listings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <VisibilityIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.activeListings}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Listings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <VisibilityIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.totalViews}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Views
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <DraftIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.draftListings}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Draft Listings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <EmailIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.messagesReceived}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Messages Received
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <FavoriteIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.totalLikes}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Likes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {subscription && (
            <Grid item xs={12}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(74, 58, 154, 0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {subscription.plan_name} Plan ({subscription.billing_period})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subscription.current_listings || 0} / {subscription.max_listings} active listings
                        {subscription.end_date && ` • Expires: ${new Date(subscription.end_date).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/subscription-plans')}
                    >
                      Manage Subscription
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
          {!subscription && (
            <Grid item xs={12}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'warning.main', bgcolor: 'rgba(255, 143, 0, 0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600} color="warning.main">
                        No Active Subscription
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Subscribe to a plan to activate your listings and start selling
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => navigate('/subscription-plans')}
                    >
                      View Plans
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Main Content Tabs */}
        <Paper elevation={0} sx={{ width: '100%', mb: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="My Listings" />
              <Tab label="Analytics" />
              <Tab label="Profile" />
              <Tab label="Settings" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ArtTrackIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      My Listings
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage your artwork listings and track their performance
                    </Typography>
                  </Box>
                </Box>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/create-listing')}
                  sx={{
                    borderRadius: 1,
                    fontWeight: 600,
                    textTransform: 'none',
                    px: 3,
                  }}
                >
                  Add New Listing
                </Button>
              </Box>
            </Box>
            
            {/* Filter Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={listingsStatusFilter}
                  label="Filter by Status"
                  onChange={(e) => setListingsStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Listings</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="sold">Sold</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
              
              {listingsPagination && listingsPagination.total > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Showing {((listingsPagination.page - 1) * listingsPagination.limit) + 1} - {Math.min(listingsPagination.page * listingsPagination.limit, listingsPagination.total)} of {listingsPagination.total} listings
                </Typography>
              )}
            </Box>
            
            {loadingListings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                
                <Grid container spacing={2}>
                  {recentListings.length === 0 ? (
                    <Grid item xs={12}>
                      <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivateListing(listing.id);
                            }}
                            disabled={activatingListing === listing.id}
                            sx={{ mb: 1 }}
                          >
                            {activatingListing === listing.id ? 'Activating...' : 'Activate Listing'}
                          </Button>
                          {subscription && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                              {subscription.listings_remaining !== undefined && subscription.listings_remaining > 0
                                ? `${subscription.listings_remaining} slots remaining`
                                : 'Subscription limit reached'}
                            </Typography>
                          )}
                          {!subscription && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                              Subscribe to activate listings
                            </Typography>
                          )}
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

                {listingsPagination && listingsPagination.total > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                    <Pagination
                      count={listingsPagination.totalPages || 1}
                      page={listingsPagination.page || listingsPage}
                      onChange={handleListingsPageChange}
                      color="primary"
                      size="large"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <BarChartIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Analytics Overview
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Track your artwork performance and engagement metrics
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Listing Performance Cards */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                      }}
                    >
                      <ArtTrackIcon sx={{ fontSize: 24 }} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                    {artistStats.totalListings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Total Listings
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'success.main',
                        color: 'white',
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 24 }} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                    {artistStats.activeListings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Active Listings
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'warning.main',
                        color: 'white',
                      }}
                    >
                      <DraftIcon sx={{ fontSize: 24 }} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                    {artistStats.draftListings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Draft Listings
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'info.main',
                        color: 'white',
                      }}
                    >
                      <VisibilityIcon sx={{ fontSize: 24 }} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                    {artistStats.totalViews.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Total Views
                  </Typography>
                </Paper>
              </Grid>

              {/* Engagement Cards */}
              <Grid item xs={12} sm={6} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5,
                    height: '100%',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'error.main',
                        color: 'white',
                      }}
                    >
                      <FavoriteIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {artistStats.totalLikes.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Total Likes
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Average per listing: {artistStats.totalListings > 0 
                        ? Math.round(artistStats.totalLikes / artistStats.totalListings) 
                        : 0}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5,
                    height: '100%',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'secondary.main',
                        color: 'white',
                      }}
                    >
                      <MessageIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {artistStats.messagesReceived.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Messages Received
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      From potential buyers and interested collectors
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5,
                    height: '100%',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: '#00bcd4',
                        color: 'white',
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {artistStats.totalListings > 0 
                          ? Math.round((artistStats.totalViews / artistStats.totalListings) * 10) / 10 
                          : 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Avg Views per Listing
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Engagement rate indicator
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <PersonIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Artist Profile
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Manage your profile information and showcase your artistic identity
              </Typography>
            </Box>

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

            <form onSubmit={handleProfileSubmit}>
              <Grid container spacing={3}>
                {/* Personal Information Section */}
                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: 'primary.main',
                          color: 'white',
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Personal Information
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="First Name"
                          value={profileFormData.firstName}
                          onChange={handleProfileInputChange('firstName')}
                          required
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={profileFormData.lastName}
                          onChange={handleProfileInputChange('lastName')}
                          required
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Email"
                          value={profileData?.email || user?.email || ''}
                          disabled
                          helperText="Email cannot be changed"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Business/Studio Name"
                          value={profileFormData.businessName}
                          onChange={handleProfileInputChange('businessName')}
                          required
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Contact Information Section */}
                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: 'info.main',
                          color: 'white',
                        }}
                      >
                        <EmailIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Contact Information
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          value={profileFormData.phone}
                          onChange={handleProfileInputChange('phone')}
                          placeholder="+1234567890"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Country"
                          value={profileFormData.country}
                          onChange={handleProfileInputChange('country')}
                          required
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Website"
                          value={profileFormData.website}
                          onChange={handleProfileInputChange('website')}
                          placeholder="https://yourwebsite.com"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Professional Information Section */}
                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: 'success.main',
                          color: 'white',
                        }}
                      >
                        <TrendingUpIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Professional Information
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth sx={{ bgcolor: 'background.paper' }}>
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
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                          Specialties
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                          {['Painting', 'Woodworking', 'Other'].map((specialty) => (
                            <Chip
                              key={specialty}
                              label={specialty}
                              onClick={() => handleSpecialtyChange(specialty)}
                              color={profileFormData.specialties.includes(specialty) ? 'primary' : 'default'}
                              variant={profileFormData.specialties.includes(specialty) ? 'filled' : 'outlined'}
                              sx={{
                                height: 36,
                                fontSize: '0.875rem',
                                fontWeight: profileFormData.specialties.includes(specialty) ? 600 : 400,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                },
                              }}
                            />
                          ))}
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={5}
                          label="Bio"
                          value={profileFormData.bio}
                          onChange={handleProfileInputChange('bio')}
                          placeholder="Tell us about yourself and your artistic journey..."
                          helperText="Share your story, inspiration, and artistic background"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Signature Section */}
                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: 'secondary.main',
                          color: 'white',
                        }}
                      >
                        <EditIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Digital Signature
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
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
                    </Box>
                  </Paper>
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={savingProfile}
                      startIcon={savingProfile ? <CircularProgress size={20} /> : <PersonIcon />}
                      sx={{
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 600,
                        textTransform: 'none',
                      }}
                    >
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <SettingsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Settings
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Configure your account preferences and default listing settings
              </Typography>
            </Box>

            {settingsError && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSettingsError(null)}>
                {settingsError}
              </Alert>
            )}

            {settingsSuccess && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSettingsSuccess(false)}>
                Settings saved successfully!
              </Alert>
            )}

            {loadingSettings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <form onSubmit={handleSettingsSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Comment Settings
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.default_allow_comments}
                            onChange={handleSettingsChange('default_allow_comments')}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              Allow Comments by Default
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              New listings will have comments enabled by default. You can change this for individual listings.
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Notification Settings
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.email_notifications}
                            onChange={handleSettingsChange('email_notifications')}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              Email Notifications
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Receive email notifications for messages and inquiries
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.comment_notifications}
                            onChange={handleSettingsChange('comment_notifications')}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              Comment Notifications
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Get notified when someone comments on your listings
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        Default Special Instructions
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Default Special Instructions"
                        value={settings.default_special_instructions || ''}
                        onChange={handleSettingsChange('default_special_instructions')}
                        placeholder="Enter default special instructions that will be pre-filled for all new listings (e.g., framing recommendations, care instructions, customization options)..."
                        helperText="This will be automatically filled in when creating new listings. You can edit it for individual listings."
                        sx={{ bgcolor: 'background.default' }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={savingSettings}
                          startIcon={savingSettings ? <CircularProgress size={20} /> : <SettingsIcon />}
                        >
                          {savingSettings ? 'Saving...' : 'Save Settings'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </form>
              </Paper>
            )}
          </TabPanel>
        </Paper>
          </>
        )}
      </Box>

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
