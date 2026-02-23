import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Pagination,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  ShoppingBag as ShoppingBagIcon,
  Store as StoreIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import apiService, { Order } from '../services/api';
import PageHeader from '../components/PageHeader';
import OrderCardComponent, { getReturnEligibility } from '../components/OrderCard';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [shippingConfigured, setShippingConfigured] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [labelRates, setLabelRates] = useState<Array<{ object_id: string; provider: string; servicelevel: string; amount: string; estimated_days?: number }>>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelPurchasing, setLabelPurchasing] = useState(false);
  const [selectedLabelRate, setSelectedLabelRate] = useState<{ object_id: string; provider: string; servicelevel: string; amount: string; estimated_days?: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [purchasePage, setPurchasePage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const ordersPerPage = 6;
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<number | null>(null);

  const filterOrders = (orders: Order[]) => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = !search ||
        (order.order_number?.toLowerCase().includes(search)) ||
        (order.listing_title?.toLowerCase().includes(search)) ||
        (order.buyer_email?.toLowerCase().includes(search)) ||
        (order.seller_email?.toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  };

  const filteredPurchases = filterOrders(purchases);
  const filteredSales = filterOrders(sales);

  const purchaseTotalPages = Math.ceil(filteredPurchases.length / ordersPerPage);
  const salesTotalPages = Math.ceil(filteredSales.length / ordersPerPage);
  const safePurchasePage = Math.min(purchasePage, purchaseTotalPages || 1);
  const safeSalesPage = Math.min(salesPage, salesTotalPages || 1);
  const paginatedPurchases = filteredPurchases.slice((safePurchasePage - 1) * ordersPerPage, safePurchasePage * ordersPerPage);
  const paginatedSales = filteredSales.slice((safeSalesPage - 1) * ordersPerPage, safeSalesPage * ordersPerPage);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const [purchasesData, salesData] = await Promise.all([
          apiService.getUserOrders(user.id, 'buyer'),
          apiService.getUserOrders(user.id, 'seller'),
        ]);
        setPurchases(purchasesData || []);
        setSales(salesData || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setPurchases([]);
        setSales([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    apiService.isShippingConfigured().then((r) => setShippingConfigured(r.configured)).catch(() => setShippingConfigured(false));
  }, []);

  const orderIdParam = searchParams.get('order');
  useEffect(() => {
    if (!orderIdParam || loading) return;
    const oid = parseInt(orderIdParam, 10);
    if (isNaN(oid)) return;
    const purchaseIndex = purchases.findIndex((o) => o.id === oid);
    const salesIndex = sales.findIndex((o) => o.id === oid);

    setStatusFilter('all');
    setSearchTerm('');

    if (purchaseIndex >= 0) {
      setTabValue(0);
      setPurchasePage(Math.floor(purchaseIndex / ordersPerPage) + 1);
      setHighlightedOrderId(oid);
    } else if (salesIndex >= 0) {
      setTabValue(1);
      setSalesPage(Math.floor(salesIndex / ordersPerPage) + 1);
      setHighlightedOrderId(oid);
    } else {
      return;
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('order');
      return next;
    }, { replace: true });
  }, [orderIdParam, loading, purchases, sales, setSearchParams, ordersPerPage]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const refreshOrders = async () => {
    if (!user?.id) return;
    try {
      const [purchasesData, salesData] = await Promise.all([
        apiService.getUserOrders(user.id, 'buyer'),
        apiService.getUserOrders(user.id, 'seller'),
      ]);
      setPurchases(purchasesData || []);
      setSales(salesData || []);
    } catch {
      // ignore
    }
  };

  const handleMarkShipped = async (orderId: number) => {
    if (!user?.id) return;
    setActionLoading(orderId);
    setError(null);
    try {
      await apiService.markOrderShipped(orderId, user.id);
      await refreshOrders();
      enqueueSnackbar('Order marked as shipped', { variant: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark as shipped';
      setError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenLabelDialog = async (order: Order) => {
    setLabelOrder(order);
    setLabelDialogOpen(true);
    setLabelRates([]);
    setSelectedLabelRate(null);
    setLabelLoading(true);
    setError(null);
    try {
      const { rates } = await apiService.getShippingRatesForOrder(order.id, user!.id);
      setLabelRates(rates || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to get shipping rates');
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to get rates', { variant: 'error' });
    } finally {
      setLabelLoading(false);
    }
  };

  const handlePurchaseLabel = async (rateId: string) => {
    if (!user?.id || !labelOrder) return;
    const rate = selectedLabelRate || labelRates.find(r => r.object_id === rateId);
    setLabelPurchasing(true);
    setError(null);
    try {
      const result = await apiService.purchaseShippingLabel(labelOrder.id, rateId, user.id, rate?.amount, rate?.provider?.toLowerCase());
      enqueueSnackbar('Label purchased! Print and attach to package.', { variant: 'success' });
      setLabelDialogOpen(false);
      setLabelOrder(null);
      setLabelRates([]);
      if (result.label_url) window.open(result.label_url, '_blank');
      await refreshOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to purchase label';
      setError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLabelPurchasing(false);
    }
  };

  const handleConfirmDelivery = async (orderId: number) => {
    if (!user?.id) return;
    setActionLoading(orderId);
    setError(null);
    try {
      await apiService.confirmOrderDelivery(orderId, user.id);
      await refreshOrders();
      enqueueSnackbar('Delivery confirmed. Funds have been released to the artist.', { variant: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm delivery';
      setError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setActionLoading(null);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit return request';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setReturnLoading(false);
    }
  };

  const handleRespondReturn = async (orderId: number, action: 'approved' | 'denied') => {
    if (!user?.id) return;
    setActionLoading(orderId);
    try {
      await apiService.respondToReturn(orderId, user.id, action);
      enqueueSnackbar(`Return ${action}`, { variant: action === 'approved' ? 'success' : 'info' });
      await refreshOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to respond to return';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAuthenticated || !user?.id) {
    return (
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 8 }}>
        <Alert severity="info">
          Please sign in to view your orders.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Typography
            component="button"
            onClick={() => navigate('/artist-signin')}
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              textDecoration: 'underline',
              border: 'none',
              background: 'none',
              fontSize: 'inherit',
            }}
          >
            Sign in
          </Typography>
        </Box>
      </Box>
    );
  }

  const orderCardProps = {
    actionLoading,
    shippingConfigured,
    onMarkShipped: handleMarkShipped,
    onOpenLabelDialog: handleOpenLabelDialog,
    onConfirmDelivery: handleConfirmDelivery,
    onOpenReturnDialog: handleOpenReturnDialog,
    onRespondReturn: handleRespondReturn,
  };

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
        <PageHeader
          title="Orders"
          subtitle="View and manage your purchases and sales"
          align="left"
        />

        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, sm: 5, md: 6 }, minHeight: '60vh' }}>
        <Paper sx={{ mb: 4 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              Filter orders
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Search by order #, title, or email..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPurchasePage(1); setSalesPage(1); }}
                  sx={{ minWidth: 260 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => { setStatusFilter(e.target.value); setPurchasePage(1); setSalesPage(1); }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="shipped">Shipped</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
                {(statusFilter !== 'all' || searchTerm.trim()) && (
                  <Button
                    size="small"
                    onClick={() => { setStatusFilter('all'); setSearchTerm(''); setPurchasePage(1); setSalesPage(1); }}
                    startIcon={<FilterListIcon />}
                  >
                    Clear filters
                  </Button>
                )}
                {(statusFilter !== 'all' || searchTerm.trim()) && (
                  <Typography variant="body2" color="text.secondary">
                    {tabValue === 0
                      ? `Showing ${filteredPurchases.length} of ${purchases.length} purchases`
                      : `Showing ${filteredSales.length} of ${sales.length} sales`}
                  </Typography>
                )}
              </Box>
          </Box>

          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab
              icon={<ShoppingBagIcon />}
              iconPosition="start"
              label={`Purchases (${purchases.length})`}
            />
            <Tab
              icon={<StoreIcon />}
              iconPosition="start"
              label={`Sales (${sales.length})`}
            />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : tabValue === 0 ? (
              purchases.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No purchases yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Items you buy will appear here.
                  </Typography>
                </Box>
              ) : filteredPurchases.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <FilterListIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No matching purchases
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Try adjusting your filters or search.
                  </Typography>
                  <Button variant="outlined" onClick={() => { setStatusFilter('all'); setSearchTerm(''); setPurchasePage(1); setSalesPage(1); }} sx={{ mt: 2 }}>
                    Clear filters
                  </Button>
                </Box>
              ) : (
                <>
                  <Grid container spacing={2} alignItems="stretch">
                    {paginatedPurchases.map((order) => (
                      <Grid item xs={12} key={order.id} sx={{ display: 'flex' }}>
                        <OrderCardComponent order={order} type="purchase" highlighted={highlightedOrderId === order.id} {...orderCardProps} />
                      </Grid>
                    ))}
                  </Grid>
                  {purchaseTotalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={purchaseTotalPages}
                        page={safePurchasePage}
                        onChange={(_e, p) => { setPurchasePage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        color="primary"
                      />
                    </Box>
                  )}
                </>
              )
            ) : sales.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <StoreIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No sales yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  When buyers purchase your artwork, orders will appear here.
                </Typography>
              </Box>
            ) : filteredSales.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FilterListIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No matching sales
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try adjusting your filters or search.
                </Typography>
                <Button variant="outlined" onClick={() => { setStatusFilter('all'); setSearchTerm(''); setPurchasePage(1); setSalesPage(1); }} sx={{ mt: 2 }}>
                  Clear filters
                </Button>
              </Box>
            ) : (
              <>
                <Grid container spacing={2} alignItems="stretch">
                  {paginatedSales.map((order) => (
                    <Grid item xs={12} key={order.id} sx={{ display: 'flex' }}>
                      <OrderCardComponent order={order} type="sale" highlighted={highlightedOrderId === order.id} {...orderCardProps} />
                    </Grid>
                  ))}
                </Grid>
                {salesTotalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={salesTotalPages}
                      page={safeSalesPage}
                      onChange={(_e, p) => { setSalesPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        </Paper>

        <Dialog open={labelDialogOpen} onClose={() => !labelPurchasing && setLabelDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedLabelRate ? 'Confirm Label Purchase' : 'Select Shipping Rate'}</DialogTitle>
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
            ) : selectedLabelRate ? (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You are about to purchase a shipping label. This action cannot be undone.
                </Alert>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {selectedLabelRate.provider} — {selectedLabelRate.servicelevel}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ my: 1 }}>
                    ${parseFloat(selectedLabelRate.amount).toFixed(2)}
                  </Typography>
                  {selectedLabelRate.estimated_days && (
                    <Typography variant="body2" color="text.secondary">
                      Estimated delivery: {selectedLabelRate.estimated_days} business day{selectedLabelRate.estimated_days !== 1 ? 's' : ''}
                    </Typography>
                  )}
                </Paper>
              </Box>
            ) : labelRates.length === 0 ? (
              <Alert severity="info">
                No shipping rates available. Make sure your shipping address is set in Profile Settings and the listing has dimensions.
              </Alert>
            ) : (
              <List>
                {labelRates.map((rate) => (
                  <ListItemButton
                    key={rate.object_id}
                    onClick={() => setSelectedLabelRate(rate)}
                    disabled={labelPurchasing}
                  >
                    <ListItemText
                      primary={`${rate.provider} — ${rate.servicelevel}`}
                      secondary={`$${parseFloat(rate.amount).toFixed(2)}${rate.estimated_days ? ` • ${rate.estimated_days} day${rate.estimated_days !== 1 ? 's' : ''}` : ''}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            {selectedLabelRate ? (
              <>
                <Button onClick={() => setSelectedLabelRate(null)} disabled={labelPurchasing}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handlePurchaseLabel(selectedLabelRate.object_id)}
                  disabled={labelPurchasing}
                >
                  {labelPurchasing ? 'Purchasing...' : 'Confirm Purchase'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setLabelDialogOpen(false)} disabled={labelPurchasing}>
                Cancel
              </Button>
            )}
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
            <Button onClick={() => setReturnDialogOpen(false)} disabled={returnLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReturn} variant="contained" color="warning" disabled={returnLoading}>
              {returnLoading ? 'Submitting...' : 'Submit return request'}
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
    </Box>
  );
};

export default Orders;
