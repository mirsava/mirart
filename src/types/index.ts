export interface Artwork {
  id: number;
  title: string;
  artist: string;
  artistUsername?: string;
  artistSignatureUrl?: string;
  price: number | null;
  image: string;
  description: string;
  category: 'Painting' | 'Woodworking' | 'Prints';
  subcategory: string;
  dimensions: string;
  medium: string;
  year: number;
  inStock: boolean;
  quantityAvailable?: number;
  likeCount?: number;
  isLiked?: boolean;
  imageCount?: number;
}

export interface Painting extends Artwork {
  category: 'Painting';
  subcategory: string;
}

export interface Woodworking extends Artwork {
  category: 'Woodworking';
  subcategory: string;
}

export interface CartItem extends Artwork {
  quantity: number;
  type?: 'artwork' | 'activation';
  listingId?: number;
}

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: any;
}

export interface CartContextType {
  cartItems: CartItem[];
  addToCart: (painting: Artwork, type?: 'artwork' | 'activation', listingId?: number) => void;
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


