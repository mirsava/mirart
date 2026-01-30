import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
  Check as CheckIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService, { SubscriptionPlan } from '../services/api';

const ArtistSignup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, user, isAuthenticated } = useAuth();
  
  // Get pre-filled data from location state (if redirected from sign-in)
  const locationState = location.state as { message?: string; email?: string; username?: string } | null;
  
  // If user is already authenticated but redirected here, they need to complete profile
  const isCompletingProfile = isAuthenticated && locationState?.message;
  
  const [formData, setFormData] = useState({
    username: locationState?.username || '',
    firstName: '',
    lastName: '',
    email: locationState?.email || '',
    password: '',
    confirmPassword: '',
    businessName: '',
    phone: '',
    country: '',
    specialties: [] as string[],
    experience: '',
    website: '',
    agreeToTerms: false,
    selectedPlanId: null as number | null,
    billingPeriod: 'monthly' as 'monthly' | 'yearly',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  // Show message if redirected from sign-in
  const redirectMessage = locationState?.message;

  useEffect(() => {
    const fetchPlans = async () => {
      if (isCompletingProfile) {
        setLoadingPlans(false);
        return;
      }
      try {
        const plans = await apiService.getSubscriptionPlans();
        console.log('Fetched subscription plans:', plans);
        if (plans && Array.isArray(plans) && plans.length > 0) {
          const sortedPlans = plans
            .map(plan => ({
              ...plan,
              price_monthly: typeof plan.price_monthly === 'number' ? plan.price_monthly : parseFloat(plan.price_monthly as any) || 0,
              price_yearly: typeof plan.price_yearly === 'number' ? plan.price_yearly : parseFloat(plan.price_yearly as any) || 0,
              max_listings: typeof plan.max_listings === 'number' ? plan.max_listings : parseInt(plan.max_listings as any) || 0,
              display_order: typeof plan.display_order === 'number' ? plan.display_order : parseInt(plan.display_order as any) || 0,
            }))
            .sort((a, b) => a.display_order - b.display_order);
          setSubscriptionPlans(sortedPlans);
          if (!formData.selectedPlanId && sortedPlans.length > 0) {
            setFormData(prev => ({ ...prev, selectedPlanId: sortedPlans[0].id }));
          }
        } else {
          console.warn('No subscription plans returned from API');
          setSubscriptionPlans([]);
        }
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        setSubscriptionPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [isCompletingProfile]);

  const specialties = [
    'Painting',
    'Woodworking',
    'Other',
  ];

  const experienceLevels = [
    'Just starting out',
    '1-2 years',
    '3-5 years',
    '6-10 years',
    '10+ years',
    'Professional',
  ];

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
  };

  const handleSpecialtyChange = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!isCompletingProfile && !formData.selectedPlanId) {
      newErrors.selectedPlanId = 'Please select a subscription plan';
    }

    // Skip username and password validation if completing profile (already authenticated)
    if (!isCompletingProfile) {
      if (!formData.username.trim()) newErrors.username = 'Username is required';
      else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
      else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = 'Username can only contain letters, numbers, and underscores';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!isCompletingProfile) {
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    }
    if (!formData.businessName.trim()) newErrors.businessName = 'Business/Studio name is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (formData.specialties.length === 0) newErrors.specialties = 'Please select at least one specialty';
    if (!isCompletingProfile && !formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const attributes: Record<string, string> = {
        name: `${formData.firstName} ${formData.lastName}`,
        given_name: formData.firstName,
        family_name: formData.lastName,
        // Custom attributes need to be configured in Cognito User Pool first
        // For now, we'll only use standard attributes
        // Additional profile data can be stored in a separate database/API later
      };

      // Only add phone number if it's provided and properly formatted
      if (formData.phone && formData.phone.trim() !== '') {
        // Format phone number for Cognito (E.164 format)
        let formattedPhone = formData.phone.trim();
        if (!formattedPhone.startsWith('+')) {
          // Add +1 for US numbers if no country code provided
          formattedPhone = '+1' + formattedPhone.replace(/\D/g, '');
        }
        attributes.phone_number = formattedPhone;
      }

      // If user is already authenticated (redirected from sign-in), just save to database
      if (isCompletingProfile && user?.id) {
        // User is already logged in, just update/create their database record
        try {
          await apiService.createOrUpdateUser({
            cognito_username: user.id,
            email: user.email || formData.email || '',
            first_name: formData.firstName,
            last_name: formData.lastName,
            business_name: formData.businessName,
            phone: formData.phone || null,
            country: formData.country,
            website: formData.website || null,
            specialties: formData.specialties,
            experience_level: formData.experience,
          });
          // Redirect to dashboard after profile completion
          navigate('/artist-dashboard');
          return;
        } catch (dbError) {
          console.error('Error saving user data to database:', dbError);
          setErrors({ general: 'Failed to save profile. Please try again.' });
          return;
        }
      } else {
        // Normal signup flow - create Cognito account
        await signUp(formData.email, formData.password, attributes, formData.username);
        
        // Save user data to database (non-blocking)
        try {
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

          // Create subscription after user is created
          if (formData.selectedPlanId) {
            try {
              const mockPaymentIntentId = `mock_payment_${Date.now()}`;
              await apiService.createSubscription(
                formData.username,
                formData.selectedPlanId,
                formData.billingPeriod,
                mockPaymentIntentId
              );
            } catch (subError) {
              console.error('Error creating subscription:', subError);
              console.warn('User created but subscription failed. User can subscribe later.');
            }
          }
        } catch (dbError) {
          // Log error but don't fail signup - user data can be saved after email confirmation
          console.error('Error saving user data to database:', dbError);
          console.warn('User signed up in Cognito but database save failed. Data will need to be saved after email confirmation.');
        }
        
        setSignupSuccess(true);
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 8 }}>
      <Box 
        sx={{ 
          textAlign: 'center',
          position: 'relative',
          px: 3,
          py: 3,
          bgcolor: 'rgba(74, 58, 154, 0.04)',
          borderRadius: 1,
          mb: 4,
        }}
      >
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            color: 'primary.main',
            mb: 2,
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}
        >
          Join Our Artist Community
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            fontSize: '1.1rem', 
            lineHeight: 1.7,
            maxWidth: '800px',
            mx: 'auto',
          }}
        >
          Start selling your artwork to a global audience. Choose a subscription plan that fits your needs and start listing your work today. No activation fees, transparent pricing.
        </Typography>
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 3, sm: 4, md: 6 }, 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >

          {redirectMessage && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {redirectMessage}
            </Alert>
          )}


          {signupSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Account Created Successfully!
                </Typography>
                <Typography variant="body2">
                  Please check your email for a confirmation code to verify your account.
                </Typography>
              </Alert>
              <Button
                variant="contained"
                onClick={() => navigate('/confirm-signup', { 
                  state: { 
                    email: formData.email,
                    username: formData.username,
                    userData: {
                      email: formData.email,
                      first_name: formData.firstName,
                      last_name: formData.lastName,
                      business_name: formData.businessName,
                      phone: formData.phone || null,
                      country: formData.country,
                      website: formData.website || null,
                      specialties: formData.specialties,
                      experience_level: formData.experience,
                    },
                  } 
                })}
                sx={{ px: 4 }}
              >
                Verify Email
              </Button>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="text"
                  onClick={() => navigate('/artist-signin')}
                  sx={{ textTransform: 'none' }}
                >
                  Go to Sign In
                </Button>
              </Box>
            </Box>
          ) : (
            <form onSubmit={handleSubmit}>
              {errors.general && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {errors.general}
                </Alert>
              )}
              <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  required
                />
              </Grid>
              {!isCompletingProfile && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      error={!!errors.email}
                      helperText={errors.email}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={formData.username}
                      onChange={handleInputChange('username')}
                      error={!!errors.username}
                      helperText={errors.username || 'Choose a unique username (letters, numbers, and underscores only)'}
                      required
                      inputProps={{
                        pattern: '[a-zA-Z0-9_]+',
                        minLength: 3,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      error={!!errors.password}
                      helperText={errors.password}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword}
                      required
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business/Studio Name"
                  value={formData.businessName}
                  onChange={handleInputChange('businessName')}
                  error={!!errors.businessName}
                  helperText={errors.businessName}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number (optional)"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  placeholder="+1 (555) 123-4567"
                  helperText="Include country code (e.g., +1 for US)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={handleInputChange('country')}
                  error={!!errors.country}
                  helperText={errors.country}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Website (optional)"
                  value={formData.website}
                  onChange={handleInputChange('website')}
                  placeholder="https://yourwebsite.com"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Art Specialties *
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select all that apply to your work
                </Typography>
                <Grid container spacing={1}>
                  {specialties.map((specialty) => (
                    <Grid item xs={6} sm={4} md={3} key={specialty}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.specialties.includes(specialty)}
                            onChange={() => handleSpecialtyChange(specialty)}
                          />
                        }
                        label={specialty}
                      />
                    </Grid>
                  ))}
                </Grid>
                {errors.specialties && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {errors.specialties}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Experience Level</InputLabel>
                  <Select
                    value={formData.experience}
                    onChange={handleInputChange('experience')}
                    label="Experience Level"
                  >
                    {experienceLevels.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {!isCompletingProfile && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.agreeToTerms}
                        onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        I agree to the{' '}
                        <Button variant="text" size="small" sx={{ p: 0, minWidth: 'auto' }}>
                          Terms of Service
                        </Button>{' '}
                        and{' '}
                        <Button variant="text" size="small" sx={{ p: 0, minWidth: 'auto' }}>
                          Privacy Policy
                        </Button>
                      </Typography>
                    }
                  />
                  {errors.agreeToTerms && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {errors.agreeToTerms}
                    </Typography>
                  )}
                </Grid>
              )}
            </Grid>

            {/* Subscription Plans Section */}
            {!isCompletingProfile && (
              <Box 
                sx={{ 
                  mt: 4, 
                  mb: 4,
                  p: { xs: 3, sm: 4 },
                  borderRadius: 1,
                  bgcolor: 'rgba(74, 58, 154, 0.03)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      width: 4,
                      height: 32,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                    }}
                  />
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700,
                      color: 'primary.main',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Choose Your Subscription Plan
                  </Typography>
                </Box>
                {loadingPlans ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : subscriptionPlans.length === 0 ? (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="body1" gutterBottom>
                      No subscription plans available.
                    </Typography>
                    <Typography variant="body2">
                      Please ensure the database migration has been run and plans are configured in the admin dashboard.
                    </Typography>
                  </Alert>
                ) : (
                  <>
                    <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                        Billing Period
                      </Typography>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 0.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '50px',
                          display: 'inline-flex',
                          bgcolor: 'background.paper',
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 2,
                            bottom: 2,
                            left: formData.billingPeriod === 'monthly' ? 2 : '50%',
                            right: formData.billingPeriod === 'monthly' ? '50%' : 2,
                            bgcolor: 'primary.main',
                            borderRadius: '50px',
                            transition: 'all 0.3s ease',
                            zIndex: 0,
                          }}
                        />
                        <Button
                          onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'monthly' }))}
                          sx={{
                            position: 'relative',
                            zIndex: 1,
                            px: 4,
                            py: 1.5,
                            borderRadius: '50px',
                            textTransform: 'none',
                            color: formData.billingPeriod === 'monthly' ? 'white' : 'text.primary',
                            fontWeight: 600,
                            minWidth: 120,
                            transition: 'color 0.3s ease',
                            '&:hover': {
                              bgcolor: 'transparent',
                            },
                          }}
                        >
                          Monthly
                        </Button>
                        <Button
                          onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'yearly' }))}
                          sx={{
                            position: 'relative',
                            zIndex: 1,
                            px: 4,
                            py: 1.5,
                            borderRadius: '50px',
                            textTransform: 'none',
                            color: formData.billingPeriod === 'yearly' ? 'white' : 'text.primary',
                            fontWeight: 600,
                            minWidth: 120,
                            transition: 'color 0.3s ease',
                            '&:hover': {
                              bgcolor: 'transparent',
                            },
                          }}
                        >
                          Yearly
                        </Button>
                      </Paper>
                    </Box>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      {subscriptionPlans.map((plan, index) => {
                        const isPopular = index === 1;
                        const features = plan.features ? plan.features.split('\n').filter(f => f.trim()) : [];
                        const isSelected = formData.selectedPlanId === plan.id;
                        const priceMonthly = typeof plan.price_monthly === 'number' ? plan.price_monthly : parseFloat(plan.price_monthly as any) || 0;
                        const priceYearly = typeof plan.price_yearly === 'number' ? plan.price_yearly : parseFloat(plan.price_yearly as any) || 0;
                        const price = formData.billingPeriod === 'monthly' ? priceMonthly : priceYearly;
                        const savings = (priceMonthly * 12) - priceYearly;

                        return (
                          <Grid item xs={12} md={4} key={plan.id}>
                            <Paper
                              elevation={0}
                              sx={{
                                height: '100%',
                                cursor: 'pointer',
                                border: isSelected ? '2px solid' : '1px solid',
                                borderColor: isSelected ? 'primary.main' : 'divider',
                                bgcolor: isSelected ? 'rgba(74, 58, 154, 0.05)' : 'background.paper',
                                position: 'relative',
                                borderRadius: 1,
                                transition: 'border-color 0.2s',
                                overflow: 'hidden',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                },
                                ...(isPopular && {
                                  borderColor: 'secondary.main',
                                  borderWidth: '2px',
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    bgcolor: 'secondary.main',
                                  },
                                }),
                              }}
                              onClick={() => setFormData(prev => ({ ...prev, selectedPlanId: plan.id }))}
                            >
                              {isPopular && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 12,
                                    right: 12,
                                  }}
                                >
                                  <Chip
                                    icon={<StarIcon />}
                                    label="Popular"
                                    size="small"
                                    color="secondary"
                                    sx={{
                                      fontWeight: 600,
                                    }}
                                  />
                                </Box>
                              )}
                              <Box sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                                      {plan.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {plan.tier}
                                    </Typography>
                                  </Box>
                                  <Radio
                                    checked={isSelected}
                                    onChange={() => setFormData(prev => ({ ...prev, selectedPlanId: plan.id }))}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Box>
                                <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                    <Typography variant="h3" fontWeight={700} color="primary.main">
                                      ${(price || 0).toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      /{formData.billingPeriod === 'monthly' ? 'mo' : 'yr'}
                                    </Typography>
                                  </Box>
                                  {formData.billingPeriod === 'yearly' && savings > 0 && (
                                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
                                      Save ${(savings || 0).toFixed(2)} per year
                                    </Typography>
                                  )}
                                </Box>
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                                    Up to {plan.max_listings} active listings per month
                                  </Typography>
                                  {features.length > 0 && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                      {features.map((feature, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                          <CheckIcon sx={{ color: 'success.main', mt: 0.25, fontSize: 18, flexShrink: 0 }} />
                                          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{feature.trim()}</Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                    {errors.selectedPlanId && (
                      <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                        {errors.selectedPlanId}
                      </Typography>
                    )}
                    <Alert severity="info" sx={{ bgcolor: 'transparent', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>How it works:</strong> Choose a subscription plan that fits your needs. You can activate up to your plan's listing limit. You keep 100% of your sale price - no commission, no hidden fees.
                      </Typography>
                    </Alert>
                  </>
                )}
              </Box>
            )}

            <Box sx={{ textAlign: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ px: 6, py: 1.5 }}
              >
                {isLoading ? (isCompletingProfile ? 'Saving Profile...' : 'Creating Account...') : (isCompletingProfile ? 'Complete Profile' : 'Join as Artist')}
              </Button>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Already have an account?{' '}
                <Button 
                  variant="text" 
                  size="small" 
                  sx={{ p: 0, minWidth: 'auto' }}
                  onClick={() => navigate('/artist-signin')}
                >
                  Sign in here
                </Button>
              </Typography>
            </Box>
            </form>
          )}
        </Paper>
    </Box>
  );
};

export default ArtistSignup;
