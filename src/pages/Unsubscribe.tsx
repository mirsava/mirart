import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';

// Landing page for the unsubscribe link in the weekly email.
const Unsubscribe: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<'working' | 'done' | 'error'>(token ? 'working' : 'error');

  useEffect(() => {
    if (!token) return;
    apiService.unsubscribeFromNewsletter(token)
      .then(() => setState('done'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          {state === 'working' && <CircularProgress />}
          {state === 'done' && (
            <>
              <Typography variant="h5" component="h1" gutterBottom>You're unsubscribed</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>You won't get the weekly email anymore. You can sign up again from the bottom of any page.</Typography>
            </>
          )}
          {state === 'error' && (
            <>
              <Typography variant="h5" component="h1" gutterBottom>This link didn't work</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>It may be incomplete. Try the unsubscribe link in a recent email again, or contact us and we'll remove you.</Typography>
            </>
          )}
          {state !== 'working' && <Button variant="contained" onClick={() => navigate('/')}>Go to ArtZyla</Button>}
        </Paper>
      </Container>
    </Box>
  );
};

export default Unsubscribe;
