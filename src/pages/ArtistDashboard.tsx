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
  ListItemButton,
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
  Cancel as CancelIcon,
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  ShoppingBag as ShoppingBagIcon,
  Store as StoreIcon,
  LocalShipping as LocalShippingIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import apiService, { DashboardData, Listing, Order, SubscriptionPlan, User, UserSubscription } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import OrderCardComponent from '../components/OrderCard';
import { CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, TextField, Switch, FormControlLabel, Divider, RadioGroup, Radio, FormLabel, InputAdornment, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButtonGroup, ToggleButton, useTheme, LinearProgress, Collapse } from '@mui/material';
import { Lock as LockIcon, AttachMoney as AttachMoneyIcon, CalendarMonth as CalendarMonthIcon, ShowChart as ShowChartIcon, KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon } from '@mui/icons-material';
import SignatureInput from '../components/SignatureInput';
import PageHeader from '../components/PageHeader';
import ImagePlaceholder from '../components/ImagePlaceholder';
import { getPaintingDetailPath } from '../utils/seoPaths';

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

const CATEGORY_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];

const ArtistDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { addToCart } = useCart();
  const theme = useTheme();
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
  const [listingsView, setListingsView] = useState<'grid' | 'table'>('table');
  const [listingImageErrors, setListingImageErrors] = useState<Record<number, boolean>>({});
  const [analyticsListingImageErrors, setAnalyticsListingImageErrors] = useState<Record<number, boolean>>({});
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
    socialInstagram: '',
    socialTikTok: '',
    socialBehance: '',
    socialYouTube: '',
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: 'US',
    billingLine1: '',
    billingLine2: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: 'US',
    billingSameAsShipping: false,
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
    default_shipping_preference: 'buyer' as 'free' | 'buyer',
    default_shipping_carrier: 'shippo' as 'shippo' | 'own',
    default_return_days: 30 as number | null,
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [activatingListing, setActivatingListing] = useState<number | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [resumingSubscription, setResumingSubscription] = useState(false);
  const [cancelSubscriptionDialogOpen, setCancelSubscriptionDialogOpen] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionRoi, setSubscriptionRoi] = useState<{
    last30Net: number;
    last30Orders: number;
    monthlyCost: number;
    costPerOrder: number | null;
    costPerActiveListing: number | null;
    roiMultiple: number | null;
  }>({
    last30Net: 0,
    last30Orders: 0,
    monthlyCost: 0,
    costPerOrder: null,
    costPerActiveListing: null,
    roiMultiple: null,
  });
  const [purchasesOrders, setPurchasesOrders] = useState<Order[]>([]);
  const [salesOrders, setSalesOrders] = useState<Order[]>([]);
  const [ordersSubTab, setOrdersSubTab] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string>('all');
  const [ordersSearchTerm, setOrdersSearchTerm] = useState('');
  const [connectStatus, setConnectStatus] = useState<{ connected: boolean; chargesEnabled?: boolean } | null>(null);
  const [shippingConfigured, setShippingConfigured] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [labelRates, setLabelRates] = useState<Array<{ object_id: string; provider: string; servicelevel: string; amount: string; estimated_days?: number }>>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelPurchasing, setLabelPurchasing] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState<number | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    summary: {
      totalEarnings: number;
      totalGrossEarnings: number;
      totalNetEarnings: number;
      totalStripeFees: number;
      totalLabelCosts: number;
      totalCommission: number;
      totalDeductions: number;
      netMarginPercent: number;
      totalOrders: number;
      avgOrderValue: number;
      thisMonth: number;
      lastMonth: number;
      ytd: number;
    };
    revenueOverTime: {
      month: string;
      earnings: number;
      grossEarnings: number;
      netEarnings: number;
      stripeFees: number;
      labelCosts: number;
      commissionCosts: number;
      orders: number;
    }[];
    topListings: { id: number; title: string; primaryImageUrl: string; category: string; totalRevenue: number; orderCount: number }[];
    revenueByCategory: { category: string; earnings: number; orders: number }[];
    conversionFunnel: {
      views: number;
      likes: number;
      inquiries: number;
      orders: number;
      viewToLikeRate: number;
      likeToInquiryRate: number;
      inquiryToOrderRate: number;
      viewToOrderRate: number;
    };
    missedRevenueOpportunities: Array<{
      id: number;
      title: string;
      status: string;
      views: number;
      currentOrders: number;
      estimatedExtraOrders: number;
      estimatedExtraRevenue: number;
    }>;
    pricingIntelligence: Array<{
      id: number;
      title: string;
      category: string;
      medium: string;
      listingPrice: number;
      marketAvgPrice: number | null;
      suggestedMin: number | null;
      suggestedMax: number | null;
      priceDeltaPercent: number | null;
      listingConversionRate: number;
      soldOrders: number;
      views: number;
      marketSales: number;
    }>;
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [monthlyNetGoal, setMonthlyNetGoal] = useState<number>(0);
  const [analyticsRowsOpen, setAnalyticsRowsOpen] = useState({
    summary: true,
    deductions: true,
    trend: true,
    performance: true,
    growth: true,
    pricing: true,
  });

  const filterDashboardOrders = (orders: Order[]) => {
    return orders.filter((order) => {
      const matchesStatus = ordersStatusFilter === 'all' || order.status === ordersStatusFilter;
      const search = ordersSearchTerm.trim().toLowerCase();
      const matchesSearch = !search ||
        (order.order_number?.toLowerCase().includes(search)) ||
        (order.listing_title?.toLowerCase().includes(search)) ||
        (order.buyer_email?.toLowerCase().includes(search)) ||
        (order.seller_email?.toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  };
  const filteredPurchasesOrders = filterDashboardOrders(purchasesOrders);
  const filteredSalesOrders = filterDashboardOrders(salesOrders);
  const [ordersPurchasePage, setOrdersPurchasePage] = useState(1);
  const [ordersSalesPage, setOrdersSalesPage] = useState(1);
  const ordersPerPage = 6;
  const purchasesTotalPages = Math.ceil(filteredPurchasesOrders.length / ordersPerPage);
  const salesTotalPages = Math.ceil(filteredSalesOrders.length / ordersPerPage);
  const safePurchasePage = Math.min(ordersPurchasePage, purchasesTotalPages || 1);
  const safeSalesPage = Math.min(ordersSalesPage, salesTotalPages || 1);
  const paginatedPurchases = filteredPurchasesOrders.slice((safePurchasePage - 1) * ordersPerPage, safePurchasePage * ordersPerPage);
  const paginatedSales = filteredSalesOrders.slice((safeSalesPage - 1) * ordersPerPage, safeSalesPage * ordersPerPage);
  const isShippingAddressComplete = Boolean(
    profileFormData.addressLine1.trim() &&
    profileFormData.addressCity.trim() &&
    profileFormData.addressState.trim() &&
    profileFormData.addressZip.trim() &&
    profileFormData.addressCountry.trim()
  );
  const profileCompletenessChecks = [
    Boolean(profileFormData.firstName.trim()),
    Boolean(profileFormData.lastName.trim()),
    Boolean(profileFormData.businessName.trim()),
    Boolean(profileFormData.phone.trim()),
    Boolean(profileFormData.country.trim()),
    Boolean(profileFormData.website.trim()),
    Boolean(profileFormData.bio.trim()),
    Boolean(profileFormData.experience.trim()),
    profileFormData.specialties.length > 0,
    Boolean(profileFormData.signatureUrl),
    isShippingAddressComplete,
    Boolean(
      profileFormData.socialInstagram.trim() ||
      profileFormData.socialTikTok.trim() ||
      profileFormData.socialBehance.trim() ||
      profileFormData.socialYouTube.trim()
    ),
  ];
  const profileCompletenessPercent = Math.round(
    (profileCompletenessChecks.filter(Boolean).length / profileCompletenessChecks.length) * 100
  );
  const payoutReadiness = {
    stripeConnected: Boolean(connectStatus?.connected && connectStatus?.chargesEnabled),
    shippingAddress: isShippingAddressComplete,
    profileQuality: profileCompletenessPercent >= 70,
  };
  const shippingProfileComplete = profileData ? isShippingAddressComplete : undefined;
  const needsShippingProfile = shippingProfileComplete === false;
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const fetchAnalytics = async () => {
    if (!user?.id) return;
    setLoadingAnalytics(true);
    try {
      const data = await apiService.getArtistAnalytics(user.id);
      setAnalyticsData(data);
    } catch {
      setAnalyticsData(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };
  const toggleAnalyticsRow = (key: keyof typeof analyticsRowsOpen) => {
    setAnalyticsRowsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (!user?.id) return;
    try {
      const storedGoal = localStorage.getItem(`artistMonthlyNetGoal:${user.id}`);
      if (storedGoal) {
        const parsed = Number(storedGoal);
        if (Number.isFinite(parsed) && parsed > 0) setMonthlyNetGoal(parsed);
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !Number.isFinite(monthlyNetGoal) || monthlyNetGoal <= 0) return;
    try {
      localStorage.setItem(`artistMonthlyNetGoal:${user.id}`, String(monthlyNetGoal));
    } catch {}
  }, [user?.id, monthlyNetGoal]);

  useEffect(() => {
    if (!analyticsData || monthlyNetGoal > 0) return;
    const suggested = Math.max(
      Math.ceil(analyticsData.summary.lastMonth || 0),
      Math.ceil(analyticsData.summary.thisMonth || 0),
      1000
    );
    setMonthlyNetGoal(suggested);
  }, [analyticsData, monthlyNetGoal]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
      fetchSubscription();
      if (tabValue === 2 && subscription?.tier === 'enterprise') {
        fetchAnalytics();
      }
      if (tabValue === 4 || tabValue === 5) {
        fetchProfile();
      }
      if (tabValue === 4 || tabValue === 5) {
        fetchConnectStatus();
      }
      if (tabValue === 5) {
        fetchSettings();
      }
    }
  }, [user?.id, tabValue]);

  useEffect(() => {
    if (tabValue !== 3 || !user?.id) return;
    fetchSubscriptionPlans();
  }, [tabValue, user?.id]);

  useEffect(() => {
    if (tabValue !== 3 || !subscription || !user?.id) return;
    fetchSubscriptionRoi();
  }, [tabValue, subscription?.id, subscription?.billing_period, user?.id]);

  const fetchConnectStatus = async () => {
    if (!user?.id) return;
    try {
      const status = await apiService.getStripeConnectStatus(user.id);
      setConnectStatus(status);
    } catch {
      setConnectStatus({ connected: false });
    }
  };

  const handleConnectOnboarding = async () => {
    if (!user?.id || !profileData?.email) {
      enqueueSnackbar('Please save your profile with an email first', { variant: 'warning' });
      return;
    }
    setConnectLoading(true);
    try {
      await apiService.createStripeConnectAccount(user.id, profileData.email, profileData.business_name || undefined);
      const { url } = await apiService.createStripeConnectAccountLink(user.id);
      window.location.href = url;
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to start payout setup', { variant: 'error' });
    } finally {
      setConnectLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && tabValue === 0) {
      fetchListings();
    }
  }, [user?.id, listingsPage, listingsStatusFilter, tabValue]);

  // Auto-activate listing when returning from subscription payment with listingIdToActivate
  useEffect(() => {
    const state = location.state as { listingIdToActivate?: number } | null;
    const listingIdToActivate = state?.listingIdToActivate;
    if (!listingIdToActivate || !subscription || !user?.id) return;
    let cancelled = false;
    const activateAndClear = async () => {
      try {
        await apiService.activateListing(listingIdToActivate, user.id);
        if (!cancelled) {
          enqueueSnackbar('Listing activated successfully!', { variant: 'success' });
          await fetchListings();
          await fetchDashboardData();
          navigate(location.pathname, { replace: true, state: {} });
        }
      } catch (err: any) {
        if (!cancelled) {
          enqueueSnackbar(err.message || 'Failed to activate listing', { variant: 'error' });
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    };
    activateAndClear();
    return () => { cancelled = true; };
  }, [subscription?.id, (location.state as any)?.listingIdToActivate, user?.id]);

  useEffect(() => {
    // Reset to page 1 when filter changes
    if (tabValue === 0) {
      setListingsPage(1);
    }
  }, [listingsStatusFilter, tabValue]);

  // Open Subscription tab when navigating from Subscription Plans
  useEffect(() => {
    const state = location.state as { tab?: string } | null;
    if (state?.tab === 'subscription') {
      setTabValue(3);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  useEffect(() => {
    if (user?.id && tabValue === 1) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const [purchases, sales] = await Promise.all([
            apiService.getUserOrders(user.id, 'buyer'),
            apiService.getUserOrders(user.id, 'seller'),
          ]);
          setPurchasesOrders(purchases || []);
          setSalesOrders(sales || []);
        } catch {
          setPurchasesOrders([]);
          setSalesOrders([]);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [user?.id, tabValue]);

  useEffect(() => {
    if (tabValue === 1) {
      apiService.isShippingConfigured().then((r) => setShippingConfigured(r.configured)).catch(() => setShippingConfigured(false));
    }
  }, [tabValue]);

  const refreshOrders = async () => {
    if (!user?.id) return;
    try {
      const [purchases, sales] = await Promise.all([
        apiService.getUserOrders(user.id, 'buyer'),
        apiService.getUserOrders(user.id, 'seller'),
      ]);
      setPurchasesOrders(purchases || []);
      setSalesOrders(sales || []);
    } catch {}
  };

  const handleOpenLabelDialog = async (order: Order) => {
    setLabelOrder(order);
    setLabelDialogOpen(true);
    setLabelRates([]);
    setLabelLoading(true);
    try {
      const { rates } = await apiService.getShippingRatesForOrder(order.id, user!.id);
      setLabelRates(rates || []);
    } catch (err: any) {
      enqueueSnackbar(err?.message || 'Failed to get shipping rates', { variant: 'error' });
    } finally {
      setLabelLoading(false);
    }
  };

  const handlePurchaseLabel = async (rateId: string) => {
    if (!user?.id || !labelOrder) return;
    setLabelPurchasing(true);
    try {
      const result = await apiService.purchaseShippingLabel(labelOrder.id, rateId, user.id);
      enqueueSnackbar('Label purchased!', { variant: 'success' });
      setLabelDialogOpen(false);
      setLabelOrder(null);
      setLabelRates([]);
      if (result.label_url) window.open(result.label_url, '_blank');
      await refreshOrders();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to purchase label', { variant: 'error' });
    } finally {
      setLabelPurchasing(false);
    }
  };

  const handleMarkShipped = async (orderId: number, trackingNumber?: string, trackingUrl?: string) => {
    if (!user?.id) return;
    setOrderActionLoading(orderId);
    try {
      await apiService.markOrderShipped(orderId, user.id, {
        shipping_carrier: 'own',
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
      });
      await refreshOrders();
      enqueueSnackbar('Order marked as shipped', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to mark as shipped', { variant: 'error' });
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleConfirmDelivery = async (orderId: number) => {
    if (!user?.id) return;
    setOrderActionLoading(orderId);
    try {
      await apiService.confirmOrderDelivery(orderId, user.id);
      await refreshOrders();
      enqueueSnackbar('Delivery confirmed', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to confirm delivery', { variant: 'error' });
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleOpenReturnDialog = (order: Order) => {
    setReturnOrder(order);
    setReturnReason('');
    setReturnDialogOpen(true);
  };

  const handleSubmitReturn = async () => {
    if (!user?.id || !returnOrder) return;
    setReturnLoading(true);
    try {
      await apiService.requestReturn(returnOrder.id, user.id, returnReason);
      enqueueSnackbar('Return request submitted', { variant: 'success' });
      setReturnDialogOpen(false);
      setReturnOrder(null);
      await refreshOrders();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to submit return request', { variant: 'error' });
    } finally {
      setReturnLoading(false);
    }
  };

  const handleRespondReturn = async (orderId: number, action: 'approved' | 'denied') => {
    if (!user?.id) return;
    setOrderActionLoading(orderId);
    try {
      await apiService.respondToReturn(orderId, user.id, action);
      enqueueSnackbar(`Return ${action}`, { variant: action === 'approved' ? 'success' : 'info' });
      await refreshOrders();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to respond to return', { variant: 'error' });
    } finally {
      setOrderActionLoading(null);
    }
  };

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

  const fetchSubscriptionPlans = async () => {
    try {
      const plans = await apiService.getSubscriptionPlans();
      setSubscriptionPlans(Array.isArray(plans) ? plans : []);
    } catch {
      setSubscriptionPlans([]);
    }
  };

  const fetchSubscriptionRoi = async () => {
    if (!user?.id || !subscription) return;
    try {
      const orders = await apiService.getUserOrders(user.id, 'seller');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const last30Orders = (orders || []).filter((order) => {
        const createdAt = order.created_at ? new Date(order.created_at) : null;
        return Boolean(createdAt && createdAt >= cutoff && order.status !== 'cancelled');
      }).length;
      const last30Net = (orders || []).reduce((sum, order) => {
        const createdAt = order.created_at ? new Date(order.created_at) : null;
        if (!createdAt || createdAt < cutoff || order.status === 'cancelled') return sum;
        const net = Number(order.payout_amount ?? order.artist_earnings ?? 0);
        return sum + (Number.isFinite(net) ? net : 0);
      }, 0);
      const monthlyCost = Number(
        subscription.billing_period === 'yearly'
          ? ((subscription.price_yearly || 0) / 12)
          : (subscription.price_monthly || 0)
      );
      const roiMultiple = monthlyCost > 0 ? last30Net / monthlyCost : null;
      const activeListings = Number(subscription.current_listings || 0);
      const costPerOrder = last30Orders > 0 && monthlyCost > 0 ? (monthlyCost / last30Orders) : null;
      const costPerActiveListing = activeListings > 0 && monthlyCost > 0 ? (monthlyCost / activeListings) : null;
      setSubscriptionRoi({
        last30Net,
        last30Orders,
        monthlyCost,
        costPerOrder,
        costPerActiveListing,
        roiMultiple,
      });
    } catch {
      setSubscriptionRoi({
        last30Net: 0,
        last30Orders: 0,
        monthlyCost: 0,
        costPerOrder: null,
        costPerActiveListing: null,
        roiMultiple: null,
      });
    }
  };

  const fetchListings = async () => {
    if (!user?.id) return;
    
    setLoadingListings(true);
    try {
      const filters: any = {
        cognitoUsername: user.id,
        requestingUser: user.id,
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
        socialInstagram: (data as any).social_instagram || '',
        socialTikTok: (data as any).social_tiktok || '',
        socialBehance: (data as any).social_behance || '',
        socialYouTube: (data as any).social_youtube || '',
        addressLine1: (data as any).address_line1 || '',
        addressLine2: (data as any).address_line2 || '',
        addressCity: (data as any).address_city || '',
        addressState: (data as any).address_state || '',
        addressZip: (data as any).address_zip || '',
        addressCountry: (data as any).address_country || 'US',
        billingLine1: (data as any).billing_line1 || '',
        billingLine2: (data as any).billing_line2 || '',
        billingCity: (data as any).billing_city || '',
        billingState: (data as any).billing_state || '',
        billingZip: (data as any).billing_zip || '',
        billingCountry: (data as any).billing_country || 'US',
        billingSameAsShipping:
          ((data as any).address_line1 || '') === ((data as any).billing_line1 || '') &&
          ((data as any).address_line2 || '') === ((data as any).billing_line2 || '') &&
          ((data as any).address_city || '') === ((data as any).billing_city || '') &&
          ((data as any).address_state || '') === ((data as any).billing_state || '') &&
          ((data as any).address_zip || '') === ((data as any).billing_zip || '') &&
          ((data as any).address_country || 'US') === ((data as any).billing_country || 'US') &&
          !!((data as any).address_line1 || (data as any).billing_line1),
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
        social_instagram: profileFormData.socialInstagram || null,
        social_tiktok: profileFormData.socialTikTok || null,
        social_behance: profileFormData.socialBehance || null,
        social_youtube: profileFormData.socialYouTube || null,
        address_line1: profileFormData.addressLine1 || null,
        address_line2: profileFormData.addressLine2 || null,
        address_city: profileFormData.addressCity || null,
        address_state: profileFormData.addressState || null,
        address_zip: profileFormData.addressZip || null,
        address_country: profileFormData.addressCountry || 'US',
        billing_line1: (profileFormData.billingSameAsShipping ? profileFormData.addressLine1 : profileFormData.billingLine1) || null,
        billing_line2: (profileFormData.billingSameAsShipping ? profileFormData.addressLine2 : profileFormData.billingLine2) || null,
        billing_city: (profileFormData.billingSameAsShipping ? profileFormData.addressCity : profileFormData.billingCity) || null,
        billing_state: (profileFormData.billingSameAsShipping ? profileFormData.addressState : profileFormData.billingState) || null,
        billing_zip: (profileFormData.billingSameAsShipping ? profileFormData.addressZip : profileFormData.billingZip) || null,
        billing_country: (profileFormData.billingSameAsShipping ? profileFormData.addressCountry : profileFormData.billingCountry) || 'US',
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
      await apiService.deleteListing(listingToDelete.id, user.id, user.groups);
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

  const handleActivateListing = async (listingId: number) => {
    if (!user?.id) return;
    if (!subscription) {
      navigate('/subscription-plans', { state: { listingIdToActivate: listingId } });
      return;
    }
    setActivatingListing(listingId);
    try {
      await apiService.activateListing(listingId, user.id);
      enqueueSnackbar('Listing activated successfully!', { variant: 'success' });
      await fetchListings();
      await fetchDashboardData();
      await fetchSubscription();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to activate listing', { variant: 'error' });
    } finally {
      setActivatingListing(null);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    setCancellingSubscription(true);
    try {
      await apiService.cancelSubscription(user.id);
      enqueueSnackbar('Subscription cancelled. You will retain access until the end of your billing period.', { variant: 'success' });
      setCancelSubscriptionDialogOpen(false);
      await fetchSubscription();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to cancel subscription', { variant: 'error' });
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!user?.id) return;
    setResumingSubscription(true);
    try {
      await apiService.resumeSubscription(user.id);
      enqueueSnackbar('Subscription resumed. Your subscription will renew automatically.', { variant: 'success' });
      await fetchSubscription();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to resume subscription', { variant: 'error' });
    } finally {
      setResumingSubscription(false);
    }
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
        default_shipping_preference: (data.default_shipping_preference === 'free' || data.default_shipping_preference === 'buyer') ? data.default_shipping_preference : 'buyer',
        default_shipping_carrier: (data.default_shipping_carrier === 'shippo' || data.default_shipping_carrier === 'own') ? data.default_shipping_carrier : 'shippo',
        default_return_days: (data.default_return_days != null && Number(data.default_return_days) > 0 && Number(data.default_return_days) <= 365) ? Number(data.default_return_days) : (data.default_return_days === null ? null : 30),
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

  const handleShippingPreferenceChange = (value: 'free' | 'buyer') => {
    setSettings(prev => ({ ...prev, default_shipping_preference: value }));
    if (settingsError) setSettingsError(null);
    if (settingsSuccess) setSettingsSuccess(false);
  };

  const handleShippingCarrierChange = (value: 'shippo' | 'own') => {
    setSettings(prev => ({ ...prev, default_shipping_carrier: value }));
    if (settingsError) setSettingsError(null);
    if (settingsSuccess) setSettingsSuccess(false);
  };

  const handleReturnDaysChange = (value: number | null) => {
    setSettings(prev => ({ ...prev, default_return_days: value }));
    if (settingsError) setSettingsError(null);
    if (settingsSuccess) setSettingsSuccess(false);
  };

  const handleReturnDaysInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    if (v === '') return;
    const n = parseInt(v, 10);
    if (!isNaN(n) && n > 0 && n <= 365) {
      handleReturnDaysChange(n);
    }
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
      default_shipping_preference: settings.default_shipping_preference,
      default_shipping_carrier: settings.default_shipping_carrier,
      default_return_days: settings.default_return_days,
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
        default_shipping_preference: (data.default_shipping_preference === 'free' || data.default_shipping_preference === 'buyer') ? data.default_shipping_preference : settings.default_shipping_preference,
        default_shipping_carrier: (data.default_shipping_carrier === 'shippo' || data.default_shipping_carrier === 'own') ? data.default_shipping_carrier : settings.default_shipping_carrier,
        default_return_days: (data.default_return_days != null && Number(data.default_return_days) > 0 && Number(data.default_return_days) <= 365) ? Number(data.default_return_days) : (data.default_return_days === null ? null : (settings.default_return_days ?? 30)),
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
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>Welcome back, {user?.name || 'Artist'}!</Typography>
              <Typography variant="body2" color="text.secondary">Manage your listings, track engagement, and grow your art business.</Typography>
            </Box>
          </Box>
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
            {/* Listing limit reached banner */}
            {subscription && subscription.status === 'active' && subscription.max_listings < 999999 && (subscription.current_listings ?? artistStats.activeListings) >= (subscription.max_listings ?? 0) && (
              <Alert
                severity="warning"
                sx={{ mb: 3 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/subscription-plans')}
                  >
                    Upgrade plan
                  </Button>
                }
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Listing limit reached ({subscription.current_listings ?? artistStats.activeListings} / {subscription.max_listings >= 999999 ? 'Unlimited' : subscription.max_listings} active)
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  You cannot activate more listings until you free up slots. Deactivate an existing listing to make room, or upgrade your plan for more active listings.
                </Typography>
              </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Total Listings', value: artistStats.totalListings, icon: <ArtTrackIcon />, color: '#6366f1' },
                { label: 'Active', value: artistStats.activeListings, icon: <CheckCircleIcon />, color: '#10b981' },
                { label: 'Drafts', value: artistStats.draftListings, icon: <DraftIcon />, color: '#f59e0b' },
                { label: 'Total Views', value: artistStats.totalViews, icon: <VisibilityIcon />, color: '#3b82f6' },
                { label: 'Messages', value: artistStats.messagesReceived, icon: <EmailIcon />, color: '#ef4444' },
                { label: 'Likes', value: artistStats.totalLikes, icon: <FavoriteIcon />, color: '#ec4899' },
              ].map((stat) => (
                <Grid item xs={4} sm={4} md={2} key={stat.label}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color, width: 40, height: 40, mx: 'auto', mb: 1 }}>
                      {stat.icon}
                    </Avatar>
                    <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {subscription ? (
              <Paper
                elevation={0}
                sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <CreditCardIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {subscription.plan_name} Plan ({subscription.billing_period})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {subscription.current_listings || 0} / {subscription.max_listings >= 999999 ? 'Unlimited' : subscription.max_listings} active listings
                      {subscription.end_date && ` · Expires: ${new Date(subscription.end_date).toLocaleDateString()}`}
                    </Typography>
                  </Box>
                </Box>
                <Button variant="outlined" size="small" onClick={() => navigate('/subscription-plans')} sx={{ textTransform: 'none' }}>
                  Manage Subscription
                </Button>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'warning.main', borderRadius: 2, bgcolor: 'rgba(255, 143, 0, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
                    <CreditCardIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight={600} color="warning.main">No Active Subscription</Typography>
                    <Typography variant="caption" color="text.secondary">Subscribe to start selling your artwork</Typography>
                  </Box>
                </Box>
                <Button variant="contained" size="small" color="primary" onClick={() => navigate('/subscription-plans')} sx={{ textTransform: 'none' }}>
                  View Plans
                </Button>
              </Paper>
            )}

        {/* Main Content Tabs */}
        <Paper elevation={0} sx={{ width: '100%', mb: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              <Tab label="My Listings" />
              <Tab label="Orders" />
              <Tab label="Analytics" />
              <Tab label="Subscription" />
              <Tab label="Profile" />
              <Tab label="Settings" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 3 }}>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                <ToggleButtonGroup
                  value={listingsView}
                  exclusive
                  onChange={(_, v) => v && setListingsView(v)}
                  size="small"
                >
                  <ToggleButton value="table">
                    <Tooltip title="List view"><ViewListIcon fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="grid">
                    <Tooltip title="Grid view"><ViewModuleIcon fontSize="small" /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
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
            ) : recentListings.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>No listings yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Start selling your art by creating your first listing
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/create-listing')}>
                  Add New Listing
                </Button>
              </Paper>
            ) : (
              <>
                {listingsView === 'table' ? (
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600, width: 60 }}>Image</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Views</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentListings.map((listing) => (
                          <TableRow key={listing.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ p: 1 }}>
                              {listing.primary_image_url && !listingImageErrors[listing.id] ? (
                                <Box
                                  component="img"
                                  src={getImageUrl(listing.primary_image_url)}
                                  alt={listing.title}
                                  onError={() => setListingImageErrors(prev => ({ ...prev, [listing.id]: true }))}
                                  sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }}
                                />
                              ) : (
                                <ImagePlaceholder sx={{ width: 48, height: 48, borderRadius: 1 }} iconSize={24} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 250 }}>
                                {listing.title}
                              </Typography>
                              {listing.category && (
                                <Typography variant="caption" color="text.secondary">{listing.category}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} color="primary">${listing.price ?? 0}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={listing.status === 'active' ? 'Active' : listing.status}
                                color={listing.status === 'active' ? 'success' : listing.status === 'draft' ? 'warning' : 'default'}
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{listing.views}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                {listing.status === 'draft' && (
                                  <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    onClick={() => handleActivateListing(listing.id)}
                                    disabled={activatingListing === listing.id}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25, minWidth: 0 }}
                                  >
                                    {activatingListing === listing.id ? '...' : 'Activate'}
                                  </Button>
                                )}
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => navigate(`/edit-listing/${listing.id}`)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View">
                                  <IconButton size="small" onClick={() => navigate(getPaintingDetailPath(listing.id, listing.title))}>
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteClick(listing)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Grid container spacing={1.5}>
                    {recentListings.map((listing) => (
                      <Grid item xs={6} sm={4} md={3} key={listing.id}>
                        <Card
                          elevation={0}
                          sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {listing.primary_image_url && !listingImageErrors[listing.id] ? (
                            <Box
                              component="img"
                              src={getImageUrl(listing.primary_image_url)}
                              alt={listing.title}
                              onError={() => setListingImageErrors(prev => ({ ...prev, [listing.id]: true }))}
                              sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <ImagePlaceholder sx={{ height: 120, width: '100%' }} iconSize={32} />
                          )}
                          <CardContent sx={{ flexGrow: 1, p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{listing.title}</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                              <Typography variant="body2" fontWeight={600} color="primary">${listing.price ?? 0}</Typography>
                              <Chip
                                label={listing.status}
                                color={listing.status === 'active' ? 'success' : listing.status === 'draft' ? 'warning' : 'default'}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', textTransform: 'capitalize' }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">{listing.views} views</Typography>
                            {listing.status === 'draft' && (
                              <Button
                                variant="outlined"
                                color="primary"
                                fullWidth
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleActivateListing(listing.id); }}
                                disabled={activatingListing === listing.id}
                                sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}
                              >
                                {activatingListing === listing.id ? '...' : 'Activate'}
                              </Button>
                            )}
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/edit-listing/${listing.id}`); }}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(getPaintingDetailPath(listing.id, listing.title)); }}>
                                  <VisibilityIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteClick(listing); }}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {listingsPagination && listingsPagination.total > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ReceiptIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      Orders
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      View your purchases and sales
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            {needsShippingProfile && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => setTabValue(4)}>
                    Complete profile
                  </Button>
                }
              >
                Your shipping address is incomplete. Complete it in Profile so you can buy labels and fulfill orders without issues.
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search orders..."
                value={ordersSearchTerm}
                onChange={(e) => { setOrdersSearchTerm(e.target.value); setOrdersPurchasePage(1); setOrdersSalesPage(1); }}
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={ordersStatusFilter}
                  label="Status"
                  onChange={(e) => { setOrdersStatusFilter(e.target.value); setOrdersPurchasePage(1); setOrdersSalesPage(1); }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="shipped">Shipped</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              {(ordersStatusFilter !== 'all' || ordersSearchTerm.trim()) && (
                <Button size="small" onClick={() => { setOrdersStatusFilter('all'); setOrdersSearchTerm(''); setOrdersPurchasePage(1); setOrdersSalesPage(1); }} startIcon={<FilterListIcon />}>
                  Clear
                </Button>
              )}
            </Box>
            <Tabs value={ordersSubTab} onChange={(_, v) => setOrdersSubTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tab icon={<ShoppingBagIcon />} iconPosition="start" label={`Purchases (${purchasesOrders.length})`} />
              <Tab icon={<StoreIcon />} iconPosition="start" label={`Sales (${salesOrders.length})`} />
            </Tabs>
            {loadingOrders ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : ordersSubTab === 0 ? (
              purchasesOrders.length === 0 ? (
                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <ShoppingBagIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No purchases yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Items you buy will appear here.
                  </Typography>
                  <Button variant="outlined" onClick={() => navigate('/gallery')}>
                    Browse Gallery
                  </Button>
                </Paper>
              ) : filteredPurchasesOrders.length === 0 ? (
                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <FilterListIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>No matching purchases</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Try adjusting your filters.</Typography>
                  <Button variant="outlined" size="small" onClick={() => { setOrdersStatusFilter('all'); setOrdersSearchTerm(''); setOrdersPurchasePage(1); setOrdersSalesPage(1); }}>Clear filters</Button>
                </Paper>
              ) : (
                <Box>
                  <Grid container spacing={2} alignItems="stretch">
                    {paginatedPurchases.map((order) => (
                      <Grid item xs={12} key={order.id} sx={{ display: 'flex' }}>
                        <OrderCardComponent
                          order={order}
                          type="purchase"
                          actionLoading={orderActionLoading}
                          shippingConfigured={shippingConfigured}
                        shippingCarrierPreference={settings.default_shipping_carrier}
                        shippingProfileComplete={shippingProfileComplete}
                          onConfirmDelivery={handleConfirmDelivery}
                          onOpenLabelDialog={handleOpenLabelDialog}
                          onMarkShipped={handleMarkShipped}
                          onOpenReturnDialog={handleOpenReturnDialog}
                          onRespondReturn={handleRespondReturn}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  {purchasesTotalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={purchasesTotalPages}
                        page={safePurchasePage}
                        onChange={(_e, p) => setOrdersPurchasePage(p)}
                        color="primary"
                      />
                    </Box>
                  )}
                </Box>
              )
            ) : salesOrders.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <StoreIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No sales yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  When buyers purchase your artwork, orders will appear here.
                </Typography>
                <Button variant="outlined" onClick={() => navigate('/orders')}>
                  View Orders Page
                </Button>
              </Paper>
            ) : filteredSalesOrders.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <FilterListIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>No matching sales</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Try adjusting your filters.</Typography>
                <Button variant="outlined" size="small" onClick={() => { setOrdersStatusFilter('all'); setOrdersSearchTerm(''); setOrdersPurchasePage(1); setOrdersSalesPage(1); }}>Clear filters</Button>
              </Paper>
            ) : (
              <Box>
                <Grid container spacing={2} alignItems="stretch">
                  {paginatedSales.map((order) => (
                    <Grid item xs={12} key={order.id} sx={{ display: 'flex' }}>
                      <OrderCardComponent
                        order={order}
                        type="sale"
                        actionLoading={orderActionLoading}
                        shippingConfigured={shippingConfigured}
                        shippingCarrierPreference={settings.default_shipping_carrier}
                        shippingProfileComplete={shippingProfileComplete}
                        onMarkShipped={handleMarkShipped}
                        onOpenLabelDialog={handleOpenLabelDialog}
                        onRespondReturn={handleRespondReturn}
                      />
                    </Grid>
                  ))}
                </Grid>
                {salesTotalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={salesTotalPages}
                      page={safeSalesPage}
                      onChange={(_e, p) => setOrdersSalesPage(p)}
                      color="primary"
                    />
                  </Box>
                )}
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {subscription?.tier !== 'enterprise' ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <LockIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Unlock Revenue Analytics
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
                  Get detailed revenue insights, track earnings over time, see your top performing listings, and analyze sales by category with an Enterprise subscription.
                </Typography>
                <Button variant="contained" size="large" onClick={() => navigate('/subscription-plans')} startIcon={<ShowChartIcon />}>
                  Upgrade to Enterprise
                </Button>
              </Box>
            ) : loadingAnalytics ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : !analyticsData ? (
              <Alert severity="info">No analytics data available yet. Start selling to see your revenue insights.</Alert>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <ShowChartIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                  <Typography variant="h5" fontWeight={600}>Revenue Analytics</Typography>
                </Box>

                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Summary</Typography>
                    <IconButton size="small" onClick={() => toggleAnalyticsRow('summary')}>
                      {analyticsRowsOpen.summary ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={analyticsRowsOpen.summary}>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {[
                    { label: 'Total Net Payout', value: `$${analyticsData.summary.totalNetEarnings.toFixed(2)}`, icon: <AttachMoneyIcon /> },
                    { label: 'Total Gross Earnings', value: `$${analyticsData.summary.totalGrossEarnings.toFixed(2)}`, icon: <BarChartIcon /> },
                    { label: 'Total Deductions', value: `$${analyticsData.summary.totalDeductions.toFixed(2)}`, icon: <ReceiptIcon /> },
                    { label: 'Net Margin', value: `${analyticsData.summary.netMarginPercent.toFixed(1)}%`, icon: <TrendingUpIcon /> },
                    { label: 'This Month', value: `$${analyticsData.summary.thisMonth.toFixed(2)}`, icon: <CalendarMonthIcon /> },
                    { label: 'Last Month', value: `$${analyticsData.summary.lastMonth.toFixed(2)}`, icon: <CalendarMonthIcon /> },
                    { label: 'Year to Date', value: `$${analyticsData.summary.ytd.toFixed(2)}`, icon: <TrendingUpIcon /> },
                    { label: 'Avg Order Value', value: `$${analyticsData.summary.avgOrderValue.toFixed(2)}`, icon: <ReceiptIcon /> },
                    { label: 'Total Orders', value: String(analyticsData.summary.totalOrders), icon: <ShoppingBagIcon /> },
                  ].map((stat) => (
                    <Grid item xs={6} sm={4} md={3} key={stat.label}>
                      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mx: 'auto', mb: 1 }}>
                          {React.cloneElement(stat.icon, { sx: { fontSize: 18 } })}
                        </Avatar>
                        <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                  </Collapse>
                </Paper>

                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Deductions</Typography>
                    <IconButton size="small" onClick={() => toggleAnalyticsRow('deductions')}>
                      {analyticsRowsOpen.deductions ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={analyticsRowsOpen.deductions}>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {[
                    { label: 'Stripe Fees', value: analyticsData.summary.totalStripeFees },
                    { label: 'Label Costs', value: analyticsData.summary.totalLabelCosts },
                    { label: 'Commission', value: analyticsData.summary.totalCommission },
                  ].map((deduction) => (
                    <Grid item xs={12} sm={4} key={deduction.label}>
                      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">{deduction.label}</Typography>
                        <Typography variant="h6" fontWeight={700} color="error.main">
                          -${deduction.value.toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                  </Collapse>
                </Paper>

                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Monthly Gross vs Net (Last 12 Months)</Typography>
                    <IconButton size="small" onClick={() => toggleAnalyticsRow('trend')}>
                      {analyticsRowsOpen.trend ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={analyticsRowsOpen.trend}>
                  {analyticsData.revenueOverTime.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No revenue data yet</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.revenueOverTime} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                        <XAxis
                          dataKey="month"
                          tickFormatter={(v: string) => {
                            const [y, m] = v.split('-');
                            return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short' });
                          }}
                          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        />
                        <YAxis
                          tickFormatter={(v: number) => `$${v}`}
                          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        />
                        <RechartsTooltip
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = {
                              grossEarnings: 'Gross',
                              netEarnings: 'Net',
                            };
                            return [`$${value.toFixed(2)}`, labels[name] || name];
                          }}
                          labelFormatter={(label: string) => {
                            const [y, m] = label.split('-');
                            return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                          }}
                          contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                        />
                        <Bar dataKey="grossEarnings" name="grossEarnings" radius={[4, 4, 0, 0]} fill={theme.palette.grey[500]} />
                        <Bar dataKey="netEarnings" name="netEarnings" radius={[4, 4, 0, 0]} fill={theme.palette.primary.main} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  </Collapse>
                </Paper>

                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Top Listings & Categories</Typography>
                    <IconButton size="small" onClick={() => toggleAnalyticsRow('performance')}>
                      {analyticsRowsOpen.performance ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={analyticsRowsOpen.performance}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Top Performing Listings</Typography>
                      {analyticsData.topListings.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No sales data yet</Typography>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Listing</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>Orders</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>Revenue</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {analyticsData.topListings.map((listing, idx) => (
                                <TableRow key={listing.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(getPaintingDetailPath(listing.id, listing.title))}>
                                  <TableCell>{idx + 1}</TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      {getImageUrl(listing.primaryImageUrl) && !analyticsListingImageErrors[listing.id] ? (
                                        <Box
                                          component="img"
                                          src={getImageUrl(listing.primaryImageUrl)}
                                          onError={() => setAnalyticsListingImageErrors((prev) => ({ ...prev, [listing.id]: true }))}
                                          sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
                                        />
                                      ) : (
                                        <Box sx={{ width: 40, height: 40, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                                          <ImagePlaceholder iconSize={{ xs: 16, md: 16 }} />
                                        </Box>
                                      )}
                                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{listing.title}</Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell><Chip label={listing.category || 'N/A'} size="small" variant="outlined" /></TableCell>
                                  <TableCell align="right">{listing.orderCount}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>${listing.totalRevenue.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Revenue by Category</Typography>
                      {analyticsData.revenueByCategory.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No category data yet</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {(() => {
                            const maxEarnings = Math.max(...analyticsData.revenueByCategory.map(c => c.earnings));
                            return analyticsData.revenueByCategory.map((cat, idx) => (
                              <Box key={cat.category}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], flexShrink: 0 }} />
                                    <Typography variant="body2">{cat.category}</Typography>
                                  </Box>
                                  <Typography variant="body2" fontWeight={600}>${cat.earnings.toFixed(2)}</Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={maxEarnings > 0 ? (cat.earnings / maxEarnings) * 100 : 0}
                                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length], borderRadius: 3 } }}
                                />
                                <Typography variant="caption" color="text.secondary">{cat.orders} order{cat.orders !== 1 ? 's' : ''}</Typography>
                              </Box>
                            ));
                          })()}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
                  </Collapse>
                </Paper>

                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 4, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Growth Insights
                    </Typography>
                    <IconButton size="small" onClick={() => toggleAnalyticsRow('growth')}>
                      {analyticsRowsOpen.growth ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={analyticsRowsOpen.growth}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Conversion Funnel</Typography>
                        {[
                          { label: 'Views', value: analyticsData.conversionFunnel.views },
                          { label: 'Likes', value: analyticsData.conversionFunnel.likes },
                          { label: 'Inquiries', value: analyticsData.conversionFunnel.inquiries },
                          { label: 'Orders', value: analyticsData.conversionFunnel.orders },
                        ].map((stage) => (
                          <Box key={stage.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                            <Typography variant="body2" color="text.secondary">{stage.label}</Typography>
                            <Typography variant="body2" fontWeight={600}>{stage.value}</Typography>
                          </Box>
                        ))}
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" color="text.secondary" display="block">
                          View to Like: {analyticsData.conversionFunnel.viewToLikeRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Like to Inquiry: {analyticsData.conversionFunnel.likeToInquiryRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Inquiry to Order: {analyticsData.conversionFunnel.inquiryToOrderRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="primary.main" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                          View to Order: {analyticsData.conversionFunnel.viewToOrderRate.toFixed(2)}%
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Missed Revenue</Typography>
                        {analyticsData.missedRevenueOpportunities.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Not enough listing traffic yet.</Typography>
                        ) : (
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>Listing</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>Views</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>Orders</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600 }}>Est. Upside</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {analyticsData.missedRevenueOpportunities.slice(0, 4).map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <Typography variant="body2" noWrap sx={{ maxWidth: 160, fontWeight: 600 }}>{item.title}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        +{item.estimatedExtraOrders.toFixed(2)} est. orders
                                      </Typography>
                                    </TableCell>
                                    <TableCell>{item.views}</TableCell>
                                    <TableCell>{item.currentOrders}</TableCell>
                                    <TableCell align="right">
                                      <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                                        +${item.estimatedExtraRevenue.toFixed(0)}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Goal Forecast</Typography>
                        {(() => {
                          const now = new Date();
                          const dayOfMonth = now.getDate();
                          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                          const monthProjected = dayOfMonth > 0 ? (analyticsData.summary.thisMonth / dayOfMonth) * daysInMonth : 0;
                          const goal = monthlyNetGoal > 0 ? monthlyNetGoal : 0;
                          const progress = goal > 0 ? Math.min(100, (analyticsData.summary.thisMonth / goal) * 100) : 0;
                          const remaining = Math.max(0, goal - analyticsData.summary.thisMonth);
                          const remainingDays = Math.max(1, daysInMonth - dayOfMonth);
                          const neededPerDay = remaining / remainingDays;
                          return (
                            <Box>
                              <TextField
                                label="Monthly Net Goal ($)"
                                size="small"
                                type="number"
                                value={monthlyNetGoal}
                                onChange={(e) => setMonthlyNetGoal(Number(e.target.value) || 0)}
                                sx={{ mb: 2, width: '100%' }}
                              />
                              <Typography variant="body2" color="text.secondary">Current month net</Typography>
                              <Typography variant="h6" fontWeight={700}>${analyticsData.summary.thisMonth.toFixed(2)}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Projected month end</Typography>
                              <Typography variant="h6" fontWeight={700} color="primary.main">${monthProjected.toFixed(2)}</Typography>
                              <LinearProgress variant="determinate" value={progress} sx={{ mt: 1.5, height: 8, borderRadius: 4 }} />
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                                Goal progress: {progress.toFixed(1)}%
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Needed per day: ${neededPerDay.toFixed(2)} for next {remainingDays} day{remainingDays !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </Paper>
                    </Grid>
                  </Grid>
                  </Collapse>
                </Paper>

                <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Pricing Intelligence</Typography>
                    <IconButton size="small" onClick={() => toggleAnalyticsRow('pricing')}>
                      {analyticsRowsOpen.pricing ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={analyticsRowsOpen.pricing}>
                    {analyticsData.pricingIntelligence.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Not enough pricing data yet.</Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Listing</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Your Price</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Market Avg</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Suggested Range</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Price Delta</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Views / Orders</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Conv.</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {analyticsData.pricingIntelligence.slice(0, 8).map((item) => (
                              <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(getPaintingDetailPath(item.id, item.title))}>
                                <TableCell>
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 220, fontWeight: 600 }}>{item.title}</Typography>
                                  <Typography variant="caption" color="text.secondary">{item.category}</Typography>
                                </TableCell>
                                <TableCell>${item.listingPrice.toFixed(2)}</TableCell>
                                <TableCell>{item.marketAvgPrice != null ? `$${item.marketAvgPrice.toFixed(2)}` : 'N/A'}</TableCell>
                                <TableCell>
                                  {item.suggestedMin != null && item.suggestedMax != null
                                    ? `$${item.suggestedMin.toFixed(0)} - $${item.suggestedMax.toFixed(0)}`
                                    : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {item.priceDeltaPercent != null ? (
                                    <Typography
                                      variant="body2"
                                      color={item.priceDeltaPercent > 10 ? 'warning.main' : item.priceDeltaPercent < -10 ? 'success.main' : 'text.primary'}
                                    >
                                      {item.priceDeltaPercent > 0 ? '+' : ''}{item.priceDeltaPercent.toFixed(1)}%
                                    </Typography>
                                  ) : 'N/A'}
                                </TableCell>
                                <TableCell>{item.views} / {item.soldOrders}</TableCell>
                                <TableCell align="right">{item.listingConversionRate.toFixed(2)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Collapse>
                </Paper>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <CreditCardIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Subscription
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Manage your subscription plan and billing
              </Typography>
            </Box>

            {subscription && subscription.status === 'active' ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 3,
                }}
              >
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Current Plan: {subscription.plan_name} ({subscription.billing_period})
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                      <Typography variant="caption" color="text.secondary">Plan Usage</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                        {subscription.current_listings || 0} / {subscription.max_listings >= 999999 ? 'Unlimited' : subscription.max_listings}
                      </Typography>
                      {subscription.max_listings && subscription.max_listings < 999999 && (
                        <>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, ((subscription.current_listings || 0) / subscription.max_listings) * 100)}
                            sx={{ mt: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                            {subscription.listings_remaining ?? Math.max(0, subscription.max_listings - (subscription.current_listings || 0))} listing slots left
                          </Typography>
                          {(() => {
                            const daysSinceStart = subscription.start_date
                              ? Math.max(1, Math.ceil((Date.now() - new Date(subscription.start_date).getTime()) / 86400000))
                              : 30;
                            const pace = (subscription.current_listings || 0) / daysSinceStart;
                            if (pace <= 0) return null;
                            const remaining = subscription.listings_remaining ?? Math.max(0, subscription.max_listings - (subscription.current_listings || 0));
                            const daysToExhaust = remaining / pace;
                            if (!Number.isFinite(daysToExhaust) || daysToExhaust > 365) return null;
                            return (
                              <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                                At current pace, slots may be full in ~{Math.max(1, Math.round(daysToExhaust))} days
                              </Typography>
                            );
                          })()}
                        </>
                      )}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                      <Typography variant="caption" color="text.secondary">ROI (Last 30 Days)</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                        {subscriptionRoi.roiMultiple != null ? `${subscriptionRoi.roiMultiple.toFixed(1)}x` : 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Net payout: ${subscriptionRoi.last30Net.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Est. monthly plan cost: ${subscriptionRoi.monthlyCost.toFixed(2)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                      <Typography variant="caption" color="text.secondary">Upgrade Impact</Typography>
                      {(() => {
                        const currentCap = Number(subscription.max_listings || 0);
                        const currentPrice = Number(
                          subscription.billing_period === 'yearly'
                            ? (subscription.price_yearly || 0)
                            : (subscription.price_monthly || 0)
                        );
                        const candidates = subscriptionPlans
                          .filter((plan) =>
                            plan?.is_active &&
                            Number(plan.max_listings || 0) > currentCap
                          )
                          .sort((a, b) =>
                            Number((subscription.billing_period === 'yearly' ? a.price_yearly : a.price_monthly) || 0) -
                            Number((subscription.billing_period === 'yearly' ? b.price_yearly : b.price_monthly) || 0)
                          );
                        const nextPlan = candidates[0];
                        if (!nextPlan) {
                          return <Typography variant="body2" sx={{ mt: 0.75 }}>You are on the highest listing tier.</Typography>;
                        }
                        const nextPrice = Number(
                          subscription.billing_period === 'yearly'
                            ? (nextPlan.price_yearly || 0)
                            : (nextPlan.price_monthly || 0)
                        );
                        const moreSlots = Number(nextPlan.max_listings || 0) - currentCap;
                        return (
                          <>
                            <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600 }}>
                              Next: {nextPlan.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              +{moreSlots} listing slots
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {subscription.billing_period === 'yearly' ? 'Yearly' : 'Monthly'} price change: ${(nextPrice - currentPrice).toFixed(2)}
                            </Typography>
                          </>
                        );
                      })()}
                    </Paper>
                  </Grid>
                </Grid>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                      <Typography variant="caption" color="text.secondary">Billing Snapshot</Typography>
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        Next charge date: {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Amount: $
                        {(subscription.billing_period === 'yearly'
                          ? Number(subscription.price_yearly || 0)
                          : Number(subscription.price_monthly || 0)
                        ).toFixed(2)} {subscription.billing_period === 'yearly' ? '/ year' : '/ month'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Auto-renew: {(subscription.auto_renew === false || subscription.auto_renew === 0) ? 'Off' : 'On'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Payment method: Managed in Stripe checkout
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                      <Typography variant="caption" color="text.secondary">Value Indicators</Typography>
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        Cost per active listing: {subscriptionRoi.costPerActiveListing != null ? `$${subscriptionRoi.costPerActiveListing.toFixed(2)}` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Cost per order (30d): {subscriptionRoi.costPerOrder != null ? `$${subscriptionRoi.costPerOrder.toFixed(2)}` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Orders in last 30 days: {subscriptionRoi.last30Orders}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Monthly plan cost baseline: ${subscriptionRoi.monthlyCost.toFixed(2)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Active listings: {subscription.current_listings || 0} / {subscription.max_listings >= 999999 ? 'Unlimited' : subscription.max_listings}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {subscription.end_date && `Access until: ${new Date(subscription.end_date).toLocaleDateString()}`}
                    </Typography>
                  </Grid>
                  {(subscription.auto_renew === false || subscription.auto_renew === 0) && (
                    <Grid item xs={12}>
                      <Chip label="Cancels at end of period" color="warning" size="small" />
                    </Grid>
                  )}
                </Grid>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={() => navigate('/subscription-plans')}>
                    Change Plan
                  </Button>
                  {(subscription.auto_renew === false || subscription.auto_renew === 0) ? (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CheckCircleIcon />}
                      onClick={handleResumeSubscription}
                      disabled={resumingSubscription}
                    >
                      {resumingSubscription ? 'Resuming...' : 'Resume Subscription'}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => setCancelSubscriptionDialogOpen(true)}
                      disabled={cancellingSubscription}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </Box>
                <Dialog open={cancelSubscriptionDialogOpen} onClose={() => !cancellingSubscription && setCancelSubscriptionDialogOpen(false)}>
                  <DialogTitle>Cancel subscription?</DialogTitle>
                  <DialogContent>
                    <DialogContentText>
                      Your subscription will remain active until {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'the end of your billing period'}.
                      You won&apos;t be charged again and can resubscribe anytime. You won&apos;t be able to activate new listings after this period.
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setCancelSubscriptionDialogOpen(false)} disabled={cancellingSubscription}>
                      Keep Subscription
                    </Button>
                    <Button variant="contained" color="error" onClick={handleCancelSubscription} disabled={cancellingSubscription}>
                      {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>
                  </DialogActions>
                </Dialog>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No Active Subscription
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Subscribe to a plan to activate your listings and start selling your artwork.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/subscription-plans')}>
                  View Subscription Plans
                </Button>
              </Paper>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
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
            {needsShippingProfile && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Shipping address is incomplete. Fill Street, City, State/Province, ZIP/Postal code, and Country to enable shipping workflows.
              </Alert>
            )}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>Payout Readiness</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Stripe payouts connected</Typography>
                      <Chip
                        size="small"
                        label={payoutReadiness.stripeConnected ? 'Ready' : 'Action needed'}
                        color={payoutReadiness.stripeConnected ? 'success' : 'warning'}
                        variant={payoutReadiness.stripeConnected ? 'filled' : 'outlined'}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Shipping address complete</Typography>
                      <Chip
                        size="small"
                        label={payoutReadiness.shippingAddress ? 'Ready' : 'Action needed'}
                        color={payoutReadiness.shippingAddress ? 'success' : 'warning'}
                        variant={payoutReadiness.shippingAddress ? 'filled' : 'outlined'}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Profile quality</Typography>
                      <Chip
                        size="small"
                        label={payoutReadiness.profileQuality ? 'Strong' : 'Improve'}
                        color={payoutReadiness.profileQuality ? 'success' : 'warning'}
                        variant={payoutReadiness.profileQuality ? 'filled' : 'outlined'}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>Public Profile Completeness</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Current completeness</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{profileCompletenessPercent}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={profileCompletenessPercent}
                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Add bio, signature, socials, and shipping details to improve trust and conversion.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <form onSubmit={handleProfileSubmit} noValidate>
              <Grid container spacing={2}>
                {/* Personal Information Section */}
                <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 1 } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
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
                    <Divider sx={{ mb: 2 }} />
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
                <Grid item xs={12} md={6} sx={{ order: { xs: 3, md: 3 } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
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
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required sx={{ bgcolor: 'background.paper' }}>
                          <InputLabel>Country</InputLabel>
                          <Select
                            value={profileFormData.country}
                            label="Country"
                            onChange={(e) => {
                              setProfileFormData(prev => ({ ...prev, country: e.target.value as string, phone: '' }));
                            }}
                          >
                            {[
                              { code: 'US', name: 'United States', dial: '+1' },
                              { code: 'CA', name: 'Canada', dial: '+1' },
                              { code: 'GB', name: 'United Kingdom', dial: '+44' },
                              { code: 'AU', name: 'Australia', dial: '+61' },
                              { code: 'DE', name: 'Germany', dial: '+49' },
                              { code: 'FR', name: 'France', dial: '+33' },
                              { code: 'IT', name: 'Italy', dial: '+39' },
                              { code: 'ES', name: 'Spain', dial: '+34' },
                              { code: 'NL', name: 'Netherlands', dial: '+31' },
                              { code: 'BE', name: 'Belgium', dial: '+32' },
                              { code: 'CH', name: 'Switzerland', dial: '+41' },
                              { code: 'AT', name: 'Austria', dial: '+43' },
                              { code: 'SE', name: 'Sweden', dial: '+46' },
                              { code: 'NO', name: 'Norway', dial: '+47' },
                              { code: 'DK', name: 'Denmark', dial: '+45' },
                              { code: 'FI', name: 'Finland', dial: '+358' },
                              { code: 'IE', name: 'Ireland', dial: '+353' },
                              { code: 'NZ', name: 'New Zealand', dial: '+64' },
                              { code: 'JP', name: 'Japan', dial: '+81' },
                              { code: 'KR', name: 'South Korea', dial: '+82' },
                              { code: 'IN', name: 'India', dial: '+91' },
                              { code: 'BR', name: 'Brazil', dial: '+55' },
                              { code: 'MX', name: 'Mexico', dial: '+52' },
                              { code: 'AR', name: 'Argentina', dial: '+54' },
                              { code: 'ZA', name: 'South Africa', dial: '+27' },
                              { code: 'IL', name: 'Israel', dial: '+972' },
                              { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
                              { code: 'SG', name: 'Singapore', dial: '+65' },
                              { code: 'PT', name: 'Portugal', dial: '+351' },
                              { code: 'PL', name: 'Poland', dial: '+48' },
                            ].map(c => (
                              <MenuItem key={c.code} value={c.code}>{c.name} ({c.dial})</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          value={profileFormData.phone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            const phoneMasks: Record<string, (d: string) => string> = {
                              US: (d) => d.length <= 3 ? d : d.length <= 6 ? `(${d.slice(0,3)}) ${d.slice(3)}` : `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`,
                              CA: (d) => d.length <= 3 ? d : d.length <= 6 ? `(${d.slice(0,3)}) ${d.slice(3)}` : `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`,
                              GB: (d) => d.length <= 4 ? d : d.length <= 7 ? `${d.slice(0,4)} ${d.slice(4)}` : `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7,11)}`,
                              AU: (d) => d.length <= 4 ? d : d.length <= 7 ? `${d.slice(0,4)} ${d.slice(4)}` : `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7,10)}`,
                              DE: (d) => d.length <= 4 ? d : `${d.slice(0,4)} ${d.slice(4,12)}`,
                              FR: (d) => d.replace(/(\d{2})(?=\d)/g, '$1 ').trim().slice(0,14),
                              IN: (d) => d.length <= 5 ? d : `${d.slice(0,5)} ${d.slice(5,10)}`,
                            };
                            const maxLen: Record<string, number> = { US: 10, CA: 10, GB: 11, AU: 10, DE: 12, FR: 10, IN: 10 };
                            const country = profileFormData.country;
                            const max = maxLen[country] || 15;
                            const trimmed = digits.slice(0, max);
                            const formatter = phoneMasks[country];
                            const formatted = formatter ? formatter(trimmed) : trimmed;
                            setProfileFormData(prev => ({ ...prev, phone: formatted }));
                          }}
                          InputProps={{
                            startAdornment: profileFormData.country ? (
                              <InputAdornment position="start">
                                {{
                                  US: '+1', CA: '+1', GB: '+44', AU: '+61', DE: '+49', FR: '+33', IT: '+39', ES: '+34',
                                  NL: '+31', BE: '+32', CH: '+41', AT: '+43', SE: '+46', NO: '+47', DK: '+45', FI: '+358',
                                  IE: '+353', NZ: '+64', JP: '+81', KR: '+82', IN: '+91', BR: '+55', MX: '+52', AR: '+54',
                                  ZA: '+27', IL: '+972', AE: '+971', SG: '+65', PT: '+351', PL: '+48',
                                }[profileFormData.country] || ''}
                              </InputAdornment>
                            ) : undefined,
                          }}
                          placeholder={
                            { US: '(555) 123-4567', CA: '(555) 123-4567', GB: '7911 123 456', AU: '0412 345 678', DE: '0151 12345678', FR: '06 12 34 56 78', IN: '98765 43210' }[profileFormData.country] || 'Phone number'
                          }
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                          Shipping Address
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Used as your origin for shipping labels and for receiving items.
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Street address"
                          value={profileFormData.addressLine1}
                          onChange={handleProfileInputChange('addressLine1')}
                          placeholder="123 Main St"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Street address 2 (optional)"
                          value={profileFormData.addressLine2}
                          onChange={handleProfileInputChange('addressLine2')}
                          placeholder="Apt, suite, etc."
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="City"
                          value={profileFormData.addressCity}
                          onChange={handleProfileInputChange('addressCity')}
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="State / Province"
                          value={profileFormData.addressState}
                          onChange={handleProfileInputChange('addressState')}
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="ZIP / Postal code"
                          value={profileFormData.addressZip}
                          onChange={handleProfileInputChange('addressZip')}
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Billing Address
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Used for invoices and payment processing.
                            </Typography>
                          </Box>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={profileFormData.billingSameAsShipping}
                                onChange={(e) => setProfileFormData(prev => ({ ...prev, billingSameAsShipping: e.target.checked }))}
                              />
                            }
                            label={<Typography variant="body2">Same as shipping</Typography>}
                          />
                        </Box>
                      </Grid>
                      {!profileFormData.billingSameAsShipping && (
                        <>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Street address"
                              value={profileFormData.billingLine1}
                              onChange={handleProfileInputChange('billingLine1')}
                              placeholder="123 Main St"
                              sx={{ bgcolor: 'background.paper' }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Street address 2 (optional)"
                              value={profileFormData.billingLine2}
                              onChange={handleProfileInputChange('billingLine2')}
                              placeholder="Apt, suite, etc."
                              sx={{ bgcolor: 'background.paper' }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="City"
                              value={profileFormData.billingCity}
                              onChange={handleProfileInputChange('billingCity')}
                              sx={{ bgcolor: 'background.paper' }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="State / Province"
                              value={profileFormData.billingState}
                              onChange={handleProfileInputChange('billingState')}
                              sx={{ bgcolor: 'background.paper' }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              label="ZIP / Postal code"
                              value={profileFormData.billingZip}
                              onChange={handleProfileInputChange('billingZip')}
                              sx={{ bgcolor: 'background.paper' }}
                            />
                          </Grid>
                        </>
                      )}

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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Instagram"
                          value={profileFormData.socialInstagram}
                          onChange={handleProfileInputChange('socialInstagram')}
                          placeholder="https://instagram.com/yourhandle"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="TikTok"
                          value={profileFormData.socialTikTok}
                          onChange={handleProfileInputChange('socialTikTok')}
                          placeholder="https://tiktok.com/@yourhandle"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Behance"
                          value={profileFormData.socialBehance}
                          onChange={handleProfileInputChange('socialBehance')}
                          placeholder="https://behance.net/yourprofile"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="YouTube"
                          value={profileFormData.socialYouTube}
                          onChange={handleProfileInputChange('socialYouTube')}
                          placeholder="https://youtube.com/@yourchannel"
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Professional Information Section */}
                <Grid item xs={12} md={6} sx={{ order: { xs: 2, md: 2 } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
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
                    <Divider sx={{ mb: 2 }} />
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
                          {['Painting', 'Woodworking', 'Prints', 'Other'].map((specialty) => (
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
                <Grid item xs={12} md={6} sx={{ order: { xs: 4, md: 4 } }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
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
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Your signature will be displayed on your public profile and artwork pages, helping collectors identify and authenticate your work.
                    </Typography>
                    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 1.5 }}>
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
                <Grid item xs={12} sx={{ order: { xs: 5, md: 5 } }}>
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

          <TabPanel value={tabValue} index={5}>
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
              <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <form onSubmit={handleSettingsSubmit} noValidate>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CreditCardIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="subtitle1" fontWeight={700}>Payouts</Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Connect Stripe once to receive payouts automatically after delivery is confirmed.
                          </Typography>
                          {connectStatus?.chargesEnabled ? (
                            <Chip icon={<CheckCircleIcon />} label="Payout account connected" color="success" />
                          ) : (
                            <Button
                              variant="outlined"
                              startIcon={<CreditCardIcon />}
                              onClick={handleConnectOnboarding}
                              disabled={connectLoading || !profileData?.email}
                            >
                              {connectLoading ? 'Redirecting...' : connectStatus?.connected ? 'Complete setup' : 'Set up payouts'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={7}>
                      <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <LocalShippingIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="subtitle1" fontWeight={700}>Selling Defaults</Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                            These defaults are pre-filled for new listings and can be overridden per listing.
                          </Typography>

                          <FormControl component="fieldset" sx={{ display: 'block', mb: 2.5 }}>
                            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                              Shipping cost
                            </FormLabel>
                            <RadioGroup
                              row
                              value={settings.default_shipping_preference}
                              onChange={(e) => handleShippingPreferenceChange(e.target.value as 'free' | 'buyer')}
                            >
                              <FormControlLabel value="free" control={<Radio color="primary" />} label="Free shipping (you pay)" />
                              <FormControlLabel value="buyer" control={<Radio color="primary" />} label="Buyer pays at checkout" />
                            </RadioGroup>
                          </FormControl>

                          <FormControl component="fieldset" sx={{ display: 'block', mb: 2.5 }}>
                            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                              Shipping method
                            </FormLabel>
                            <RadioGroup
                              row
                              value={settings.default_shipping_carrier}
                              onChange={(e) => handleShippingCarrierChange(e.target.value as 'shippo' | 'own')}
                            >
                              <FormControlLabel value="shippo" control={<Radio color="primary" />} label="Shippo label workflow" />
                              <FormControlLabel value="own" control={<Radio color="primary" />} label="Own carrier workflow" />
                            </RadioGroup>
                            {settings.default_shipping_carrier === 'shippo' && (
                              <Alert severity="info" sx={{ mt: 1.5 }}>
                                Shippo workflow: buyers see live shipping rates at checkout, you select and purchase a label from the order, tracking is attached automatically, and delivery updates sync into order status and notifications.
                              </Alert>
                            )}
                            {settings.default_shipping_carrier === 'own' && (
                              <Alert severity="info" sx={{ mt: 1.5 }}>
                                Own carrier workflow: you arrange shipping outside Artzyla, enter tracking details manually when marking orders as shipped, and buyers follow updates using your provided tracking link.
                              </Alert>
                            )}
                          </FormControl>

                          <FormControl component="fieldset" sx={{ display: 'block' }}>
                            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                              Returns
                            </FormLabel>
                            <RadioGroup
                              row
                              value={settings.default_return_days === null ? 'none' : 'days'}
                              onChange={(e) => handleReturnDaysChange(e.target.value === 'none' ? null : 30)}
                            >
                              <FormControlLabel value="none" control={<Radio color="primary" />} label="No returns" />
                              <FormControlLabel value="days" control={<Radio color="primary" />} label="Return window" />
                            </RadioGroup>
                            {settings.default_return_days !== null && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, ml: 4 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={settings.default_return_days}
                                  onChange={handleReturnDaysInputChange}
                                  inputProps={{ min: 1, max: 365 }}
                                  sx={{ width: 88 }}
                                />
                                <Typography variant="body2" color="text.secondary">days</Typography>
                              </Box>
                            )}
                          </FormControl>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <MessageIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="subtitle1" fontWeight={700}>Communication</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                            <FormControlLabel
                              control={<Switch checked={settings.default_allow_comments} onChange={handleSettingsChange('default_allow_comments')} color="primary" />}
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>Allow comments by default</Typography>
                                  <Typography variant="caption" color="text.secondary">Apply to new listings automatically</Typography>
                                </Box>
                              }
                            />
                            <Divider />
                            <FormControlLabel
                              control={<Switch checked={settings.email_notifications} onChange={handleSettingsChange('email_notifications')} color="primary" />}
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>Email notifications</Typography>
                                  <Typography variant="caption" color="text.secondary">Messages and inquiries</Typography>
                                </Box>
                              }
                            />
                            <Divider />
                            <FormControlLabel
                              control={<Switch checked={settings.comment_notifications} onChange={handleSettingsChange('comment_notifications')} color="primary" />}
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>Comment notifications</Typography>
                                  <Typography variant="caption" color="text.secondary">Activity on your listings</Typography>
                                </Box>
                              }
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                            Default special instructions
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Auto-fill helper text for new listings.
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Special instructions template"
                            value={settings.default_special_instructions || ''}
                            onChange={handleSettingsChange('default_special_instructions')}
                            placeholder="Example: Include framing notes, care instructions, or customization details."
                            helperText="You can still edit this on each listing."
                            sx={{ bgcolor: 'background.default' }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Review your defaults and save to apply them across new listings.
                        </Typography>
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

        <Dialog open={labelDialogOpen} onClose={() => !labelPurchasing && setLabelDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Buy shipping label</DialogTitle>
          <DialogContent>
            {labelOrder && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {labelOrder.listing_title} → {labelOrder.buyer_email}
              </Typography>
            )}
            {labelLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : labelRates.length === 0 ? (
              <Alert severity="info">
                No shipping rates available. Set your address in Profile Settings and ensure the listing has dimensions.
              </Alert>
            ) : (
              <List>
                {labelRates.map((rate) => (
                  <ListItemButton
                    key={rate.object_id}
                    onClick={() => handlePurchaseLabel(rate.object_id)}
                    disabled={labelPurchasing}
                  >
                    <ListItemText
                      primary={`${rate.provider} - ${rate.servicelevel}`}
                      secondary={`$${rate.amount}${rate.estimated_days ? ` • ${rate.estimated_days} days` : ''}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLabelDialogOpen(false)} disabled={labelPurchasing}>Cancel</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={returnDialogOpen} onClose={() => !returnLoading && setReturnDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Request return</DialogTitle>
          <DialogContent>
            {returnOrder && (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  {returnOrder.listing_title} — Order {returnOrder.order_number}
                </DialogContentText>
                {returnOrder.returns_info && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Seller's return policy</Typography>
                    {returnOrder.returns_info}
                  </Alert>
                )}
                {returnOrder.return_days && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Return window: {returnOrder.return_days} days from delivery
                  </Typography>
                )}
              </>
            )}
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Reason for return"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Please describe why you'd like to return this item..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReturnDialogOpen(false)} disabled={returnLoading}>Cancel</Button>
            <Button onClick={handleSubmitReturn} variant="contained" color="warning" disabled={returnLoading}>
              {returnLoading ? 'Submitting...' : 'Submit return request'}
            </Button>
          </DialogActions>
        </Dialog>

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
