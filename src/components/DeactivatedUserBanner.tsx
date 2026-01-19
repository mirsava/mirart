import React, { useState } from 'react';
import { Box, Alert, Button, CircularProgress } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { useSnackbar } from 'notistack';

const DeactivatedUserBanner: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [reactivating, setReactivating] = useState(false);

  // Check if user is deactivated (handle both boolean false and numeric 0)
  const activeStatus = user?.attributes?.active;
  const isDeactivated = activeStatus === false || activeStatus === 0 || (activeStatus !== undefined && !activeStatus);
  
  if (!user || !isDeactivated) {
    return null;
  }

  const handleReactivate = async () => {
    if (!user?.id) return;

    setReactivating(true);
    try {
      const response = await apiService.reactivateUser(user.id);
      enqueueSnackbar('Account reactivated successfully!', { variant: 'success' });
      
      // Refresh user data immediately
      await refreshUser();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to reactivate account', { variant: 'error' });
    } finally {
      setReactivating(false);
    }
  };

  return (
    <Box sx={{ position: 'sticky', top: 64, zIndex: 1200, width: '100%' }}>
      <Alert
        severity="warning"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={handleReactivate}
            disabled={reactivating}
            startIcon={reactivating ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {reactivating ? 'Reactivating...' : 'Reactivate Account'}
          </Button>
        }
        sx={{
          borderRadius: 0,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        Your account has been deactivated. Please reactivate your account to continue using the platform.
      </Alert>
    </Box>
  );
};

export default DeactivatedUserBanner;

