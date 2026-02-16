import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const OrderSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { signUp } = useAuth();
  const sessionId = searchParams.get('session_id');
  const [confirming, setConfirming] = useState(!!sessionId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const confirm = async () => {
      try {
        const result = await apiService.confirmStripeSession(sessionId);
        if (result.success) {
          clearCart();
          if (result.requiresUserCreation && result.subscriptionData) {
            const signupData = sessionStorage.getItem('signupFormData');
            sessionStorage.removeItem('signupFormData');
            if (signupData) {
              const formData = JSON.parse(signupData);
              const attributes: Record<string, string> = {
                name: `${formData.firstName} ${formData.lastName}`,
                given_name: formData.firstName,
                family_name: formData.lastName,
              };
              if (formData.phone?.trim()) {
                let phone = formData.phone.trim();
                if (!phone.startsWith('+')) phone = '+1' + phone.replace(/\D/g, '');
                attributes.phone_number = phone;
              }
              await signUp(formData.email, formData.password, attributes, formData.username);
              await apiService.createOrUpdateUser({
                cognito_username: formData.username,
                email: formData.email,
                first_name: formData.firstName,
                last_name: formData.lastName,
                business_name: formData.businessName,
                phone: formData.phone || null,
                country: formData.country,
                website: formData.website || null,
                specialties: formData.specialties,
                experience_level: formData.experience,
              });
              await apiService.createSubscription(
                formData.username,
                result.subscriptionData.plan_id,
                result.subscriptionData.billing_period,
                sessionId
              );
            }
            navigate('/artist-dashboard', { replace: true });
            return;
          }
          if (result.subscription) {
            const listingId = sessionStorage.getItem('listingIdToActivate');
            sessionStorage.removeItem('listingIdToActivate');
            navigate('/artist-dashboard', { replace: true, state: listingId ? { listingIdToActivate: parseInt(listingId, 10) } : undefined });
            return;
          }
        }
      } catch (err: any) {
        const msg = err?.details?.message || err?.error || err?.message || 'Failed to confirm payment';
        setError(msg);
      } finally {
        setConfirming(false);
      }
    };
    confirm();
  }, [sessionId, clearCart, navigate, signUp]);

  if (confirming) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography>Confirming your payment...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 8 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" variant="h6" gutterBottom>{error}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              If your payment was successful, try refreshing this page. Your order may already be confirmed.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button variant="outlined" onClick={() => navigate('/cart')}>Back to Cart</Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 3,
            }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Order Placed Successfully!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Thank you for your purchase. Your order has been confirmed and will be
            processed shortly.
          </Typography>

          <Card sx={{ mt: 4, mb: 4, textAlign: 'left' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                What happens next?
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    Order Confirmation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You'll receive an email confirmation with your order details
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShippingIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    Secure Packaging
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your artwork will be carefully packaged with insurance
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShippingIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    Worldwide Shipping
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Free shipping with tracking information provided
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/gallery')}
            >
              Continue Shopping
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            Questions about your order? Contact us at info@artzyla.com
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default OrderSuccess;


