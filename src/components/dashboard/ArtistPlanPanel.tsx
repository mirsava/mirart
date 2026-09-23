import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import apiService, { ArtistPlanData } from '../../services/api';

interface ArtistPlanPanelProps {
  authUserId: string;
  onPromoteListing: (listingId: number) => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const dateOnly = (v: string) => new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const weekRange = (weekStart: string) => {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
};

// Plan & billing details: slot usage, included features, active passes and promotions, and payment history.
const ArtistPlanPanel: React.FC<ArtistPlanPanelProps> = ({ authUserId, onPromoteListing }) => {
  const [data, setData] = useState<ArtistPlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService.getArtistPlan(authUserId).then(setData).catch((err) => setError(err.message || 'Failed to load plan details'));
  }, [authUserId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  const { slots } = data;
  const slotPct = slots.max > 0 ? Math.min(100, (slots.used / slots.max) * 100) : 100;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Listing slots</Typography>
          {slots.max > 0 ? (
            <>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'inherit' }}>{slots.used} of {slots.max}</Typography>
              <LinearProgress
                variant="determinate"
                value={slotPct}
                color={slotPct >= 100 ? 'warning' : 'primary'}
                sx={{ my: 1, height: 8, borderRadius: 4 }}
                aria-label={`${slots.used} of ${slots.max} listing slots used`}
              />
              <Typography variant="body2" color="text.secondary">
                {data.access_source === 'free' ? 'Free during launch.' : slotPct >= 100 ? 'All slots in use. Upgrade, or buy a pass for extra listings.' : `${slots.max - slots.used} left.`}
                {data.passes.length > 0 && ` Plus ${data.passes.length} on a listing pass (not counted).`}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No plan slots. Listings need a plan or a listing pass{data.listing_pass.enabled ? ` ($${data.listing_pass.price} for ${data.listing_pass.days} days)` : ''} to go live.
            </Typography>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Included features</Typography>
          {data.credits.allowance > 0 ? (
            <>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'inherit' }}>{data.credits.remaining} of {data.credits.allowance} left</Typography>
              <Typography variant="body2" color="text.secondary">
                Each features a listing for {data.credits.days} days. They refresh on a rolling 30 days. Use them from Promote on a listing.
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">Your plan doesn't include free features. Professional and Enterprise do.</Typography>
          )}
        </Paper>
      </Box>

      {(data.passes.length > 0 || data.featured_listings.length > 0 || data.featured_weeks.length > 0) && (
        <Paper variant="outlined">
          <Typography variant="subtitle2" sx={{ p: 2, pb: 1 }}>Active promotions</Typography>
          <Table size="small">
            <TableBody>
              {data.passes.map((p) => (
                <TableRow key={`pass-${p.id}`}>
                  <TableCell>Listing pass: {p.title}</TableCell>
                  <TableCell>until {dateOnly(p.paid_until)}</TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => onPromoteListing(p.id)} sx={{ textTransform: 'none' }}>Extend</Button></TableCell>
                </TableRow>
              ))}
              {data.featured_listings.map((f) => (
                <TableRow key={`feat-${f.id}`}>
                  <TableCell>Featured: {f.title}</TableCell>
                  <TableCell>until {dateOnly(f.featured_until)}</TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => onPromoteListing(f.id)} sx={{ textTransform: 'none' }}>Add time</Button></TableCell>
                </TableRow>
              ))}
              {data.featured_weeks.map((w) => (
                <TableRow key={`week-${w.week_start}`}>
                  <TableCell>Featured Artist week</TableCell>
                  <TableCell>{weekRange(w.week_start)}</TableCell>
                  <TableCell align="right">{w.source === 'admin' ? 'Free' : money(w.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Paper variant="outlined">
        <Typography variant="subtitle2" sx={{ p: 2, pb: 1 }}>Payment history</Typography>
        {data.payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>No payments yet.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>What</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.payments.map((p, i) => (
                  <TableRow key={`${p.at}-${i}`}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateOnly(p.at)}</TableCell>
                    <TableCell>{p.description}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {p.source === 'plan' ? 'Included' : p.source === 'admin' ? 'Free' : money(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ArtistPlanPanel;
