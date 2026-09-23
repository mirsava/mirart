import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Build as BuildIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import SEO from '../components/SEO';

const wallFrames = [
  { left: '7%', top: '13%', width: '35%', height: '64%', art: 'radial-gradient(circle at 66% 30%, #e6a888 0 15%, transparent 16%), linear-gradient(180deg, #1f2a44 0 64%, #b5573a 64% 100%)' },
  { left: '48%', top: '13%', width: '22%', height: '30%', art: 'linear-gradient(90deg, #eadfce 0 52%, #b5573a 52% 76%, #1f2a44 76% 100%)' },
  { left: '48%', top: '49%', width: '22%', height: '28%', art: 'radial-gradient(ellipse at 50% 100%, #d9825f 0 46%, transparent 47%), linear-gradient(180deg, #efe6d8 0 100%)' },
  { left: '76%', top: '13%', width: '17%', height: '64%', art: 'radial-gradient(circle at 50% 70%, #eadfce 0 16%, transparent 17%), linear-gradient(180deg, #b5573a 0 100%)' },
];

const About: React.FC = () => {
  const isDarkMode = useTheme().palette.mode === 'dark';

  const features = [
    {
      icon: <PaletteIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Flexible Pricing',
      description: 'Choose a subscription plan that fits your business needs, or pay once to list a single piece. List your work at a fixed price and keep the full sale amount, with no commission on sales.',
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
      <SEO
        title="About Us"
        description="ArtZyla is a marketplace connecting talented artists with art lovers worldwide. Learn about our mission to support independent creators and democratize art sales."
        url="/about"
      />
      <PageHeader
        title="About Our Marketplace"
        eyebrow="Our story"
        subtitle="ArtZyla is a vibrant marketplace connecting talented artists with art lovers worldwide. We empower artists to sell their work through flexible pricing options while providing buyers with access to authentic, handmade art from independent creators."
        disablePattern={true}
        align="left"
        subtitleLines={2}
      />

      <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
        <Grid container spacing={6} sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Box
              aria-hidden
              sx={{
                position: 'relative',
                height: { xs: 300, md: 400 },
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: isDarkMode ? '#211e1b' : '#efe6d8',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {wallFrames.map((frame, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: frame.left,
                    top: frame.top,
                    width: frame.width,
                    height: frame.height,
                    p: { xs: 0.5, md: 1 },
                    bgcolor: isDarkMode ? '#2a2622' : '#ffffff',
                    boxShadow: isDarkMode ? '0 18px 30px -18px rgba(0,0,0,0.7)' : '0 18px 30px -18px rgba(31,42,68,0.4)',
                  }}
                >
                  <Box sx={{ width: '100%', height: '100%', background: frame.art }} />
                </Box>
              ))}
              <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '12%', bgcolor: isDarkMode ? 'rgba(243,239,233,0.05)' : 'rgba(31,42,68,0.07)' }} />
            </Box>
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
                Our mission is to support independent artists by offering transparent, affordable pricing. 
                Artists choose a subscription plan that fits their needs, or pay a small one-time fee to keep a single 
                listing live, and list their work at a fixed price. No commission or surprise charges—artists 
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
