import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
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
  Alert,
  Pagination,
  Avatar,
  Fade,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
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
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
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
  const [newStatus, setNewStatus] = useState<'draft' | 'active' | 'inactive' | 'sold' | 'archived'>('active');

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
      setUsers(response.users || []);
      setUsersPagination(response.pagination);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage users, listings, and platform content"
        icon={<DashboardIcon />}
      />
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

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
                    <DashboardIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4">{stats.orders.total}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Orders
                      </Typography>
                    </Box>
                  </Box>
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
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(listing.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleStatusChangeClick(listing.id, listing.status)}
                          title="Change status"
                          disabled={statusChanging === listing.id}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
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
        </Paper>

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
      </Container>
    </Box>
  );
};

export default AdminDashboard;




