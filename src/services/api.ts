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
  address_line1?: string;
  address_line2?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  billing_line1?: string;
  billing_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  active?: boolean;
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
  price: number | null;
  primary_image_url?: string;
  image_urls?: string[];
  dimensions?: string;
  medium?: string;
  year?: number;
  in_stock: boolean;
  quantity_available?: number;
  status: 'draft' | 'active' | 'inactive' | 'sold' | 'archived';
  views: number;
  created_at: string;
  updated_at: string;
  artist_name?: string;
  cognito_username?: string;
  signature_url?: string;
  shipping_info?: string;
  returns_info?: string;
  special_instructions?: string;
  like_count?: number;
  is_liked?: boolean;
  allow_comments?: boolean;
  avg_rating?: number | null;
  review_count?: number;
  shipping_preference?: 'free' | 'buyer';
  shipping_carrier?: 'shippo' | 'own';
  return_days?: number | null;
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
  return_status?: 'requested' | 'approved' | 'denied' | null;
  return_reason?: string;
  return_requested_at?: string;
  shipping_address?: string;
  shipping_cost?: number;
  payout_amount?: number | null;
  payout_stripe_fee?: number | null;
  payout_label_cost?: number | null;
  payout_commission_percent?: number | null;
  payout_commission_amount?: number | null;
  shippo_rate_id?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  tracking_status?: string;
  tracking_last_updated?: string;
  label_url?: string;
  shipped_at?: string;
  delivered_at?: string;
  payment_intent_id?: string;
  return_days?: number | null;
  returns_info?: string | null;
  created_at: string;
  updated_at: string;
  listing_title?: string;
  buyer_email?: string;
  seller_email?: string;
  primary_image_url?: string;
}

export interface DashboardData {
  stats: {
    totalListings: number;
    activeListings: number;
    totalViews: number;
    draftListings: number;
    messagesReceived: number;
    totalLikes: number;
  };
  recentListings: Listing[];
  recentOrders: Order[];
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  tier: string;
  max_listings: number;
  price_monthly: number;
  price_yearly: number;
  features?: string;
  is_active: boolean;
  display_order: number;
  stripe_product_id?: string;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  billing_period: 'monthly' | 'yearly';
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  payment_intent_id?: string;
  plan_name?: string;
  tier?: string;
  max_listings?: number;
  current_listings?: number;
  listings_remaining?: number;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      console.log('API Request:', url, options.method || 'GET');
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      console.log('API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          console.log('Error response body:', text);
          errorData = JSON.parse(text);
        } catch (parseError) {
          errorData = { error: `HTTP error! status: ${response.status}`, status: response.status };
        }
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.error = errorData.error || errorMessage;
        error.details = errorData.details || errorData;
        if (errorData.seller_is_current_user !== undefined) error.seller_is_current_user = errorData.seller_is_current_user;
        if (errorData.seller_cognito_username !== undefined) error.seller_cognito_username = errorData.seller_cognito_username;
        if (errorData.artist_email !== undefined) error.artist_email = errorData.artist_email;
        if (errorData.artist_name !== undefined) error.artist_name = errorData.artist_name;
        console.error('API Error:', error);
        throw error;
      }
      
      const data = await response.json();
      console.log('API Response data:', data);
      return data;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Failed to connect to server. Please check if the backend is running.');
      }
      console.error('Request error:', error);
      throw error;
    }
  }

  // User endpoints
  async getUser(cognitoUsername: string): Promise<User> {
    const user = await this.request<User>(`/users/${cognitoUsername}?requestingUser=${cognitoUsername}`);
    // Ensure active is converted to boolean
    if (user.active !== undefined) {
      user.active = Boolean(user.active);
    }
    return user;
  }

  async reactivateUser(cognitoUsername: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request<{ success: boolean; message: string; user: User }>(`/users/${cognitoUsername}/reactivate?requestingUser=${cognitoUsername}`, {
      method: 'PUT',
    });
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

  async getArtists(): Promise<{ artists: Array<{ id: number; cognito_username: string; artist_name: string; profile_image_url?: string }> }> {
    return this.request<{ artists: Array<{ id: number; cognito_username: string; artist_name: string; profile_image_url?: string }> }>('/users/artists/list');
  }

  // Listing endpoints
  async getListings(filters?: {
    category?: string;
    subcategory?: string;
    status?: string;
    userId?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    cognitoUsername?: string;
    requestingUser?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
    medium?: string;
    inStock?: boolean;
  }): Promise<{ listings: Listing[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    return this.request<{ listings: Listing[]; pagination: any }>(`/listings${queryString ? `?${queryString}` : ''}`);
  }

  async likeListing(listingId: number, cognitoUsername: string): Promise<{ liked: boolean; likeCount: number }> {
    return this.request<{ liked: boolean; likeCount: number }>(`/likes/${listingId}`, {
      method: 'POST',
      body: JSON.stringify({ cognitoUsername }),
    });
  }

  async unlikeListing(listingId: number, cognitoUsername: string): Promise<{ liked: boolean; likeCount: number }> {
    return this.request<{ liked: boolean; likeCount: number }>(`/likes/${listingId}`, {
      method: 'DELETE',
      body: JSON.stringify({ cognitoUsername }),
    });
  }

  async getFavoriteListings(cognitoUsername: string): Promise<{ listings: Array<{ id: number; title: string; price: number; primary_image_url?: string; category: string; in_stock: boolean; status: string; cognito_username: string; artist_name: string; like_count: number; favorited_at: string }> }> {
    return this.request(`/likes/user/${cognitoUsername}/listings`);
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

  async updateListing(id: number, listingData: Partial<Listing> & { cognito_username: string; groups?: string[] }): Promise<Listing> {
    return this.request<Listing>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(listingData),
    });
  }

  async deleteListing(id: number, cognitoUsername: string, groups?: string[]): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ message: string }>(`/listings/${id}?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  async activateListing(id: number, cognitoUsername: string): Promise<Listing> {
    return this.request<Listing>(`/listings/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({
        cognito_username: cognitoUsername,
      }),
    });
  }

  async getUserListings(cognitoUsername: string): Promise<Listing[]> {
    return this.request<Listing[]>(`/listings/user/${cognitoUsername}`);
  }

  // Dashboard endpoints
  async getDashboardData(cognitoUsername: string): Promise<DashboardData> {
    return this.request<DashboardData>(`/dashboard/${cognitoUsername}`);
  }

  async getArtistAnalytics(cognitoUsername: string): Promise<{
    summary: {
      totalEarnings: number;
      totalGrossEarnings: number;
      totalNetEarnings: number;
      totalStripeFees: number;
      totalLabelCosts: number;
      totalCommission: number;
      totalDeductions: number;
      netMarginPercent: number;
      totalOrders: number;
      avgOrderValue: number;
      thisMonth: number;
      lastMonth: number;
      ytd: number;
    };
    revenueOverTime: {
      month: string;
      earnings: number;
      grossEarnings: number;
      netEarnings: number;
      stripeFees: number;
      labelCosts: number;
      commissionCosts: number;
      orders: number;
    }[];
    topListings: { id: number; title: string; primaryImageUrl: string; category: string; totalRevenue: number; orderCount: number }[];
    revenueByCategory: { category: string; earnings: number; orders: number }[];
    conversionFunnel: {
      views: number;
      likes: number;
      inquiries: number;
      orders: number;
      viewToLikeRate: number;
      likeToInquiryRate: number;
      inquiryToOrderRate: number;
      viewToOrderRate: number;
    };
    missedRevenueOpportunities: Array<{
      id: number;
      title: string;
      status: string;
      views: number;
      currentOrders: number;
      estimatedExtraOrders: number;
      estimatedExtraRevenue: number;
    }>;
    pricingIntelligence: Array<{
      id: number;
      title: string;
      category: string;
      medium: string;
      listingPrice: number;
      marketAvgPrice: number | null;
      suggestedMin: number | null;
      suggestedMax: number | null;
      priceDeltaPercent: number | null;
      listingConversionRate: number;
      soldOrders: number;
      views: number;
      marketSales: number;
    }>;
  }> {
    return this.request(`/dashboard/${cognitoUsername}/analytics`);
  }

  // Order endpoints
  async createOrder(orderData: {
    cognito_username: string;
    listing_id: number;
    quantity?: number;
    shipping_address?: string;
    payment_intent_id?: string;
  }): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getUserOrders(cognitoUsername: string, type?: 'buyer' | 'seller'): Promise<Order[]> {
    const params = type ? `?type=${type}` : '';
    return this.request<Order[]>(`/orders/user/${cognitoUsername}${params}`);
  }

  async getOrderById(orderId: number, cognitoUsername: string): Promise<any> {
    return this.request<any>(`/orders/${orderId}?cognitoUsername=${cognitoUsername}`);
  }

  async markOrderShipped(
    orderId: number,
    cognitoUsername: string,
    options?: { tracking_number?: string; tracking_url?: string; shipping_carrier?: string }
  ): Promise<{ success: boolean; status: string }> {
    return this.request(`/orders/${orderId}/mark-shipped`, {
      method: 'PUT',
      body: JSON.stringify({ cognito_username: cognitoUsername, ...(options || {}) }),
    });
  }

  async confirmOrderDelivery(orderId: number, cognitoUsername: string): Promise<{ success: boolean; status: string }> {
    return this.request(`/orders/${orderId}/confirm-delivery`, {
      method: 'PUT',
      body: JSON.stringify({ cognito_username: cognitoUsername }),
    });
  }

  async requestReturn(orderId: number, cognitoUsername: string, reason?: string): Promise<{ success: boolean; return_status: string }> {
    return this.request(`/orders/${orderId}/return-request`, {
      method: 'POST',
      body: JSON.stringify({ cognito_username: cognitoUsername, reason }),
    });
  }

  async respondToReturn(orderId: number, cognitoUsername: string, action: 'approved' | 'denied'): Promise<{ success: boolean; return_status: string }> {
    return this.request(`/orders/${orderId}/return-respond`, {
      method: 'PUT',
      body: JSON.stringify({ cognito_username: cognitoUsername, action }),
    });
  }

  // Shippo shipping
  async getShippingRates(address: { street1: string; city: string; state: string; zip: string; country?: string; name?: string }, items: Array<{ listing_id: number; quantity: number }>): Promise<{ rates: Array<{ object_id: string; provider: string; servicelevel: string; amount: string; estimated_days?: number }> }> {
    return this.request('/shipping/rates', {
      method: 'POST',
      body: JSON.stringify({ address, items }),
    });
  }

  async getShippingRatesForOrder(orderId: number, cognitoUsername: string): Promise<{ rates: Array<{ object_id: string; provider: string; servicelevel: string; amount: string; estimated_days?: number }> }> {
    return this.request('/shipping/rates-for-order', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, cognito_username: cognitoUsername }),
    });
  }

  async purchaseShippingLabel(orderId: number, rateId: string, cognitoUsername: string, rateAmount?: string, carrier?: string): Promise<{ label_url: string; tracking_number: string; tracking_url: string }> {
    return this.request('/shipping/label', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, rate_id: rateId, cognito_username: cognitoUsername, rate_amount: rateAmount, carrier }),
    });
  }

  async getShippingTracking(trackingNumber: string, carrier?: string): Promise<{ status: string; url?: string }> {
    const params = carrier ? `?carrier=${encodeURIComponent(carrier)}` : '';
    return this.request(`/shipping/track/${encodeURIComponent(trackingNumber)}${params}`);
  }

  async getOrderTracking(orderId: number): Promise<{ tracking: any }> {
    return this.request(`/shipping/track-order/${orderId}`);
  }

  async isShippingConfigured(): Promise<{ configured: boolean }> {
    return this.request('/shipping/configured');
  }

  async createStripeConnectAccount(cognitoUsername: string, email: string, businessName?: string): Promise<{ accountId: string; existing?: boolean }> {
    return this.request('/stripe/connect/create-account', {
      method: 'POST',
      body: JSON.stringify({ cognito_username: cognitoUsername, email, business_name: businessName }),
    });
  }

  async createStripeConnectAccountLink(
    cognitoUsername: string,
    options?: { return_url?: string; refresh_url?: string }
  ): Promise<{ url: string }> {
    const body: Record<string, string> = { cognito_username: cognitoUsername };
    if (options?.return_url) body.return_url = options.return_url;
    if (options?.refresh_url) body.refresh_url = options.refresh_url;
    if (typeof window !== 'undefined') body.return_url_base = window.location.origin;
    return this.request('/stripe/connect/create-account-link', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getStripeConnectStatus(cognitoUsername: string): Promise<{ connected: boolean; chargesEnabled?: boolean; detailsSubmitted?: boolean }> {
    return this.request(`/stripe/connect/status?cognito_username=${encodeURIComponent(cognitoUsername)}`);
  }

  async createStripeCheckoutSession(
    items: Array<{ name: string; price: number; quantity: number; image_url?: string }>,
    options?: {
      shippingAddress?: Record<string, string>;
      metadata?: Record<string, string | object>;
    }
  ): Promise<{ url: string; sessionId: string }> {
    const { shippingAddress, metadata } = options || {};
    const res = await this.request<{ url: string; sessionId: string }>('/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        items,
        shipping_address: shippingAddress,
        metadata: metadata ? Object.fromEntries(
          Object.entries(metadata).map(([k, v]) => [k, typeof v === 'object' ? v : v])
        ) : undefined,
        return_url_base: typeof window !== 'undefined' ? window.location.origin : undefined,
      }),
    });
    return res;
  }

  async confirmStripeSession(sessionId: string): Promise<{
    success: boolean;
    transactionId: string;
    orders?: Order[];
    subscription?: any;
    requiresUserCreation?: boolean;
    subscriptionData?: { plan_id: number; billing_period: string };
    payer?: { email: string; name: string };
  }> {
    return this.request(`/stripe/confirm-session?session_id=${encodeURIComponent(sessionId)}`);
  }

  async getMessages(cognitoUsername: string, type: 'all' | 'sent' | 'received' | 'archived' = 'all'): Promise<{ messages: Message[] }> {
    return this.request<{ messages: Message[] }>(`/messages/user/${cognitoUsername}?type=${type}`);
  }

  async sendMessage(cognitoUsername: string, listingId: number, subject: string, message: string): Promise<{ success: boolean; messageId: number }> {
    return this.request<{ success: boolean; messageId: number }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ cognitoUsername, listingId, subject, message }),
    });
  }

  async getUnreadMessageCount(cognitoUsername: string): Promise<{ count: number }> {
    return this.request<{ count: number }>(`/messages/unread-count/${cognitoUsername}`);
  }

  async markMessageAsRead(messageId: number, cognitoUsername: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/messages/${messageId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ cognitoUsername }),
    });
  }

  async archiveMessage(messageId: number, cognitoUsername: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/messages/${messageId}/archive`, {
      method: 'PUT',
      body: JSON.stringify({ cognitoUsername }),
    });
  }

  async unarchiveMessage(messageId: number, cognitoUsername: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/messages/${messageId}/unarchive`, {
      method: 'PUT',
      body: JSON.stringify({ cognitoUsername }),
    });
  }

  async deleteMessage(messageId: number, cognitoUsername: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/messages/${messageId}?cognitoUsername=${encodeURIComponent(cognitoUsername)}`, {
      method: 'DELETE',
    });
  }

  async replyToMessage(messageId: number, cognitoUsername: string, subject: string, message: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/messages/${messageId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ cognitoUsername, subject, message }),
    });
  }

  async getChatConversations(cognitoUsername: string): Promise<{ conversations: any[] }> {
    return this.request<{ conversations: any[] }>(`/chat/conversations/${cognitoUsername}`);
  }

  async getChatConversation(conversationId: number, cognitoUsername: string): Promise<{ conversation: any; messages: any[] }> {
    return this.request<{ conversation: any; messages: any[] }>(`/chat/conversation/${conversationId}?cognitoUsername=${encodeURIComponent(cognitoUsername)}`);
  }

  async createChatConversation(cognitoUsername: string, otherUserId: number, listingId: number | null, message: string, otherUserCognitoUsername?: string): Promise<{ success: boolean; conversationId: number }> {
    return this.request<{ success: boolean; conversationId: number }>(`/chat/conversation`, {
      method: 'POST',
      body: JSON.stringify({ 
        cognitoUsername, 
        otherUserId: otherUserId || undefined, 
        otherUserCognitoUsername,
        listingId, 
        message 
      }),
    });
  }

  async sendChatMessage(cognitoUsername: string, conversationId: number, message: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/chat/message`, {
      method: 'POST',
      body: JSON.stringify({ cognitoUsername, conversationId, message }),
    });
  }

  async markChatMessagesAsRead(conversationId: number, cognitoUsername: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/chat/messages/read/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify({ cognitoUsername }),
    });
  }

  async searchUsers(query: string, limit?: number): Promise<{ users: User[] }> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) {
      params.append('limit', limit.toString());
    }
    return this.request<{ users: User[] }>(`/users/search?${params.toString()}`);
  }

  async getListingReviews(listingId: number): Promise<{ reviews: Review[]; averageRating: number; reviewCount: number }> {
    return this.request(`/comments/listing/${listingId}`);
  }

  async createReview(listingId: number, cognitoUsername: string, rating: number, comment?: string): Promise<{ review: Review; updated?: boolean }> {
    return this.request(`/comments`, {
      method: 'POST',
      body: JSON.stringify({ listingId, cognitoUsername, rating, comment }),
    });
  }

  async deleteReview(reviewId: number, cognitoUsername: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/comments/${reviewId}?cognitoUsername=${encodeURIComponent(cognitoUsername)}`, {
      method: 'DELETE',
    });
  }

  async getAdminStats(cognitoUsername: string, groups?: string[]): Promise<any> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<any>(`/admin/stats?${params.toString()}`);
  }

  async getAdminUserById(cognitoUsername: string, userId: number, groups?: string[]): Promise<User> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<User>(`/admin/users/${userId}?${params.toString()}`);
  }

  async getAdminUsers(cognitoUsername: string, filters?: { page?: number; limit?: number; search?: string; subscriptionFilter?: string; subscriptionPlan?: string; subscriptionBilling?: string }, groups?: string[]): Promise<any> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, value.toString());
      });
    }
    return this.request<any>(`/admin/users?${params.toString()}`);
  }

  async getAdminListings(cognitoUsername: string, filters?: { page?: number; limit?: number; status?: string; category?: string; search?: string }, groups?: string[]): Promise<any> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, value.toString());
      });
    }
    return this.request<any>(`/admin/listings?${params.toString()}`);
  }

  async getAdminOrders(cognitoUsername: string, filters?: { page?: number; limit?: number; search?: string; status?: string; buyer_id?: number; seller_id?: number; user_id?: number }, groups?: string[]): Promise<{ orders: Order[]; pagination: any }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.append(key, value.toString());
      });
    }
    return this.request<{ orders: Order[]; pagination: any }>(`/admin/orders?${params.toString()}`);
  }

  async updateAdminOrderShipping(cognitoUsername: string, orderId: number, data: { tracking_number?: string; tracking_url?: string; status?: string }, groups?: string[]): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ success: boolean }>(`/admin/orders/${orderId}/shipping?${params.toString()}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAnnouncements(cognitoUsername?: string, groups?: string[]): Promise<{ announcements: Array<{ id: number; message: string; severity: string }> }> {
    const params = new URLSearchParams();
    if (cognitoUsername) params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    const qs = params.toString();
    return this.request<{ announcements: Array<{ id: number; message: string; severity: string }> }>(`/announcements${qs ? `?${qs}` : ''}`);
  }

  async getAdminAnnouncements(cognitoUsername: string, groups?: string[]): Promise<{ announcements: any[] }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ announcements: any[] }>(`/announcements/admin?${params.toString()}`);
  }

  async createAnnouncement(cognitoUsername: string, data: { message: string; target_type?: string; target_user_ids?: number[]; severity?: string; is_active?: boolean; start_date?: string; end_date?: string }, groups?: string[]): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ success: boolean }>(`/announcements/admin?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnouncement(cognitoUsername: string, id: number, data: Partial<{ message: string; target_type: string; target_user_ids: number[]; severity: string; is_active: boolean; start_date: string; end_date: string }>, groups?: string[]): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ success: boolean }>(`/announcements/admin/${id}?${params.toString()}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(cognitoUsername: string, id: number, groups?: string[]): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ success: boolean }>(`/announcements/admin/${id}?${params.toString()}`, { method: 'DELETE' });
  }

  async getNotifications(cognitoUsername: string): Promise<{ notifications: Array<{ id: number; type: string; title: string; body?: string; link?: string; reference_id?: number; read_at: string | null; created_at: string }>; unreadCount: number }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    return this.request<{ notifications: any[]; unreadCount: number }>(`/notifications?${params.toString()}`);
  }

  async markNotificationRead(cognitoUsername: string, id: number): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    return this.request<{ success: boolean }>(`/notifications/${id}/read?${params.toString()}`, { method: 'PUT' });
  }

  async dismissNotification(cognitoUsername: string, id: number): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    return this.request<{ success: boolean }>(`/notifications/${id}?${params.toString()}`, { method: 'DELETE' });
  }

  async markAllNotificationsRead(cognitoUsername: string): Promise<{ success: boolean }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    return this.request<{ success: boolean }>(`/notifications/read-all?${params.toString()}`, { method: 'PUT' });
  }

  async sendAdminNotification(cognitoUsername: string, data: { title: string; body?: string; link?: string; target: 'all' | 'specific'; user_ids?: number[]; severity?: 'info' | 'warning' | 'success' | 'error' }, groups?: string[]): Promise<{ success: boolean; sent: number; total: number }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ success: boolean; sent: number; total: number }>(`/admin/notifications/send?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminMessages(cognitoUsername: string, filters?: { page?: number; limit?: number }, groups?: string[]): Promise<any> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, value.toString());
      });
    }
    return this.request<any>(`/admin/messages?${params.toString()}`);
  }


  async updateUserType(cognitoUsername: string, targetCognitoUsername: string, userType: 'artist' | 'buyer' | 'admin'): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/admin/users/${targetCognitoUsername}/user-type?cognitoUsername=${cognitoUsername}`, {
      method: 'PUT',
      body: JSON.stringify({ user_type: userType }),
    });
  }

  async activateUser(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/users/${userId}/activate?${params.toString()}`, {
      method: 'PUT',
    });
  }

  async deactivateUser(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/users/${userId}/deactivate?${params.toString()}`, {
      method: 'PUT',
    });
  }

  async blockUser(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/users/${userId}/block?${params.toString()}`, {
      method: 'PUT',
    });
  }

  async unblockUser(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/users/${userId}/unblock?${params.toString()}`, {
      method: 'PUT',
    });
  }

  async deleteUser(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/users/${userId}?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  async inactivateListingAsAdmin(cognitoUsername: string, listingId: number, groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/listings/${listingId}/inactivate?${params.toString()}`, {
      method: 'PUT',
    });
  }

  async updateListingStatusAsAdmin(cognitoUsername: string, listingId: number, status: 'draft' | 'active' | 'inactive' | 'sold' | 'archived', groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/listings/${listingId}/status?${params.toString()}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteListingAsAdmin(cognitoUsername: string, listingId: number, groups?: string[]): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    return this.request<{ success: boolean; message: string }>(`/admin/listings/${listingId}?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  // Subscription endpoints
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.request<SubscriptionPlan[]>('/subscriptions/plans');
  }

  async getUserSubscription(cognitoUsername: string): Promise<{ subscription: UserSubscription | null }> {
    return this.request<{ subscription: UserSubscription | null }>(`/subscriptions/user/${cognitoUsername}`);
  }

  async createSubscription(cognitoUsername: string, planId: number, billingPeriod: 'monthly' | 'yearly', sessionId: string): Promise<{ subscription: UserSubscription }> {
    return this.request<{ subscription: UserSubscription }>(`/subscriptions/user/${cognitoUsername}`, {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        billing_period: billingPeriod,
        session_id: sessionId,
        auto_renew: true,
      }),
    });
  }

  async cancelSubscription(cognitoUsername: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/subscriptions/user/${cognitoUsername}/cancel`, {
      method: 'PUT',
    });
  }

  async resumeSubscription(cognitoUsername: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/subscriptions/user/${cognitoUsername}/resume`, {
      method: 'PUT',
    });
  }

  // Admin subscription endpoints
  async getAdminSubscriptionPlans(cognitoUsername: string, groups?: string[]): Promise<SubscriptionPlan[]> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) {
      params.append('groups', JSON.stringify(groups));
    }
    const url = `/subscriptions/admin/plans?${params.toString()}`;
    console.log('Calling subscription plans API:', url);
    console.log('With params:', { cognitoUsername, groups });
    return this.request<SubscriptionPlan[]>(url);
  }

  async saveSubscriptionPlan(cognitoUsername: string, groups: string[], plan: Partial<SubscriptionPlan> & { name: string; tier: string; max_listings: number; price_monthly: number; price_yearly: number }): Promise<{ message: string; id: number }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    params.append('groups', JSON.stringify(groups));
    return this.request<{ message: string; id: number }>(`/subscriptions/admin/plans?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  async deleteSubscriptionPlan(cognitoUsername: string, groups: string[], planId: number): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    params.append('groups', JSON.stringify(groups));
    return this.request<{ message: string }>(`/subscriptions/admin/plans/${planId}?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  async getStripePlans(cognitoUsername: string, groups?: string[]): Promise<{ plans: any[] }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups?.length) params.append('groups', JSON.stringify(groups));
    return this.request<{ plans: any[] }>(`/subscriptions/admin/stripe-plans?${params.toString()}`);
  }

  async syncStripePlans(cognitoUsername: string, groups?: string[]): Promise<{ success: boolean; synced: number; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups?.length) params.append('groups', JSON.stringify(groups));
    return this.request<{ success: boolean; synced: number; message: string }>(`/subscriptions/admin/sync-stripe-plans?${params.toString()}`, { method: 'POST' });
  }

  async updateStripePlanPrices(cognitoUsername: string, groups: string[], productId: string, prices: { price_monthly?: number; price_yearly?: number }): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    params.append('groups', JSON.stringify(groups));
    return this.request<{ success: boolean; message: string }>(`/subscriptions/admin/stripe-plans/${productId}/prices?${params.toString()}`, {
      method: 'PUT',
      body: JSON.stringify(prices),
    });
  }

  async getAdminSubscriptions(cognitoUsername: string, filters?: { page?: number; limit?: number; status?: string; plan?: string; search?: string }, groups?: string[]): Promise<{ subscriptions: any[]; pagination: any }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.append(key, value.toString());
      });
    }
    return this.request<{ subscriptions: any[]; pagination: any }>(`/subscriptions/admin/subscriptions?${params.toString()}`);
  }

  async cancelUserSubscriptionAsAdmin(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ message: string }>(`/subscriptions/admin/subscriptions/${userId}/cancel?${params.toString()}`, { method: 'PUT' });
  }

  async resumeUserSubscriptionAsAdmin(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ message: string }>(`/subscriptions/admin/subscriptions/${userId}/resume?${params.toString()}`, { method: 'PUT' });
  }

  async expireUserSubscriptionAsAdmin(cognitoUsername: string, userId: number, groups?: string[]): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ message: string }>(`/subscriptions/admin/subscriptions/${userId}/expire?${params.toString()}`, { method: 'PUT' });
  }

  async extendUserSubscriptionAsAdmin(cognitoUsername: string, userId: number, days: number, groups?: string[]): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('cognitoUsername', cognitoUsername);
    if (groups && groups.length > 0) params.append('groups', JSON.stringify(groups));
    return this.request<{ message: string }>(`/subscriptions/admin/subscriptions/${userId}/extend?${params.toString()}`, {
      method: 'PUT',
      body: JSON.stringify({ days }),
    });
  }

  async getSupportChatConfig(): Promise<any> {
    return this.request<any>('/support-chat/config');
  }

  async updateSupportChatConfig(config: any): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/support-chat/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getPayoutConfig(): Promise<{ commission_percent: number }> {
    return this.request<{ commission_percent: number }>('/support-chat/payout-config');
  }

  async updatePayoutConfig(commission_percent: number): Promise<{ success: boolean; commission_percent: number }> {
    return this.request<{ success: boolean; commission_percent: number }>('/support-chat/payout-config', {
      method: 'PUT',
      body: JSON.stringify({ commission_percent }),
    });
  }

  async getSupportChatMessages(params: { cognitoUsername?: string; userId?: number }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params.cognitoUsername) qs.append('cognitoUsername', params.cognitoUsername);
    if (params.userId !== undefined) qs.append('userId', String(params.userId));
    return this.request<any[]>(`/support-chat/messages?${qs.toString()}`);
  }

  async sendSupportChatMessage(data: {
    cognitoUsername?: string;
    userId?: number;
    guestSessionId?: string;
    guestName?: string;
    guestEmail?: string;
    supportType?: 'sales' | 'signup' | 'subscription' | 'billing' | 'technical' | 'general';
    message: string;
    sender: 'user' | 'admin';
    adminCognitoUsername?: string;
    targetUserId?: number;
  }): Promise<any> {
    return this.request<any>('/support-chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markSupportChatRead(params: { cognitoUsername?: string; userId?: number; sender: 'user' | 'admin' }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/support-chat/messages/read', {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  async getSupportChatConversations(): Promise<any[]> {
    return this.request<any[]>('/support-chat/admin/conversations');
  }

  async getSupportChatAdminMessages(userId: number): Promise<any[]> {
    return this.request<any[]>(`/support-chat/admin/messages/${userId}`);
  }

  async getUserChatEnabled(): Promise<{ enabled: boolean }> {
    return this.request<{ enabled: boolean }>('/support-chat/user-chat-enabled');
  }

  async setUserChatEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    return this.request<{ success: boolean; enabled: boolean }>('/support-chat/user-chat-enabled', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }

  async getTestDataEnabled(): Promise<{ enabled: boolean }> {
    return this.request<{ enabled: boolean }>('/support-chat/test-data-enabled');
  }

  async setTestDataEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    return this.request<{ success: boolean; enabled: boolean }>('/support-chat/test-data-enabled', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }
}

export interface Review {
  id: number;
  listing_id: number;
  user_id: number;
  comment: string | null;
  rating: number;
  created_at: string;
  updated_at: string;
  cognito_username: string;
  user_name: string;
  profile_image_url?: string;
}

export interface Message {
  id: number;
  listing_id: number;
  sender_id: number;
  recipient_id: number;
  subject: string;
  message: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  status: 'sent' | 'read' | 'archived';
  created_at: string;
  updated_at: string;
  listing_title?: string;
  listing_image?: string;
  sender_name_display?: string;
  recipient_name?: string;
  parent_message_id?: number | null;
  replies?: Message[];
}

export const apiService = new ApiService();
export default apiService;
