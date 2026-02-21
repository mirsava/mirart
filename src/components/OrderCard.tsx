import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Replay as ReturnIcon,
  TrackChanges as TrackIcon,
  ThumbUp as ApproveIcon,
  ThumbDown as DenyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Order } from '../services/api';

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

export const getReturnEligibility = (order: Order): ReturnEligibility => {
  if (order.status !== 'delivered') return { eligible: false, reason: 'Order not yet delivered' };
  if (order.return_status) return { eligible: false, reason: `Return ${order.return_status}` };
  if (!order.return_days || order.return_days <= 0) return { eligible: false, reason: 'No returns accepted' };
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
  onMarkShipped?: (orderId: number) => void;
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
  onMarkShipped,
  onOpenLabelDialog,
  onConfirmDelivery,
  onOpenReturnDialog,
  onRespondReturn,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  const ret = type === 'purchase' && order.status === 'delivered' && !order.return_status
    ? getReturnEligibility(order)
    : null;

  return (
    <Card
      ref={cardRef}
      sx={{
        display: 'flex',
        width: '100%',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s, border-color 0.3s',
        '&:hover': { boxShadow: 3 },
        ...(highlighted && {
          border: 2,
          borderColor: 'primary.main',
          boxShadow: '0 0 12px rgba(25, 118, 210, 0.3)',
        }),
      }}
      onClick={() => navigate(`/painting/${order.listing_id}`)}
    >
      <Box sx={{ width: 180, minWidth: 180, flexShrink: 0, bgcolor: 'grey.200', position: 'relative' }}>
        {getImageUrl(order.primary_image_url) ? (
          <CardMedia
            component="img"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
            image={getImageUrl(order.primary_image_url)!}
            alt={order.listing_title}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 160 }}>
            <Typography variant="body2" color="text.secondary">No Image</Typography>
          </Box>
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
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {type === 'sale' && order.status === 'paid' && (
              shippingConfigured && onOpenLabelDialog ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<ShippingIcon />}
                  onClick={(e) => { e.stopPropagation(); onOpenLabelDialog(order); }}
                >
                  Buy shipping label
                </Button>
              ) : onMarkShipped ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ShippingIcon />}
                  onClick={(e) => { e.stopPropagation(); onMarkShipped(order.id); }}
                  disabled={actionLoading === order.id}
                >
                  {actionLoading === order.id ? '...' : 'Mark as shipped'}
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
                Track package
              </Button>
            )}
            {type === 'purchase' && ['shipped', 'paid'].includes(order.status) && order.status !== 'delivered' && onConfirmDelivery && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={(e) => { e.stopPropagation(); onConfirmDelivery(order.id); }}
                disabled={actionLoading === order.id}
              >
                {actionLoading === order.id ? '...' : 'Confirm delivery'}
              </Button>
            )}
            {ret && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
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
            {order.return_status && (
              <Chip
                label={`Return ${order.return_status}`}
                size="small"
                color={order.return_status === 'approved' ? 'success' : order.return_status === 'denied' ? 'error' : 'warning'}
              />
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
                  Approve return
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DenyIcon />}
                  onClick={(e) => { e.stopPropagation(); onRespondReturn(order.id, 'denied'); }}
                  disabled={actionLoading === order.id}
                >
                  Deny return
                </Button>
              </>
            )}
          </Box>
          {type === 'sale' && order.return_status === 'requested' && order.return_reason && (
            <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
              Return reason: {order.return_reason}
            </Typography>
          )}
          {type === 'purchase' && order.returns_info && order.status === 'delivered' && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Return policy: {order.returns_info}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {new Date(order.created_at).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
