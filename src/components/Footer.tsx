import React from 'react';
import {
  Box,
  Container,
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
        bgcolor: 'background.paper',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              MirArt
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Premium original paintings for art lovers and collectors. Each piece is
              carefully crafted with passion and artistic vision.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/" color="text.secondary" underline="hover">
                Home
              </Link>
              <Link href="/gallery" color="text.secondary" underline="hover">
                Gallery
              </Link>
              <Link href="/about" color="text.secondary" underline="hover">
                About
              </Link>
              <Link href="/contact" color="text.secondary" underline="hover">
                Contact
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Customer Service
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/shipping" color="text.secondary" underline="hover">
                Shipping Info
              </Link>
              <Link href="/returns" color="text.secondary" underline="hover">
                Returns
              </Link>
              <Link href="/faq" color="text.secondary" underline="hover">
                FAQ
              </Link>
              <Link href="/privacy" color="text.secondary" underline="hover">
                Privacy Policy
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Connect With Us
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <IconButton color="primary" size="small">
                <FacebookIcon />
              </IconButton>
              <IconButton color="primary" size="small">
                <InstagramIcon />
              </IconButton>
              <IconButton color="primary" size="small">
                <TwitterIcon />
              </IconButton>
              <IconButton color="primary" size="small">
                <EmailIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Email: info@mirart.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phone: (555) 123-4567
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © 2023 MirArt. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Made with ❤️ for art lovers
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;


