import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Build as BuildIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader';

const About: React.FC = () => {

  const features = [
    {
      icon: <PaletteIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Flexible Pricing',
      description: 'Choose a subscription plan that fits your business needs. List your work at a fixed price and keep the full sale amount. No activation fees per listing.',
    },
    {
      icon: <BuildIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Artist Control',
      description: 'Artists manage their own shipping, packaging, and customer service, building direct relationships with buyers.',
    },
    {
      icon: <StarIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Global Marketplace',
      description: 'Connect with artists worldwide and discover unique paintings, woodworking, and handmade art from diverse creators.',
    },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <PageHeader
        title="About Our Marketplace"
        subtitle="ArtZyla is a vibrant marketplace connecting talented artists with art lovers worldwide. We empower artists to sell their work through flexible pricing options while providing buyers with access to authentic, handmade art from independent creators."
        icon={<PaletteIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
        disablePattern={true}
        align="left"
      />

      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Grid container spacing={6} sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                height: 400,
                backgroundImage: 'url(https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h4" component="h2" gutterBottom>
                Our Mission
              </Typography>
              <Typography variant="body1" paragraph>
                We believe that art has the power to transform spaces and inspire emotions. ArtZyla was 
                created to democratize art sales by providing artists with a flexible, accessible platform 
                to showcase and sell their work directly to art lovers worldwide.
              </Typography>
              <Typography variant="body1" paragraph>
                Our mission is to support independent artists by offering transparent, affordable subscription-based pricing. 
                Artists choose a subscription plan that fits their needs, list their work at a fixed price, and 
                activate listings within their plan limits. No per-listing activation fees or surprise charges—artists 
                keep the full sale price and maintain control over their business.
              </Typography>
              <Typography variant="body1">
                We empower artists to maintain control over their sales process, including shipping, 
                packaging, and customer service. This marketplace model allows creators to build direct 
                relationships with buyers while we provide the platform and tools to make selling art 
                simple and accessible.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Why Choose Our Marketplace?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto', mb: 4 }}>
            We're dedicated to supporting both artists and art lovers with these key benefits:
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Typography variant="h4" component="h2" gutterBottom>
            How It Works
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            ArtZyla provides a simple, transparent marketplace for artists and buyers. Artists choose a 
            subscription plan, create listings within their plan limits, and manage shipping and 
            customer service directly with collectors. Buyers purchase authentic art straight from the source.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', mt: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                Subscription-Based
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Flexible Plans Available
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                0%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Platform Commission
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                Artist
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Controlled Shipping
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                Direct
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Artist-Buyer Connection
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default About;
