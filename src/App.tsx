import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import PaintingDetail from './pages/PaintingDetail';
import PublicProfile from './pages/PublicProfile';
import ProtectedRoute from './components/ProtectedRoute';
import CheckoutGate from './components/CheckoutGate';
import { UserRole } from './types/userRoles';

// Public landing pages load with the app; everything else is fetched when first opened.
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const PromotionSuccess = lazy(() => import('./pages/PromotionSuccess'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const SignUp = lazy(() => import('./pages/SignUp'));
const SignIn = lazy(() => import('./pages/SignIn'));
const AccountDashboard = lazy(() => import('./pages/AccountDashboard'));
const CreateListing = lazy(() => import('./pages/CreateListing'));
const EditListing = lazy(() => import('./pages/EditListing'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ConfirmSignup = lazy(() => import('./pages/ConfirmSignup'));
const Messages = lazy(() => import('./pages/Messages'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));

const PageLoading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
    <CircularProgress />
  </Box>
);

function App(): JSX.Element {
  return (
    <HelmetProvider>
      <CustomThemeProvider>
        <AuthProvider>
          <CartProvider>
            <ChatProvider>
              <NotificationProvider>
                <FavoritesProvider>
                  <AppContent />
                </FavoritesProvider>
              </NotificationProvider>
            </ChatProvider>
          </CartProvider>
        </AuthProvider>
      </CustomThemeProvider>
    </HelmetProvider>
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
        <ConfirmProvider>
        <Router>
          <Layout>
            <Suspense fallback={<PageLoading />}>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/painting/:slug-:id" element={<PaintingDetail />} />
            <Route path="/painting/:id" element={<PaintingDetail />} />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CheckoutGate>
                    <Cart />
                  </CheckoutGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutGate>
                    <Checkout />
                  </CheckoutGate>
                </ProtectedRoute>
              }
            />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/promotion-success" element={
              <ProtectedRoute requiredUserType={UserRole.ARTIST}>
                <PromotionSuccess />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            } />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/profile/:username" element={<PublicProfile />} />
                    <Route path="/artist-signup" element={<SignUp />} />
                    <Route path="/artist-signin" element={<SignIn />} />
                    <Route path="/artist/:username" element={<PublicProfile />} />
                    <Route path="/confirm-signup" element={<ConfirmSignup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredUserType={UserRole.ARTIST}>
                  <AccountDashboard />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/artist-dashboard"
              element={
                <ProtectedRoute requiredUserType={UserRole.ARTIST}>
                  <AccountDashboard />
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
            </Suspense>
          </Layout>
        </Router>
        </ConfirmProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
