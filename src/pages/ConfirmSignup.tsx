import React, { useEffect, useRef, useState } from 'react';
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
import { useSnackbar } from 'notistack';

const ConfirmSignup: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirmSignUp, resendConfirmationCode, refreshUser, isAuthenticated, loading: authLoading } = useAuth();
  
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const wasSignedInOnArrival = useRef<boolean | null>(null);

  // Clicking the link in the confirmation email signs the user in (in this tab or another one).
  useEffect(() => {
    if (authLoading) return;
    if (wasSignedInOnArrival.current === null) {
      wasSignedInOnArrival.current = isAuthenticated;
      if (isAuthenticated) navigate('/dashboard', { replace: true });
      return;
    }
    if (isAuthenticated && !wasSignedInOnArrival.current && !success) {
      setSuccess(true);
      const timer = setTimeout(() => navigate('/dashboard'), 2000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated, success, navigate]);

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

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!code.trim()) {
      newErrors.code = 'Verification code is required';
    } else if (code.length < 6) {
      newErrors.code = 'Verification code must be at least 6 digits';
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
      await confirmSignUp(email, code);
      // Confirming the code also signs the user in.
      await refreshUser();

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
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
      enqueueSnackbar('A new verification email has been sent!', { variant: 'success' });
    } catch (error: any) {
      // Show helpful message instead of error
      enqueueSnackbar('If you did not receive the code, please check your spam folder or try signing up again. The code is valid for 24 hours.', { variant: 'info', autoHideDuration: 8000 });
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
              Your account has been successfully verified. Redirecting to your dashboard...
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
              We've sent a verification email. Click the link in it to confirm your account, or enter the code from the email below.
            </Typography>
          </Box>

          {errors.general && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.general}
            </Alert>
          )}

          <form onSubmit={handleConfirm} noValidate>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={handleEmailChange}
              error={!!errors.email}
              helperText={errors.email || 'The email address you signed up with'}
              required
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
              helperText={errors.code || 'Only needed if your email includes a verification code'}
              required
              inputProps={{
                maxLength: 10,
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
                Didn't receive the email?
              </Typography>
              <Button
                variant="text"
                onClick={handleResendCode}
                disabled={isResending || !email.trim()}
                sx={{ textTransform: 'none' }}
              >
                {isResending ? 'Resending...' : 'Resend verification email'}
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/signin')}
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
