import React from 'react';
import { Alert, AlertProps, Typography } from '@mui/material';

interface MarketplaceNoticeProps {
  variant?: 'buyer' | 'seller';
  sx?: AlertProps['sx'];
}

// Shown wherever ArtZyla is not processing payments or shipping (online checkout switched off).
const MarketplaceNotice: React.FC<MarketplaceNoticeProps> = ({ variant = 'buyer', sx }) => (
  <Alert severity="info" icon={false} sx={{ borderRadius: 1, ...sx }}>
    <Typography variant="body2">
      {variant === 'buyer'
        ? 'ArtZyla connects buyers and sellers. Payment, shipping and returns are arranged directly between you and the seller. ArtZyla does not process payments or ship items, and is not a party to any sale.'
        : 'Buyers will contact you to arrange payment, shipping and returns directly. Describe your terms in the fields below. ArtZyla does not process payments or ship items, and is not a party to any sale.'}
    </Typography>
  </Alert>
);

export default MarketplaceNotice;
