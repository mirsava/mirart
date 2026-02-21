import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { UserRole, UserRoleType } from '../types/userRoles';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: UserRoleType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType 
}) => {
  const location = useLocation();
  const { user, loading, isAuthenticated, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (requiredUserType && isAuthenticated && !loading) {
      if (requiredUserType === UserRole.SITE_ADMIN && user?.userRole !== UserRole.SITE_ADMIN) {
        setRefreshing(true);
        refreshUser().finally(() => {
          setRefreshing(false);
        });
      }
    }
  }, [requiredUserType, isAuthenticated, loading, user?.userRole, refreshUser]);

  if (loading || refreshing) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '50vh',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/artist-signin" state={{ from: location }} replace />;
  }

  if (requiredUserType && user?.userRole !== requiredUserType) {
    
    if (!user?.userRole && requiredUserType === UserRole.ARTIST) {
      return <>{children}</>;
    }
    
    if (requiredUserType === UserRole.ARTIST && user?.userRole === UserRole.SITE_ADMIN) {
      return <>{children}</>;
    }
    
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '50vh',
          gap: 2,
          p: 4
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          You don't have permission to access this page. 
          {requiredUserType === UserRole.ARTIST && ' This page is for artists only.'}
          {requiredUserType === UserRole.SITE_ADMIN && ' This page is for administrators only.'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your user role: {user?.userRole || 'not set'}
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
