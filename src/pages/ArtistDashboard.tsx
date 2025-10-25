import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Divider,
  Paper,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ArtistDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Mock data - in a real app, this would come from an API
  const artistStats = {
    totalListings: 12,
    totalSales: 8,
    totalRevenue: 2450,
    pendingOrders: 2,
  };

  const recentListings = [
    { id: 1, title: 'Sunset Over Mountains', price: 450, status: 'Active', views: 24 },
    { id: 2, title: 'Ocean Waves', price: 380, status: 'Active', views: 18 },
    { id: 3, title: 'Forest Path', price: 320, status: 'Sold', views: 31 },
  ];

  const recentOrders = [
    { id: 1, customer: 'John Smith', item: 'Forest Path', amount: 320, date: '2024-01-15' },
    { id: 2, customer: 'Sarah Johnson', item: 'Mountain View', amount: 450, date: '2024-01-12' },
  ];

  return (
    <Box sx={{ py: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Artist Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your listings, track sales, and grow your art business.
          </Typography>
        </Box>

        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.totalListings}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Listings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <TrendingUpIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.totalSales}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sales
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <MoneyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">${artistStats.totalRevenue}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <CartIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{artistStats.pendingOrders}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Orders
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="My Listings" />
              <Tab label="Orders" />
              <Tab label="Analytics" />
              <Tab label="Profile" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Your Artwork</Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                Add New Listing
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {recentListings.map((listing) => (
                <Grid item xs={12} sm={6} md={4} key={listing.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" noWrap>
                          {listing.title}
                        </Typography>
                        <Chip 
                          label={listing.status} 
                          color={listing.status === 'Active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="h6" color="primary" gutterBottom>
                        ${listing.price}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {listing.views} views
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small">
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Recent Orders
            </Typography>
            <List>
              {recentOrders.map((order) => (
                <ListItem key={order.id} divider>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <CartIcon />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={order.item}
                    secondary={`Sold to ${order.customer} on ${order.date}`}
                  />
                  <Typography variant="h6" color="primary">
                    ${order.amount}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Sales Analytics
            </Typography>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Analytics dashboard coming soon! Track your sales performance, 
                popular items, and customer insights.
              </Typography>
            </Paper>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Artist Profile
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Profile management coming soon! Update your bio, portfolio, 
                and contact information.
              </Typography>
            </Paper>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default ArtistDashboard;
