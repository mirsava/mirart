import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Radio,
  Typography,
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { Listing } from '../../services/api';

interface FeatureCreditDialogProps {
  open: boolean;
  authUserId: string;
  days: number;
  onClose: () => void;
  onUsed: () => void;
}

const isFeatured = (l: Listing) => Boolean(l.featured_until && new Date(l.featured_until) > new Date());

// Pick one live listing and feature it with a free feature included in the plan.
const FeatureCreditDialog: React.FC<FeatureCreditDialogProps> = ({ open, authUserId, days, onClose, onUsed }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setListings(null);
    setSelected(null);
    apiService.getListings({ authUserId, status: 'active', limit: 100 })
      .then(({ listings: l }) => {
        setListings(l);
        // Suggest a listing that isn't featured yet
        setSelected((l.find((x) => !isFeatured(x)) || l[0])?.id ?? null);
      })
      .catch(() => setListings([]));
  }, [open, authUserId]);

  const use = async () => {
    if (selected == null) return;
    setSaving(true);
    try {
      const result = await apiService.useFeatureCredit(selected);
      const until = result.listing.featured_until
        ? new Date(result.listing.featured_until).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
        : null;
      enqueueSnackbar(`Featured${until ? ` until ${until}` : ''}. It's now at the top of the gallery and on the homepage.`, { variant: 'success' });
      onUsed();
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Could not feature the listing', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth scroll="paper">
      <DialogTitle>Feature a listing for free</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          For {days} days, the listing you pick shows above others in the gallery, appears in the homepage spotlight and gets a
          Featured badge. It's included with your plan, so there's nothing to pay.
        </Typography>
        {!listings ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : listings.length === 0 ? (
          <Alert severity="info">You need a live listing to feature. Activate one first.</Alert>
        ) : (
          <List dense disablePadding>
            {listings.map((l) => (
              <ListItemButton key={l.id} selected={selected === l.id} onClick={() => setSelected(l.id)} sx={{ borderRadius: 1 }}>
                <Radio edge="start" checked={selected === l.id} tabIndex={-1} size="small" inputProps={{ 'aria-label': l.title }} />
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar variant="rounded" src={l.primary_image_url || undefined}>{l.title.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={l.title}
                  secondary={isFeatured(l) ? `Already featured until ${new Date(l.featured_until as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}. This adds ${days} days.` : undefined}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Not now</Button>
        <Button
          variant="contained"
          onClick={use}
          disabled={saving || selected == null}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <StarIcon />}
          sx={{ textTransform: 'none' }}
        >
          Feature it free
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeatureCreditDialog;
