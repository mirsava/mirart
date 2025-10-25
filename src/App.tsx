import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
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

function App(): JSX.Element {
  return (
    <CustomThemeProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
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
            <Route path="/artist-dashboard" element={<ArtistDashboard />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
