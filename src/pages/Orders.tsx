import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
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
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  ShoppingBag as ShoppingBagIcon,
  Store as StoreIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import apiService, { Order } from '../services/api';
import PageHeader from '../components/PageHeader';

const getImageUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const baseUrl = API_BASE_URL.replace('/api', '');
  return baseUrl + url;
};

const statusColor: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  paid: 'primary',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    const inPurchases = purchases.some((o) => o.id === oid);
    const inSales = sales.some((o) => o.id === oid);
    if (inPurchases && tabValue !== 0) setTabValue(0);
    if (inSales && !inPurchases && tabValue !== 1) setTabValue(1);
  }, [orderIdParam, loading, purchases, sales, tabValue]);

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
    setLabelPurchasing(true);
    setError(null);
    try {
      const result = await apiService.purchaseShippingLabel(labelOrder.id, rateId, user.id);
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

  const highlightedOrderId = orderIdParam ? parseInt(orderIdParam, 10) : null;

  const OrderCard: React.FC<{ order: Order; type: 'purchase' | 'sale' }> = ({ order, type }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const isHighlighted = highlightedOrderId === order.id;

    useEffect(() => {
      if (isHighlighted && cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [isHighlighted]);

    return (
    <Card
      ref={cardRef}
      sx={{
        display: 'flex',
        height: '100%',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s, border-color 0.3s',
        '&:hover': { boxShadow: 3 },
        ...(isHighlighted && {
          border: 2,
          borderColor: 'primary.main',
          boxShadow: '0 0 12px rgba(25, 118, 210, 0.3)',
        }),
      }}
      onClick={() => navigate(`/painting/${order.listing_id}`)}
    >
      <Box sx={{ width: 160, minWidth: 160, height: 160, flexShrink: 0, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {getImageUrl(order.primary_image_url) ? (
          <CardMedia
            component="img"
            sx={{ width: '100%', height: 160, objectFit: 'cover' }}
            image={getImageUrl(order.primary_image_url)!}
            alt={order.listing_title}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">No Image</Typography>
        )}
      </Box>
      <CardContent sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {order.order_number}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {order.listing_title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {type === 'purchase' ? 'Seller' : 'Buyer'}: {type === 'purchase' ? order.seller_email : order.buyer_email}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={order.status} size="small" color={statusColor[order.status] || 'default'} />
            <Typography variant="body2" fontWeight={600}>
              ${order.total_price?.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Qty: {order.quantity}
            </Typography>
          </Box>
          {order.shipping_address && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Ship to: {order.shipping_address.split('\n').slice(0, 2).join(', ')}
            </Typography>
          )}
          {order.tracking_number && (
            <Typography variant="caption" display="block" color="primary" sx={{ mt: 0.25 }}>
              {order.tracking_url ? (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  Track: {order.tracking_number}
                </a>
              ) : (
                `Track: ${order.tracking_number}`
              )}
            </Typography>
          )}
          {type === 'sale' && order.status === 'paid' && (
            <>
              {shippingConfigured ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<ShippingIcon />}
                  onClick={(e) => { e.stopPropagation(); handleOpenLabelDialog(order); }}
                  sx={{ mt: 1 }}
                >
                  Buy shipping label
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ShippingIcon />}
                  onClick={(e) => { e.stopPropagation(); handleMarkShipped(order.id); }}
                  disabled={actionLoading === order.id}
                  sx={{ mt: 1 }}
                >
                  {actionLoading === order.id ? '...' : 'Mark as shipped'}
                </Button>
              )}
            </>
          )}
          {type === 'sale' && order.status === 'shipped' && order.tracking_url && (
            <Button size="small" variant="outlined" href={order.tracking_url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} sx={{ mt: 0.5 }}>
              Track shipment
            </Button>
          )}
          {type === 'purchase' && order.status === 'shipped' && order.tracking_url && (
            <Button size="small" variant="outlined" href={order.tracking_url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} sx={{ mt: 0.5 }}>
              Track shipment
            </Button>
          )}
          {type === 'purchase' && (order.status === 'shipped' || order.status === 'paid') && order.status !== 'delivered' && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={(e) => { e.stopPropagation(); handleConfirmDelivery(order.id); }}
              disabled={actionLoading === order.id}
              sx={{ mt: 1 }}
            >
              {actionLoading === order.id ? '...' : 'Confirm delivery'}
            </Button>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {new Date(order.created_at).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
    );
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    onChange={(e) => setStatusFilter(e.target.value)}
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
                    onClick={() => { setStatusFilter('all'); setSearchTerm(''); }}
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
                  <Button variant="outlined" onClick={() => { setStatusFilter('all'); setSearchTerm(''); }} sx={{ mt: 2 }}>
                    Clear filters
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredPurchases.map((order) => (
                    <Grid item xs={12} md={6} key={order.id}>
                      <OrderCard order={order} type="purchase" />
                    </Grid>
                  ))}
                </Grid>
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
                <Button variant="outlined" onClick={() => { setStatusFilter('all'); setSearchTerm(''); }} sx={{ mt: 2 }}>
                  Clear filters
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredSales.map((order) => (
                  <Grid item xs={12} md={6} key={order.id}>
                    <OrderCard order={order} type="sale" />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Paper>

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
                No shipping rates available. Make sure your shipping address is set in Profile Settings and the listing has dimensions.
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
            <Button onClick={() => setLabelDialogOpen(false)} disabled={labelPurchasing}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
    </Box>
  );
};

export default Orders;
