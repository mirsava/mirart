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
  Build as BuildIcon,
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
      icon: <BuildIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Curated Quality',
      description: 'Each piece is carefully selected to ensure the highest quality and artistic excellence.',
    },
    {
      icon: <StarIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Global Community',
      description: 'Connect with artists worldwide and discover unique pieces from diverse cultures.',
    },
  ];

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            About Our Marketplace
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '800px', mx: 'auto' }}>
            We're a community-driven marketplace connecting talented artists with art lovers worldwide. 
            Our platform makes it easy for artists to sell their work and for collectors to discover unique pieces.
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
                Our Mission
              </Typography>
              <Typography variant="body1" paragraph>
                We believe that art has the power to transform spaces and inspire emotions. Our marketplace 
                was created to support artists by providing them with a platform to showcase and sell their 
                work while connecting them with art lovers who appreciate authentic, handmade pieces.
              </Typography>
              <Typography variant="body1" paragraph>
                We're committed to fair compensation for artists, with a transparent fee structure that 
                allows creators to keep 85% of their sales. Our platform handles the technical aspects 
                of selling art, so artists can focus on what they do best - creating.
              </Typography>
              <Typography variant="body1">
                Whether you're an established artist or just starting out, our community welcomes creators 
                of all levels. We provide the tools and support needed to successfully sell your artwork 
                in a global marketplace.
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
