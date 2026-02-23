import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
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
  ListItemButton,
  ListItemIcon,
  ListSubheader,
  Drawer,
  Divider,
  Autocomplete,
  Popper,
  MenuList,
  ClickAwayListener,
  useMediaQuery,
  useTheme,
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
  Campaign as CampaignIcon,
  Notifications as NotificationsIcon,
  HeadsetMic as SupportIcon,
  Send as SendIcon,
  Circle as CircleIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService, { SubscriptionPlan } from '../services/api';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/PageHeader';

const SIDEBAR_WIDTH = 240;

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeSection, setActiveSection] = useState('users');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [announcementForm, setAnnouncementForm] = useState({ message: '', target_type: 'all', target_user_ids: [] as number[], severity: 'info', is_active: true });
  const [announcementUserOptions, setAnnouncementUserOptions] = useState<any[]>([]);
  const [announcementUserLoading, setAnnouncementUserLoading] = useState(false);
  const [announcementSelectedUser, setAnnouncementSelectedUser] = useState<any>(null);
  const [notificationForm, setNotificationForm] = useState({ title: '', body: '', link: '', target: 'all' as 'all' | 'specific', user_ids: [] as number[], severity: 'info' as 'info' | 'warning' | 'success' | 'error' });
  const [notificationUserOptions, setNotificationUserOptions] = useState<any[]>([]);
  const [notificationSelectedUser, setNotificationSelectedUser] = useState<any>(null);
  const [notificationMentionOptions, setNotificationMentionOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [notificationMentionOpen, setNotificationMentionOpen] = useState(false);
  const [notificationMentionQuery, setNotificationMentionQuery] = useState('');
  const notificationBodyRef = useRef<HTMLTextAreaElement>(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [supportChatConfig, setSupportChatConfig] = useState({ enabled: true, hours_start: 9, hours_end: 17, timezone: 'America/Los_Angeles', offline_message: 'Support is currently offline. Please leave a message and we will get back to you.', welcome_message: 'Hi! How can we help you today?' });
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [supportSelectedUserId, setSupportSelectedUserId] = useState<number | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportReply, setSupportReply] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [savingSupportConfig, setSavingSupportConfig] = useState(false);
  const supportMessagesEndRef = useRef<HTMLDivElement>(null);
  const [userChatEnabled, setUserChatEnabled] = useState(false);
  const [userChatLoading, setUserChatLoading] = useState(false);

  const fetchUserChatEnabled = async () => {
    try {
      const { enabled } = await apiService.getUserChatEnabled();
      setUserChatEnabled(enabled);
    } catch {}
  };

  const fetchSupportConfig = async () => {
    try {
      const config = await apiService.getSupportChatConfig();
      setSupportChatConfig(config);
    } catch {}
  };

  const fetchSupportConversations = async () => {
    try {
      const convs = await apiService.getSupportChatConversations();
      setSupportConversations(convs);
    } catch {}
  };

  const fetchSupportMessages = async (userId: number) => {
    try {
      const msgs = await apiService.getSupportChatAdminMessages(userId);
      setSupportMessages(msgs);
      setTimeout(() => supportMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  const handleSaveSupportConfig = async () => {
    setSavingSupportConfig(true);
    try {
      await apiService.updateSupportChatConfig(supportChatConfig);
      enqueueSnackbar('Support chat settings saved', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
    } finally {
      setSavingSupportConfig(false);
    }
  };

  const handleSendSupportReply = async () => {
    if (!supportReply.trim() || !supportSelectedUserId || !user?.id) return;
    setSupportSending(true);
    try {
      await apiService.sendSupportChatMessage({
        message: supportReply.trim(),
        sender: 'admin',
        adminCognitoUsername: user.id,
        targetUserId: supportSelectedUserId,
      });
      setSupportReply('');
      await fetchSupportMessages(supportSelectedUserId);
      await fetchSupportConversations();
    } catch {
      enqueueSnackbar('Failed to send reply', { variant: 'error' });
    } finally {
      setSupportSending(false);
    }
  };

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
    if (!user?.id || (activeSection !== 'subscriptions' && activeSection !== 'plans')) return;
    fetchSubscriptionPlans();
  }, [user?.id, activeSection]);

  useEffect(() => {
    if (!user?.id || activeSection !== 'announcements') return;
    fetchAnnouncements();
  }, [user?.id, activeSection]);

  useEffect(() => {
    if (!user?.id || activeSection !== 'subscriptions') return;
    setSubscriptionsPage(1);
  }, [subscriptionsStatusFilter, subscriptionsPlanFilter, subscriptionsSearch]);

  useEffect(() => {
    if (!user?.id || activeSection !== 'subscriptions') return;
    fetchSubscriptions();
  }, [user?.id, activeSection, subscriptionsPage, subscriptionsStatusFilter, subscriptionsPlanFilter, subscriptionsSearch]);

  useEffect(() => {
    if (!user?.id || activeSection !== 'orders') return;
    setOrdersPage(1);
  }, [ordersSearch, ordersStatusFilter]);

  useEffect(() => {
    if (!user?.id || activeSection !== 'orders') return;
    fetchOrders();
  }, [user?.id, activeSection, ordersPage, ordersSearch, ordersStatusFilter]);

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

  const fetchAnnouncements = async (): Promise<void> => {
    if (!user?.id) return;
    setLoadingAnnouncements(true);
    try {
      const res = await apiService.getAdminAnnouncements(user.id, user.groups);
      setAnnouncements(res.announcements || []);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to fetch announcements', { variant: 'error' });
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleAnnouncementCreate = (): void => {
    setEditingAnnouncement(null);
    setAnnouncementForm({ message: '', target_type: 'all', target_user_ids: [], severity: 'info', is_active: true });
    setAnnouncementSelectedUser(null);
    setAnnouncementDialogOpen(true);
  };

  const handleAnnouncementEdit = async (a: any): Promise<void> => {
    setEditingAnnouncement(a);
    setAnnouncementForm({
      message: a.message || '',
      target_type: a.target_type || 'all',
      target_user_ids: Array.isArray(a.target_user_ids) ? a.target_user_ids : [],
      severity: a.severity || 'info',
      is_active: a.is_active !== false,
    });
    setAnnouncementSelectedUser(null);
    if (a.target_type === 'specific' && a.target_user_ids?.length > 0 && user?.id) {
      try {
        const u = await apiService.getAdminUserById(user.id, a.target_user_ids[0], user.groups);
        setAnnouncementSelectedUser(u);
      } catch {
        setAnnouncementSelectedUser(null);
      }
    }
    setAnnouncementDialogOpen(true);
  };

  const handleAnnouncementSave = async (): Promise<void> => {
    if (!user?.id) return;
    if (!announcementForm.message.trim()) {
      enqueueSnackbar('Message is required', { variant: 'error' });
      return;
    }
    const payload = { ...announcementForm };
    if (payload.target_type === 'specific') {
      const ids = announcementSelectedUser?.id ? [announcementSelectedUser.id] : payload.target_user_ids;
      if (!ids?.length) {
        enqueueSnackbar('Select a user for specific targeting', { variant: 'error' });
        return;
      }
      payload.target_user_ids = ids;
    } else {
      payload.target_user_ids = [];
    }
    try {
      if (editingAnnouncement) {
        await apiService.updateAnnouncement(user.id, editingAnnouncement.id, payload, user.groups);
        enqueueSnackbar('Announcement updated', { variant: 'success' });
      } else {
        await apiService.createAnnouncement(user.id, payload, user.groups);
        enqueueSnackbar('Announcement created', { variant: 'success' });
      }
      setAnnouncementDialogOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to save', { variant: 'error' });
    }
  };

  const handleAnnouncementDelete = async (id: number): Promise<void> => {
    if (!user?.id) return;
    try {
      await apiService.deleteAnnouncement(user.id, id, user.groups);
      enqueueSnackbar('Announcement deleted', { variant: 'success' });
      fetchAnnouncements();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to delete', { variant: 'error' });
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

  const handleSectionChange = (section: string): void => {
    setActiveSection(section);
    if (isMobile) setSidebarOpen(false);
    if (section === 'support') {
      fetchSupportConfig();
      fetchSupportConversations();
    }
    if (section === 'settings') {
      fetchUserChatEnabled();
      fetchSupportConfig();
    }
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

  const sidebarNav = (
    <List component="nav" disablePadding>
      {[
        { label: 'Core', items: [
          { key: 'users', name: 'Users', icon: <PeopleIcon fontSize="small" /> },
          { key: 'listings', name: 'Listings', icon: <InventoryIcon fontSize="small" /> },
          { key: 'orders', name: 'Orders', icon: <ReceiptIcon fontSize="small" /> },
        ]},
        { label: 'Communication', items: [
          { key: 'messages', name: 'Messages', icon: <EmailIcon fontSize="small" /> },
          { key: 'notifications', name: 'Notifications', icon: <NotificationsIcon fontSize="small" /> },
          { key: 'announcements', name: 'Announcements', icon: <CampaignIcon fontSize="small" /> },
          { key: 'support', name: 'Support Chat', icon: <SupportIcon fontSize="small" /> },
        ]},
        { label: 'Billing', items: [
          { key: 'subscriptions', name: 'Subscriptions', icon: <CardMembershipIcon fontSize="small" /> },
          { key: 'plans', name: 'Plans', icon: <CreditCardIcon fontSize="small" /> },
        ]},
      ].map(group => (
        <React.Fragment key={group.label}>
          <ListSubheader sx={{ lineHeight: '36px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled', bgcolor: 'transparent' }}>{group.label}</ListSubheader>
          {group.items.map(item => (
            <ListItemButton key={item.key} selected={activeSection === item.key} onClick={() => handleSectionChange(item.key)} sx={{ py: 0.75, pl: 3 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
          ))}
        </React.Fragment>
      ))}
      <Divider sx={{ my: 1 }} />
      <ListItemButton selected={activeSection === 'settings'} onClick={() => handleSectionChange('settings')} sx={{ py: 0.75, pl: 3 }}>
        <ListItemIcon sx={{ minWidth: 36 }}><SettingsIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary="Settings" primaryTypographyProps={{ variant: 'body2' }} />
      </ListItemButton>
    </List>
  );

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

        <Box sx={{ display: 'flex', gap: 3 }}>
          {!isMobile ? (
            <Paper sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 80, overflow: 'hidden' }}>
              {sidebarNav}
            </Paper>
          ) : (
            <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
              <Box sx={{ width: SIDEBAR_WIDTH }}>{sidebarNav}</Box>
            </Drawer>
          )}

          <Paper sx={{ flex: 1, minWidth: 0 }}>
            {isMobile && (
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Button startIcon={<MenuIcon />} onClick={() => setSidebarOpen(true)} size="small" variant="outlined">
                  Menu
                </Button>
              </Box>
            )}
            {activeSection === 'users' && (<Box sx={{ py: 3 }}>
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
          </Box>)}

          {activeSection === 'listings' && (<Box sx={{ py: 3 }}>
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
          </Box>)}

          {activeSection === 'messages' && (<Box sx={{ py: 3 }}>
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
          </Box>)}

          {activeSection === 'orders' && (<Box sx={{ py: 3 }}>
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
          </Box>)}

          {activeSection === 'subscriptions' && (<Box sx={{ py: 3 }}>
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
          </Box>)}

          {activeSection === 'plans' && (<Box sx={{ py: 3 }}>
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
          </Box>)}

          {activeSection === 'announcements' && (<Box sx={{ py: 3 }}>
            <Box sx={{ px: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Site Announcements</Typography>
                <Button variant="contained" onClick={handleAnnouncementCreate} startIcon={<CampaignIcon />}>
                  Create Announcement
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Announcements appear as banners at the top of the site. Choose who sees each message.
              </Typography>
              {loadingAnnouncements ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : announcements.length === 0 ? (
                <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <CampaignIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No announcements yet. Create one to show a banner to users.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Message</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {announcements.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell sx={{ maxWidth: 400 }}>
                            <Typography variant="body2" noWrap>{a.message}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={a.target_type === 'specific' && a.target_user_ids?.length ? `1 user` : a.target_type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={a.severity} size="small" color={a.severity === 'error' ? 'error' : a.severity === 'warning' ? 'warning' : a.severity === 'success' ? 'success' : 'default'} />
                          </TableCell>
                          <TableCell>{a.is_active ? 'Yes' : 'No'}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleAnnouncementEdit(a)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleAnnouncementDelete(a.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>)}

          {activeSection === 'notifications' && (<Box sx={{ py: 3 }}>
            <Box sx={{ px: 3, pb: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Send Notification</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Send a notification to one user or all users. Notifications appear in the notification panel.
              </Typography>
              <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Send to</InputLabel>
                    <Select
                      value={notificationForm.target}
                      label="Send to"
                      onChange={(e) => {
                        const t = e.target.value as 'all' | 'specific';
                        setNotificationForm({ ...notificationForm, target: t });
                        if (t === 'all') setNotificationSelectedUser(null);
                      }}
                    >
                      <MenuItem value="all">All users</MenuItem>
                      <MenuItem value="specific">Specific user</MenuItem>
                    </Select>
                  </FormControl>
                  {notificationForm.target === 'specific' && (
                    <Autocomplete
                      options={notificationUserOptions}
                      value={notificationSelectedUser}
                      onChange={(_, v) => setNotificationSelectedUser(v)}
                      onInputChange={(_, v) => {
                        if (v.length < 2) {
                          setNotificationUserOptions([]);
                          return;
                        }
                        apiService.getAdminUsers(user!.id, { search: v, limit: 20 }, user!.groups)
                          .then((r) => setNotificationUserOptions(r.users || []));
                      }}
                      onOpen={() => {
                        if (notificationUserOptions.length === 0) {
                          apiService.getAdminUsers(user!.id, { limit: 50 }, user!.groups)
                            .then((r) => setNotificationUserOptions(r.users || []));
                        }
                      }}
                      getOptionLabel={(o) => o?.email || o?.cognito_username || o?.first_name || o?.last_name || String(o?.id || '')}
                      renderInput={(params) => (
                        <TextField {...params} label="Select user" placeholder="Search by email or name" />
                      )}
                    />
                  )}
                  <FormControl fullWidth>
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={notificationForm.severity}
                      label="Severity"
                      onChange={(e) => setNotificationForm({ ...notificationForm, severity: e.target.value as 'info' | 'warning' | 'success' | 'error' })}
                    >
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="success">Success</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Title"
                    fullWidth
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    placeholder="e.g. New feature available"
                    required
                  />
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      label="Message"
                      multiline
                      rows={3}
                      fullWidth
                      inputRef={notificationBodyRef}
                      value={notificationForm.body}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNotificationForm({ ...notificationForm, body: val });
                        const cursorPos = e.target.selectionStart || 0;
                        const textBefore = val.slice(0, cursorPos);
                        const mentionMatch = textBefore.match(/@(\w*)$/);
                        if (mentionMatch) {
                          const query = mentionMatch[1].toLowerCase();
                          setNotificationMentionQuery(query);
                          const staticLinks: Array<{ label: string; value: string }> = [
                            { label: '@orders', value: '/orders' },
                            { label: '@gallery', value: '/gallery' },
                            { label: '@messages', value: '/messages' },
                            { label: '@cart', value: '/cart' },
                          ];
                          const filtered = query ? staticLinks.filter((l) => l.label.slice(1).startsWith(query)) : staticLinks;
                          if ((query === 'orders' || query.startsWith('orders')) && notificationForm.target === 'specific' && notificationSelectedUser?.id) {
                            apiService.getAdminOrders(user!.id, { user_id: notificationSelectedUser.id, limit: 50 }, user!.groups)
                              .then((r) => {
                                const orderOpts = (r.orders || []).map((o: any) => ({
                                  label: `Order ${o.order_number} - ${o.listing_title || ''} (${o.status})`,
                                  value: `/orders?order=${o.id}`,
                                }));
                                setNotificationMentionOptions([...filtered, ...orderOpts]);
                              });
                          } else if ((query === 'gallery' || query.startsWith('gallery')) && query.length > 7) {
                            const search = query.slice(7).trim();
                            if (search.length >= 1) {
                              apiService.getListings({ search, limit: 20, status: 'active' }).then((r) => {
                                const listingOpts = (r.listings || []).map((l: any) => ({
                                  label: `${l.title} (${l.category})`,
                                  value: `/painting/${l.id}`,
                                }));
                                setNotificationMentionOptions([...filtered, ...listingOpts]);
                              });
                            } else {
                              setNotificationMentionOptions(filtered);
                            }
                          } else if (query === 'gallery') {
                            apiService.getListings({ limit: 30, status: 'active' }).then((r) => {
                              const listingOpts = (r.listings || []).map((l: any) => ({
                                label: `${l.title} (${l.category})`,
                                value: `/painting/${l.id}`,
                              }));
                              setNotificationMentionOptions([...filtered, ...listingOpts]);
                            });
                          } else {
                            setNotificationMentionOptions(filtered);
                          }
                          setNotificationMentionOpen(filtered.length > 0 || query.length > 0);
                        } else {
                          setNotificationMentionOpen(false);
                        }
                      }}
                      placeholder="Type message... use @ for links (@orders, @gallery, @messages, @cart)"
                      helperText={notificationForm.link ? `Link: ${notificationForm.link}` : 'Type @ to insert a link'}
                    />
                    <Popper
                      open={notificationMentionOpen && notificationMentionOptions.length > 0}
                      anchorEl={notificationBodyRef.current}
                      placement="bottom-start"
                      sx={{ zIndex: 1500, width: notificationBodyRef.current?.offsetWidth || 400, maxHeight: 250, overflow: 'auto' }}
                    >
                      <ClickAwayListener onClickAway={() => setNotificationMentionOpen(false)}>
                        <Paper elevation={8} sx={{ maxHeight: 250, overflow: 'auto' }}>
                          <MenuList dense>
                            {notificationMentionOptions.map((opt, idx) => (
                              <MenuItem
                                key={`${opt.value}-${idx}`}
                                onClick={() => {
                                  const body = notificationForm.body;
                                  const cursorPos = notificationBodyRef.current?.selectionStart || body.length;
                                  const textBefore = body.slice(0, cursorPos);
                                  const textAfter = body.slice(cursorPos);
                                  const mentionMatch = textBefore.match(/@(\w*)$/);
                                  if (mentionMatch) {
                                    const start = textBefore.lastIndexOf('@');
                                    const newBody = textBefore.slice(0, start) + opt.label + textAfter;
                                    setNotificationForm({ ...notificationForm, body: newBody, link: opt.value });
                                  } else {
                                    setNotificationForm({ ...notificationForm, link: opt.value });
                                  }
                                  setNotificationMentionOpen(false);
                                  notificationBodyRef.current?.focus();
                                }}
                                sx={{ whiteSpace: 'normal', py: 1 }}
                              >
                                <Box>
                                  <Typography variant="body2">{opt.label}</Typography>
                                  <Typography variant="caption" color="text.secondary">{opt.value}</Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Paper>
                      </ClickAwayListener>
                    </Popper>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      if (!notificationForm.title.trim()) {
                        enqueueSnackbar('Title is required', { variant: 'error' });
                        return;
                      }
                      if (notificationForm.target === 'specific' && !notificationSelectedUser?.id) {
                        enqueueSnackbar('Select a user', { variant: 'error' });
                        return;
                      }
                      setSendingNotification(true);
                      try {
                        const res = await apiService.sendAdminNotification(user!.id, {
                          title: notificationForm.title.trim(),
                          body: notificationForm.body.trim() || undefined,
                          link: notificationForm.link.trim() || undefined,
                          target: notificationForm.target,
                          user_ids: notificationForm.target === 'specific' && notificationSelectedUser?.id ? [notificationSelectedUser.id] : undefined,
                          severity: notificationForm.severity,
                        }, user!.groups);
                        enqueueSnackbar(`Notification sent to ${res.sent} user${res.sent !== 1 ? 's' : ''}`, { variant: 'success' });
                        setNotificationForm({ title: '', body: '', link: '', target: 'all', user_ids: [], severity: 'info' });
                        setNotificationSelectedUser(null);
                        setNotificationMentionOptions([]);
                        setNotificationMentionOpen(false);
                      } catch (err: any) {
                        enqueueSnackbar(err.message || 'Failed to send', { variant: 'error' });
                      } finally {
                        setSendingNotification(false);
                      }
                    }}
                    disabled={sendingNotification}
                  >
                    {sendingNotification ? 'Sending...' : 'Send Notification'}
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Box>)}

          {activeSection === 'support' && (<Box sx={{ py: 3 }}>
            <Box sx={{ px: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Conversations</Typography>
                    </Box>
                    <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
                      {supportConversations.length === 0 ? (
                        <ListItem>
                          <ListItemText secondary="No conversations yet" />
                        </ListItem>
                      ) : supportConversations.map((conv: any) => (
                        <ListItem
                          key={conv.user_id}
                          component="div"
                          onClick={() => {
                            setSupportSelectedUserId(conv.user_id);
                            fetchSupportMessages(conv.user_id);
                          }}
                          sx={{
                            cursor: 'pointer',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: supportSelectedUserId === conv.user_id ? 'action.selected' : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: conv.unread_count > 0 ? 'primary.main' : 'grey.400' }}>
                              {(conv.user_name || conv.user_email || '?')[0].toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: conv.unread_count > 0 ? 700 : 400 }} noWrap>
                                  {conv.user_name || conv.user_email || `User ${conv.user_id}`}
                                </Typography>
                                {conv.unread_count > 0 && (
                                  <Chip label={conv.unread_count} size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {conv.last_sender === 'admin' ? 'You: ' : ''}{conv.last_message?.slice(0, 50)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: 600 }}>
                    {!supportSelectedUserId ? (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">Select a conversation to view messages</Typography>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {supportConversations.find((c: any) => c.user_id === supportSelectedUserId)?.user_name || `User ${supportSelectedUserId}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {supportConversations.find((c: any) => c.user_id === supportSelectedUserId)?.user_email}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {supportMessages.map((msg: any) => (
                            <Box
                              key={msg.id}
                              sx={{
                                display: 'flex',
                                justifyContent: msg.sender === 'admin' ? 'flex-end' : 'flex-start',
                              }}
                            >
                              <Box sx={{
                                maxWidth: '70%',
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                bgcolor: msg.sender === 'admin' ? 'primary.main' : 'grey.100',
                                color: msg.sender === 'admin' ? 'white' : 'text.primary',
                              }}>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.message}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.25 }}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                          <div ref={supportMessagesEndRef} />
                        </Box>
                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Type a reply..."
                            value={supportReply}
                            onChange={(e) => setSupportReply(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendSupportReply(); } }}
                            multiline
                            maxRows={3}
                          />
                          <Button
                            variant="contained"
                            onClick={handleSendSupportReply}
                            disabled={!supportReply.trim() || supportSending}
                            sx={{ minWidth: 44 }}
                          >
                            <SendIcon fontSize="small" />
                          </Button>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Box>)}

          {activeSection === 'settings' && (<Box sx={{ py: 3 }}>
            <Box sx={{ px: 3, maxWidth: 600 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Feature Settings</Typography>

              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>User-to-User Chat</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Allow users to chat with each other about listings and orders.
                    </Typography>
                  </Box>
                  <Switch
                    checked={userChatEnabled}
                    onChange={async (e) => {
                      setUserChatLoading(true);
                      try {
                        const { enabled } = await apiService.setUserChatEnabled(e.target.checked);
                        setUserChatEnabled(enabled);
                        enqueueSnackbar(`User chat ${enabled ? 'enabled' : 'disabled'}`, { variant: 'success' });
                      } catch {
                        enqueueSnackbar('Failed to update setting', { variant: 'error' });
                      } finally {
                        setUserChatLoading(false);
                      }
                    }}
                    disabled={userChatLoading}
                  />
                </Box>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Artzyla Support Chat</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enable the floating support chat widget for all users.
                    </Typography>
                  </Box>
                  <Switch
                    checked={supportChatConfig.enabled}
                    onChange={async (e) => {
                      const updated = { ...supportChatConfig, enabled: e.target.checked };
                      setSupportChatConfig(updated);
                      try {
                        await apiService.updateSupportChatConfig(updated);
                        enqueueSnackbar(`Support chat ${updated.enabled ? 'enabled' : 'disabled'}`, { variant: 'success' });
                      } catch {
                        enqueueSnackbar('Failed to update setting', { variant: 'error' });
                      }
                    }}
                  />
                </Box>
                {supportChatConfig.enabled && (
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Start Hour (24h)"
                        type="number"
                        size="small"
                        value={supportChatConfig.hours_start}
                        onChange={(e) => setSupportChatConfig(prev => ({ ...prev, hours_start: parseInt(e.target.value) || 0 }))}
                        inputProps={{ min: 0, max: 23 }}
                        sx={{ width: 130 }}
                      />
                      <TextField
                        label="End Hour (24h)"
                        type="number"
                        size="small"
                        value={supportChatConfig.hours_end}
                        onChange={(e) => setSupportChatConfig(prev => ({ ...prev, hours_end: parseInt(e.target.value) || 0 }))}
                        inputProps={{ min: 0, max: 23 }}
                        sx={{ width: 130 }}
                      />
                      <TextField
                        label="Timezone"
                        size="small"
                        value={supportChatConfig.timezone}
                        onChange={(e) => setSupportChatConfig(prev => ({ ...prev, timezone: e.target.value }))}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    <TextField
                      label="Welcome Message"
                      size="small"
                      fullWidth
                      value={supportChatConfig.welcome_message}
                      onChange={(e) => setSupportChatConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                    />
                    <TextField
                      label="Offline Message"
                      size="small"
                      fullWidth
                      value={supportChatConfig.offline_message}
                      onChange={(e) => setSupportChatConfig(prev => ({ ...prev, offline_message: e.target.value }))}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                      onClick={async () => {
                        try {
                          await apiService.updateSupportChatConfig(supportChatConfig);
                          enqueueSnackbar('Support chat settings saved', { variant: 'success' });
                        } catch {
                          enqueueSnackbar('Failed to save settings', { variant: 'error' });
                        }
                      }}
                    >
                      Save Support Chat Settings
                    </Button>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>)}
          </Paper>
        </Box>

        <Dialog open={announcementDialogOpen} onClose={() => setAnnouncementDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Message"
                multiline
                rows={3}
                fullWidth
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                placeholder="This message will appear as a banner at the top of the site"
                required
              />
              <FormControl fullWidth>
                <InputLabel>Show to</InputLabel>
                <Select
                  value={announcementForm.target_type}
                  label="Show to"
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, target_type: e.target.value })}
                >
                  <MenuItem value="all">All visitors</MenuItem>
                  <MenuItem value="authenticated">Logged-in users only</MenuItem>
                  <MenuItem value="artists">Artists only</MenuItem>
                  <MenuItem value="buyers">Buyers only</MenuItem>
                  <MenuItem value="admins">Admins only</MenuItem>
                  <MenuItem value="specific">Specific user</MenuItem>
                </Select>
              </FormControl>
              {announcementForm.target_type === 'specific' && (
                <Autocomplete
                  options={announcementUserOptions}
                  value={announcementSelectedUser}
                  onChange={(_, v) => setAnnouncementSelectedUser(v)}
                  onInputChange={(_, v) => {
                    if (v.length < 2) {
                      setAnnouncementUserOptions([]);
                      return;
                    }
                    setAnnouncementUserLoading(true);
                    apiService.getAdminUsers(user!.id, { search: v, limit: 20 }, user!.groups)
                      .then((r) => setAnnouncementUserOptions(r.users || []))
                      .finally(() => setAnnouncementUserLoading(false));
                  }}
                  onOpen={() => {
                    if (announcementUserOptions.length === 0 && !announcementUserLoading) {
                      setAnnouncementUserLoading(true);
                      apiService.getAdminUsers(user!.id, { limit: 50 }, user!.groups)
                        .then((r) => setAnnouncementUserOptions(r.users || []))
                        .finally(() => setAnnouncementUserLoading(false));
                    }
                  }}
                  getOptionLabel={(o) => o?.email || o?.cognito_username || o?.first_name || o?.last_name || String(o?.id || '')}
                  loading={announcementUserLoading}
                  renderInput={(params) => (
                    <TextField {...params} label="Select user" placeholder="Search by email or name" />
                  )}
                />
              )}
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={announcementForm.severity}
                  label="Severity"
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, severity: e.target.value })}
                >
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={announcementForm.is_active}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAnnouncementSave} variant="contained">
              {editingAnnouncement ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

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
