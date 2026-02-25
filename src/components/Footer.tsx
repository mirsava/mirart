import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Link,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'rgba(74, 58, 154, 0.02)',
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
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              ArtZyla
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              A marketplace connecting talented artists with art lovers worldwide. Discover 
              unique paintings, woodworking, and handmade art from independent creators.
            </Typography>
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
              <Link href="/artist-signup" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Sell Your Art
              </Link>
              <Link href="/about" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                How It Works
              </Link>
              <Link href="/subscription-plans" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Subscription Plans
              </Link>
              <Link href="/faq" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                FAQ
              </Link>
              <Link href="/privacy" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Privacy Policy
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              Connect With Us
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
              <IconButton color="secondary" size="small" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <FacebookIcon />
              </IconButton>
              <IconButton color="secondary" size="small" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <InstagramIcon />
              </IconButton>
              <IconButton color="secondary" size="small" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TwitterIcon />
              </IconButton>
              <IconButton color="secondary" size="small" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <EmailIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Email: info@artzyla.com
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 4, md: 5 } }} />

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
            © 2023 ArtZyla. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Made with ❤️ for art lovers
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;


