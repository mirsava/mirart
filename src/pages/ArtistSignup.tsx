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
  FormHelperText,
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
import { useSnackbar } from 'notistack';
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
    paymentOption: 'payLater' as 'payNow' | 'payLater',
    selectedPlanId: null as number | null,
    billingPeriod: 'monthly' as 'monthly' | 'yearly',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paymentStep, setPaymentStep] = useState(false);
  
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
    
    // Subscription is optional at signup - artists pay when they activate listings

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
    if (!isCompletingProfile && formData.paymentOption === 'payNow' && !formData.selectedPlanId) {
      newErrors.selectedPlanId = 'Please select a subscription plan';
    }

    setErrors(newErrors);
    return { valid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validation = validateForm();
    if (!validation.valid) {
      const firstErrorId = Object.keys(validation.errors).find(k => k !== 'general' && validation.errors[k]);
      if (firstErrorId) {
        setTimeout(() => {
          document.getElementById(`field-${firstErrorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      return;
    }

    if (isCompletingProfile && user?.id) {
      setIsLoading(true);
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
        navigate('/artist-dashboard');
      } catch (dbError) {
        console.error('Error saving user data to database:', dbError);
        setErrors({ general: 'Failed to save profile. Please try again.' });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // If Pay Now with plan selected, go to payment; otherwise sign up directly (Pay Later)
    if (formData.paymentOption === 'payNow' && formData.selectedPlanId) {
      setPaymentStep(true);
      return;
    }

    // Direct signup without subscription - artists can list arts as draft and subscribe when activating
    setIsLoading(true);
    try {
      const attributes: Record<string, string> = {
        name: `${formData.firstName} ${formData.lastName}`,
        given_name: formData.firstName,
        family_name: formData.lastName,
      };
      if (formData.phone?.trim()) {
        let formattedPhone = formData.phone.trim();
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+1' + formattedPhone.replace(/\D/g, '');
        }
        attributes.phone_number = formattedPhone;
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
      setSignupSuccess(true);
      enqueueSnackbar('Account created! Please check your email to verify your account.', { variant: 'success' });
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrors({ general: err.message || 'Failed to create account. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripePayNow = async (): Promise<void> => {
    if (!formData.selectedPlanId) {
      setErrors({ ...errors, selectedPlanId: 'Please select a plan' });
      return;
    }
    const selectedPlan = subscriptionPlans.find(p => p.id === formData.selectedPlanId);
    if (!selectedPlan) return;
    const price = formData.billingPeriod === 'monthly'
      ? (typeof selectedPlan.price_monthly === 'number' ? selectedPlan.price_monthly : parseFloat(selectedPlan.price_monthly as any) || 0)
      : (typeof selectedPlan.price_yearly === 'number' ? selectedPlan.price_yearly : parseFloat(selectedPlan.price_yearly as any) || 0);
    setIsLoading(true);
    try {
      sessionStorage.setItem('signupFormData', JSON.stringify({
        ...formData,
        password: formData.password,
      }));
      const items = [{ name: `${selectedPlan.name} Plan (${formData.billingPeriod})`, price, quantity: 1 }];
      const result = await apiService.createStripeCheckoutSession(items, {
        metadata: {
          is_subscription: 'true',
          plan_id: String(formData.selectedPlanId),
          billing_period: formData.billingPeriod,
          cognito_username: formData.username,
          cancel_url: '/artist-signup',
        },
      });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to start payment', { variant: 'error' });
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        background: 'radial-gradient(1200px 500px at 10% 0%, rgba(74, 58, 154, 0.12), transparent 68%), radial-gradient(900px 520px at 95% 12%, rgba(74, 58, 154, 0.1), transparent 72%), linear-gradient(180deg, #faf9ff 0%, #f5f3ff 100%)',
        minHeight: '100vh',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1180, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 6, md: 8 } }}>
      <Box 
        sx={{ 
          textAlign: 'left',
          position: 'relative',
          px: { xs: 3, md: 5 },
          py: { xs: 3.5, md: 4.5 },
          background: 'linear-gradient(145deg, rgba(74, 58, 154, 0.12) 0%, rgba(74, 58, 154, 0.06) 40%, rgba(74, 58, 154, 0.02) 100%)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'rgba(74, 58, 154, 0.18)',
          mb: 4.5,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74, 58, 154, 0.22), rgba(74, 58, 154, 0.02) 68%)',
            pointerEvents: 'none',
          }}
        />
        <Chip
          icon={<StarIcon />}
          label="For Independent Artists"
          color="primary"
          sx={{ mb: 2, fontWeight: 600 }}
        />
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            color: 'text.primary',
            mb: 1.5,
            fontSize: { xs: '1.9rem', sm: '2.4rem', md: '2.9rem' },
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            maxWidth: 800,
          }}
        >
          Build your artist storefront and start selling with confidence
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            fontSize: { xs: '1rem', md: '1.08rem' }, 
            lineHeight: 1.75,
            maxWidth: 860,
            mb: 2.5,
          }}
        >
          Join ArtZyla to showcase original work, connect with buyers, and manage listings in one place.
          You can start now and choose your subscription timing based on your launch plan.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip icon={<CheckIcon />} label="No activation fees" variant="outlined" />
          <Chip icon={<CheckIcon />} label="Transparent plans" variant="outlined" />
          <Chip icon={<CheckIcon />} label="Direct buyer connection" variant="outlined" />
        </Box>
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2.5, sm: 4, md: 5 }, 
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'rgba(74, 58, 154, 0.2)',
          boxShadow: '0 14px 40px rgba(31, 24, 71, 0.08)',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          '& .MuiTextField-root .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
          '& .MuiFormControl-root .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
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
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
              {errors.general && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrors(prev => ({ ...prev, general: '' }))}>
                  {errors.general}
                </Alert>
              )}
              {Object.entries(errors).filter(([k, msg]) => k !== 'general' && msg).length > 0 && (
                <Alert severity="error" sx={{ mb: 3 }} icon={false}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Please fix the following errors:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {Object.entries(errors)
                      .filter(([k, msg]) => k !== 'general' && msg)
                      .map(([key, msg]) => (
                        <li key={key}>
                          <Typography variant="body2">{msg}</Typography>
                        </li>
                      ))}
                  </Box>
                </Alert>
              )}
              <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} id="field-firstName">
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
              <Grid item xs={12} sm={6} id="field-lastName">
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
                  <Grid item xs={12} id="field-email">
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
                  <Grid item xs={12} id="field-username">
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
                  <Grid item xs={12} sm={6} id="field-password">
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
                  <Grid item xs={12} sm={6} id="field-confirmPassword">
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
              <Grid item xs={12} id="field-businessName">
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
              <Grid item xs={12} sm={6} id="field-country">
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
              <Grid item xs={12} id="field-specialties">
                <FormControl error={!!errors.specialties} fullWidth>
                  <Typography variant="h6" gutterBottom>
                    Art Specialties *
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select all that apply to your work
                  </Typography>
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={1}>
                      {specialties.map((specialty) => (
                        <Grid item xs={6} sm={4} md={3} key={specialty}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.specialties.includes(specialty)}
                                onChange={() => handleSpecialtyChange(specialty)}
                                color={errors.specialties ? 'error' : 'primary'}
                              />
                            }
                            label={specialty}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  <FormHelperText error={!!errors.specialties} sx={{ mt: 1 }}>
                    {errors.specialties}
                  </FormHelperText>
                </FormControl>
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
                <Grid item xs={12} id="field-agreeToTerms">
                  <Divider sx={{ my: 2 }} />
                  <FormControl error={!!errors.agreeToTerms} component="fieldset" fullWidth>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.agreeToTerms}
                          onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                          color={errors.agreeToTerms ? 'error' : 'primary'}
                        />
                      }
                      label={
                        <Typography variant="body2" color={errors.agreeToTerms ? 'error' : 'inherit'}>
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
                      <FormHelperText error>{errors.agreeToTerms}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
            </Grid>

            {/* Payment Option: Pay Now vs Pay Later */}
            {!isCompletingProfile && (
              <Box 
                sx={{ 
                  mt: 4, 
                  mb: 4,
                  p: { xs: 2.5, sm: 3.5 },
                  borderRadius: 2.5,
                  bgcolor: 'rgba(74, 58, 154, 0.04)',
                  border: '1px solid',
                  borderColor: 'rgba(74, 58, 154, 0.16)',
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
                    When would you like to subscribe?
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Paper
                    elevation={0}
                    onClick={() => setFormData(prev => ({ ...prev, paymentOption: 'payLater' }))}
                    sx={{
                      p: 2,
                      flex: 1,
                      minWidth: 200,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: formData.paymentOption === 'payLater' ? 'primary.main' : 'divider',
                      bgcolor: formData.paymentOption === 'payLater' ? 'rgba(74, 58, 154, 0.09)' : 'background.paper',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(74, 58, 154, 0.05)', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Pay Later
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sign up now for free. Subscribe when you activate your first listing. Listings start as drafts until you have an active subscription.
                    </Typography>
                  </Paper>
                  <Paper
                    elevation={0}
                    onClick={() => setFormData(prev => ({ ...prev, paymentOption: 'payNow' }))}
                    sx={{
                      p: 2,
                      flex: 1,
                      minWidth: 200,
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: formData.paymentOption === 'payNow' ? 'primary.main' : 'divider',
                      bgcolor: formData.paymentOption === 'payNow' ? 'rgba(74, 58, 154, 0.09)' : 'background.paper',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(74, 58, 154, 0.05)', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Pay Now
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Subscribe during signup and start activating listings immediately after verification.
                    </Typography>
                  </Paper>
                </Box>
                {formData.paymentOption === 'payNow' && (
                  <Box id="field-selectedPlanId">
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Choose a plan below. You'll complete payment after filling in your details.
                    </Typography>
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
                    <Box sx={{ mb: 3 }}>
                    <Grid container spacing={3}>
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
                                borderRadius: 2,
                                transition: 'all 0.2s ease',
                                overflow: 'hidden',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  transform: 'translateY(-2px)',
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
                                      {plan.description || plan.tier}
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
                                    {plan.max_listings >= 999999 ? 'Unlimited' : `Up to ${plan.max_listings}`} active listings per month
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
                    </Box>
                    {errors.selectedPlanId && (
                      <FormHelperText error sx={{ mb: 2, fontSize: '0.875rem' }}>
                        {errors.selectedPlanId}
                      </FormHelperText>
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
              </Box>
            )}

            {paymentStep ? (
              <Box sx={{ mt: 4, p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Complete Payment
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Please complete your payment to create your account. Your subscription will be activated immediately after payment.
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleStripePayNow}
                  disabled={isLoading}
                  sx={{ py: 1.5, mb: 2 }}
                >
                  {isLoading ? 'Redirecting...' : 'Pay with Card (Stripe)'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setPaymentStep(false)}
                  sx={{ mt: 2 }}
                >
                  Back
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{ px: 6, py: 1.6, borderRadius: 2, fontWeight: 700, boxShadow: '0 10px 28px rgba(74, 58, 154, 0.35)' }}
                >
                  {isLoading
                    ? (isCompletingProfile ? 'Saving Profile...' : (formData.paymentOption === 'payNow' && formData.selectedPlanId ? 'Loading...' : 'Creating Account...'))
                    : (isCompletingProfile ? 'Complete Profile' : (formData.paymentOption === 'payNow' && formData.selectedPlanId ? 'Continue to Payment' : 'Create Account'))
                  }
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
            )}
            </form>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ArtistSignup;
