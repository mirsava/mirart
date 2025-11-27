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
              ArtZyla
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A marketplace connecting talented artists with art lovers worldwide. Discover 
              unique paintings, woodworking, and handmade art from independent creators.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Home
              </Link>
              <Link href="/gallery" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Gallery
              </Link>
              <Link href="/about" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                About
              </Link>
              <Link href="/contact" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Contact
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              For Artists
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/artist-signup" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Sell Your Art
              </Link>
              <Link href="/about" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                How It Works
              </Link>
              <Link href="/contact" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                FAQ
              </Link>
              <Link href="/privacy" color="text.secondary" underline="hover" sx={{ '&:hover': { color: 'secondary.main' } }}>
                Privacy Policy
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Connect With Us
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <IconButton color="secondary" size="small">
                <FacebookIcon />
              </IconButton>
              <IconButton color="secondary" size="small">
                <InstagramIcon />
              </IconButton>
              <IconButton color="secondary" size="small">
                <TwitterIcon />
              </IconButton>
              <IconButton color="secondary" size="small">
                <EmailIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Email: info@artzyla.com
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
            © 2023 ArtZyla. All rights reserved.
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


