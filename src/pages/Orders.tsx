import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Receipt as ReceiptIcon, ShoppingBag as ShoppingBagIcon, Store as StoreIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { user, isAuthenticated } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  const OrderCard: React.FC<{ order: Order; type: 'purchase' | 'sale' }> = ({ order, type }) => (
    <Card
      sx={{
        display: 'flex',
        mb: 2,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
      onClick={() => navigate(`/painting/${order.listing_id}`)}
    >
      <CardMedia
        component="img"
        sx={{ width: 120, objectFit: 'cover' }}
        image={getImageUrl(order.primary_image_url) || '/placeholder-art.jpg'}
        alt={order.listing_title}
      />
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {order.order_number}
          </Typography>
          <Typography variant="h6" gutterBottom>
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
        </Box>
        <Typography variant="caption" color="text.secondary">
          {new Date(order.created_at).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
        <PageHeader
          title="Orders"
          subtitle="View and manage your purchases and sales"
          align="left"
        />

        <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 4, sm: 5, md: 6 }, minHeight: '60vh' }}>
        <Paper sx={{ mb: 4 }}>
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
              ) : (
                purchases.map((order) => (
                  <OrderCard key={order.id} order={order} type="purchase" />
                ))
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
            ) : (
              sales.map((order) => (
                <OrderCard key={order.id} order={order} type="sale" />
              ))
            )}
          </Box>
        </Paper>
        </Box>
    </Box>
  );
};

export default Orders;
