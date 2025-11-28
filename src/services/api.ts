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
  price: number | null;
  primary_image_url?: string;
  image_urls?: string[];
  dimensions?: string;
  medium?: string;
  year?: number;
  in_stock: boolean;
  status: 'draft' | 'active' | 'inactive' | 'sold' | 'archived';
  views: number;
  created_at: string;
  updated_at: string;
  artist_name?: string;
  cognito_username?: string;
  signature_url?: string;
  shipping_info?: string;
  returns_info?: string;
  like_count?: number;
  is_liked?: boolean;
  allow_comments?: boolean;
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
    totalViews: number;
    draftListings: number;
    messagesReceived: number;
    totalLikes: number;
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
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    cognitoUsername?: string;
  }): Promise<{ listings: Listing[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, value.toString());
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

  async activateListing(id: number, cognitoUsername: string, paymentIntentId?: string): Promise<Listing> {
    return this.request<Listing>(`/listings/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({
        cognito_username: cognitoUsername,
        payment_intent_id: paymentIntentId
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

  async getMessages(cognitoUsername: string, type: 'all' | 'sent' | 'received' | 'archived' = 'all'): Promise<{ messages: Message[] }> {
    return this.request<{ messages: Message[] }>(`/messages/user/${cognitoUsername}?type=${type}`);
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

  async createChatConversation(cognitoUsername: string, otherUserId: number, listingId: number | null, message: string): Promise<{ success: boolean; conversationId: number }> {
    return this.request<{ success: boolean; conversationId: number }>(`/chat/conversation`, {
      method: 'POST',
      body: JSON.stringify({ cognitoUsername, otherUserId, listingId, message }),
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

  async getListingComments(listingId: number): Promise<{ comments: Comment[] }> {
    return this.request<{ comments: Comment[] }>(`/comments/listing/${listingId}`);
  }

  async createComment(listingId: number, cognitoUsername: string, comment: string, parentCommentId?: number): Promise<{ comment: Comment }> {
    return this.request<{ comment: Comment }>(`/comments`, {
      method: 'POST',
      body: JSON.stringify({ listingId, cognitoUsername, comment, parentCommentId }),
    });
  }

  async deleteComment(commentId: number, cognitoUsername: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/comments/${commentId}?cognitoUsername=${encodeURIComponent(cognitoUsername)}`, {
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

  async getAdminUsers(cognitoUsername: string, filters?: { page?: number; limit?: number; search?: string }, groups?: string[]): Promise<any> {
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

  async getAdminListings(cognitoUsername: string, filters?: { page?: number; limit?: number; status?: string; category?: string }, groups?: string[]): Promise<any> {
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
}

export interface Comment {
  id: number;
  listing_id: number;
  user_id: number;
  comment: string;
  parent_comment_id?: number | null;
  created_at: string;
  updated_at: string;
  cognito_username: string;
  user_name: string;
  profile_image_url?: string;
  replies?: Comment[];
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
