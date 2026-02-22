import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/api';

export interface FavoriteItem {
  id: number;
  title: string;
  price: number;
  primary_image_url?: string;
  category: string;
  in_stock: boolean;
  status: string;
  cognito_username: string;
  artist_name: string;
  like_count: number;
  favorited_at: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoriteIds: Set<number>;
  favoritesLoading: boolean;
  fetchFavorites: () => Promise<void>;
  addFavorite: (listingId: number) => Promise<{ likeCount: number } | null>;
  removeFavorite: (listingId: number) => Promise<{ likeCount: number } | null>;
  isFavorite: (listingId: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }
    setFavoritesLoading(true);
    try {
      const data = await apiService.getFavoriteListings(user.id);
      const list = data.listings || [];
      setFavorites(list);
      setFavoriteIds(new Set(list.map(f => f.id)));
    } catch {
      setFavorites([]);
      setFavoriteIds(new Set());
    } finally {
      setFavoritesLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = useCallback(async (listingId: number): Promise<{ likeCount: number } | null> => {
    if (!isAuthenticated || !user?.id) return null;
    try {
      const result = await apiService.likeListing(listingId, user.id);
      setFavoriteIds(prev => new Set([...prev, listingId]));
      fetchFavorites();
      return { likeCount: result.likeCount };
    } catch {
      return null;
    }
  }, [isAuthenticated, user?.id, fetchFavorites]);

  const removeFavorite = useCallback(async (listingId: number): Promise<{ likeCount: number } | null> => {
    if (!isAuthenticated || !user?.id) return null;
    try {
      const result = await apiService.unlikeListing(listingId, user.id);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
      setFavorites(prev => prev.filter(f => f.id !== listingId));
      return { likeCount: result.likeCount };
    } catch {
      return null;
    }
  }, [isAuthenticated, user?.id]);

  const isFavorite = useCallback((listingId: number) => favoriteIds.has(listingId), [favoriteIds]);

  return (
    <FavoritesContext.Provider value={{ favorites, favoriteIds, favoritesLoading, fetchFavorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider');
  return context;
}
