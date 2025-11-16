const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id?: number;
  cognito_username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone?: string;
  country?: string;
  website?: string;
  specialties?: string;
  experience_level?: string;
  bio?: string;
  profile_image_url?: string;
  signature_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Listing {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  listing_type: 'fixed_price' | 'auction';
  starting_bid?: number;
  current_bid?: number;
  reserve_price?: number;
  auction_end_date?: string;
  bid_count?: number;
  primary_image_url?: string;
  image_urls?: string[];
  dimensions?: string;
  medium?: string;
  year?: number;
  in_stock: boolean;
  status: 'draft' | 'active' | 'sold' | 'archived';
  views: number;
  created_at: string;
  updated_at: string;
  artist_name?: string;
  cognito_username?: string;
  shipping_info?: string;
  returns_info?: string;
}

export interface Order {
  id: number;
  order_number: string;
  buyer_id: number;
  seller_id: number;
  listing_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  platform_fee: number;
  artist_earnings: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address?: string;
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
  listing_title?: string;
  buyer_email?: string;
}

export interface DashboardData {
  stats: {
    totalListings: number;
    activeListings: number;
    totalSales: number;
    totalRevenue: number;
    pendingOrders: number;
    totalViews: number;
  };
  recentListings: Listing[];
  recentOrders: Order[];
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Failed to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // User endpoints
  async getUser(cognitoUsername: string): Promise<User> {
    return this.request<User>(`/users/${cognitoUsername}`);
  }

  async createOrUpdateUser(userData: Partial<User>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(cognitoUsername: string, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${cognitoUsername}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Listing endpoints
  async getListings(filters?: {
    category?: string;
    subcategory?: string;
    status?: string;
    userId?: number;
    search?: string;
  }): Promise<Listing[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const queryString = params.toString();
    return this.request<Listing[]>(`/listings${queryString ? `?${queryString}` : ''}`);
  }

  async getListing(id: number): Promise<Listing> {
    return this.request<Listing>(`/listings/${id}`);
  }

  async createListing(listingData: Partial<Listing> & { cognito_username: string }): Promise<Listing> {
    return this.request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  }

  async updateListing(id: number, listingData: Partial<Listing>): Promise<Listing> {
    return this.request<Listing>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(listingData),
    });
  }

  async deleteListing(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/listings/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserListings(cognitoUsername: string): Promise<Listing[]> {
    return this.request<Listing[]>(`/listings/user/${cognitoUsername}`);
  }

  // Dashboard endpoints
  async getDashboardData(cognitoUsername: string): Promise<DashboardData> {
    return this.request<DashboardData>(`/dashboard/${cognitoUsername}`);
  }
}

export const apiService = new ApiService();
export default apiService;
