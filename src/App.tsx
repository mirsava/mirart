import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
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
import ArtistSignup from './pages/ArtistSignup';
import ArtistSignin from './pages/ArtistSignin';
import ArtistDashboard from './pages/ArtistDashboard';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import ForgotPassword from './pages/ForgotPassword';
import ConfirmSignup from './pages/ConfirmSignup';
import ProtectedRoute from './components/ProtectedRoute';

function App(): JSX.Element {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
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
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/painting/:id" element={<PaintingDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/artist-signup" element={<ArtistSignup />} />
            <Route path="/artist-signin" element={<ArtistSignin />} />
            <Route path="/confirm-signup" element={<ConfirmSignup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route 
              path="/artist-dashboard" 
              element={
                <ProtectedRoute requiredUserType="artist">
                  <ArtistDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-listing" 
              element={
                <ProtectedRoute requiredUserType="artist">
                  <CreateListing />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-listing/:id" 
              element={
                <ProtectedRoute requiredUserType="artist">
                  <EditListing />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
