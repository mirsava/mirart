import React, { useState } from 'react';
import {
  Box,
  Container,
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
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

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
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  // Show message if redirected from sign-in
  const redirectMessage = locationState?.message;

  const specialties = [
    'Painting',
    'Woodworking',
    'Sculpture',
    'Photography',
    'Digital Art',
    'Ceramics',
    'Textiles',
    'Jewelry',
    'Mixed Media',
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
    <Box sx={{ py: 8, minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 6, borderRadius: 3, boxShadow: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Join Our Artist Community
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Start selling your artwork to a global audience. It's free to join!
            </Typography>
          </Box>

          {redirectMessage && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {redirectMessage}
            </Alert>
          )}

          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6">Personal Information</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Tell us about yourself and your artistic background.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BusinessIcon color="primary" />
                  <Typography variant="h6">Business Details</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Set up your artist profile and studio information.
                </Typography>
              </Grid>
            </Grid>
          </Box>

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

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Platform Fee:</strong> 15% commission on sales (you keep 85%)
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
                  <strong>Note:</strong> Your profile information (business name, specialties, etc.) will be saved to your account after verification.
                </Typography>
              </Alert>
              
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
      </Container>
    </Box>
  );
};

export default ArtistSignup;
