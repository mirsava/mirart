import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
} from '@mui/material';
import {
  Print as PrintIcon,
  ArrowBack as BackIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
  Inventory as PackageIcon,
  FlightTakeoff as TransitIcon,
  CheckCircle as DeliveredIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import PageHeader from '../components/PageHeader';

const statusColor: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  paid: 'primary',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

const getImageUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return API_BASE_URL.replace('/api', '') + url;
};

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user?.id) return;
    setLoading(true);
    apiService.getOrderById(parseInt(id), user.id)
      .then(setOrder)
      .catch((err) => setError(err.message || 'Failed to load order'))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const handlePrint = () => {
    window.print();
  };

  const isBuyer = order && user?.id && order.buyer_id === order._resolvedBuyerId;
  const viewerIsBuyer = order?.buyer_email && order?.seller_email
    ? order.buyer_email !== order.seller_email
    : true;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Order not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/orders')}>Back to Orders</Button>
      </Container>
    );
  }

  const shippingLines = order.shipping_address?.split('\n').filter(Boolean) || [];
  const orderDate = new Date(order.created_at);
  const shippingCost = order.shipping_cost || 0;
  const subtotal = order.unit_price * order.quantity;
  const tax = subtotal * 0.08;

  return (
    <Box>
      <PageHeader
        title="Invoice / Order Details"
        subtitle={`Order ${order.order_number}`}
      />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 3, '@media print': { display: 'none' } }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/orders')} variant="outlined" size="small">
            Back to Orders
          </Button>
          <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="contained" size="small">
            Print Invoice
          </Button>
        </Box>

        <Paper ref={invoiceRef} elevation={2} sx={{ p: { xs: 3, md: 5 }, '@media print': { boxShadow: 'none', p: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 4 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ReceiptIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>INVOICE</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {order.order_number}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Chip
                label={order.status.toUpperCase()}
                size="small"
                color={statusColor[order.status] || 'default'}
                sx={{ fontWeight: 600, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" display="block">
                Ordered: {orderDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
              {order.updated_at && order.status !== 'paid' && (
                <Typography variant="body2" color="text.secondary">
                  Updated: {new Date(order.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>Buyer</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {[order.buyer_first_name, order.buyer_last_name].filter(Boolean).join(' ') || order.buyer_email}
              </Typography>
              <Typography variant="body2" color="text.secondary">{order.buyer_email}</Typography>
              {order.buyer_phone && <Typography variant="body2" color="text.secondary">{order.buyer_phone}</Typography>}
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>Seller</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {order.seller_business_name || [order.seller_first_name, order.seller_last_name].filter(Boolean).join(' ') || order.seller_email}
              </Typography>
              <Typography variant="body2" color="text.secondary">{order.seller_email}</Typography>
              {order.seller_phone && <Typography variant="body2" color="text.secondary">{order.seller_phone}</Typography>}
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>Ship To</Typography>
              {shippingLines.length > 0 ? (
                shippingLines.map((line: string, i: number) => (
                  <Typography key={i} variant="body2" color="text.secondary">{line}</Typography>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">N/A</Typography>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
            {getImageUrl(order.primary_image_url) && (
              <Box
                component="img"
                src={getImageUrl(order.primary_image_url)}
                alt={order.listing_title}
                sx={{
                  width: { xs: '100%', sm: 120 },
                  height: { xs: 200, sm: 120 },
                  objectFit: 'cover',
                  borderRadius: 1.5,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/painting/${order.listing_id}`)}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                onClick={() => navigate(`/painting/${order.listing_id}`)}
              >
                {order.listing_title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                {order.category && <Typography variant="body2" color="text.secondary">{order.category}{order.subcategory ? ` / ${order.subcategory}` : ''}</Typography>}
                {order.medium && <Typography variant="body2" color="text.secondary">{order.medium}</Typography>}
                {order.dimensions && <Typography variant="body2" color="text.secondary">{order.dimensions}</Typography>}
                {order.listing_year && <Typography variant="body2" color="text.secondary">{order.listing_year}</Typography>}
              </Box>
            </Box>
          </Box>

          <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
            <Box sx={{ display: 'flex', bgcolor: 'grey.50', px: 2, py: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>Item</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, width: 80, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, width: 100, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 }}>Unit Price</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, width: 100, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', px: 2, py: 2, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{order.listing_title}</Typography>
              <Typography variant="body2" sx={{ width: 80, textAlign: 'center' }}>{order.quantity}</Typography>
              <Typography variant="body2" sx={{ width: 100, textAlign: 'right' }}>${order.unit_price.toFixed(2)}</Typography>
              <Typography variant="body2" sx={{ width: 100, textAlign: 'right', fontWeight: 600 }}>${subtotal.toFixed(2)}</Typography>
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Box sx={{ width: { xs: '100%', sm: 280 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Shipping</Typography>
                <Typography variant="body2" color={shippingCost === 0 ? 'success.main' : undefined}>
                  {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                <Typography variant="body2" color="text.secondary">Tax (est.)</Typography>
                <Typography variant="body2">${tax.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} color="primary">
                  ${order.total_price.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {(order.tracking_number || order.return_status || order.returns_info) && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                {order.tracking_number && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ShippingIcon fontSize="small" color="primary" />
                      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>Shipment Tracking</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                      {order.shipping_carrier && (
                        <Chip label={order.shipping_carrier.toUpperCase()} size="small" variant="outlined" />
                      )}
                      {order.tracking_url ? (
                        <Typography
                          variant="body2"
                          component="a"
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {order.tracking_number}
                        </Typography>
                      ) : (
                        <Typography variant="body2">{order.tracking_number}</Typography>
                      )}
                      {order.label_url && (
                        <Button size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 14 }} />} href={order.label_url} target="_blank" rel="noopener">
                          Label
                        </Button>
                      )}
                    </Box>
                    {(() => {
                      const trackingSteps = ['Label Created', 'In Transit', 'Out for Delivery', 'Delivered'];
                      const statusMap: Record<string, number> = { PRE_TRANSIT: 0, TRANSIT: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3 };
                      const activeStep = statusMap[order.tracking_status || ''] ?? (order.status === 'delivered' ? 3 : order.status === 'shipped' ? 0 : -1);
                      return (
                        <Stepper activeStep={activeStep} alternativeLabel connector={<StepConnector />} sx={{ mb: 2 }}>
                          {trackingSteps.map((label, idx) => (
                            <Step key={label} completed={idx <= activeStep}>
                              <StepLabel
                                StepIconComponent={() => {
                                  const icons = [<PackageIcon />, <TransitIcon />, <ShippingIcon />, <DeliveredIcon />];
                                  const done = idx <= activeStep;
                                  return (
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: done ? 'primary.main' : 'action.disabledBackground', color: done ? 'primary.contrastText' : 'text.disabled' }}>
                                      {React.cloneElement(icons[idx], { sx: { fontSize: 18 } })}
                                    </Box>
                                  );
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: idx <= activeStep ? 600 : 400 }}>{label}</Typography>
                              </StepLabel>
                            </Step>
                          ))}
                        </Stepper>
                      );
                    })()}
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {order.shipped_at && (
                        <Typography variant="caption" color="text.secondary">
                          Shipped: {new Date(order.shipped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                      )}
                      {order.delivered_at && (
                        <Typography variant="caption" color="success.main">
                          Delivered: {new Date(order.delivered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}
                {order.return_status && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>Return Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={`Return ${order.return_status}`}
                        size="small"
                        color={order.return_status === 'approved' ? 'success' : order.return_status === 'denied' ? 'error' : 'warning'}
                      />
                    </Box>
                    {order.return_reason && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Reason: {order.return_reason}
                      </Typography>
                    )}
                  </Grid>
                )}
                {order.returns_info && !order.return_status && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>Return Policy</Typography>
                    <Typography variant="body2" color="text.secondary">{order.returns_info}</Typography>
                    {order.return_days > 0 && (
                      <Typography variant="caption" color="text.secondary">{order.return_days}-day return window</Typography>
                    )}
                  </Grid>
                )}
              </Grid>
            </>
          )}

          {order.payment_intent_id && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="caption" color="text.secondary">
                Payment reference: {order.payment_intent_id}
              </Typography>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default OrderDetail;
