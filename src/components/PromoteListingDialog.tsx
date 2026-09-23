import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { Star as StarIcon, ArrowUpward as ArrowUpwardIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { FeatureCredits, Listing, ListingPromotionState, PromotionConfig } from '../services/api';

interface PromoteListingDialogProps {
  open: boolean;
  listing: Listing | null;
  onClose: () => void;
  // Called when a promotion takes effect without leaving the page (an included plan feature).
  onPromoted?: (state: ListingPromotionState) => void;
}

const CREDIT = 'credit';

const formatPrice = (price: number) => `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
const formatDate = (value: string | Date) =>
  new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const isListingFeatured = (listing: Pick<Listing, 'featured_until'>) =>
  Boolean(listing.featured_until && new Date(listing.featured_until) > new Date());

const PromoteListingDialog: React.FC<PromoteListingDialogProps> = ({ open, listing, onClose, onPromoted }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [options, setOptions] = useState<(PromotionConfig & { credits: FeatureCredits | null }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [featureChoice, setFeatureChoice] = useState<string>('');
  const [submitting, setSubmitting] = useState<'feature' | 'bump' | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    apiService.getPromotionOptions()
      .then((result) => {
        if (!active) return;
        setOptions(result);
        const hasCredit = (result.credits?.remaining ?? 0) > 0;
        setFeatureChoice(hasCredit ? CREDIT : String(result.feature_options[0]?.days ?? ''));
      })
      .catch((err) => active && enqueueSnackbar(err.message || 'Could not load promotion options', { variant: 'error' }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, enqueueSnackbar]);

  if (!listing) return null;

  const featured = isListingFeatured(listing);
  const nextBump = options && listing.bumped_at && options.bump_cooldown_hours > 0
    ? new Date(new Date(listing.bumped_at).getTime() + options.bump_cooldown_hours * 3600 * 1000)
    : null;
  const bumpBlocked = Boolean(nextBump && nextBump > new Date());
  const credits = options?.credits;
  const selectedOption = options?.feature_options.find((o) => String(o.days) === featureChoice);

  const startCheckout = async (type: 'feature' | 'bump', days?: number) => {
    setSubmitting(type);
    try {
      const { url } = await apiService.createPromotionCheckout(listing.id, type, days);
      window.location.href = url;
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to start payment', { variant: 'error' });
      setSubmitting(null);
    }
  };

  const handleFeature = async () => {
    if (featureChoice !== CREDIT) {
      if (selectedOption) await startCheckout('feature', selectedOption.days);
      return;
    }
    setSubmitting('feature');
    try {
      const result = await apiService.useFeatureCredit(listing.id);
      enqueueSnackbar(`Listing featured until ${formatDate(result.listing.featured_until as string)}`, { variant: 'success' });
      onPromoted?.(result.listing);
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to feature listing', { variant: 'error' });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Promote listing
        <Typography variant="body2" color="text.secondary" noWrap>{listing.title}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading || !options ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : !options.enabled ? (
          <Alert severity="info">Listing promotions are not available right now.</Alert>
        ) : listing.status !== 'active' ? (
          <Alert severity="info">Activate this listing before promoting it.</Alert>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <StarIcon color="warning" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>Feature</Typography>
              {featured && (
                <Chip size="small" color="warning" label={`Featured until ${formatDate(listing.featured_until as string)}`} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Show this listing above the others in the Gallery and in the homepage spotlight.
              {featured && ' Buying more time adds it to the end of the current period.'}
            </Typography>
            <RadioGroup value={featureChoice} onChange={(e) => setFeatureChoice(e.target.value)}>
              {credits && credits.remaining > 0 && (
                <FormControlLabel
                  value={CREDIT}
                  control={<Radio size="small" />}
                  label={`${credits.days} days: free with your plan (${credits.remaining} of ${credits.allowance} left this month)`}
                />
              )}
              {options.feature_options.map((option) => (
                <FormControlLabel
                  key={option.days}
                  value={String(option.days)}
                  control={<Radio size="small" />}
                  label={`${option.days} days: ${formatPrice(option.price)}`}
                />
              ))}
            </RadioGroup>
            <Button
              variant="contained"
              color="warning"
              startIcon={submitting === 'feature' ? <CircularProgress size={16} color="inherit" /> : <StarIcon />}
              disabled={Boolean(submitting) || (!selectedOption && featureChoice !== CREDIT)}
              onClick={handleFeature}
              sx={{ mt: 1, textTransform: 'none' }}
            >
              {featureChoice === CREDIT
                ? 'Use included feature'
                : `Feature for ${selectedOption ? formatPrice(selectedOption.price) : ''}`}
            </Button>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ArrowUpwardIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>Bump to the top</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Move this listing back to the top of "Newest", as if you had just posted it.
              {options.bump_cooldown_hours > 0 && ` You can bump a listing once every ${options.bump_cooldown_hours} hours.`}
            </Typography>
            <Button
              variant="outlined"
              startIcon={submitting === 'bump' ? <CircularProgress size={16} color="inherit" /> : <ArrowUpwardIcon />}
              disabled={Boolean(submitting) || bumpBlocked}
              onClick={() => startCheckout('bump')}
              sx={{ textTransform: 'none' }}
            >
              {bumpBlocked && nextBump ? `Available again ${formatDate(nextBump)}` : `Bump for ${formatPrice(options.bump_price)}`}
            </Button>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={Boolean(submitting)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromoteListingDialog;
