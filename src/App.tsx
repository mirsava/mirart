import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import './aws-config';
import Layout from './components/Layout';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import PaintingDetail from './pages/PaintingDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import ArtistSignup from './pages/ArtistSignup';
import ArtistSignin from './pages/ArtistSignin';
import ArtistDashboard from './pages/ArtistDashboard';
import ArtistProfile from './pages/ArtistProfile';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import ForgotPassword from './pages/ForgotPassword';
import ConfirmSignup from './pages/ConfirmSignup';
import Messages from './pages/Messages';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import SubscriptionPlans from './pages/SubscriptionPlans';
import Orders from './pages/Orders';
import ProtectedRoute from './components/ProtectedRoute';
import { UserRole } from './types/userRoles';

function App(): JSX.Element {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <CartProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </CartProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

function AppContent(): JSX.Element {
  const { theme } = useTheme();
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        autoHideDuration={3000}
      >
        <Router>
          <Layout>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/painting/:id" element={<PaintingDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
                    <Route path="/artist-signup" element={<ArtistSignup />} />
                    <Route path="/artist-signin" element={<ArtistSignin />} />
                    <Route path="/artist/:username" element={<ArtistProfile />} />
                    <Route path="/confirm-signup" element={<ConfirmSignup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route 
              path="/artist-dashboard" 
              element={
                <ProtectedRoute requiredUserType={UserRole.ARTIST}>
                  <ArtistDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-listing" 
              element={
                <ProtectedRoute requiredUserType={UserRole.ARTIST}>
                  <CreateListing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-listing/:id" 
              element={
                <ProtectedRoute requiredUserType={UserRole.ARTIST}>
                  <EditListing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute requiredUserType={UserRole.ARTIST}>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredUserType={UserRole.SITE_ADMIN}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/subscription-plans" element={<SubscriptionPlans />} />
            </Routes>
          </Layout>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
