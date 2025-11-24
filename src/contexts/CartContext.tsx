import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Artwork, CartItem, CartContextType } from '../types';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (painting: Artwork, type: 'artwork' | 'activation' = 'artwork', listingId?: number): void => {
    if (type === 'artwork') {
      if (!painting.inStock) {
        throw new Error('This item is no longer available.');
      }
    }
    
    setCartItems(prev => {
      const existingItem = prev.find(item => 
        item.id === painting.id && item.type === type
      );
      if (existingItem) {
        return prev.map(item =>
          item.id === painting.id && item.type === type
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...painting, quantity: 1, type, listingId }];
    });
  };

  const removeFromCart = (id: number): void => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number): void => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = (): void => {
    setCartItems([]);
  };

  const getTotalPrice = (): number => {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.price || 0;
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const getTotalItems = (): number => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};


