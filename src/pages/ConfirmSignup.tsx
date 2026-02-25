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
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const ConfirmSignup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmSignUp, resendConfirmationCode } = useAuth();
  
  // Get email, username, and user data from location state
  const emailFromState = location.state?.email || '';
  const usernameFromState = location.state?.username || '';
  const userDataFromState = location.state?.userData || null;
  const [email, setEmail] = useState(emailFromState);
  const [username, setUsername] = useState(usernameFromState);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value);
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: '' }));
    }
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // If username is not from state, we need either username or email
    if (!usernameFromState) {
      if (!username.trim() && !email.trim()) {
        newErrors.username = 'Username or email is required';
      }
    }

    if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!code.trim()) {
      newErrors.code = 'Verification code is required';
    } else if (code.length < 6) {
      newErrors.code = 'Verification code must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    
    try {
      // Prioritize username if available (from signup), otherwise use email
      // Username is what was actually used during signup
      const identifier = (username && username.trim()) || email;
      if (!identifier) {
        setErrors({ general: 'Username or email is required' });
        return;
      }
      await confirmSignUp(identifier, code);
      
      // Try to save user data to database if it wasn't saved during signup
      if (userDataFromState && username) {
        try {
          await apiService.createOrUpdateUser({
            cognito_username: username,
            ...userDataFromState,
          });
        } catch (dbError) {
          console.error('Error saving user data after confirmation:', dbError);
          // Don't fail confirmation if database save fails
        }
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/artist-signin', { 
          state: { message: 'Account confirmed successfully! Please sign in.' } 
        });
      }, 2000);
    } catch (error: any) {
      setErrors({ general: error.message || 'Invalid verification code. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsResending(true);
    setErrors({});
    
    try {
      await resendConfirmationCode(email);
      setErrors({});
      alert('Verification code has been resent to your email!');
    } catch (error: any) {
      // Show helpful message instead of error
      alert('If you did not receive the code, please check your spam folder or try signing up again. The code is valid for 24 hours.');
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ py: 8, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 6, borderRadius: 3, boxShadow: 3, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Account Confirmed!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your account has been successfully verified. Redirecting to sign in...
            </Typography>
            <CircularProgress />
          </Paper>
        </Container>
      </Box>
    );
  }

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
                <EmailIcon sx={{ color: 'white', mr: 1 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  Verify Your Email
                </Typography>
              </Box>
            </Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Confirm Your Account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We've sent a verification code to your email address. Please enter it below to confirm your account.
            </Typography>
          </Box>

          {errors.general && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.general}
            </Alert>
          )}

          <form onSubmit={handleConfirm} noValidate>
            {!usernameFromState && (
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={!!errors.username}
                helperText={errors.username || 'Enter the username you used during signup'}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={handleEmailChange}
              error={!!errors.email}
              helperText={errors.email || (usernameFromState ? 'Email used during signup' : 'Enter your email address')}
              required={!usernameFromState}
              disabled={!!emailFromState}
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Verification Code"
              value={code}
              onChange={handleCodeChange}
              error={!!errors.code}
              helperText={errors.code || 'Enter the 6-digit code from your email'}
              required
              inputProps={{
                maxLength: 6,
                pattern: '[0-9]*',
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{ mb: 2, py: 1.5 }}
            >
              {isLoading ? 'Verifying...' : 'Verify Account'}
            </Button>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Didn't receive the code?
              </Typography>
              <Button
                variant="text"
                onClick={handleResendCode}
                disabled={isResending || !email.trim()}
                sx={{ textTransform: 'none' }}
              >
                {isResending ? 'Resending...' : 'Resend Verification Code'}
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/artist-signin')}
                sx={{ textDecoration: 'none' }}
              >
                Back to Sign In
              </Link>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default ConfirmSignup;
