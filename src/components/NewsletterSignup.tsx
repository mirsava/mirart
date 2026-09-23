import React, { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import apiService from '../services/api';

// Footer form for the weekly "new art" email.
const NewsletterSignup: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await apiService.subscribeToNewsletter(email.trim());
      setDone(true);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Could not subscribe. Please try again.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        New art, every Monday
      </Typography>
      {done ? (
        <Typography variant="body2" color="success.main">You're subscribed. See you Monday!</Typography>
      ) : (
        <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            type="email"
            size="small"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputProps={{ 'aria-label': 'Email address', maxLength: 255 }}
            sx={{ flex: 1, bgcolor: 'background.paper' }}
            required
          />
          <Button type="submit" variant="contained" disabled={submitting} sx={{ textTransform: 'none', flexShrink: 0 }}>
            {submitting ? 'Joining…' : 'Subscribe'}
          </Button>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        One email a week. Unsubscribe any time.
      </Typography>
    </Box>
  );
};

export default NewsletterSignup;
