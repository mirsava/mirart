import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { ConfirmationNumber as PassIcon, WorkspacePremium as PlanIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import apiService, { Listing, PromotionConfig } from '../services/api';

interface ActivateListingDialogProps {
  open: boolean;
  listing: Pick<Listing, 'id' | 'title'> | null;
  // Why activation was refused, as the server explained it.
  message?: string;
  onClose: () => void;
}

const formatPrice = (price: number) => `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;

// Shown when a listing cannot go live on the artist's plan: pay once for this listing, or subscribe.
const ActivateListingDialog: React.FC<ActivateListingDialogProps> = ({ open, listing, message, onClose }) => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [options, setOptions] = useState<PromotionConfig | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    apiService.getPromotionOptions()
      .then((result) => active && setOptions(result))
      .catch(() => active && setOptions(null));
    return () => {
      active = false;
    };
  }, [open]);

  if (!listing) return null;

  const payForListing = async () => {
    setPaying(true);
    try {
      const { url } = await apiService.createPromotionCheckout(listing.id, 'listing_pass');
      window.location.href = url;
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Failed to start payment', { variant: 'error' });
      setPaying(false);
    }
  };

  const passAvailable = Boolean(options?.listing_pass_enabled);

  return (
    <Dialog open={open} onClose={paying ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Activate listing
        <Typography variant="body2" color="text.secondary" noWrap>{listing.title}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {passAvailable && options && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <PassIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>Pay for just this listing</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {formatPrice(options.listing_pass_price)} keeps it live for {options.listing_pass_days} days. It doesn't use a plan slot, and you can extend it any time.
              </Typography>
              <Button
                variant="contained"
                onClick={payForListing}
                disabled={paying}
                startIcon={paying ? <CircularProgress size={16} color="inherit" /> : <PassIcon />}
                sx={{ textTransform: 'none' }}
              >
                Pay {formatPrice(options.listing_pass_price)} and activate
              </Button>
            </Paper>
          )}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <PlanIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600}>Subscribe or upgrade your plan</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Better value if you list several pieces. Plans cover multiple active listings for one monthly or yearly price.
            </Typography>
            <Button
              variant={passAvailable ? 'outlined' : 'contained'}
              disabled={paying}
              onClick={() => navigate('/subscription-plans', { state: { listingIdToActivate: listing.id } })}
              startIcon={<PlanIcon />}
              sx={{ textTransform: 'none' }}
            >
              See plans
            </Button>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={paying}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivateListingDialog;
