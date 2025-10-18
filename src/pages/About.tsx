import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Brush as BrushIcon,
  Star as StarIcon,
} from '@mui/icons-material';

const About: React.FC = () => {

  const features = [
    {
      icon: <PaletteIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Artist-First Platform',
      description: 'Artists keep 85% of their sales, ensuring fair compensation for their creative work.',
    },
    {
      icon: <BrushIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Curated Quality',
      description: 'Each piece is carefully selected to ensure the highest quality and artistic excellence.',
    },
    {
      icon: <StarIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Global Marketplace',
      description: 'Connect with artists worldwide and discover unique pieces from diverse cultures.',
    },
  ];

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            About MirArt
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '800px', mx: 'auto' }}>
            MirArt is a curated marketplace connecting artists with art lovers worldwide. 
            We showcase original paintings from talented creators while providing a platform 
            for artists to sell their work with competitive commission rates.
          </Typography>
        </Box>

        <Grid container spacing={6} sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                height: 400,
                backgroundImage: 'url(https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 2,
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h4" component="h2" gutterBottom>
                Our Story
              </Typography>
              <Typography variant="body1" paragraph>
                Founded in 2023, MirArt began as a passion project to create a fair marketplace for artists. 
                Our founder, an artist and art enthusiast, recognized the need for a platform that gives 
                artists control over their work while connecting them with art lovers worldwide.
              </Typography>
              <Typography variant="body1" paragraph>
                Today, we work with talented artists from around the globe, offering them a platform to 
                showcase their work with competitive commission rates. Artists keep 85% of their sales, 
                ensuring they're fairly compensated for their creativity and hard work.
              </Typography>
              <Typography variant="body1">
                We're committed to supporting artists while providing customers with authentic, 
                meaningful pieces that will be treasured for generations. Our curated approach ensures 
                quality while giving artists the exposure they deserve.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Why Choose MirArt?
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
            Our Commitment
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Every painting comes with a certificate of authenticity, secure packaging, and worldwide shipping. 
            We offer a 30-day return policy and support artists with fair commission rates (15% platform fee).
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', mt: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                85%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Artist Commission
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                Free
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Worldwide Shipping
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                30 Days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Return Policy
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main">
                15%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Platform Fee
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default About;
