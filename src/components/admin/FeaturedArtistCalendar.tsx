import React, { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Link, Paper, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import apiService, { FeaturedArtistCalendarWeek } from '../../services/api';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatWeekRange, money } from './adminLabels';

interface FeaturedArtistCalendarProps {
  onOpenUser: (userId: number) => void;
}

type ArtistOption = { id: number; artist_name: string };

// Who is (or was) the homepage Featured Artist each week. Admins can give a free week or remove a booking.
const FeaturedArtistCalendar: React.FC<FeaturedArtistCalendarProps> = ({ onOpenUser }) => {
  const { enqueueSnackbar } = useSnackbar();
  const { confirm } = useConfirm();
  const [weeks, setWeeks] = useState<FeaturedArtistCalendarWeek[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [choice, setChoice] = useState<ArtistOption | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    apiService.getFeaturedArtistCalendar()
      .then(({ weeks: w }) => setWeeks(w))
      .catch((err) => setError(err.message || 'Failed to load calendar'));

  useEffect(() => {
    load();
    apiService.getArtists().then(({ artists: a }) => setArtists(a.map((x) => ({ id: x.id, artist_name: x.artist_name })))).catch(() => {});
  }, []);

  const assign = async (weekStart: string) => {
    if (!choice) return;
    setBusy(true);
    try {
      await apiService.assignFeaturedArtistWeek(weekStart, choice.id);
      enqueueSnackbar(`${choice.artist_name} featured for ${formatWeekRange(weekStart)}`, { variant: 'success' });
      setAssigning(null);
      setChoice(null);
      await load();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to assign week', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (week: FeaturedArtistCalendarWeek) => {
    if (!week.booking) return;
    const paid = week.booking.source === 'stripe';
    if (!(await confirm({
      title: `Remove ${week.booking.artist_name} from ${formatWeekRange(week.week_start)}?`,
      message: paid ? `They paid ${money(week.booking.amount)} for this week. Removing it does not refund them; issue the refund in Stripe.` : 'This was a free week given by an admin.',
      confirmText: 'Remove',
      destructive: true,
    }))) return;
    try {
      await apiService.removeFeaturedArtistWeek(week.week_start);
      enqueueSnackbar('Booking removed', { variant: 'success' });
      await load();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to remove booking', { variant: 'error' });
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!weeks) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
      {weeks.map((week) => (
        <Paper
          key={week.week_start}
          variant="outlined"
          sx={{
            p: 1.5,
            opacity: week.status === 'past' ? 0.6 : 1,
            borderColor: week.status === 'current' ? 'primary.main' : 'divider',
            borderWidth: week.status === 'current' ? 2 : 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatWeekRange(week.week_start)}</Typography>
            {week.status === 'current' && <Chip size="small" color="primary" label="This week" />}
          </Box>
          {week.booking ? (
            <>
              <Link component="button" variant="body2" onClick={() => onOpenUser(week.booking!.user_id)} sx={{ textAlign: 'left' }}>
                {week.booking.artist_name}
              </Link>
              <Typography variant="caption" color="text.secondary" display="block">
                {week.booking.source === 'stripe' ? `Paid ${money(week.booking.amount)}` : 'Free (admin)'}
              </Typography>
              {week.status !== 'past' && (
                <Button size="small" color="error" onClick={() => remove(week)} sx={{ mt: 0.5, px: 0, textTransform: 'none' }}>Remove</Button>
              )}
            </>
          ) : week.status === 'past' ? (
            <Typography variant="caption" color="text.secondary">Nobody</Typography>
          ) : assigning === week.week_start ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
              <Autocomplete
                size="small"
                options={artists}
                value={choice}
                onChange={(_e, v) => setChoice(v)}
                getOptionLabel={(o) => o.artist_name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Artist" autoFocus />}
                noOptionsText="No artists with live work"
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="contained" disabled={!choice || busy} onClick={() => assign(week.week_start)} sx={{ textTransform: 'none' }}>Feature for free</Button>
                <Button size="small" onClick={() => { setAssigning(null); setChoice(null); }} sx={{ textTransform: 'none' }}>Cancel</Button>
              </Box>
            </Box>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" display="block">Open</Typography>
              <Button size="small" onClick={() => { setAssigning(week.week_start); setChoice(null); }} sx={{ mt: 0.5, px: 0, textTransform: 'none' }}>
                Give to an artist
              </Button>
            </>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default FeaturedArtistCalendar;
