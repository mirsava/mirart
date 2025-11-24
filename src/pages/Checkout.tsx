import React, { useState } from 'react';
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

  const steps = ['Shipping Information', 'Payment Details', 'Review & Confirm'];

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
    } else if (activeStep === 1) {
      if (!formData.cardNumber) newErrors.cardNumber = 'Card number is required';
      if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
      if (!formData.cvv) newErrors.cvv = 'CVV is required';
      if (!formData.cardName) newErrors.cardName = 'Cardholder name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (): void => {
    if (validateForm()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = (): void => {
    setActiveStep((prevStep) => prevStep - 1);
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

    setLoading(true);

    try {
      const mockPaymentIntentId = `mock_payment_${Date.now()}`;
      
      const activationItems = cartItems.filter(item => item.type === 'activation');
      const artworkItems = cartItems.filter(item => item.type !== 'activation');

      if (activationItems.length > 0) {
        for (const item of activationItems) {
          if (item.listingId) {
            await apiService.activateListing(item.listingId, user.id, mockPaymentIntentId);
          }
        }
        enqueueSnackbar('Listings activated successfully!', { variant: 'success' });
      }

      if (artworkItems.length > 0) {
        const shippingAddress = `${formData.firstName} ${formData.lastName}\n${formData.address}\n${formData.city}, ${formData.state} ${formData.zipCode}\n${formData.country}`;

        const orderPromises = artworkItems.map(item =>
          apiService.createOrder({
            cognito_username: user.id,
            listing_id: item.id,
            quantity: item.quantity,
            shipping_address: shippingAddress,
            payment_intent_id: mockPaymentIntentId
          })
        );

        await Promise.all(orderPromises);
        enqueueSnackbar('Order placed successfully!', { variant: 'success' });
      }

      clearCart();
      
      if (activationItems.length > 0 && artworkItems.length === 0) {
        navigate('/artist-dashboard');
      } else {
        navigate('/order-success');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      enqueueSnackbar(error.message || 'Failed to process payment. Please try again.', { variant: 'error' });
    } finally {
      setLoading(false);
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
          <TextField
            required
            fullWidth
            label="First Name"
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Last Name"
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName}
          />
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
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            value={formData.phone}
            onChange={handleInputChange('phone')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Address"
            value={formData.address}
            onChange={handleInputChange('address')}
            error={!!errors.address}
            helperText={errors.address}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="City"
            value={formData.city}
            onChange={handleInputChange('city')}
            error={!!errors.city}
            helperText={errors.city}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="State"
            value={formData.state}
            onChange={handleInputChange('state')}
            error={!!errors.state}
            helperText={errors.state}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="ZIP Code"
            value={formData.zipCode}
            onChange={handleInputChange('zipCode')}
            error={!!errors.zipCode}
            helperText={errors.zipCode}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Country</InputLabel>
            <Select
              value={formData.country}
              label="Country"
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            >
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

  const renderPaymentForm = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          required
          fullWidth
          label="Card Number"
          placeholder="1234 5678 9012 3456"
          value={formData.cardNumber}
          onChange={handleInputChange('cardNumber')}
          error={!!errors.cardNumber}
          helperText={errors.cardNumber}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Expiry Date"
          placeholder="MM/YY"
          value={formData.expiryDate}
          onChange={handleInputChange('expiryDate')}
          error={!!errors.expiryDate}
          helperText={errors.expiryDate}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="CVV"
          placeholder="123"
          value={formData.cvv}
          onChange={handleInputChange('cvv')}
          error={!!errors.cvv}
          helperText={errors.cvv}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          required
          fullWidth
          label="Cardholder Name"
          value={formData.cardName}
          onChange={handleInputChange('cardName')}
          error={!!errors.cardName}
          helperText={errors.cardName}
        />
      </Grid>
    </Grid>
  );

  const renderOrderSummary = () => {
    const activationItems = cartItems.filter(item => item.type === 'activation');
    const artworkItems = cartItems.filter(item => item.type !== 'activation');
    const activationTotal = activationItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const artworkTotal = artworkItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    
    return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Order Summary
      </Typography>
      {activationItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Listing Activations
          </Typography>
          {activationItems.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {item.title}
              </Typography>
              <Typography variant="body2">
                ${((item.price || 0) * item.quantity).toFixed(2)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {artworkItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Artwork
          </Typography>
          {artworkItems.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {item.title} x {item.quantity}
              </Typography>
              <Typography variant="body2">
                ${((item.price || 0) * item.quantity).toFixed(2)}
              </Typography>
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
            <Typography variant="body2" color="success.main">FREE</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">Tax</Typography>
            <Typography variant="body2">${(artworkTotal * 0.08).toFixed(2)}</Typography>
          </Box>
        </>
      )}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Total</Typography>
        <Typography variant="h6" color="primary">
          ${(getTotalPrice() + (artworkTotal * 0.08)).toFixed(2)}
        </Typography>
      </Box>
    </Box>
    );
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          Checkout
        </Typography>

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
                </Box>
              )}

              {activeStep === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <CreditCardIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Payment Details</Typography>
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
                <Button
                  variant="contained"
                  onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : activeStep === steps.length - 1 ? 'Place Order' : 'Next'}
                </Button>
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
