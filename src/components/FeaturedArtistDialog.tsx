import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { AutoAwesome as SpotlightIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { FeaturedArtistWeek } from '../services/api';

interface FeaturedArtistDialogProps {
  open: boolean;
  onClose: () => void;
}

const formatPrice = (price: number) => `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
const formatWeek = (weekStart: string) => {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
};

// Book the homepage "Featured Artist" slot for a week (it also leads the weekly email).
const FeaturedArtistDialog: React.FC<FeaturedArtistDialogProps> = ({ open, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<{ enabled: boolean; price: number; weeks: FeaturedArtistWeek[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setData(null);
    setSelected(null);
    apiService.getFeaturedArtistWeeks()
      .then((result) => {
        if (!active) return;
        setData(result);
        setSelected(result.weeks.find((w) => !w.taken)?.week_start ?? null);
      })
      .catch((err) => active && enqueueSnackbar(err.message || 'Could not load available weeks', { variant: 'error' }));
    return () => {
      active = false;
    };
  }, [open, enqueueSnackbar]);

  const book = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const { url } = await apiService.createFeaturedArtistCheckout(selected);
      window.location.href = url;
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to start payment', { variant: 'error' });
      setPaying(false);
    }
  };

  const booked = data?.weeks.filter((w) => w.mine) ?? [];

  return (
    <Dialog open={open} onClose={paying ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Feature my shop</DialogTitle>
      <DialogContent dividers>
        {!data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : !data.enabled ? (
          <Alert severity="info">Featured artist spots are not available right now.</Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Be the <strong>Featured Artist</strong> for a week: your profile and work at the top of the homepage, and the lead
              story in the weekly email to subscribers. One artist per week, {formatPrice(data.price)}.
            </Typography>
            {booked.length > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                You're booked for {booked.map((w) => formatWeek(w.week_start)).join(', ')}.
              </Alert>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              {data.weeks.map((week, index) => (
                <Paper
                  key={week.week_start}
                  variant="outlined"
                  component="button"
                  type="button"
                  disabled={week.taken}
                  onClick={() => setSelected(week.week_start)}
                  sx={{
                    p: 1.5,
                    textAlign: 'left',
                    cursor: week.taken ? 'default' : 'pointer',
                    font: 'inherit',
                    color: 'text.primary',
                    bgcolor: selected === week.week_start ? 'action.selected' : 'background.paper',
                    borderColor: selected === week.week_start ? 'primary.main' : 'divider',
                    borderWidth: selected === week.week_start ? 2 : 1,
                    opacity: week.taken && !week.mine ? 0.55 : 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>{formatWeek(week.week_start)}</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {week.mine ? (
                      <Chip size="small" color="success" label="Yours" />
                    ) : week.taken ? (
                      <Chip size="small" label="Booked" />
                    ) : (
                      <Chip size="small" color="primary" variant="outlined" label={index === 0 ? 'Available (starts now)' : 'Available'} />
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={paying}>Close</Button>
        {data?.enabled && (
          <Button
            variant="contained"
            onClick={book}
            disabled={!selected || paying}
            startIcon={paying ? <CircularProgress size={16} color="inherit" /> : <SpotlightIcon />}
          >
            {selected ? `Book ${formatWeek(selected)} for ${formatPrice(data.price)}` : 'All weeks are booked'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FeaturedArtistDialog;
