import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Link,
  IconButton,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  Pinterest as PinterestIcon,
  YouTube as YouTubeIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useMarketplaceSettings } from '../hooks/useMarketplaceSettings';
import { useBillingStatus } from '../hooks/useBillingStatus';
import { useSocialLinks } from '../hooks/useSocialLinks';
import NewsletterSignup from './NewsletterSignup';
import logoLight from '../assets/images/logo.svg';
import logoDark from '../assets/images/logo-dark.svg';

const Footer: React.FC = () => {
  const { isDarkMode } = useCustomTheme();
  const { checkoutEnabled, loaded } = useMarketplaceSettings();
  const billing = useBillingStatus();
  const social = useSocialLinks();
  const [emailCopied, setEmailCopied] = React.useState(false);

  // mailto: does nothing on computers without a mail app, so also copy the address.
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(social?.email || '');
      setEmailCopied(true);
    } catch {}
  };
  const socialItems = social
    ? [
        { label: 'Facebook', href: social.facebook, icon: <FacebookIcon /> },
        { label: 'Instagram', href: social.instagram, icon: <InstagramIcon /> },
        { label: 'X (Twitter)', href: social.twitter, icon: <TwitterIcon /> },
        { label: 'Pinterest', href: social.pinterest, icon: <PinterestIcon /> },
        { label: 'YouTube', href: social.youtube, icon: <YouTubeIcon /> },
        { label: 'Email', href: social.email ? `mailto:${social.email}` : '', icon: <EmailIcon /> },
      ].filter((item) => item.href)
    : [];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'rgba(181, 87, 58, 0.02)',
        py: 6,
        mt: 'auto',
        width: '100%',
        borderTop: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, primary.main 50%, transparent 100%)',
          opacity: 0.3,
        },
      }}
    >
      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 4, md: 3 }} justifyContent="space-between">
          <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex', flexDirection: 'column', maxWidth: { md: '400px' } }}>
            <Link href="/" aria-label="ArtZyla home" sx={{ display: 'inline-block', alignSelf: 'flex-start', mb: 2 }}>
              <Box
                component="img"
                src={isDarkMode ? logoDark : logoLight}
                alt="ArtZyla"
                sx={{ height: 34, width: 'auto', display: 'block' }}
              />
            </Link>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              A marketplace connecting talented artists with art lovers worldwide. Discover 
              unique paintings, woodworking, and handmade art from independent creators.
            </Typography>
            <NewsletterSignup />
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Link href="/" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Home
              </Link>
              <Link href="/gallery" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Gallery
              </Link>
              <Link href="/subscription-plans" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Pricing
              </Link>
              <Link href="/about" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                About
              </Link>
              <Link href="/contact" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Contact
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              For Artists
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Link href="/signup" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Sell Your Art
              </Link>
              <Link href="/about" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                How It Works
              </Link>
              {billing?.billing_enabled && (
              <Link href="/subscription-plans" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Subscription Plans
              </Link>
              )}
              <Link href="/faq" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                FAQ
              </Link>
              <Link href="/terms" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Terms of Service
              </Link>
              <Link href="/privacy" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Privacy Policy
              </Link>
            </Box>
          </Grid>

          {socialItems.length > 0 && (
            <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
                Connect With Us
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
                {socialItems.map((item) => (
                  <IconButton
                    key={item.label}
                    component="a"
                    href={item.href}
                    aria-label={item.label}
                    target={item.label === 'Email' ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    onClick={item.label === 'Email' ? copyEmail : undefined}
                    color="secondary"
                    size="small"
                    sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    {item.icon}
                  </IconButton>
                ))}
              </Box>
              {social?.email && (
                <Typography variant="body2" color="text.secondary">
                  Email: {social.email}
                </Typography>
              )}
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: { xs: 4, md: 5 } }} />

        {loaded && !checkoutEnabled && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, maxWidth: 820, lineHeight: 1.7 }}>
            ArtZyla is a marketplace that connects buyers and sellers. Payment, shipping and returns are arranged directly between
            buyer and seller. ArtZyla does not process payments or ship items and is not a party to any sale.
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} ArtZyla. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Made with <Box component="span" sx={{ color: 'primary.main' }}>♥</Box> for art lovers
          </Typography>
        </Box>
      </Box>
      <Snackbar
        open={emailCopied}
        autoHideDuration={2500}
        onClose={() => setEmailCopied(false)}
        message={`Email address copied: ${social?.email || ''}`}
      />
    </Box>
  );
};

export default Footer;


