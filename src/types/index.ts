export interface Painting {
  id: number;
  title: string;
  artist: string;
  price: number;
  image: string;
  description: string;
  category: string;
  dimensions: string;
  medium: string;
  year: number;
  inStock: boolean;
}

export interface CartItem extends Painting {
  quantity: number;
}

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: any;
}

export interface CartContextType {
  cartItems: CartItem[];
  addToCart: (painting: Painting) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardName: string;
}


