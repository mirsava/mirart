import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import {
  SupportAgent as SupportIcon,
  ConfirmationNumber as PassIcon,
  Star as StarIcon,
  EventBusy as EndingIcon,
  LocalShipping as ShipIcon,
  CheckCircleOutline as AllClearIcon,
} from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiService, { AdminOverview as Overview, AdminPaymentType } from '../../services/api';
import { PAYMENT_TYPE_LABELS, formatWeekRange, money } from './adminLabels';

interface AdminOverviewProps {
  onNavigate: (section: string) => void;
  onOpenUser: (userId: number) => void;
  checkoutEnabled: boolean;
}

const monthLabel = (month: string, withYear = false) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });

const Kpi: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'inherit', mt: 0.5 }}>{value}</Typography>
    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
  </Paper>
);

// Admin home: revenue from every source, growth, what needs attention, and upcoming featured artists.
const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate, onOpenUser, checkoutEnabled }) => {
  const theme = useTheme();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    apiService.getAdminOverview().then(setData).catch((err) => setError(err.message || 'Failed to load overview'));
  }, []);

  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const { revenue, growth, attention } = data;
  const byType = (Object.keys(PAYMENT_TYPE_LABELS) as AdminPaymentType[])
    .map((type) => ({ type, ...(revenue.by_type[type] || { this_month: 0, last_30d: 0, all_time: 0, purchases: 0 }) }))
    // Order fees only matter when checkout is on (or once there are some)
    .filter((row) => row.type !== 'order_fee' || checkoutEnabled || row.all_time > 0);

  const attentionItems = [
    { count: attention.unread_support, label: 'support chats waiting for a reply', icon: <SupportIcon />, section: 'support' },
    { count: attention.orders_to_ship, label: 'paid orders not shipped yet', icon: <ShipIcon />, section: 'orders' },
    { count: attention.subscriptions_ending, label: 'subscriptions ending in 14 days without renewal', icon: <EndingIcon />, section: 'subscriptions' },
    { count: attention.passes_ending, label: 'listing passes ending this week', icon: <PassIcon />, section: 'payments' },
    { count: attention.features_ending, label: 'featured listings ending this week', icon: <StarIcon />, section: 'promotions' },
  ].filter((item) => item.count > 0);

  const hasRevenue = data.monthly.some((m) => m.total > 0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Revenue</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Kpi label="This month" value={money(revenue.this_month)} />
        <Kpi label="Last 30 days" value={money(revenue.last_30d)} />
        <Kpi label="All time" value={money(revenue.all_time)} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2, mb: 4 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Revenue by month</Typography>
            <Button size="small" onClick={() => setShowTable((v) => !v)} sx={{ textTransform: 'none' }}>
              {showTable ? 'Show chart' : 'Show table'}
            </Button>
          </Box>
          {!hasRevenue ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>No payments in the last 12 months yet.</Typography>
          ) : showTable ? (
            <Table size="small">
              <TableHead><TableRow><TableCell>Month</TableCell><TableCell align="right">Revenue</TableCell></TableRow></TableHead>
              <TableBody>
                {[...data.monthly].reverse().map((m) => (
                  <TableRow key={m.month}><TableCell>{monthLabel(m.month, true)}</TableCell><TableCell align="right">{money(m.total)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ height: 240 }} role="img" aria-label="Revenue by month for the last 12 months">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => monthLabel(m)}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => money(v, false)}
                    tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: theme.palette.action.hover }}
                    contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, color: theme.palette.text.primary }}
                    labelFormatter={(m) => monthLabel(String(m), true)}
                    formatter={(value) => [money(Number(value)), 'Revenue']}
                  />
                  <Bar dataKey="total" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>By source</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 0 }}>Source</TableCell>
                <TableCell align="right">30 days</TableCell>
                <TableCell align="right" sx={{ pr: 0 }}>All time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byType.map((row) => (
                <TableRow key={row.type}>
                  <TableCell sx={{ pl: 0 }}>
                    {PAYMENT_TYPE_LABELS[row.type]}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>({row.purchases})</Typography>
                  </TableCell>
                  <TableCell align="right">{money(row.last_30d)}</TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}>{money(row.all_time)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button size="small" onClick={() => onNavigate('payments')} sx={{ mt: 1, textTransform: 'none' }}>See every payment →</Button>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Needs attention</Typography>
          {attentionItems.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <AllClearIcon color="success" fontSize="small" />
              <Typography variant="body2">All clear.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {attentionItems.map((item) => (
                <Button
                  key={item.label}
                  onClick={() => onNavigate(item.section)}
                  startIcon={item.icon}
                  color="warning"
                  sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none' }}
                >
                  <strong style={{ marginRight: 6 }}>{item.count}</strong> {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Growth</Typography>
          <Table size="small">
            <TableBody>
              {[
                ['Users', `${growth.users_total}`, `+${growth.users_7d} this week`],
                ['Artists / buyers', `${growth.artists} / ${growth.buyers}`, ''],
                ['Active listings', `${growth.listings_active}`, `+${growth.listings_7d} new this week`],
                ['Active subscriptions', `${growth.subscriptions_active}`, ''],
                ['Weekly email subscribers', `${growth.newsletter_subscribers}`, ''],
                ['Messages this week', `${growth.messages_7d}`, ''],
              ].map(([label, value, sub]) => (
                <TableRow key={label}>
                  <TableCell sx={{ pl: 0 }}>{label}</TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}>
                    <strong>{value}</strong>
                    {sub && <Typography component="div" variant="caption" color="text.secondary">{sub}</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Upcoming featured artists</Typography>
          {data.upcoming_featured.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No weeks booked.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {data.upcoming_featured.map((week) => (
                <Box key={week.week_start} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">{formatWeekRange(week.week_start)}</Typography>
                  <Link component="button" variant="body2" onClick={() => onOpenUser(week.user_id)} sx={{ textAlign: 'right' }}>
                    {week.artist_name}{week.source === 'admin' ? ' (free)' : ''}
                  </Link>
                </Box>
              ))}
            </Box>
          )}
          <Button size="small" onClick={() => onNavigate('promotions')} sx={{ mt: 1, textTransform: 'none' }}>Open calendar →</Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminOverview;
