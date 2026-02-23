import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import apiService from '../services/api';
import { FormData } from '../types';

interface ShippingRate {
  object_id: string;
  provider: string;
  servicelevel: string;
  amount: string;
  estimated_days?: number;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const hasActivationItems = cartItems.some(item => item.type === 'activation');
  const hasArtworkItems = cartItems.some(item => item.type !== 'activation');
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [needsPayoutSetup, setNeedsPayoutSetup] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingConfigured, setShippingConfigured] = useState(false);
  const [needsShippingRates, setNeedsShippingRates] = useState(false);

  const steps = ['Shipping Information', 'Payment', 'Review & Confirm'];

  const artworkItems = cartItems.filter(item => item.type !== 'activation');
  const artworkTotal = artworkItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const shippingCost = selectedRate ? parseFloat(selectedRate.amount) : 0;
  const taxAmount = artworkTotal * 0.08;
  const orderTotal = getTotalPrice() + taxAmount + shippingCost;

  useEffect(() => {
    apiService.isShippingConfigured().then(r => setShippingConfigured(r.configured)).catch(() => {});
  }, []);

  useEffect(() => {
    if (shippingConfigured && artworkItems.length > 0) {
      const hasBuyerPays = artworkItems.some((item: any) => item.shipping_preference === 'buyer');
      setNeedsShippingRates(hasBuyerPays);
    }
  }, [shippingConfigured, cartItems]);

  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const profile = await apiService.getUser(user.id);
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || profile.first_name || '',
        lastName: prev.lastName || profile.last_name || '',
        email: prev.email || profile.email || '',
        phone: prev.phone || profile.phone || '',
        address: prev.address || profile.address_line1 || '',
        city: prev.city || profile.address_city || '',
        state: prev.state || profile.address_state || '',
        zipCode: prev.zipCode || profile.address_zip || '',
        country: profile.address_country || profile.country || prev.country,
      }));
    } catch {
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const fetchShippingRates = async () => {
    if (!needsShippingRates || !formData.address || !formData.city || !formData.state || !formData.zipCode) return;
    setLoadingRates(true);
    try {
      const address = {
        street1: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zipCode,
        country: formData.country || 'US',
        name: `${formData.firstName} ${formData.lastName}`,
      };
      const items = artworkItems
        .filter((item: any) => item.shipping_preference === 'buyer')
        .map(item => ({ listing_id: item.id, quantity: item.quantity }));
      if (items.length === 0) {
        setShippingRates([]);
        setLoadingRates(false);
        return;
      }
      const result = await apiService.getShippingRates(address, items);
      setShippingRates(result.rates || []);
      if (result.rates?.length > 0 && !selectedRate) {
        setSelectedRate(result.rates[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch shipping rates:', err);
      setShippingRates([]);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: '',
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (activeStep === 0) {
      if (hasArtworkItems) {
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.state) newErrors.state = 'State is required';
        if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';
      } else if (hasActivationItems) {
        if (!formData.email) newErrors.email = 'Email is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (): void => {
    if (validateForm()) {
      if (activeStep === 0 && needsShippingRates) {
        fetchShippingRates();
      }
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = (): void => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleStripeCheckout = async (): Promise<void> => {
    if (!user?.id) {
      enqueueSnackbar('Please sign in to complete your purchase', { variant: 'error' });
      navigate('/artist-signin');
      return;
    }

    if (artworkItems.length === 0) return;

    setLoading(true);
    try {
      const items = artworkItems.map(item => ({
        name: item.title || 'Artwork',
        price: item.price || 0,
        quantity: item.quantity,
        image_url: item.image,
      }));
      const shippingAddress = {
        address_line_1: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      };
      const orderData = {
        items: artworkItems.map(item => ({ listing_id: item.id, quantity: item.quantity })),
        shipping_address: `${formData.firstName} ${formData.lastName}\n${formData.address}\n${formData.city}, ${formData.state} ${formData.zipCode}\n${formData.country}`,
        cognito_username: user.id,
        shippo_rate_id: selectedRate?.object_id || null,
        shipping_cost: shippingCost,
      };
      const result = await apiService.createStripeCheckoutSession(items, {
        shippingAddress,
        metadata: {
          order_data: orderData,
          shipping_cost: shippingCost.toString(),
          shippo_rate_id: selectedRate?.object_id || '',
        },
      });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      const isPayoutError = error?.error === 'Artist has not set up payouts';
      const isArtist = error?.seller_is_current_user || (isPayoutError && user?.id && error?.seller_cognito_username === user.id);
      if (isPayoutError && isArtist) {
        setNeedsPayoutSetup(true);
      } else if (isPayoutError) {
        enqueueSnackbar(error.details || error.message || 'The artist has not set up payouts yet. Please ask them to complete setup in their dashboard.', { variant: 'error' });
      } else {
        enqueueSnackbar(error.details || error.message || 'Failed to start checkout. Please try again.', { variant: 'error' });
      }
      setLoading(false);
    }
  };

  const handlePayoutSetup = async (): Promise<void> => {
    if (!user?.id) return;
    const email = formData.email || user.email;
    if (!email) {
      enqueueSnackbar('Please enter your email in the shipping form to complete payout setup', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await apiService.createStripeConnectAccount(user.id, email);
      const { url } = await apiService.createStripeConnectAccountLink(user.id, {
        return_url: '/checkout',
        refresh_url: '/checkout',
      });
      window.location.href = url;
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to start payout setup', { variant: 'error' });
      setLoading(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      enqueueSnackbar('Please sign in to complete your purchase', { variant: 'error' });
      navigate('/artist-signin');
      return;
    }

    if (cartItems.length === 0) {
      enqueueSnackbar('No items available for checkout', { variant: 'error' });
      return;
    }

    const activationItems = cartItems.filter(item => item.type === 'activation');
    const artItems = cartItems.filter(item => item.type !== 'activation');

    if (activationItems.length > 0 && artItems.length === 0) {
      setLoading(true);
      try {
        for (const item of activationItems) {
          if (item.listingId) {
            await apiService.activateListing(item.listingId, user.id);
          }
        }
        enqueueSnackbar('Listings activated successfully!', { variant: 'success' });
        clearCart();
        navigate('/artist-dashboard');
      } catch (error: any) {
        enqueueSnackbar(error.message || 'Failed to activate listings.', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const renderShippingForm = () => {
    if (hasActivationItems && !hasArtworkItems) {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              You are paying for listing activation fees. No shipping address is required.
            </Alert>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>
        </Grid>
      );
    }
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField required fullWidth label="First Name" value={formData.firstName} onChange={handleInputChange('firstName')} error={!!errors.firstName} helperText={errors.firstName} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField required fullWidth label="Last Name" value={formData.lastName} onChange={handleInputChange('lastName')} error={!!errors.lastName} helperText={errors.lastName} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField required fullWidth label="Email" type="email" value={formData.email} onChange={handleInputChange('email')} error={!!errors.email} helperText={errors.email} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone" value={formData.phone} onChange={handleInputChange('phone')} />
        </Grid>
        <Grid item xs={12}>
          <TextField required fullWidth label="Address" value={formData.address} onChange={handleInputChange('address')} error={!!errors.address} helperText={errors.address} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField required fullWidth label="City" value={formData.city} onChange={handleInputChange('city')} error={!!errors.city} helperText={errors.city} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField required fullWidth label="State" value={formData.state} onChange={handleInputChange('state')} error={!!errors.state} helperText={errors.state} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField required fullWidth label="ZIP Code" value={formData.zipCode} onChange={handleInputChange('zipCode')} error={!!errors.zipCode} helperText={errors.zipCode} />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Country</InputLabel>
            <Select value={formData.country} label="Country" onChange={(e) => setFormData({ ...formData, country: e.target.value })}>
              <MenuItem value="US">United States</MenuItem>
              <MenuItem value="CA">Canada</MenuItem>
              <MenuItem value="UK">United Kingdom</MenuItem>
              <MenuItem value="AU">Australia</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    );
  };

  const renderShippingRateSelection = () => {
    if (!needsShippingRates) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight={600}>Shipping Method</Typography>
        </Box>
        {loadingRates ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">Fetching shipping rates...</Typography>
          </Box>
        ) : shippingRates.length === 0 ? (
          <Alert severity="info">
            No shipping rates available. Rates will be calculated after you enter your shipping address and proceed.
          </Alert>
        ) : (
          <RadioGroup
            value={selectedRate?.object_id || ''}
            onChange={(e) => {
              const rate = shippingRates.find(r => r.object_id === e.target.value);
              setSelectedRate(rate || null);
            }}
          >
            {shippingRates.map((rate) => (
              <Paper
                key={rate.object_id}
                elevation={0}
                sx={{
                  mb: 1,
                  p: 2,
                  border: '1px solid',
                  borderColor: selectedRate?.object_id === rate.object_id ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.light' },
                }}
                onClick={() => setSelectedRate(rate)}
              >
                <FormControlLabel
                  value={rate.object_id}
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', ml: 1 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {rate.provider} — {rate.servicelevel}
                        </Typography>
                        {rate.estimated_days && (
                          <Typography variant="caption" color="text.secondary">
                            Estimated {rate.estimated_days} business day{rate.estimated_days !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                      <Chip label={`$${parseFloat(rate.amount).toFixed(2)}`} color="primary" variant="outlined" size="small" />
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              </Paper>
            ))}
          </RadioGroup>
        )}
      </Box>
    );
  };

  const renderPaymentForm = () => {
    if (artworkItems.length === 0) {
      return (
        <Alert severity="info">
          No payment required for listing activations.
        </Alert>
      );
    }

    if (needsPayoutSetup) {
      return (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Complete your payout setup
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              You need to set up Stripe to receive payments for your artwork. This is a one-time setup that takes about 2 minutes. You&apos;ll return to checkout when done.
            </Typography>
            <Button variant="contained" color="warning" onClick={handlePayoutSetup} disabled={loading} startIcon={<CreditCardIcon />}>
              {loading ? 'Starting...' : 'Set up payouts now'}
            </Button>
          </Alert>
          <Button variant="outlined" size="small" onClick={() => setNeedsPayoutSetup(false)} sx={{ mt: 1 }}>
            Try payment again
          </Button>
        </Box>
      );
    }

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          Complete your payment securely with Stripe. You will be redirected to the payment page.
        </Alert>
        {needsShippingRates && shippingRates.length > 0 && selectedRate && (
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Shipping: <strong>{selectedRate.provider} — {selectedRate.servicelevel}</strong> (${parseFloat(selectedRate.amount).toFixed(2)})
              {selectedRate.estimated_days && ` • ${selectedRate.estimated_days} day${selectedRate.estimated_days !== 1 ? 's' : ''}`}
            </Typography>
          </Paper>
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleStripeCheckout}
          disabled={loading || (needsShippingRates && shippingRates.length > 0 && !selectedRate)}
          sx={{ py: 1.5 }}
        >
          {loading ? 'Redirecting...' : `Pay $${orderTotal.toFixed(2)} with Stripe`}
        </Button>
      </Box>
    );
  };

  const renderOrderSummary = () => {
    const activationItems = cartItems.filter(item => item.type === 'activation');
    const activationTotal = activationItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    
    return (
    <Box>
      <Typography variant="h6" gutterBottom>Order Summary</Typography>
      {activationItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>Listing Activations</Typography>
          {activationItems.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">{item.title}</Typography>
              <Typography variant="body2">${((item.price || 0) * item.quantity).toFixed(2)}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {artworkItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Artwork</Typography>
          {artworkItems.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">{item.title} x {item.quantity}</Typography>
              <Typography variant="body2">${((item.price || 0) * item.quantity).toFixed(2)}</Typography>
            </Box>
          ))}
        </Box>
      )}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2">Subtotal</Typography>
        <Typography variant="body2">${getTotalPrice().toFixed(2)}</Typography>
      </Box>
      {artworkItems.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Shipping</Typography>
            {shippingCost > 0 ? (
              <Typography variant="body2">${shippingCost.toFixed(2)}</Typography>
            ) : (
              <Typography variant="body2" color="success.main">FREE</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">Tax</Typography>
            <Typography variant="body2">${taxAmount.toFixed(2)}</Typography>
          </Box>
        </>
      )}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Total</Typography>
        <Typography variant="h6" color="primary">${orderTotal.toFixed(2)}</Typography>
      </Box>
    </Box>
    );
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>Checkout</Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              {activeStep === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <ShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Shipping Information</Typography>
                  </Box>
                  {renderShippingForm()}
                  {renderShippingRateSelection()}
                </Box>
              )}

              {activeStep === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <CreditCardIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Payment</Typography>
                  </Box>
                  {renderPaymentForm()}
                </Box>
              )}

              {activeStep === 2 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <CheckCircleIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Review & Confirm</Typography>
                  </Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Please review your order details before confirming your purchase.
                  </Alert>
                  {renderOrderSummary()}
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  Back
                </Button>
                {activeStep === 1 ? (
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : activeStep === steps.length - 1 ? 'Place Order' : 'Next'}
                    </Button>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              {renderOrderSummary()}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Checkout;
