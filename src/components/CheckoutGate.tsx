import React from 'react';
import { Navigate } from 'react-router-dom';
import { useMarketplaceSettings } from '../hooks/useMarketplaceSettings';

// Cart and checkout only exist while online checkout is switched on.
const CheckoutGate: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { checkoutEnabled, loaded } = useMarketplaceSettings();
  if (!loaded) return null;
  return checkoutEnabled ? children : <Navigate to="/gallery" replace />;
};

export default CheckoutGate;
