import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import apiService, { ArtistEngagementData } from '../../services/api';
import { getPaintingDetailPath } from '../../utils/seoPaths';

interface ArtistAnalyticsProps {
  authUserId: string;
}

const dayLabel = (day: string, long = false) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(long ? { weekday: 'short' } : {}), timeZone: 'UTC' });

const Summary: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'inherit' }}>{value}</Typography>
  </Paper>
);

// Views, likes and messages over time. Starter / no plan see the totals and chart; higher plans see everything.
const ArtistAnalytics: React.FC<ArtistAnalyticsProps> = ({ authUserId }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<ArtistEngagementData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let active = true;
    apiService.getArtistEngagement(authUserId, days)
      .then((d) => active && setData(d))
      .catch((err) => active && setError(err.message || 'Failed to load analytics'));
    return () => {
      active = false;
    };
  }, [authUserId, days]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const full = data.tier === 'full';
  const hasViews = data.series.some((d) => d.views > 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Analytics</Typography>
        <ToggleButtonGroup size="small" exclusive value={days} onChange={(_e, v) => v && setDays(v)}>
          <ToggleButton value={7}>7 days</ToggleButton>
          <ToggleButton value={30}>30 days</ToggleButton>
          <ToggleButton value={90}>90 days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${full ? 4 : 3}, 1fr)` }, gap: 2, mb: 2 }}>
        <Summary label="Views" value={data.summary.views.toLocaleString()} />
        <Summary label="Likes" value={data.summary.likes.toLocaleString()} />
        <Summary label="Messages" value={data.summary.messages.toLocaleString()} />
        {full && <Summary label="Messages per 100 views" value={((data.message_rate || 0) * 100).toFixed(1)} />}
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">Views per day</Typography>
          <Button size="small" onClick={() => setShowTable((v) => !v)} sx={{ textTransform: 'none' }}>{showTable ? 'Show chart' : 'Show table'}</Button>
        </Box>
        {!hasViews ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
            No views recorded in this period yet. Daily views are counted from now on; your own visits don't count.
          </Typography>
        ) : showTable ? (
          <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell>Day</TableCell><TableCell align="right">Views</TableCell></TableRow></TableHead>
              <TableBody>
                {[...data.series].reverse().map((d) => (
                  <TableRow key={d.day}><TableCell>{dayLabel(d.day, true)}</TableCell><TableCell align="right">{d.views}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box sx={{ height: 240 }} role="img" aria-label={`Views per day for the last ${days} days`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={days === 90 ? '15%' : '30%'}>
                <CartesianGrid vertical={false} stroke={theme.palette.divider} />
                <XAxis dataKey="day" tickFormatter={(d) => dayLabel(d)} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  cursor={{ fill: theme.palette.action.hover }}
                  contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, color: theme.palette.text.primary }}
                  labelFormatter={(d) => dayLabel(String(d), true)}
                  formatter={(value) => [Number(value), 'Views']}
                />
                <Bar dataKey="views" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      {!full ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <LockIcon color="disabled" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>See which pieces get the most attention</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 480, mx: 'auto' }}>
            Views, likes and messages for every listing, how often views turn into messages, and whether your features and bumps paid off. Included with Professional and Enterprise.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/subscription-plans')} sx={{ textTransform: 'none' }}>See plans</Button>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ p: 2, pb: 1 }}>By listing (last {days} days)</Typography>
            {(data.listings || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>No live listings yet.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Listing</TableCell>
                      <TableCell align="right">Views</TableCell>
                      <TableCell align="right">Likes</TableCell>
                      <TableCell align="right">Messages</TableCell>
                      <TableCell align="right">All-time views</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.listings || []).map((l) => (
                      <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(getPaintingDetailPath(l.id, l.title))}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar variant="rounded" src={l.primary_image_url || undefined} sx={{ width: 36, height: 36 }}>{l.title.charAt(0)}</Avatar>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 240 }}>{l.title}</Typography>
                            {l.is_featured && <Chip size="small" color="warning" label="Featured" sx={{ height: 20 }} />}
                            {l.status !== 'active' && <Chip size="small" label={l.status} sx={{ height: 20, textTransform: 'capitalize' }} />}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{l.views}</TableCell>
                        <TableCell align="right">{l.likes}</TableCell>
                        <TableCell align="right">{l.messages}</TableCell>
                        <TableCell align="right">{l.views_total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>

          <Paper variant="outlined">
            <Typography variant="subtitle2" sx={{ p: 2, pb: 0.5 }}>Did promotion work?</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: 'block', mb: 1 }}>
              Average views per day in the week before, compared with while a feature ran or the week after a bump.
            </Typography>
            {(data.promotions || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>No features or bumps in the last 4 months.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Listing</TableCell>
                      <TableCell>Promotion</TableCell>
                      <TableCell align="right">Views/day before</TableCell>
                      <TableCell align="right">Views/day after</TableCell>
                      <TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.promotions || []).map((p, i) => {
                      const change = p.avg_views_before > 0 ? Math.round(((p.avg_views_during - p.avg_views_before) / p.avg_views_before) * 100) : null;
                      return (
                        <TableRow key={`${p.listing_id}-${i}`}>
                          <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>{p.title}</Typography></TableCell>
                          <TableCell>{p.type === 'feature' ? 'Feature' : 'Bump'} · {new Date(p.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</TableCell>
                          <TableCell align="right">{p.avg_views_before}</TableCell>
                          <TableCell align="right">{p.avg_views_during}</TableCell>
                          <TableCell align="right">
                            {change == null ? (p.avg_views_during > 0 ? 'New views' : '—') : `${change > 0 ? '+' : ''}${change}%`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default ArtistAnalytics;
