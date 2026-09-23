import React, { useEffect, useState } from 'react';
import { Box, Paper, Switch, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import apiService from '../../services/api';

// On/off switch for the weekly "new art" email, for the signed-in user's account email.
const NewsletterPreference: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiService.getNewsletterPreference().then((r) => setSubscribed(r.subscribed)).catch(() => setSubscribed(null));
  }, []);

  if (subscribed === null) return null;

  const toggle = async (next: boolean) => {
    setSaving(true);
    try {
      const r = await apiService.setNewsletterPreference(next);
      setSubscribed(r.subscribed);
      enqueueSnackbar(r.subscribed ? "You'll get the weekly email every Monday" : 'Unsubscribed from the weekly email', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Could not save', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <Typography variant="subtitle2">Weekly email</Typography>
        <Typography variant="body2" color="text.secondary">New art, the featured artist and spotlight pieces, every Monday.</Typography>
      </Box>
      <Switch checked={subscribed} disabled={saving} onChange={(e) => toggle(e.target.checked)} inputProps={{ 'aria-label': 'Weekly email' }} />
    </Paper>
  );
};

export default NewsletterPreference;
