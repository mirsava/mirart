import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  Search as SearchIcon,
  ChatBubbleOutline as ChatIcon,
  Handshake as HandshakeIcon,
  ShoppingCartOutlined as CartIcon,
  LocalShippingOutlined as ShippingIcon,
} from '@mui/icons-material';
import { useMarketplaceSettings } from '../../hooks/useMarketplaceSettings';

// Three steps that explain buying, matching whether online checkout is switched on.
const HowBuyingWorks: React.FC = () => {
  const { checkoutEnabled } = useMarketplaceSettings();
  const steps = checkoutEnabled
    ? [
        { icon: <SearchIcon />, title: 'Discover', text: 'Browse original work from independent artists and makers.' },
        { icon: <CartIcon />, title: 'Buy securely', text: 'Pay online. The artist is paid once your piece arrives.' },
        { icon: <ShippingIcon />, title: 'Receive it', text: 'Track your order until it is on your wall.' },
      ]
    : [
        { icon: <SearchIcon />, title: 'Discover', text: 'Browse original work from independent artists and makers.' },
        { icon: <ChatIcon />, title: 'Message the artist', text: 'Ask about the piece, sizing or commissions, straight from the listing.' },
        { icon: <HandshakeIcon />, title: 'Buy directly', text: 'Agree on payment and shipping with the artist, who keeps the full price.' },
      ];

  return (
    <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{ fontWeight: 600, color: 'text.primary', fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }, mb: 1, textAlign: 'center' }}
        >
          How Buying Works
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 5, textAlign: 'center' }}>
          Simple, personal, and straight from the studio.
        </Typography>
        <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 4, md: 5 } }}>
          {steps.map((step, index) => (
            <Box component="li" key={step.title} sx={{ textAlign: 'center', px: { md: 2 } }}>
              <Box
                sx={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 2,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '& svg': { fontSize: 30 },
                }}
              >
                {step.icon}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {index + 1}
                </Box>
              </Box>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>{step.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mx: 'auto', lineHeight: 1.6 }}>{step.text}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HowBuyingWorks;
