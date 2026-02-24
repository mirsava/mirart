import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Check as CheckIcon,
  Star as StarIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Support as SupportIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService, { SubscriptionPlan, UserSubscription } from '../services/api';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/PageHeader';
import SEO from '../components/SEO';

const SubscriptionPlans: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const locationState = location.state as { listingIdToActivate?: number } | null;
  const listingIdToActivate = locationState?.listingIdToActivate;
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<{ plan: SubscriptionPlan; billingPeriod: 'monthly' | 'yearly' } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchPlans();
        if (user?.id) {
          await fetchCurrentSubscription();
        }
      } catch (err: any) {
        console.error('Error loading subscription plans page:', err);
        setError(err.message || 'Failed to load subscription plans');
      }
    };
    loadData();
  }, [user?.id]);

  const fetchPlans = async (): Promise<void> => {
    try {
      setError(null);
      const data = await apiService.getSubscriptionPlans();
      console.log('Fetched subscription plans:', data);
      if (data && Array.isArray(data) && data.length > 0) {
        const formattedPlans = data
          .map(plan => ({
            ...plan,
            price_monthly: typeof plan.price_monthly === 'number' ? plan.price_monthly : parseFloat(String(plan.price_monthly)) || 0,
            price_yearly: typeof plan.price_yearly === 'number' ? plan.price_yearly : parseFloat(String(plan.price_yearly)) || 0,
            max_listings: typeof plan.max_listings === 'number' ? plan.max_listings : parseInt(String(plan.max_listings)) || 0,
            display_order: typeof plan.display_order === 'number' ? plan.display_order : parseInt(String(plan.display_order)) || 0,
          }))
          .sort((a, b) => a.display_order - b.display_order);
        setPlans(formattedPlans);
      } else {
        console.warn('No subscription plans returned from API');
        setPlans([]);
      }
    } catch (error: any) {
      console.error('Error fetching subscription plans:', error);
      const errorMessage = error.message || 'Failed to load subscription plans';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setPlans([]);
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

  const handleSubscribeClick = (plan: SubscriptionPlan, billingPeriod: 'monthly' | 'yearly'): void => {
    if (!user?.id) {
      enqueueSnackbar('Please sign in to subscribe', { variant: 'error' });
      navigate('/artist-signin');
      return;
    }
    setPaymentPlan({ plan, billingPeriod });
  };

  const handleStripeSubscribe = async (): Promise<void> => {
    if (!paymentPlan || !user?.id) return;
    if (listingIdToActivate) {
      sessionStorage.setItem('listingIdToActivate', String(listingIdToActivate));
    }
    const price = paymentPlan.billingPeriod === 'monthly'
      ? (typeof paymentPlan.plan.price_monthly === 'number' ? paymentPlan.plan.price_monthly : parseFloat(String(paymentPlan.plan.price_monthly)) || 0)
      : (typeof paymentPlan.plan.price_yearly === 'number' ? paymentPlan.plan.price_yearly : parseFloat(String(paymentPlan.plan.price_yearly)) || 0);
    try {
      const items = [{
        name: `${paymentPlan.plan.name} Plan (${paymentPlan.billingPeriod})`,
        price,
        quantity: 1,
      }];
      const result = await apiService.createStripeCheckoutSession(items, {
        metadata: {
          is_subscription: 'true',
          plan_id: String(paymentPlan.plan.id),
          billing_period: paymentPlan.billingPeriod,
          cognito_username: user.id,
          cancel_url: '/subscription-plans',
        },
      });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to start payment', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, py: 8 }}>
        <PageHeader
          title="Subscription Plans"
          subtitle="Choose the perfect plan for your art business"
          icon={<SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
          align="left"
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  const getPrice = (plan: SubscriptionPlan, period: 'monthly' | 'yearly'): number => {
    const monthly = typeof plan.price_monthly === 'number' ? plan.price_monthly : parseFloat(plan.price_monthly as any) || 0;
    const yearly = typeof plan.price_yearly === 'number' ? plan.price_yearly : parseFloat(plan.price_yearly as any) || 0;
    return period === 'monthly' ? monthly : yearly;
  };

  const getSavings = (plan: SubscriptionPlan): number => {
    const monthly = typeof plan.price_monthly === 'number' ? plan.price_monthly : parseFloat(plan.price_monthly as any) || 0;
    const yearly = typeof plan.price_yearly === 'number' ? plan.price_yearly : parseFloat(plan.price_yearly as any) || 0;
    const monthlyTotal = monthly * 12;
    return monthlyTotal - yearly;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <SEO
        title="Pricing - Artist Subscription Plans"
        description="ArtZyla subscription plans for artists. List your artwork with flexible pricing. Choose monthly or yearly plans to sell your paintings and handmade art."
        url="/subscription-plans"
      />
      <PageHeader
        title="Subscription Plans"
        subtitle="Choose the perfect plan for your art business"
        icon={<SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
        align="left"
      />
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 }, pb: 6 }}>
        {listingIdToActivate && (
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="body1">
              Subscribe to a plan to activate your listing. After payment, your listing will be activated automatically.
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            <Typography variant="body1" gutterBottom>
              {error}
            </Typography>
          </Alert>
        )}

        {currentSubscription && currentSubscription.status === 'active' && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'rgba(74, 58, 154, 0.04)',
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Current Plan: {currentSubscription.plan_name} ({currentSubscription.billing_period})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentSubscription.current_listings || 0} / {currentSubscription.max_listings >= 999999 ? 'Unlimited' : currentSubscription.max_listings} listings active
                {currentSubscription.end_date && ` • Access until: ${new Date(currentSubscription.end_date).toLocaleDateString()}`}
                {(currentSubscription.auto_renew === false || currentSubscription.auto_renew === 0) && (
                  <Chip label="Cancels at end of period" size="small" color="warning" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Manage or cancel your subscription from your{' '}
                <Button variant="text" size="small" onClick={() => navigate('/artist-dashboard', { state: { tab: 'subscription' } })} sx={{ p: 0, minWidth: 0 }}>
                  Artist Dashboard
                </Button>
                .
              </Typography>
            </Box>
          </Paper>
        )}

        {plans.length === 0 && !loading && !error && (
          <Alert severity="warning" sx={{ mb: 4 }}>
            <Typography variant="body1" gutterBottom>
              No subscription plans available.
            </Typography>
            <Typography variant="body2">
              Please ensure the database migration has been run and plans are configured in the admin dashboard.
            </Typography>
          </Alert>
        )}

        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
            Why Choose ArtZyla?
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <SecurityIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Secure Platform
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your artwork and transactions are protected with industry-standard security measures. Focus on creating while we handle the technical details.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Grow Your Business
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reach a global audience of art lovers. Our platform helps you showcase your work and connect with buyers worldwide.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <SupportIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Dedicated Support
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get help when you need it. Our support team is here to assist you with any questions about selling on ArtZyla.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 4, color: 'primary.main' }}>
          Choose Your Plan
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan, index) => {
            const isPopular = index === 1;
            const features = plan.features ? plan.features.split('\n').filter(f => f.trim()) : [];
            const isCurrentPlan = currentSubscription?.plan_id === plan.id && currentSubscription?.status === 'active';

            return (
              <Grid item xs={12} md={4} key={plan.id}>
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: '1px solid',
                    borderColor: isPopular ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    ...(isPopular && {
                      borderWidth: '2px',
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
                  <Box sx={{ flexGrow: 1, p: 3, pt: isPopular ? 6 : 3 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {plan.name}
                    </Typography>
                    {plan.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {plan.description}
                      </Typography>
                    )}
                    <Box sx={{ my: 3 }}>
                      <Typography variant="h3" fontWeight={700} color="primary.main">
                        ${(getPrice(plan, 'monthly') || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        per month
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        or ${(getPrice(plan, 'yearly') || 0).toFixed(2)}/year
                        {getSavings(plan) > 0 && (
                          <Chip
                            label={`Save $${(getSavings(plan) || 0).toFixed(2)}`}
                            size="small"
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                      {plan.max_listings >= 999999 ? 'Unlimited' : `Up to ${plan.max_listings}`} active listings
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
                          onClick={() => handleSubscribeClick(plan, 'monthly')}
                          disabled={subscribing === plan.id}
                          sx={{ flex: 1 }}
                        >
                          {subscribing === plan.id ? <CircularProgress size={24} /> : 'Monthly'}
                        </Button>
                        <Button
                          variant={isPopular ? 'contained' : 'outlined'}
                          fullWidth
                          onClick={() => handleSubscribeClick(plan, 'yearly')}
                          disabled={subscribing === plan.id}
                          sx={{ flex: 1 }}
                        >
                          {subscribing === plan.id ? <CircularProgress size={24} /> : 'Yearly'}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ mt: 8 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 4, color: 'primary.main' }}>
            Frequently Asked Questions
          </Typography>
          <Grid container spacing={2}>
            {[
              {
                question: 'How does the subscription work?',
                answer: 'Choose a plan that fits your needs based on how many active listings you want. You can upgrade or downgrade your plan at any time. Your subscription renews automatically based on your billing period (monthly or yearly).',
              },
              {
                question: 'What happens if I exceed my listing limit?',
                answer: 'If you reach your plan\'s listing limit, you can either upgrade to a higher tier or wait until one of your listings expires or is sold. You can always upgrade your plan to accommodate more listings.',
              },
              {
                question: 'Can I cancel my subscription?',
                answer: 'Yes, you can cancel your subscription at any time. Your active listings will remain active until they expire or are sold. You won\'t be able to create new listings after cancellation, but you can resubscribe anytime.',
              },
              {
                question: 'What payment methods do you accept?',
                answer: 'We accept all major credit cards and debit cards. Payments are processed securely through our payment partners. Your billing information is encrypted and stored securely.',
              },
              {
                question: 'Do you offer refunds?',
                answer: 'We offer a 30-day money-back guarantee for new subscriptions. If you\'re not satisfied with your plan, contact our support team within 30 days of your initial subscription for a full refund.',
              },
              {
                question: 'Can I change my billing period?',
                answer: 'Yes, you can switch between monthly and yearly billing when you renew your subscription. Yearly plans offer significant savings compared to monthly billing.',
              },
            ].map((faq, index) => (
              <Grid item xs={12} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    sx={{
                      p: 3,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: expandedFaq === index ? 'action.hover' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Typography variant="h6" fontWeight={600}>
                      {faq.question}
                    </Typography>
                    {expandedFaq === index ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>
                  {expandedFaq === index && (
                    <Box sx={{ px: 3, pb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        {faq.answer}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: 6, p: 4, bgcolor: 'rgba(74, 58, 154, 0.04)', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Ready to Start Selling?
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Join thousands of artists who are already selling their work on ArtZyla. Choose a plan that works for you and start listing your artwork today.
          </Typography>
          {!isAuthenticated && (
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/artist-signup')}
              sx={{ mt: 2 }}
            >
              Sign Up Now
            </Button>
          )}
        </Box>
      </Box>

      <Dialog open={!!paymentPlan} onClose={() => setPaymentPlan(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Complete Payment - {paymentPlan?.plan.name} ({paymentPlan?.billingPeriod})
        </DialogTitle>
        <DialogContent>
          {paymentPlan && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                ${(paymentPlan.billingPeriod === 'monthly'
                  ? (typeof paymentPlan.plan.price_monthly === 'number' ? paymentPlan.plan.price_monthly : parseFloat(String(paymentPlan.plan.price_monthly)) || 0)
                  : (typeof paymentPlan.plan.price_yearly === 'number' ? paymentPlan.plan.price_yearly : parseFloat(String(paymentPlan.plan.price_yearly)) || 0)
                ).toFixed(2)} / {paymentPlan.billingPeriod === 'monthly' ? 'month' : 'year'}
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleStripeSubscribe}
                sx={{ py: 1.5 }}
              >
                Pay with Card (Stripe)
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentPlan(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionPlans;
