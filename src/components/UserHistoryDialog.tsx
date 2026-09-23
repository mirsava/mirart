import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Person as AccountIcon,
  Image as ListingIcon,
  WorkspacePremium as SubscriptionIcon,
  Payments as PaymentIcon,
  ChatBubbleOutline as MessageIcon,
  NotificationsNone as NoticeIcon,
} from '@mui/icons-material';
import apiService, { UserHistory, UserHistoryEvent } from '../services/api';

interface UserHistoryDialogProps {
  userId: number | null;
  onClose: () => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const dateTime = (v: string) => new Date(v).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dateOnly = (v: string) => new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const EVENT_STYLE: Record<UserHistoryEvent['type'], { icon: React.ReactElement; color: string; label: string }> = {
  account: { icon: <AccountIcon fontSize="small" />, color: 'secondary.main', label: 'Account' },
  listing: { icon: <ListingIcon fontSize="small" />, color: 'primary.main', label: 'Listings' },
  subscription: { icon: <SubscriptionIcon fontSize="small" />, color: 'info.main', label: 'Subscription' },
  payment: { icon: <PaymentIcon fontSize="small" />, color: 'success.main', label: 'Payments' },
  message: { icon: <MessageIcon fontSize="small" />, color: 'text.secondary', label: 'Messages' },
  notice: { icon: <NoticeIcon fontSize="small" />, color: 'warning.main', label: 'Emails' },
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6" sx={{ fontWeight: 600 }}>{value}</Typography>
  </Paper>
);

// Admin view of one user's profile, activity timeline, payments and listings.
const UserHistoryDialog: React.FC<UserHistoryDialogProps> = ({ userId, onClose }) => {
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState<'all' | UserHistoryEvent['type']>('all');

  useEffect(() => {
    if (userId == null) return;
    let active = true;
    setHistory(null);
    setError(null);
    setTab(0);
    setFilter('all');
    apiService.getUserHistory(userId)
      .then((h) => active && setHistory(h))
      .catch((err) => active && setError(err.message || 'Failed to load history'));
    return () => {
      active = false;
    };
  }, [userId]);

  const events = useMemo(
    () => (history ? history.timeline.filter((e) => filter === 'all' || e.type === filter) : []),
    [history, filter]
  );

  const u = history?.user;
  const name = u ? (u.business_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email) : '';

  return (
    <Dialog open={userId != null} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        {u ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={u.profile_image_url || undefined} sx={{ width: 48, height: 48 }}>{name.charAt(0)}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }} noWrap>{name}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{u.email}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Chip size="small" label={u.user_type} sx={{ textTransform: 'capitalize' }} />
              {u.blocked ? <Chip size="small" color="error" label="Blocked" /> : !u.active ? <Chip size="small" color="warning" label="Inactive" /> : <Chip size="small" color="success" label="Active" />}
            </Box>
          </Box>
        ) : 'User details'}
      </DialogTitle>
      {history && (
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label={`Timeline (${history.timeline.length})`} />
          <Tab label={`Payments (${history.payments.length})`} />
          <Tab label={`Listings (${history.listings.length})`} />
        </Tabs>
      )}
      <DialogContent sx={{ minHeight: 360 }}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : !history || !u ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : tab === 0 ? (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
              <Stat label="Joined" value={dateOnly(u.created_at)} />
              <Stat label="Last sign-in" value={u.last_sign_in_at ? dateOnly(u.last_sign_in_at) : '—'} />
              <Stat label="Listings (active)" value={`${history.stats.listings_total} (${history.stats.listings_active})`} />
              <Stat label="Listing views" value={history.stats.total_views.toLocaleString()} />
              <Stat label="Paid (one-time)" value={money(history.stats.one_time_spent)} />
              <Stat label="Messages sent / received" value={`${history.stats.messages_sent} / ${history.stats.messages_received}`} />
              <Stat label="Support messages" value={history.stats.support_messages} />
              <Stat label="Weekly email" value={history.stats.newsletter === 'subscribed' ? 'Subscribed' : history.stats.newsletter === 'unsubscribed' ? 'Unsubscribed' : 'No'} />
            </Box>
            <Typography variant="subtitle2" gutterBottom>Current plan</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {history.current_subscription
                ? `${history.current_subscription.plan_name} (${history.current_subscription.billing_period}), ends ${dateOnly(history.current_subscription.end_date)}${history.current_subscription.auto_renew ? ', renews automatically' : ', not renewing'}`
                : 'No paid plan'}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>Profile</Typography>
            <Typography variant="body2" color="text.secondary">
              {[u.username && `@${u.username}`, u.country].filter(Boolean).join(' · ') || '—'}
            </Typography>
            {u.bio && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>{u.bio}</Typography>}
          </>
        ) : tab === 1 ? (
          <>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              onChange={(_e, v) => v && setFilter(v)}
              sx={{ mb: 2, flexWrap: 'wrap' }}
            >
              <ToggleButton value="all">All</ToggleButton>
              {(Object.keys(EVENT_STYLE) as UserHistoryEvent['type'][]).map((type) => (
                <ToggleButton key={type} value={type}>{EVENT_STYLE[type].label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            {history.history_logged_since && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Edits, status changes and admin actions are recorded from {dateOnly(history.history_logged_since)} onward.
              </Typography>
            )}
            {events.length === 0 ? (
              <Typography color="text.secondary">Nothing here yet.</Typography>
            ) : (
              <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {events.map((event, index) => {
                  const style = EVENT_STYLE[event.type];
                  return (
                    <Box component="li" key={`${event.at}-${index}`} sx={{ display: 'flex', gap: 2, pb: 2, position: 'relative' }}>
                      {/* connector line */}
                      {index < events.length - 1 && (
                        <Box sx={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: '2px', bgcolor: 'divider' }} />
                      )}
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'background.paper', color: style.color, border: '2px solid', borderColor: style.color, flexShrink: 0 }}>
                        {style.icon}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {event.title}
                          {event.actor && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>by {event.actor}</Typography>
                          )}
                        </Typography>
                        {event.detail && <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{event.detail}</Typography>}
                        <Typography variant="caption" color="text.secondary">{dateTime(event.at)}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        ) : tab === 2 ? (
          history.payments.length === 0 ? (
            <Typography color="text.secondary">No payments.</Typography>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>What</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.payments.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateOnly(p.at)}</TableCell>
                      <TableCell>{p.description}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {p.source === 'plan' ? 'Included' : p.source === 'admin' ? 'Free (admin)' : money(p.amount)}
                        {p.source === 'subscription' && <Typography component="div" variant="caption" color="text.secondary">plan price</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Subscriptions show the plan price when they started; renewal charges are in Stripe.
              </Typography>
            </>
          )
        ) : history.listings.length === 0 ? (
          <Typography color="text.secondary">No listings.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Listing</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Views</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar variant="rounded" src={l.primary_image_url || undefined} sx={{ width: 36, height: 36 }}>{l.title.charAt(0)}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 240 }}>{l.title}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {l.featured_until && new Date(l.featured_until) > new Date() && <Chip size="small" color="warning" label="Featured" sx={{ height: 18, fontSize: '0.65rem' }} />}
                          {l.paid_until && new Date(l.paid_until) > new Date() && <Chip size="small" color="info" variant="outlined" label="Pass" sx={{ height: 18, fontSize: '0.65rem' }} />}
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Chip size="small" label={l.status} sx={{ textTransform: 'capitalize' }} /></TableCell>
                  <TableCell align="right">{l.price != null ? money(l.price) : '—'}</TableCell>
                  <TableCell align="right">{l.views}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateOnly(l.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserHistoryDialog;
