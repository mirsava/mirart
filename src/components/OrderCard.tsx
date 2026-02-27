import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  Chip,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  TextField,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Replay as ReturnIcon,
  TrackChanges as TrackIcon,
  Download as DownloadIcon,
  ThumbUp as ApproveIcon,
  ThumbDown as DenyIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Order } from '../services/api';
import ImagePlaceholder from './ImagePlaceholder';
import { getPaintingDetailPath } from '../utils/seoPaths';

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

interface ReturnEligibility {
  eligible: boolean;
  reason: string;
  daysLeft?: number;
}

export const getReturnEligibility = (order: Order): ReturnEligibility | null => {
  if (order.status !== 'delivered') return { eligible: false, reason: 'Order not yet delivered' };
  if (order.return_status) return { eligible: false, reason: `Return ${order.return_status}` };
  if (!order.return_days || order.return_days <= 0) return null;
  const deliveredDate = order.updated_at || order.created_at;
  const daysSince = Math.floor((Date.now() - new Date(deliveredDate).getTime()) / 86400000);
  if (daysSince > order.return_days) return { eligible: false, reason: 'Return window expired' };
  return { eligible: true, reason: `${order.return_days - daysSince} days left to return`, daysLeft: order.return_days - daysSince };
};

export interface OrderCardProps {
  order: Order;
  type: 'purchase' | 'sale';
  highlighted?: boolean;
  actionLoading?: number | null;
  shippingConfigured?: boolean;
  shippingCarrierPreference?: 'shippo' | 'own';
  shippingProfileComplete?: boolean;
  onMarkShipped?: (orderId: number, trackingNumber?: string, trackingUrl?: string) => void;
  onOpenLabelDialog?: (order: Order) => void;
  onConfirmDelivery?: (orderId: number) => void;
  onOpenReturnDialog?: (order: Order) => void;
  onRespondReturn?: (orderId: number, action: 'approved' | 'denied') => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  type,
  highlighted = false,
  actionLoading,
  shippingConfigured,
  shippingCarrierPreference,
  shippingProfileComplete,
  onMarkShipped,
  onOpenLabelDialog,
  onConfirmDelivery,
  onOpenReturnDialog,
  onRespondReturn,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [confirmDeliveryOpen, setConfirmDeliveryOpen] = useState(false);
  const [manualShipDialogOpen, setManualShipDialogOpen] = useState(false);
  const [manualTrackingNumber, setManualTrackingNumber] = useState('');
  const [manualTrackingUrl, setManualTrackingUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const orderImage = getImageUrl(order.primary_image_url);
  const hasOrderImage = Boolean(orderImage) && !imageLoadError;

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  const ret = type === 'purchase' && order.status === 'delivered' && !order.return_status
    ? getReturnEligibility(order)
    : null;
  const carrierLabel = (order.shipping_carrier || '').trim();
  const hasCarrierLabel = Boolean(carrierLabel) && carrierLabel.toLowerCase() !== 'unknown';
  const trackingStatusLabel = (order.tracking_status || '').trim();
  const hasTrackingStatusLabel = Boolean(trackingStatusLabel) && trackingStatusLabel.toUpperCase() !== 'UNKNOWN';

  const hasActions =
    (type === 'sale' && order.status === 'paid') ||
    (order.tracking_url && ['shipped', 'delivered'].includes(order.status)) ||
    (type === 'purchase' && order.status === 'shipped' && onConfirmDelivery) ||
    ret ||
    (type === 'sale' && order.return_status === 'requested' && onRespondReturn);
  const shouldUseShippo = shippingCarrierPreference !== 'own';
  const labelActionDisabled = Boolean(
    shouldUseShippo && (
      shippingConfigured === false ||
      shippingProfileComplete === false
    )
  );
  const labelActionText = shippingConfigured === false
    ? 'Shipping unavailable'
    : shippingProfileComplete === false
      ? 'Complete shipping profile'
      : 'Buy label';
  const labelActionTooltip = shippingConfigured === false
    ? 'Shippo is not configured on this environment'
    : shippingProfileComplete === false
      ? 'Complete your shipping address in Profile to enable label purchase'
      : 'Buy and print a shipping label';

  return (
    <Card
      ref={cardRef}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        width: '100%',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'box-shadow 0.25s, border-color 0.25s',
        '&:hover': { boxShadow: 4 },
        ...(highlighted && {
          border: 2,
          borderColor: 'primary.main',
          boxShadow: '0 0 16px rgba(25, 118, 210, 0.25)',
        }),
      }}
      onClick={() => navigate(getPaintingDetailPath(order.listing_id, order.listing_title))}
    >
      <Box sx={{
        width: { xs: '100%', sm: 140 },
        minWidth: { sm: 140 },
        height: { xs: 180, sm: 'auto' },
        minHeight: { sm: 140 },
        flexShrink: 0,
        position: 'relative',
      }}>
        {hasOrderImage ? (
          <CardMedia
            component="img"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
            image={orderImage}
            alt={order.listing_title}
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <ImagePlaceholder iconSize={{ xs: 28, md: 34 }} />
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, p: { xs: 2, sm: 2.5 }, gap: { xs: 1.5, md: 0 } }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
              {order.listing_title}
            </Typography>
            <Chip label={order.status} size="small" color={statusColor[order.status] || 'default'} />
            {order.return_status && (
              <Chip
                label={`Return ${order.return_status}`}
                size="small"
                color={order.return_status === 'approved' ? 'success' : order.return_status === 'denied' ? 'error' : 'warning'}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 0.25 }}>
            <Typography variant="body2" color="text.secondary">
              {order.order_number}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {type === 'purchase' ? 'Seller' : 'Buyer'}: {type === 'purchase' ? order.seller_email : order.buyer_email}
            </Typography>
          </Box>

          {order.shipping_address && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
              Ship to: {order.shipping_address.split('\n').slice(0, 2).join(', ')}
            </Typography>
          )}
          {order.shipping_address && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
              <ShippingIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography
                variant="caption"
                color={Number(order.shipping_cost || 0) > 0 ? 'text.secondary' : 'success.main'}
              >
                {Number(order.shipping_cost || 0) > 0
                  ? `Shipping: $${Number(order.shipping_cost).toFixed(2)}`
                  : 'Shipping: FREE'}
              </Typography>
              {order.shipping_carrier && !order.tracking_number && (
                <Chip
                  label={order.shipping_carrier.toUpperCase()}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          )}
          {order.tracking_number && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
              {hasCarrierLabel && (
                <Chip label={carrierLabel.toUpperCase()} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
              {hasTrackingStatusLabel && (
                <Chip
                  label={trackingStatusLabel.replace(/_/g, ' ')}
                  size="small"
                  color={trackingStatusLabel === 'DELIVERED' ? 'success' : trackingStatusLabel === 'TRANSIT' ? 'info' : 'default'}
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
              <Typography variant="caption" color="primary">
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'inherit' }}>
                    {order.tracking_number}
                  </a>
                ) : (
                  order.tracking_number
                )}
              </Typography>
            </Box>
          )}
          {type === 'sale' && order.return_status === 'requested' && order.return_reason && (
            <Typography variant="caption" color="warning.main">
              Return reason: {order.return_reason}
            </Typography>
          )}
          {type === 'purchase' && order.returns_info && order.status === 'delivered' && (
            <Typography variant="caption" color="text.secondary">
              Return policy: {order.returns_info}
            </Typography>
          )}
        </Box>

        {(hasActions || true) && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 2, display: { xs: 'none', md: 'block' } }} />
            <Divider sx={{ display: { xs: 'block', md: 'none' } }} />
          </>
        )}

        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          minWidth: { md: 180 },
          gap: 1,
          flexShrink: 0,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ${order.total_price?.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              x{order.quantity}
            </Typography>
          </Box>

          <Button
            size="small"
            variant="text"
            startIcon={<ReceiptIcon />}
            onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
            sx={{ alignSelf: { xs: 'flex-start', md: 'flex-end' } }}
          >
            Invoice / Order Details
          </Button>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            {type === 'sale' && order.status === 'paid' && (
              shouldUseShippo && onOpenLabelDialog ? (
                <Tooltip title={labelActionTooltip}>
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ShippingIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!labelActionDisabled) onOpenLabelDialog(order);
                      }}
                      disabled={labelActionDisabled}
                    >
                      {labelActionText}
                    </Button>
                  </span>
                </Tooltip>
              ) : onMarkShipped ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ShippingIcon />}
                  onClick={(e) => { e.stopPropagation(); setManualShipDialogOpen(true); }}
                  disabled={actionLoading === order.id}
                >
                  {actionLoading === order.id ? '...' : 'Mark shipped'}
                </Button>
              ) : null
            )}
            {order.tracking_url && ['shipped', 'delivered'].includes(order.status) && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<TrackIcon />}
                href={order.tracking_url}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
              >
                Track
              </Button>
            )}
            {order.label_url && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                href={order.label_url}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
              >
                Label
              </Button>
            )}
            {type === 'purchase' && order.status === 'shipped' && onConfirmDelivery && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={(e) => { e.stopPropagation(); setConfirmDeliveryOpen(true); }}
                disabled={actionLoading === order.id}
              >
                {actionLoading === order.id ? '...' : 'Confirm delivery'}
              </Button>
            )}
            {type === 'sale' && order.return_status === 'requested' && onRespondReturn && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={(e) => { e.stopPropagation(); onRespondReturn(order.id, 'approved'); }}
                  disabled={actionLoading === order.id}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DenyIcon />}
                  onClick={(e) => { e.stopPropagation(); onRespondReturn(order.id, 'denied'); }}
                  disabled={actionLoading === order.id}
                >
                  Deny
                </Button>
              </>
            )}
          </Box>

          {ret && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 0.25 }}>
              <Tooltip title={ret.reason}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<ReturnIcon />}
                    disabled={!ret.eligible}
                    onClick={(e) => { e.stopPropagation(); if (ret.eligible && onOpenReturnDialog) onOpenReturnDialog(order); }}
                  >
                    Return item
                  </Button>
                </span>
              </Tooltip>
              <Typography variant="caption" color={ret.eligible ? 'success.main' : 'text.secondary'}>
                {ret.reason}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        open={confirmDeliveryOpen}
        onClose={() => setConfirmDeliveryOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Confirm Delivery</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to confirm delivery of <strong>{order.listing_title}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeliveryOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              setConfirmDeliveryOpen(false);
              onConfirmDelivery?.(order.id);
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={manualShipDialogOpen}
        onClose={() => setManualShipDialogOpen(false)}
        onClick={(e) => e.stopPropagation()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Mark As Shipped</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Add tracking details before marking this order as shipped.
          </DialogContentText>
          <TextField
            fullWidth
            required
            label="Tracking number"
            value={manualTrackingNumber}
            onChange={(e) => setManualTrackingNumber(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Tracking URL (optional)"
            value={manualTrackingUrl}
            onChange={(e) => setManualTrackingUrl(e.target.value)}
            placeholder="https://"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setManualShipDialogOpen(false);
              setManualTrackingNumber('');
              setManualTrackingUrl('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!manualTrackingNumber.trim() || actionLoading === order.id}
            onClick={() => {
              onMarkShipped?.(
                order.id,
                manualTrackingNumber.trim(),
                manualTrackingUrl.trim() || undefined
              );
              setManualShipDialogOpen(false);
              setManualTrackingNumber('');
              setManualTrackingUrl('');
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default OrderCard;
