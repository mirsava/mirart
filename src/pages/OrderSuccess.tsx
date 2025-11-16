import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const OrderSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 3,
            }}
          />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Order Placed Successfully!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Thank you for your purchase. Your order has been confirmed and will be
            processed shortly.
          </Typography>

          <Card sx={{ mt: 4, mb: 4, textAlign: 'left' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                What happens next?
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    Order Confirmation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You'll receive an email confirmation with your order details
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShippingIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    Secure Packaging
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your artwork will be carefully packaged with insurance
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShippingIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">
                    Worldwide Shipping
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Free shipping with tracking information provided
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/gallery')}
            >
              Continue Shopping
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            Questions about your order? Contact us at info@artzyla.com
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default OrderSuccess;


