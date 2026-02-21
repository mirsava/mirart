import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import apiService from '../services/api';

const ArtistSignin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const { addToCart } = useCart();
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
    if (loginError) {
      setLoginError('');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = 'Username or email is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setLoginError('');
    
    try {
      const cognitoUser = await signIn(formData.usernameOrEmail, formData.password);
      
      if (cognitoUser) {
        try {
          await apiService.getUser(cognitoUser.username);
          const state = location.state as { returnTo?: string; pendingAdd?: any; from?: { pathname?: string } } | undefined;
          if (state?.returnTo === 'checkout' && state?.pendingAdd) {
            try {
              addToCart(state.pendingAdd, 'artwork', state.pendingAdd.id);
            } catch {}
            navigate('/checkout');
          } else if (state?.from?.pathname) {
            navigate(state.from.pathname);
          } else {
            navigate('/artist-dashboard');
          }
        } catch (dbError: any) {
          navigate('/artist-signup', {
            state: {
              message: 'Please complete your artist profile to continue.',
              email: formData.usernameOrEmail.includes('@') ? formData.usernameOrEmail : undefined,
              username: cognitoUser.username,
            }
          });
        }
      } else {
        const state = location.state as { from?: { pathname?: string } } | undefined;
        navigate(state?.from?.pathname || '/artist-dashboard');
      }
    } catch (error: any) {
      setLoginError(error.message || 'Invalid username/email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ py: 8, minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 6, borderRadius: 3, boxShadow: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                }}
              >
                <PersonIcon sx={{ color: 'white', mr: 1 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  Artist Portal
                </Typography>
              </Box>
            </Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to your artist account to manage your listings and track sales.
            </Typography>
          </Box>

          {loginError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {loginError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Username or Email"
                type="text"
                value={formData.usernameOrEmail}
                onChange={handleInputChange('usernameOrEmail')}
                error={!!errors.usernameOrEmail}
                helperText={errors.usernameOrEmail || 'Enter your username or email address'}
                required
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                error={!!errors.password}
                helperText={errors.password}
                required
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                  />
                }
                label="Remember me"
              />
              <Link 
                component="button" 
                type="button"
                variant="body2"
                onClick={() => navigate('/forgot-password')}
                sx={{ textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{ mb: 3, py: 1.5 }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                New to our platform?
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Don't have an artist account yet?
              </Typography>
              <Button
                type="button"
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => navigate('/artist-signup')}
                sx={{ py: 1.5 }}
              >
                Join as Artist
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              <strong>Demo Account:</strong> Use any email and password to sign in for testing purposes.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ArtistSignin;
