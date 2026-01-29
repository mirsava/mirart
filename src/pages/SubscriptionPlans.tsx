import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Check as CheckIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiService, { SubscriptionPlan, UserSubscription } from '../services/api';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/PageHeader';

const SubscriptionPlans: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number | null>(null);

  useEffect(() => {
    fetchPlans();
    if (user?.id) {
      fetchCurrentSubscription();
    }
  }, [user?.id]);

  const fetchPlans = async (): Promise<void> => {
    try {
      const data = await apiService.getSubscriptionPlans();
      setPlans(data.sort((a, b) => a.display_order - b.display_order));
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to load subscription plans', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async (): Promise<void> => {
    if (!user?.id) return;
    try {
      const response = await apiService.getUserSubscription(user.id);
      setCurrentSubscription(response.subscription);
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan, billingPeriod: 'monthly' | 'yearly'): Promise<void> => {
    if (!user?.id) {
      enqueueSnackbar('Please sign in to subscribe', { variant: 'error' });
      navigate('/artist-signin');
      return;
    }

    setSubscribing(plan.id);
    try {
      const mockPaymentIntentId = `mock_payment_${Date.now()}`;
      await apiService.createSubscription(user.id, plan.id, billingPeriod, mockPaymentIntentId);
      enqueueSnackbar('Subscription activated successfully!', { variant: 'success' });
      await fetchCurrentSubscription();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to subscribe', { variant: 'error' });
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const getPrice = (plan: SubscriptionPlan, period: 'monthly' | 'yearly'): number => {
    return period === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const getSavings = (plan: SubscriptionPlan): number => {
    const monthlyTotal = plan.price_monthly * 12;
    return monthlyTotal - plan.price_yearly;
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <PageHeader
        title="Subscription Plans"
        subtitle="Choose the perfect plan for your art business"
        align="center"
      />
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: 6 }}>
        {currentSubscription && (
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="body1" fontWeight={600}>
              Current Plan: {currentSubscription.plan_name} ({currentSubscription.billing_period})
            </Typography>
            <Typography variant="body2">
              {currentSubscription.current_listings || 0} / {currentSubscription.max_listings} listings active
              {currentSubscription.end_date && ` • Expires: ${new Date(currentSubscription.end_date).toLocaleDateString()}`}
            </Typography>
          </Alert>
        )}

        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan, index) => {
            const isPopular = index === 1;
            const features = plan.features ? plan.features.split('\n').filter(f => f.trim()) : [];
            const isCurrentPlan = currentSubscription?.plan_id === plan.id && currentSubscription?.status === 'active';

            return (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    ...(isPopular && {
                      border: '2px solid',
                      borderColor: 'primary.main',
                      transform: 'scale(1.05)',
                    }),
                  }}
                >
                  {isPopular && (
                    <Chip
                      icon={<StarIcon />}
                      label="Most Popular"
                      color="primary"
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        fontWeight: 600,
                      }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1, pt: isPopular ? 6 : 3 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {plan.name}
                    </Typography>
                    <Box sx={{ my: 3 }}>
                      <Typography variant="h3" fontWeight={700} color="primary.main">
                        ${plan.price_monthly.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        per month
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        or ${plan.price_yearly.toFixed(2)}/year
                        {getSavings(plan) > 0 && (
                          <Chip
                            label={`Save $${getSavings(plan).toFixed(2)}`}
                            size="small"
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      Up to {plan.max_listings} active listings
                    </Typography>
                    {features.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        {features.map((feature, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                            <CheckIcon sx={{ color: 'success.main', mr: 1, mt: 0.5 }} />
                            <Typography variant="body2">{feature.trim()}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    {isCurrentPlan ? (
                      <Button
                        variant="outlined"
                        fullWidth
                        disabled
                        sx={{ mt: 'auto' }}
                      >
                        Current Plan
                      </Button>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                        <Button
                          variant={isPopular ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => handleSubscribe(plan, 'monthly')}
                          disabled={subscribing === plan.id}
                          sx={{ flex: 1 }}
                        >
                          {subscribing === plan.id ? <CircularProgress size={24} /> : 'Monthly'}
                        </Button>
                        <Button
                          variant={isPopular ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => handleSubscribe(plan, 'yearly')}
                          disabled={subscribing === plan.id}
                          sx={{ flex: 1 }}
                        >
                          {subscribing === plan.id ? <CircularProgress size={24} /> : 'Yearly'}
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};

export default SubscriptionPlans;
