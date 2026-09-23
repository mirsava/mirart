import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';

type Result = Awaited<ReturnType<typeof apiService.confirmPromotion>>;

const PromotionSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(sessionId ? null : 'Missing payment reference.');

  useEffect(() => {
    if (!sessionId) return;
    apiService.confirmPromotion(sessionId)
      .then(setResult)
      .catch((err: any) => setError(err?.message || 'Failed to confirm your payment'));
  }, [sessionId]);

  if (!result && !error) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography>Confirming your payment...</Typography>
        </Box>
      </Box>
    );
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
  const featuredUntil = formatDate(result?.listing?.featured_until);
  const paidUntil = formatDate(result?.listing?.paid_until);
  const weekOf = result?.week_start
    ? new Date(`${result.week_start}T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' })
    : null;
  const copy = {
    feature: {
      title: 'Your listing is featured',
      body: `It now appears above other listings in the Gallery and in the homepage spotlight${featuredUntil ? ` until ${featuredUntil}` : ''}.`,
    },
    bump: {
      title: 'Your listing was bumped',
      body: 'It is back at the top of the newest listings in the Gallery.',
    },
    listing_pass: {
      title: 'Your listing is live',
      body: `It stays live${paidUntil ? ` until ${paidUntil}` : ''} without using a plan slot. You can extend it from your dashboard.`,
    },
    featured_artist: {
      title: "You're booked as Featured Artist",
      body: `${result?.moved ? 'The week you picked was taken moments before your payment, so we booked the next free one. ' : ''}You'll be on the homepage and in the weekly email for the week of ${weekOf ?? 'your booking'}.`,
    },
  }[result?.type ?? 'bump'];

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          {error ? (
            <>
              <Typography color="error" variant="h6" gutterBottom>{error}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                If you were charged, refresh this page. Your promotion is applied only once, however many times you refresh.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={() => window.location.reload()}>Refresh Page</Button>
                <Button variant="outlined" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
              </Box>
            </>
          ) : (
            <>
              <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" component="h1" gutterBottom>
                {copy.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {copy.body}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                <Button variant="outlined" onClick={() => navigate('/gallery')}>View Gallery</Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default PromotionSuccess;
