import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import apiService, { UserHistoryEvent } from '../../services/api';
import ActivityTimeline, { EVENT_STYLE } from '../ActivityTimeline';

const PREVIEW_COUNT = 10;
// Types that can appear in an artist's own feed (messages have their own page)
const FILTER_TYPES: UserHistoryEvent['type'][] = ['listing', 'payment', 'subscription', 'notice', 'account'];

// "Recent activity" card for the artist dashboard, with a full, filterable list in a dialog.
const RecentActivity: React.FC<{ authUserId: string }> = ({ authUserId }) => {
  const [events, setEvents] = useState<UserHistoryEvent[] | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | UserHistoryEvent['type']>('all');

  useEffect(() => {
    apiService.getMyActivity(authUserId).then((r) => setEvents(r.timeline)).catch(() => setEvents([]));
  }, [authUserId]);

  const filtered = useMemo(() => (events || []).filter((e) => filter === 'all' || e.type === filter), [events, filter]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Recent activity</Typography>
        {events && events.length > PREVIEW_COUNT && (
          <Button size="small" onClick={() => setOpen(true)} sx={{ textTransform: 'none' }}>See all ({events.length})</Button>
        )}
      </Box>
      {!events ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
      ) : events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Nothing yet. Listings you create, payments and plan changes will show up here.</Typography>
      ) : (
        <ActivityTimeline events={events.slice(0, PREVIEW_COUNT)} />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle>Your activity</DialogTitle>
        <DialogContent dividers>
          <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_e, v) => v && setFilter(v)} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <ToggleButton value="all">All</ToggleButton>
            {FILTER_TYPES.map((type) => (
              <ToggleButton key={type} value={type}>{EVENT_STYLE[type].label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          {filtered.length === 0 ? (
            <Typography color="text.secondary">Nothing here.</Typography>
          ) : (
            <ActivityTimeline events={filtered} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RecentActivity;
