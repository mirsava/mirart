import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleInputChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    setSubmitted(true);
  };

  const contactInfo = [
    {
      icon: <EmailIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Email Us',
      details: 'info@artzyla.com',
      description: 'Send us an email anytime',
    },
    {
      icon: <PhoneIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Call Us',
      details: '(555) 123-4567',
      description: 'Mon-Fri 9AM-6PM EST',
    },
    {
      icon: <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Business Hours',
      details: 'Monday - Friday: 9AM - 6PM',
      description: 'Saturday: 10AM - 4PM',
    },
  ];

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Contact Us
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            Have questions about our paintings or need assistance with your order? 
            We're here to help! Reach out to us through any of the channels below.
          </Typography>
        </Box>

        <Grid container spacing={6}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Send us a Message
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Fill out the form below and we'll get back to you within 24 hours.
              </Typography>

              {submitted ? (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Thank you for your message! We'll get back to you soon.
                </Alert>
              ) : null}

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Your Name"
                      value={formData.name}
                      onChange={handleInputChange('name')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Subject"
                      value={formData.subject}
                      onChange={handleInputChange('subject')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Message"
                      multiline
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange('message')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={submitted}
                    >
                      {submitted ? 'Message Sent!' : 'Send Message'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {contactInfo.map((info, index) => (
                <Card key={index} sx={{ flexGrow: 1 }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ mb: 2 }}>
                      {info.icon}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {info.title}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" gutterBottom>
                      {info.details}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {info.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Frequently Asked Questions
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h6" gutterBottom>
                  How does the marketplace work?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  ArtZyla is a marketplace connecting artists and buyers. Each seller manages 
                  their own listings, shipping, and customer service. You purchase directly from the artist.
                </Typography>

                <Typography variant="h6" gutterBottom>
                  What is the return policy?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Return policies are determined by each individual seller. Please check the 
                  return information provided on each listing page before making a purchase.
                </Typography>

                <Typography variant="h6" gutterBottom>
                  How do I contact a seller?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  You can contact sellers directly through their artist profile page. Each 
                  artist provides their own contact information and preferred communication method.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h6" gutterBottom>
                  How is shipping handled?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Shipping is handled directly by each seller. Shipping methods, costs, and 
                  delivery times vary by seller and are specified on each listing page.
                </Typography>

                <Typography variant="h6" gutterBottom>
                  How is the artwork packaged?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Packaging methods are determined by each seller. Artists are responsible 
                  for ensuring their artwork is properly protected during shipping.
                </Typography>

                <Typography variant="h6" gutterBottom>
                  Do sellers offer certificates of authenticity?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Some sellers may provide certificates of authenticity with their artwork. 
                  This varies by artist and is not guaranteed. Please check with individual 
                  sellers or review their listing details for more information.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Contact;


