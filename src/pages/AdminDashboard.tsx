import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Pagination,
  Avatar,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  Block as BlockIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  CheckCircle as CheckCircleIcon,
  CreditCard as CreditCardIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  CardMembership as CardMembershipIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon,
  Event as EventIcon,
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService, { SubscriptionPlan } from '../services/api';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/PageHeader';

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<Record<number, any>>({});
  const [usersPage, setUsersPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [usersPagination, setUsersPagination] = useState<any>(null);
  const [listingsPagination, setListingsPagination] = useState<any>(null);
  const [messagesPagination, setMessagesPagination] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userTypeDialogOpen, setUserTypeDialogOpen] = useState(false);
  const [newUserType, setNewUserType] = useState<'artist' | 'buyer' | 'admin'>('artist');
  const [inactivateConfirmOpen, setInactivateConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listingToInactivate, setListingToInactivate] = useState<number | null>(null);
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);
  const [inactivating, setInactivating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [statusChanging, setStatusChanging] = useState<number | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [listingToChangeStatus, setListingToChangeStatus] = useState<{ id: number; currentStatus: string } | null>(null);
  const [activatingUser, setActivatingUser] = useState<number | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<number | null>(null);
  const [deactivateUserConfirmOpen, setDeactivateUserConfirmOpen] = useState(false);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = useState(false);
  const [blockUserConfirmOpen, setBlockUserConfirmOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [userToBlock, setUserToBlock] = useState<number | null>(null);
  const [blockingUser, setBlockingUser] = useState<number | null>(null);
  const [unblockingUser, setUnblockingUser] = useState<number | null>(null);
  const [subscriptionUsersDialogOpen, setSubscriptionUsersDialogOpen] = useState(false);
  const [subscriptionUsersFilter, setSubscriptionUsersFilter] = useState<{ filter?: string; plan?: string; billing?: string; title: string } | null>(null);
  const [subscriptionUsers, setSubscriptionUsers] = useState<any[]>([]);
  const [loadingSubscriptionUsers, setLoadingSubscriptionUsers] = useState(false);
  const [newStatus, setNewStatus] = useState<'draft' | 'active' | 'inactive' | 'sold' | 'archived'>('active');
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planFormData, setPlanFormData] = useState<Partial<SubscriptionPlan>>({});
  const [deletingPlan, setDeletingPlan] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPagination, setOrdersPagination] = useState<any>(null);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('all');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const [subscriptionsPagination, setSubscriptionsPagination] = useState<any>(null);
  const [subscriptionsStatusFilter, setSubscriptionsStatusFilter] = useState('all');
  const [subscriptionsPlanFilter, setSubscriptionsPlanFilter] = useState('');
  const [subscriptionsSearch, setSubscriptionsSearch] = useState('');
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subscriptionActionLoading, setSubscriptionActionLoading] = useState<number | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendUserId, setExtendUserId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [expireConfirmOpen, setExpireConfirmOpen] = useState(false);
  const [expireUserId, setExpireUserId] = useState<number | null>(null);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [shippingOrder, setShippingOrder] = useState<any>(null);
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');
  const [shippingTrackingUrl, setShippingTrackingUrl] = useState('');
  const [shippingActionLoading, setShippingActionLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchStats();
    fetchUsers();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setListingsPage(1);
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    if (!user?.id) return;
    fetchListings();
  }, [user?.id, listingsPage, statusFilter, categoryFilter]);

  useEffect(() => {
    if (!user?.id) return;
    fetchMessages();
  }, [user?.id, messagesPage]);

  useEffect(() => {
    if (!user?.id || (tabValue !== 4 && tabValue !== 5)) return;
    fetchSubscriptionPlans();
  }, [user?.id, tabValue]);

  useEffect(() => {
    if (!user?.id || tabValue !== 4) return;
    setSubscriptionsPage(1);
  }, [subscriptionsStatusFilter, subscriptionsPlanFilter, subscriptionsSearch]);

  useEffect(() => {
    if (!user?.id || tabValue !== 4) return;
    fetchSubscriptions();
  }, [user?.id, tabValue, subscriptionsPage, subscriptionsStatusFilter, subscriptionsPlanFilter, subscriptionsSearch]);

  useEffect(() => {
    if (!user?.id || tabValue !== 3) return;
    setOrdersPage(1);
  }, [ordersSearch, ordersStatusFilter]);

  useEffect(() => {
    if (!user?.id || tabValue !== 3) return;
    fetchOrders();
  }, [user?.id, tabValue, ordersPage, ordersSearch, ordersStatusFilter]);

  useEffect(() => {
    if (!user?.id) return;
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, usersPage, user?.id]);

  const fetchStats = async (): Promise<void> => {
    if (!user?.id) return;
    try {
      const data = await apiService.getAdminStats(user.id, user.groups);
      setStats(data);
    } catch (error: any) {
      const errorMessage = error.message || error.error || 'Failed to fetch stats';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (): Promise<void> => {
    if (!user?.id) return;
    try {
      const response = await apiService.getAdminUsers(user.id, {
        page: usersPage,
        limit: 20,
        search: searchTerm || undefined,
      }, user.groups);
      const fetchedUsers = response.users || [];
      setUsers(fetchedUsers);
      setUsersPagination(response.pagination);
      
      const subscriptions: Record<number, any> = {};
      const subscriptionPromises = fetchedUsers
        .filter(userData => userData.cognito_username)
        .map(async (userData) => {
          try {
            const subResponse = await apiService.getUserSubscription(userData.cognito_username);
            if (subResponse.subscription) {
              subscriptions[userData.id] = subResponse.subscription;
            }
          } catch (err) {
            console.error(`Error fetching subscription for user ${userData.id}:`, err);
          }
        });
      
      await Promise.all(subscriptionPromises);
      setUserSubscriptions(subscriptions);
    } catch (error: any) {
      const errorMessage = error.message || error.error || 'Failed to fetch users';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      console.error('Error fetching users:', error);
    }
  };

  const fetchListings = async (): Promise<void> => {
    if (!user?.id) return;
    try {
      const response = await apiService.getAdminListings(user.id, {
        page: listingsPage,
        limit: 20,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      }, user.groups);
      setListings(response.listings || []);
      setListingsPagination(response.pagination);
    } catch (error: any) {
      const errorMessage = error.message || error.error || 'Failed to fetch listings';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      console.error('Error fetching listings:', error);
    }
  };

  const fetchMessages = async (): Promise<void> => {
    if (!user?.id) return;
    try {
      const response = await apiService.getAdminMessages(user.id, {
        page: messagesPage,
        limit: 20,
      }, user.groups);
      setMessages(response.messages || []);
      setMessagesPagination(response.pagination);
    } catch (error: any) {
      const errorMessage = error.message || error.error || 'Failed to fetch messages';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      console.error('Error fetching messages:', error);
    }
  };

  const fetchOrders = async (): Promise<void> => {
    if (!user?.id) return;
    setLoadingOrders(true);
    try {
      const response = await apiService.getAdminOrders(user.id, {
        page: ordersPage,
        limit: 20,
        search: ordersSearch.trim() || undefined,
        status: ordersStatusFilter !== 'all' ? ordersStatusFilter : undefined,
      }, user.groups);
      setOrders(response.orders || []);
      setOrdersPagination(response.pagination);
    } catch (error: any) {
      enqueueSnackbar(error.message || error.error || 'Failed to fetch orders', { variant: 'error' });
      setOrders([]);
      setOrdersPagination(null);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchSubscriptions = async (): Promise<void> => {
    if (!user?.id) return;
    setLoadingSubscriptions(true);
    try {
      const response = await apiService.getAdminSubscriptions(user.id, {
        page: subscriptionsPage,
        limit: 20,
        status: subscriptionsStatusFilter !== 'all' ? subscriptionsStatusFilter : undefined,
        plan: subscriptionsPlanFilter || undefined,
        search: subscriptionsSearch.trim() || undefined,
      }, user.groups);
      setSubscriptions(response.subscriptions || []);
      setSubscriptionsPagination(response.pagination);
    } catch (error: any) {
      enqueueSnackbar(error.message || error.error || 'Failed to fetch subscriptions', { variant: 'error' });
      setSubscriptions([]);
      setSubscriptionsPagination(null);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchSubscriptionPlans = async (): Promise<void> => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    try {
      console.log('Fetching subscription plans for user:', user.id, 'groups:', user.groups);
      const plans = await apiService.getAdminSubscriptionPlans(user.id, user.groups);
      console.log('Received plans:', plans);
      setSubscriptionPlans(plans || []);
    } catch (error: any) {
      console.error('Error fetching subscription plans:', error);
      console.error('Error details:', {
        message: error.message,
        error: error.error,
        status: error.status,
        details: error.details,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to fetch subscription plans';
      if (error.status === 403) {
        errorMessage = 'Admin access required. Please ensure you have admin privileges.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication required. Please sign in again.';
      } else if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setSubscriptionPlans([]);
    }
  };

  const handlePlanEdit = (plan: SubscriptionPlan): void => {
    setEditingPlan(plan);
    setPlanFormData(plan);
    setPlanDialogOpen(true);
  };

  const handlePlanCreate = (): void => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      tier: '',
      max_listings: 5,
      price_monthly: 0,
      price_yearly: 0,
      features: '',
      is_active: true,
      display_order: 0,
    });
    setPlanDialogOpen(true);
  };

  const handlePlanSave = async (): Promise<void> => {
    if (!user?.id) return;
    if (!planFormData.name || !planFormData.tier || planFormData.max_listings === undefined || planFormData.price_monthly === undefined || planFormData.price_yearly === undefined) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
      return;
    }

    try {
      await apiService.saveSubscriptionPlan(user.id, user.groups, planFormData as SubscriptionPlan);
      enqueueSnackbar(editingPlan ? 'Plan updated successfully' : 'Plan created successfully', { variant: 'success' });
      setPlanDialogOpen(false);
      fetchSubscriptionPlans();
    } catch (error: any) {
      const errorMessage = error.message || error.error || 'Failed to save plan';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handlePlanDelete = async (planId: number): Promise<void> => {
    if (!user?.id) return;
    setDeletingPlan(planId);
    try {
      await apiService.deleteSubscriptionPlan(user.id, user.groups, planId);
      enqueueSnackbar('Plan deleted successfully', { variant: 'success' });
      fetchSubscriptionPlans();
    } catch (error: any) {
      const errorMessage = error.message || error.error || 'Failed to delete plan';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setDeletingPlan(null);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>, userData: any): void => {
    setUserMenuAnchor(event.currentTarget);
    setSelectedUser(userData);
  };

  const handleUserMenuClose = (): void => {
    setUserMenuAnchor(null);
    setSelectedUser(null);
  };

  const handleUpdateUserType = async (): Promise<void> => {
    if (!user?.id || !selectedUser) return;

    try {
      await apiService.updateUserType(user.id, selectedUser.cognito_username, newUserType);
      enqueueSnackbar('User type updated successfully', { variant: 'success' });
      setUserTypeDialogOpen(false);
      handleUserMenuClose();
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to update user type', { variant: 'error' });
    }
  };

  const handleActivateUser = async (userId: number): Promise<void> => {
    if (!user?.id) return;

    setActivatingUser(userId);
    try {
      await apiService.activateUser(user.id, userId, user.groups);
      enqueueSnackbar('User activated successfully', { variant: 'success' });
      handleUserMenuClose();
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to activate user', { variant: 'error' });
    } finally {
      setActivatingUser(null);
    }
  };

  const handleDeactivateUserClick = (userId: number): void => {
    setUserToDeactivate(userId);
    setDeactivateUserConfirmOpen(true);
    handleUserMenuClose();
  };

  const handleDeactivateUserConfirm = async (): Promise<void> => {
    if (!user?.id || !userToDeactivate) return;

    setDeactivatingUser(userToDeactivate);
    try {
      await apiService.deactivateUser(user.id, userToDeactivate, user.groups);
      enqueueSnackbar('User deactivated successfully', { variant: 'success' });
      setDeactivateUserConfirmOpen(false);
      setUserToDeactivate(null);
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to deactivate user', { variant: 'error' });
    } finally {
      setDeactivatingUser(null);
    }
  };

  const handleDeactivateUserCancel = (): void => {
    setDeactivateUserConfirmOpen(false);
    setUserToDeactivate(null);
  };

  const handleBlockUserClick = (userId: number): void => {
    setUserToBlock(userId);
    setBlockUserConfirmOpen(true);
    handleUserMenuClose();
  };

  const handleBlockUserConfirm = async (): Promise<void> => {
    if (!user?.id || !userToBlock) return;

    setBlockingUser(userToBlock);
    try {
      await apiService.blockUser(user.id, userToBlock, user.groups);
      enqueueSnackbar('User blocked successfully. They cannot sign in with the same credentials.', { variant: 'success' });
      setBlockUserConfirmOpen(false);
      setUserToBlock(null);
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to block user', { variant: 'error' });
    } finally {
      setBlockingUser(null);
    }
  };

  const handleBlockUserCancel = (): void => {
    setBlockUserConfirmOpen(false);
    setUserToBlock(null);
  };

  const handleUnblockUser = async (userId: number): Promise<void> => {
    if (!user?.id) return;

    setUnblockingUser(userId);
    try {
      await apiService.unblockUser(user.id, userId, user.groups);
      enqueueSnackbar('User unblocked successfully', { variant: 'success' });
      handleUserMenuClose();
      fetchUsers();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to unblock user', { variant: 'error' });
    } finally {
      setUnblockingUser(null);
    }
  };

  const handleDeleteUserClick = (userId: number): void => {
    setUserToDelete(userId);
    setDeleteUserConfirmOpen(true);
    handleUserMenuClose();
  };

  const handleDeleteUserConfirm = async (): Promise<void> => {
    if (!user?.id || !userToDelete) return;

    setDeletingUser(userToDelete);
    try {
      await apiService.deleteUser(user.id, userToDelete, user.groups);
      enqueueSnackbar('User deleted successfully', { variant: 'success' });
      setDeleteUserConfirmOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Delete user error:', error);
      const errorMessage = error.details || error.message || error.error || 'Failed to delete user';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setDeletingUser(null);
    }
  };

  const handleDeleteUserCancel = (): void => {
    setDeleteUserConfirmOpen(false);
    setUserToDelete(null);
  };

  const handleInactivateClick = (listingId: number): void => {
    setListingToInactivate(listingId);
    setInactivateConfirmOpen(true);
  };

  const handleInactivateConfirm = async (): Promise<void> => {
    if (!user?.id || !listingToInactivate) return;

    setInactivating(listingToInactivate);
    try {
      await apiService.inactivateListingAsAdmin(user.id, listingToInactivate, user.groups);
      enqueueSnackbar('Listing inactivated successfully', { variant: 'success' });
      fetchListings();
      setInactivateConfirmOpen(false);
      setListingToInactivate(null);
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to inactivate listing', { variant: 'error' });
    } finally {
      setInactivating(null);
    }
  };

  const handleInactivateCancel = (): void => {
    setInactivateConfirmOpen(false);
    setListingToInactivate(null);
  };

  const handleDeleteClick = (listingId: number): void => {
    setListingToDelete(listingId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!user?.id || !listingToDelete) return;

    setDeleting(listingToDelete);
    try {
      await apiService.deleteListingAsAdmin(user.id, listingToDelete, user.groups);
      enqueueSnackbar('Listing deleted successfully', { variant: 'success' });
      fetchListings();
      setDeleteConfirmOpen(false);
      setListingToDelete(null);
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to delete listing', { variant: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCancel = (): void => {
    setDeleteConfirmOpen(false);
    setListingToDelete(null);
  };

  const handleStatusChangeClick = (listingId: number, currentStatus: string): void => {
    setListingToChangeStatus({ id: listingId, currentStatus });
    setNewStatus(currentStatus as 'draft' | 'active' | 'sold' | 'archived');
    setStatusChangeDialogOpen(true);
  };

  const handleStatusChangeConfirm = async (): Promise<void> => {
    if (!user?.id || !listingToChangeStatus) return;

    setStatusChanging(listingToChangeStatus.id);
    try {
      await apiService.updateListingStatusAsAdmin(user.id, listingToChangeStatus.id, newStatus, user.groups);
      enqueueSnackbar(`Listing status updated to ${newStatus} successfully`, { variant: 'success' });
      fetchListings();
      setStatusChangeDialogOpen(false);
      setListingToChangeStatus(null);
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to update listing status', { variant: 'error' });
    } finally {
      setStatusChanging(null);
    }
  };

  const handleStatusChangeCancel = (): void => {
    setStatusChangeDialogOpen(false);
    setListingToChangeStatus(null);
  };

  const handleSubscriptionStatClick = async (filter: string, title: string, plan?: string, billing?: string): Promise<void> => {
    if (!user?.id) return;
    const count = plan
      ? (stats.subscriptions?.byPlan?.[plan] ?? 0)
      : billing
        ? (stats.subscriptions?.byBilling?.[billing as 'monthly' | 'yearly'] ?? 0)
        : filter === 'active'
          ? (stats.subscriptions?.active ?? 0)
          : filter === 'expired'
            ? (stats.subscriptions?.expired ?? 0)
            : filter === 'this_month'
              ? (stats.subscriptions?.thisMonth ?? 0)
              : (stats.subscriptions?.ytd ?? 0);
    if (count === 0) return;
    setSubscriptionUsersFilter({ filter, plan, billing, title });
    setSubscriptionUsersDialogOpen(true);
    setLoadingSubscriptionUsers(true);
    try {
      const response = await apiService.getAdminUsers(user.id, {
        page: 1,
        limit: 100,
        subscriptionFilter: filter,
        subscriptionPlan: plan,
        subscriptionBilling: billing,
      }, user.groups);
      setSubscriptionUsers(response.users || []);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to load users', { variant: 'error' });
      setSubscriptionUsers([]);
    } finally {
      setLoadingSubscriptionUsers(false);
    }
  };

  const handleSubscriptionCancel = async (userId: number): Promise<void> => {
    if (!user?.id) return;
    setSubscriptionActionLoading(userId);
    try {
      await apiService.cancelUserSubscriptionAsAdmin(user.id, userId, user.groups);
      enqueueSnackbar('Subscription cancelled', { variant: 'success' });
      fetchSubscriptions();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to cancel', { variant: 'error' });
    } finally {
      setSubscriptionActionLoading(null);
    }
  };

  const handleSubscriptionResume = async (userId: number): Promise<void> => {
    if (!user?.id) return;
    setSubscriptionActionLoading(userId);
    try {
      await apiService.resumeUserSubscriptionAsAdmin(user.id, userId, user.groups);
      enqueueSnackbar('Subscription resumed', { variant: 'success' });
      fetchSubscriptions();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to resume', { variant: 'error' });
    } finally {
      setSubscriptionActionLoading(null);
    }
  };

  const handleSubscriptionExpire = async (): Promise<void> => {
    const uid = expireUserId;
    if (!user?.id || !uid) return;
    setSubscriptionActionLoading(uid);
    setExpireConfirmOpen(false);
    setExpireUserId(null);
    try {
      await apiService.expireUserSubscriptionAsAdmin(user.id, uid, user.groups);
      enqueueSnackbar('Subscription expired', { variant: 'success' });
      fetchSubscriptions();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to expire', { variant: 'error' });
    } finally {
      setSubscriptionActionLoading(null);
    }
  };

  const handleExtendClick = (userId: number): void => {
    setExtendUserId(userId);
    setExtendDays(30);
    setExtendDialogOpen(true);
  };

  const handleOpenShippingDialog = (order: any): void => {
    setShippingOrder(order);
    setShippingTrackingNumber(order.tracking_number || '');
    setShippingTrackingUrl(order.tracking_url || '');
    setShippingDialogOpen(true);
  };

  const handleSaveShipping = async (): Promise<void> => {
    if (!user?.id || !shippingOrder) return;
    setShippingActionLoading(true);
    try {
      const updates: { tracking_number?: string; tracking_url?: string; status?: string } = {};
      if (shippingTrackingNumber.trim()) updates.tracking_number = shippingTrackingNumber.trim();
      if (shippingTrackingUrl.trim()) updates.tracking_url = shippingTrackingUrl.trim();
      if (Object.keys(updates).length === 0) {
        enqueueSnackbar('No changes to save', { variant: 'info' });
        return;
      }
      if (shippingTrackingNumber.trim() && shippingOrder.status === 'paid') {
        updates.status = 'shipped';
      }
      await apiService.updateAdminOrderShipping(user.id, shippingOrder.id, updates, user.groups);
      enqueueSnackbar('Shipping updated', { variant: 'success' });
      setShippingDialogOpen(false);
      setShippingOrder(null);
      fetchOrders();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to update shipping', { variant: 'error' });
    } finally {
      setShippingActionLoading(false);
    }
  };

  const handleExtendConfirm = async (): Promise<void> => {
    if (!user?.id || !extendUserId) return;
    setSubscriptionActionLoading(extendUserId);
    try {
      await apiService.extendUserSubscriptionAsAdmin(user.id, extendUserId, extendDays, user.groups);
      enqueueSnackbar(`Subscription extended by ${extendDays} days`, { variant: 'success' });
      setExtendDialogOpen(false);
      setExtendUserId(null);
      fetchSubscriptions();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to extend', { variant: 'error' });
    } finally {
      setSubscriptionActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage users, listings, and platform content"
        align="left"
        sx={{
          '& > div > div': {
            borderLeftColor: 'secondary.main',
            bgcolor: 'rgba(255, 143, 0, 0.18)',
          },
        }}
      />
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, sm: 5, md: 6 } }}>
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{stats.users.total}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
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
                    <InventoryIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{stats.listings.total}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Listings
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
                    <EmailIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{stats.messages.total}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Messages
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
                    <ShoppingCartIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{stats.orders?.total ?? 0}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Orders
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <ShoppingCartIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h6">Order Statistics</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">By Status</Typography>
                      {stats.orders?.byStatus && Object.keys(stats.orders.byStatus).length > 0 ? (
                        <Box>
                          {Object.entries(stats.orders.byStatus).map(([status, count]) => (
                            <Typography key={status} variant="body2">
                              {status}: {count as number}
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">Revenue</Typography>
                      <Typography variant="body2">Total: ${(stats.orders?.revenue?.total ?? 0).toFixed(2)}</Typography>
                      <Typography variant="body2">Platform fees: ${(stats.orders?.revenue?.platformFees ?? 0).toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">This Month</Typography>
                      <Typography variant="body2">${(stats.orders?.revenue?.thisMonth ?? 0).toFixed(2)}</Typography>
                      <Typography variant="caption" color="text.secondary">Fees: ${(stats.orders?.revenue?.thisMonthFees ?? 0).toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">YTD</Typography>
                      <Typography variant="body2">${(stats.orders?.revenue?.ytd ?? 0).toFixed(2)}</Typography>
                      <Typography variant="caption" color="text.secondary">Fees: ${(stats.orders?.revenue?.ytdFees ?? 0).toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <CreditCardIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h6">Subscriptions</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Box
                        onClick={() => handleSubscriptionStatClick('active', 'Active Subscriptions')}
                        sx={{ cursor: (stats.subscriptions?.active ?? 0) > 0 ? 'pointer' : 'default', '&:hover': (stats.subscriptions?.active ?? 0) > 0 ? { opacity: 0.8 } : {} }}
                      >
                        <Typography variant="h5" color="primary">{stats.subscriptions?.active ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Active</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box
                        onClick={() => handleSubscriptionStatClick('expired', 'Expired Subscriptions')}
                        sx={{ cursor: (stats.subscriptions?.expired ?? 0) > 0 ? 'pointer' : 'default', '&:hover': (stats.subscriptions?.expired ?? 0) > 0 ? { opacity: 0.8 } : {} }}
                      >
                        <Typography variant="h5">{stats.subscriptions?.expired ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Expired</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box
                        onClick={() => handleSubscriptionStatClick('this_month', 'Subscriptions This Month')}
                        sx={{ cursor: (stats.subscriptions?.thisMonth ?? 0) > 0 ? 'pointer' : 'default', '&:hover': (stats.subscriptions?.thisMonth ?? 0) > 0 ? { opacity: 0.8 } : {} }}
                      >
                        <Typography variant="h5">{stats.subscriptions?.thisMonth ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">This Month</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box
                        onClick={() => handleSubscriptionStatClick('ytd', 'Subscriptions YTD')}
                        sx={{ cursor: (stats.subscriptions?.ytd ?? 0) > 0 ? 'pointer' : 'default', '&:hover': (stats.subscriptions?.ytd ?? 0) > 0 ? { opacity: 0.8 } : {} }}
                      >
                        <Typography variant="h5">{stats.subscriptions?.ytd ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">YTD</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">Billing</Typography>
                      <Box
                        onClick={() => handleSubscriptionStatClick('active', 'Active Monthly', undefined, 'monthly')}
                        sx={{ cursor: (stats.subscriptions?.byBilling?.monthly ?? 0) > 0 ? 'pointer' : 'default', '&:hover': (stats.subscriptions?.byBilling?.monthly ?? 0) > 0 ? { opacity: 0.8 } : {} }}
                      >
                        <Typography variant="body2">Monthly: {stats.subscriptions?.byBilling?.monthly ?? 0}</Typography>
                      </Box>
                      <Box
                        onClick={() => handleSubscriptionStatClick('active', 'Active Yearly', undefined, 'yearly')}
                        sx={{ cursor: (stats.subscriptions?.byBilling?.yearly ?? 0) > 0 ? 'pointer' : 'default', '&:hover': (stats.subscriptions?.byBilling?.yearly ?? 0) > 0 ? { opacity: 0.8 } : {} }}
                      >
                        <Typography variant="body2">Yearly: {stats.subscriptions?.byBilling?.yearly ?? 0}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary" display="block">By Plan (active)</Typography>
                      {stats.subscriptions?.byPlan && Object.keys(stats.subscriptions.byPlan).length > 0 ? (
                        <Box>
                          {Object.entries(stats.subscriptions.byPlan).map(([plan, count]) => (
                            <Box
                              key={plan}
                              onClick={() => handleSubscriptionStatClick('active', `${plan} Plan`, plan)}
                              sx={{ cursor: (count as number) > 0 ? 'pointer' : 'default', '&:hover': (count as number) > 0 ? { opacity: 0.8 } : {} }}
                            >
                              <Typography variant="body2">
                                {plan}: {count as number}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Paper>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<PeopleIcon />} iconPosition="start" label="Users" />
            <Tab icon={<InventoryIcon />} iconPosition="start" label="Listings" />
            <Tab icon={<EmailIcon />} iconPosition="start" label="Messages" />
            <Tab icon={<ReceiptIcon />} iconPosition="start" label="Orders" />
            <Tab icon={<CardMembershipIcon />} iconPosition="start" label="Subscriptions" />
            <Tab icon={<CreditCardIcon />} iconPosition="start" label="Subscription Plans" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2, px: 3 }}>
              <TextField
                fullWidth
                placeholder="Search users by email, username, or name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setUsersPage(1);
                }}
                sx={{ maxWidth: 400 }}
              />
            </Box>
            <TableContainer sx={{ px: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Subscription</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            {userData.first_name?.charAt(0) || userData.email?.charAt(0) || 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {userData.business_name || 
                               (userData.first_name && userData.last_name 
                                 ? `${userData.first_name} ${userData.last_name}`
                                 : userData.cognito_username)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              @{userData.cognito_username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={userData.user_type || 'artist'} 
                          size="small"
                          color={userData.user_type === 'admin' ? 'error' : userData.user_type === 'buyer' ? 'info' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={
                            (userData.blocked === 1 || userData.blocked === true || userData.blocked === '1') ? 'Blocked' :
                            !userData.active || userData.active === 0 || userData.active === false ? 'Inactive' : 'Active'
                          } 
                          size="small"
                          color={
                            (userData.blocked === 1 || userData.blocked === true || userData.blocked === '1') ? 'error' :
                            !userData.active || userData.active === 0 || userData.active === false ? 'warning' : 'success'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {userSubscriptions[userData.id] ? (
                          <Box>
                            <Chip 
                              label={userSubscriptions[userData.id].plan_name || 'Unknown Plan'} 
                              size="small"
                              color="primary"
                              sx={{ mb: 0.5 }}
                            />
                            <Typography variant="caption" display="block" color="text.secondary">
                              {userSubscriptions[userData.id].billing_period === 'monthly' ? 'Monthly' : 'Yearly'}
                              {userSubscriptions[userData.id].current_listings !== undefined && (
                                ` • ${userSubscriptions[userData.id].current_listings}/${userSubscriptions[userData.id].max_listings} listings`
                              )}
                            </Typography>
                            {userSubscriptions[userData.id].end_date && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Expires: {new Date(userSubscriptions[userData.id].end_date).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No subscription
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(userData.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleUserMenuOpen(e, userData)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {usersPagination && usersPagination.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={usersPagination.totalPages}
                  page={usersPagination.page}
                  onChange={(_e, value) => setUsersPage(value)}
                />
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2, px: 3, display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setListingsPage(1);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="sold">Sold</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setListingsPage(1);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Painting">Painting</MenuItem>
                  <MenuItem value="Woodworking">Woodworking</MenuItem>
                  <MenuItem value="Prints">Prints</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TableContainer sx={{ px: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Artist</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>{listing.title}</TableCell>
                      <TableCell>{listing.artist_name}</TableCell>
                      <TableCell>{listing.category}</TableCell>
                      <TableCell>${listing.price}</TableCell>
                      <TableCell>
                        <Chip 
                          label={listing.status} 
                          size="small"
                          color={
                            listing.status === 'active' ? 'success' : 
                            listing.status === 'inactive' ? 'warning' : 
                            listing.status === 'sold' ? 'error' : 
                            listing.status === 'archived' ? 'info' : 
                            'default'
                          }
                          onClick={() => handleStatusChangeClick(listing.id, listing.status)}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.9 },
                          }}
                          disabled={statusChanging === listing.id}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(listing.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          title="Edit listing"
                          sx={{ mr: 1 }}
                        >
                          <OpenInNewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(listing.id)}
                          title="Delete listing"
                          disabled={deleting === listing.id}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {listingsPagination && listingsPagination.total > 0 && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {((listingsPagination.page - 1) * listingsPagination.limit) + 1} - {Math.min(listingsPagination.page * listingsPagination.limit, listingsPagination.total)} of {listingsPagination.total} listings
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={listingsPagination.totalPages}
                    page={listingsPagination.page}
                    onChange={(_e, value) => setListingsPage(value)}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <TableContainer sx={{ px: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Listing</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>{message.sender_name_display || message.sender_email}</TableCell>
                      <TableCell>{message.recipient_name || message.recipient_email}</TableCell>
                      <TableCell>{message.subject}</TableCell>
                      <TableCell>{message.listing_title}</TableCell>
                      <TableCell>
                        {new Date(message.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {messagesPagination && messagesPagination.total > 0 && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {((messagesPagination.page - 1) * messagesPagination.limit) + 1} - {Math.min(messagesPagination.page * messagesPagination.limit, messagesPagination.total)} of {messagesPagination.total} messages
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={messagesPagination.totalPages}
                    page={messagesPagination.page}
                    onChange={(_e, value) => setMessagesPage(value)}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box sx={{ mb: 2, px: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by order #, title, buyer, seller..."
                value={ordersSearch}
                onChange={(e) => setOrdersSearch(e.target.value)}
                sx={{ minWidth: 280 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={ordersStatusFilter}
                  label="Status"
                  onChange={(e) => setOrdersStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="shipped">Shipped</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {loadingOrders ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer sx={{ px: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Listing</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell>Seller</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Shipping</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No orders found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.order_number}</TableCell>
                          <TableCell>{order.listing_title}</TableCell>
                          <TableCell>{order.buyer_email}</TableCell>
                          <TableCell>{order.seller_email}</TableCell>
                          <TableCell>${order.total_price?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              size="small"
                              color={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : order.status === 'pending' ? 'warning' : 'primary'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ maxWidth: 180 }}>
                              {order.shipping_address && (
                                <Typography variant="caption" display="block" noWrap title={order.shipping_address}>
                                  {order.shipping_address.split('\n')[0]}
                                </Typography>
                              )}
                              {order.tracking_number ? (
                                <Typography variant="caption" display="block" color="primary">
                                  {order.tracking_url ? (
                                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                      {order.tracking_number}
                                    </a>
                                  ) : (
                                    order.tracking_number
                                  )}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary">No tracking</Typography>
                              )}
                              <IconButton size="small" onClick={() => handleOpenShippingDialog(order)} title="Manage shipping">
                                <LocalShippingIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => navigate(`/painting/${order.listing_id}`)}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {ordersPagination && ordersPagination.total > 0 && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {((ordersPagination.page - 1) * ordersPagination.limit) + 1} - {Math.min(ordersPagination.page * ordersPagination.limit, ordersPagination.total)} of {ordersPagination.total} orders
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={ordersPagination.totalPages}
                    page={ordersPagination.page}
                    onChange={(_e, value) => setOrdersPage(value)}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <Box sx={{ mb: 2, px: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by email, name, username..."
                value={subscriptionsSearch}
                onChange={(e) => setSubscriptionsSearch(e.target.value)}
                sx={{ minWidth: 260 }}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={subscriptionsStatusFilter}
                  label="Status"
                  onChange={(e) => setSubscriptionsStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Plan</InputLabel>
                <Select
                  value={subscriptionsPlanFilter}
                  label="Plan"
                  onChange={(e) => setSubscriptionsPlanFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {subscriptionPlans.map((p) => (
                    <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {loadingSubscriptions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer sx={{ px: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Billing</TableCell>
                      <TableCell>Start</TableCell>
                      <TableCell>End</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Auto-renew</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No subscriptions found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">{sub.user_name || sub.email}</Typography>
                              <Typography variant="caption" color="text.secondary">{sub.email}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{sub.plan_name}</TableCell>
                          <TableCell>{sub.billing_period === 'monthly' ? 'Monthly' : 'Yearly'}</TableCell>
                          <TableCell>{new Date(sub.start_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(sub.end_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip
                              label={sub.status}
                              size="small"
                              color={sub.status === 'active' ? 'success' : sub.status === 'expired' ? 'default' : 'warning'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{sub.auto_renew ? 'Yes' : 'No'}</TableCell>
                          <TableCell align="right">
                            {sub.status === 'active' && (
                              <>
                                {sub.auto_renew ? (
                                  <IconButton
                                    size="small"
                                    title="Cancel auto-renew"
                                    onClick={() => handleSubscriptionCancel(sub.user_id)}
                                    disabled={subscriptionActionLoading === sub.user_id}
                                  >
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <IconButton
                                    size="small"
                                    title="Resume auto-renew"
                                    onClick={() => handleSubscriptionResume(sub.user_id)}
                                    disabled={subscriptionActionLoading === sub.user_id}
                                  >
                                    <PlayArrowIcon fontSize="small" />
                                  </IconButton>
                                )}
                                <IconButton
                                  size="small"
                                  title="Extend subscription"
                                  onClick={() => handleExtendClick(sub.user_id)}
                                  disabled={subscriptionActionLoading === sub.user_id}
                                >
                                  <EventIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  title="Expire immediately"
                                  onClick={() => { setExpireUserId(sub.user_id); setExpireConfirmOpen(true); }}
                                  disabled={subscriptionActionLoading === sub.user_id}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {subscriptionsPagination && subscriptionsPagination.total > 0 && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {((subscriptionsPagination.page - 1) * subscriptionsPagination.limit) + 1} - {Math.min(subscriptionsPagination.page * subscriptionsPagination.limit, subscriptionsPagination.total)} of {subscriptionsPagination.total}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={subscriptionsPagination.totalPages}
                    page={subscriptionsPagination.page}
                    onChange={(_e, value) => setSubscriptionsPage(value)}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={5}>
            <Box sx={{ px: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Subscription Plans</Typography>
                <Button variant="contained" onClick={handlePlanCreate} startIcon={<EditIcon />}>
                  Create Plan
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Tier</TableCell>
                      <TableCell>Max Listings</TableCell>
                      <TableCell>Monthly Price</TableCell>
                      <TableCell>Yearly Price</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Order</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptionPlans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No subscription plans found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptionPlans.map((plan) => {
                        const monthlyPrice = typeof plan.price_monthly === 'number' 
                          ? plan.price_monthly 
                          : parseFloat(plan.price_monthly || '0');
                        const yearlyPrice = typeof plan.price_yearly === 'number' 
                          ? plan.price_yearly 
                          : parseFloat(plan.price_yearly || '0');
                        
                        return (
                          <TableRow key={plan.id}>
                            <TableCell>{plan.name}</TableCell>
                            <TableCell>{plan.tier}</TableCell>
                            <TableCell>{plan.max_listings}</TableCell>
                            <TableCell>${monthlyPrice.toFixed(2)}</TableCell>
                            <TableCell>${yearlyPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                label={plan.is_active ? 'Active' : 'Inactive'}
                                color={plan.is_active ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{plan.display_order}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handlePlanEdit(plan)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handlePlanDelete(plan.id)}
                            disabled={deletingPlan === plan.id}
                            color="error"
                          >
                            {deletingPlan === plan.id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>
        </Paper>

        <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Plan Name"
                fullWidth
                value={planFormData.name || ''}
                onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                required
              />
              <TextField
                label="Tier (e.g., starter, professional, enterprise)"
                fullWidth
                value={planFormData.tier || ''}
                onChange={(e) => setPlanFormData({ ...planFormData, tier: e.target.value })}
                required
              />
              <TextField
                label="Max Listings"
                type="number"
                fullWidth
                value={planFormData.max_listings || ''}
                onChange={(e) => setPlanFormData({ ...planFormData, max_listings: parseInt(e.target.value) || 0 })}
                required
              />
              <TextField
                label="Monthly Price ($)"
                type="number"
                fullWidth
                value={planFormData.price_monthly || ''}
                onChange={(e) => setPlanFormData({ ...planFormData, price_monthly: parseFloat(e.target.value) || 0 })}
                required
              />
              <TextField
                label="Yearly Price ($)"
                type="number"
                fullWidth
                value={planFormData.price_yearly || ''}
                onChange={(e) => setPlanFormData({ ...planFormData, price_yearly: parseFloat(e.target.value) || 0 })}
                required
              />
              <TextField
                label="Features (one per line)"
                multiline
                rows={4}
                fullWidth
                value={planFormData.features || ''}
                onChange={(e) => setPlanFormData({ ...planFormData, features: e.target.value })}
              />
              <TextField
                label="Display Order"
                type="number"
                fullWidth
                value={planFormData.display_order || 0}
                onChange={(e) => setPlanFormData({ ...planFormData, display_order: parseInt(e.target.value) || 0 })}
              />
              <FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={planFormData.is_active !== false}
                      onChange={(e) => setPlanFormData({ ...planFormData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePlanSave} variant="contained">
              {editingPlan ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
        >
          <MenuItem
            onClick={() => {
              setNewUserType(selectedUser?.user_type || 'artist');
              setUserTypeDialogOpen(true);
            }}
          >
            <EditIcon sx={{ mr: 1 }} />
            Change User Type
          </MenuItem>
          {selectedUser && (selectedUser.active !== false && selectedUser.active !== 0 && selectedUser.active) && !(selectedUser.blocked === 1 || selectedUser.blocked === true) && (
            <MenuItem
              onClick={() => {
                if (selectedUser) {
                  handleDeactivateUserClick(selectedUser.id);
                }
              }}
              disabled={deactivatingUser === selectedUser?.id}
            >
              <BlockIcon sx={{ mr: 1 }} />
              Deactivate User
            </MenuItem>
          )}
          {selectedUser && selectedUser.cognito_username !== user?.id && !(selectedUser.blocked === 1 || selectedUser.blocked === true) && (
            <MenuItem
              onClick={() => {
                if (selectedUser) {
                  handleBlockUserClick(selectedUser.id);
                }
              }}
              disabled={blockingUser === selectedUser?.id}
              sx={{ color: 'error.main' }}
            >
              <LockIcon sx={{ mr: 1 }} />
              {blockingUser === selectedUser?.id ? 'Blocking...' : 'Block User'}
            </MenuItem>
          )}
          {selectedUser && (!selectedUser.active || selectedUser.active === 0 || selectedUser.active === false) && !(selectedUser.blocked === 1 || selectedUser.blocked === true) && (
            <MenuItem
              onClick={() => {
                if (selectedUser) {
                  handleActivateUser(selectedUser.id);
                }
              }}
              disabled={activatingUser === selectedUser?.id}
            >
              <CheckCircleIcon sx={{ mr: 1 }} />
              {activatingUser === selectedUser?.id ? 'Activating...' : 'Activate User'}
            </MenuItem>
          )}
          {selectedUser && selectedUser.cognito_username !== user?.id && (selectedUser.blocked === 1 || selectedUser.blocked === true) && (
            <MenuItem
              onClick={() => {
                if (selectedUser) {
                  handleUnblockUser(selectedUser.id);
                }
              }}
              disabled={unblockingUser === selectedUser?.id}
            >
              <LockOpenIcon sx={{ mr: 1 }} />
              {unblockingUser === selectedUser?.id ? 'Unblocking...' : 'Unblock User'}
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              if (selectedUser) {
                handleDeleteUserClick(selectedUser.id);
              }
            }}
            disabled={deletingUser === selectedUser?.id}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            {deletingUser === selectedUser?.id ? 'Deleting...' : 'Delete User'}
          </MenuItem>
        </Menu>

        <Dialog open={userTypeDialogOpen} onClose={() => setUserTypeDialogOpen(false)}>
          <DialogTitle>Change User Type</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>User Type</InputLabel>
              <Select
                value={newUserType}
                label="User Type"
                onChange={(e) => setNewUserType(e.target.value as 'artist' | 'buyer' | 'admin')}
              >
                <MenuItem value="artist">Artist</MenuItem>
                <MenuItem value="buyer">Buyer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUserType} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={inactivateConfirmOpen} onClose={handleInactivateCancel}>
          <DialogTitle>Inactivate Listing</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to inactivate this listing? It will no longer be visible to buyers.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleInactivateCancel}>Cancel</Button>
            <Button
              onClick={handleInactivateConfirm}
              color="warning"
              variant="contained"
              disabled={inactivating !== null}
            >
              {inactivating ? 'Inactivating...' : 'Inactivate'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Delete Listing</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this listing? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleting !== null}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={statusChangeDialogOpen} onClose={handleStatusChangeCancel}>
          <DialogTitle>Change Listing Status</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Current status: <strong>{listingToChangeStatus?.currentStatus}</strong>
            </DialogContentText>
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select
                value={newStatus}
                label="New Status"
                onChange={(e) => setNewStatus(e.target.value as 'draft' | 'active' | 'inactive' | 'sold' | 'archived')}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleStatusChangeCancel}>Cancel</Button>
            <Button
              onClick={handleStatusChangeConfirm}
              variant="contained"
              disabled={statusChanging !== null || newStatus === listingToChangeStatus?.currentStatus}
            >
              {statusChanging ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deactivateUserConfirmOpen} onClose={handleDeactivateUserCancel}>
          <DialogTitle>Deactivate User</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to deactivate this user? They will not be able to access their account until reactivated.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeactivateUserCancel}>Cancel</Button>
            <Button
              onClick={handleDeactivateUserConfirm}
              color="error"
              variant="contained"
              disabled={deactivatingUser !== null}
            >
              {deactivatingUser ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={subscriptionUsersDialogOpen}
          onClose={() => setSubscriptionUsersDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{subscriptionUsersFilter?.title ?? 'Users'}</DialogTitle>
          <DialogContent>
            {loadingSubscriptionUsers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : subscriptionUsers.length === 0 ? (
              <Typography color="text.secondary">No users found</Typography>
            ) : (
              <List dense>
                {subscriptionUsers.map((u) => (
                  <ListItem key={u.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                        {u.first_name?.charAt(0) || u.email?.charAt(0) || 'U'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={u.business_name || (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.cognito_username)}
                      secondary={`${u.email} • @${u.cognito_username}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubscriptionUsersDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={blockUserConfirmOpen} onClose={handleBlockUserCancel}>
          <DialogTitle>Block User</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Blocking this user will prevent them from signing in. They cannot create a new account with the same email or credentials. Only an admin can unblock them.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBlockUserCancel}>Cancel</Button>
            <Button
              onClick={handleBlockUserConfirm}
              color="error"
              variant="contained"
              disabled={blockingUser !== null}
            >
              {blockingUser ? 'Blocking...' : 'Block'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={expireConfirmOpen} onClose={() => { setExpireConfirmOpen(false); setExpireUserId(null); }}>
          <DialogTitle>Expire Subscription</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will immediately expire the subscription. The user will lose access to their listing limits. This cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setExpireConfirmOpen(false); setExpireUserId(null); }}>Cancel</Button>
            <Button onClick={handleSubscriptionExpire} color="error" variant="contained">
              Expire Now
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={shippingDialogOpen} onClose={() => { setShippingDialogOpen(false); setShippingOrder(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>Shipping Details</DialogTitle>
          <DialogContent>
            {shippingOrder && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Order</Typography>
                  <Typography variant="body2">{shippingOrder.order_number} – {shippingOrder.listing_title}</Typography>
                </Box>
                {shippingOrder.shipping_address && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Shipping Address</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{shippingOrder.shipping_address}</Typography>
                  </Box>
                )}
                {shippingOrder.shipping_cost != null && (
                  <Typography variant="body2">Shipping cost: ${parseFloat(shippingOrder.shipping_cost).toFixed(2)}</Typography>
                )}
                {shippingOrder.label_url && (
                  <Button size="small" href={shippingOrder.label_url} target="_blank" rel="noopener">View label</Button>
                )}
                <TextField
                  label="Tracking number"
                  fullWidth
                  size="small"
                  value={shippingTrackingNumber}
                  onChange={(e) => setShippingTrackingNumber(e.target.value)}
                  placeholder="1Z999AA10123456784"
                />
                <TextField
                  label="Tracking URL"
                  fullWidth
                  size="small"
                  value={shippingTrackingUrl}
                  onChange={(e) => setShippingTrackingUrl(e.target.value)}
                  placeholder="https://..."
                />
                {shippingOrder.status === 'paid' && shippingTrackingNumber.trim() && (
                  <Typography variant="caption" color="text.secondary">Saving will mark order as shipped</Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setShippingDialogOpen(false); setShippingOrder(null); }}>Cancel</Button>
            <Button onClick={handleSaveShipping} variant="contained" disabled={shippingActionLoading}>
              {shippingActionLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={extendDialogOpen} onClose={() => { setExtendDialogOpen(false); setExtendUserId(null); }}>
          <DialogTitle>Extend Subscription</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Extend the subscription end date by the number of days specified.
            </DialogContentText>
            <TextField
              label="Days to add"
              type="number"
              fullWidth
              value={extendDays}
              onChange={(e) => setExtendDays(Math.min(365, Math.max(1, parseInt(e.target.value) || 30)))}
              inputProps={{ min: 1, max: 365 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setExtendDialogOpen(false); setExtendUserId(null); }}>Cancel</Button>
            <Button onClick={handleExtendConfirm} variant="contained" disabled={!extendUserId}>
              Extend
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={deleteUserConfirmOpen} onClose={handleDeleteUserCancel}>
          <DialogTitle>Delete User</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete this user? This will remove them from both the database and Cognito. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteUserCancel}>Cancel</Button>
            <Button
              onClick={handleDeleteUserConfirm}
              color="error"
              variant="contained"
              disabled={deletingUser !== null}
            >
              {deletingUser ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
