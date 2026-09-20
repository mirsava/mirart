import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import apiService, { User as ApiUser } from '../services/api';
import { UserRole, UserRoleType } from '../types/userRoles';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  userRole?: UserRoleType;
  groups?: string[];
  attributes?: Record<string, any>;
}

export interface SignUpProfile {
  username: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  user_type?: 'artist' | 'buyer';
  phone?: string;
  country?: string;
  website?: string;
  specialties?: string[];
  experience_level?: string;
  address_line1?: string;
  address_line2?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<{ username: string } | null>;
  signUp: (email: string, password: string, profile: SignUpProfile) => Promise<{ userId: string | null; hasSession: boolean }>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const roleFromUserType = (userType?: string): { role?: UserRoleType; groups: string[] } => {
  if (userType === 'admin') return { role: UserRole.SITE_ADMIN, groups: [UserRole.SITE_ADMIN] };
  if (userType === 'artist') return { role: UserRole.ARTIST, groups: [UserRole.ARTIST] };
  if (userType === 'buyer') return { role: UserRole.BUYER, groups: [UserRole.BUYER] };
  return { groups: [] };
};

// Keeps the { name, code, message } shape the sign-in / confirm pages branch on.
const toAuthError = (error: { message?: string; code?: string; name?: string }, fallback: string) => {
  const authError: any = new Error(error?.message || fallback);
  authError.code = error?.code || error?.name || 'auth_error';
  authError.name = error?.code || error?.name || 'AuthError';
  return authError;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const checkAuthState = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user;
      if (!authUser) {
        setUser(null);
        return;
      }

      const metadata = authUser.user_metadata || {};
      const metaName = [metadata.first_name, metadata.last_name].filter(Boolean).join(' ');

      try {
        const dbUser: ApiUser = await apiService.getUser(authUser.id);
        const { role, groups } = roleFromUserType(dbUser.user_type);
        setUser({
          id: authUser.id,
          email: authUser.email || dbUser.email || '',
          username: dbUser.username || metadata.username || undefined,
          name: dbUser.first_name && dbUser.last_name ? `${dbUser.first_name} ${dbUser.last_name}` : metaName,
          userRole: role,
          groups,
          attributes: { ...dbUser, active: dbUser.active !== undefined ? Boolean(dbUser.active) : true } as Record<string, any>,
        });
      } catch {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          username: metadata.username || undefined,
          name: metaName,
          userRole: undefined,
          groups: [],
          attributes: { ...metadata, active: true },
        });
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthState();

    // Never call other Supabase methods directly inside this callback; defer to avoid a client deadlock.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setTimeout(() => checkAuthState(), 0);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [checkAuthState]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (userRef.current) checkAuthState();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkAuthState]);

  const handleSignIn = async (usernameOrEmail: string, password: string) => {
    const identifier = usernameOrEmail.trim();

    if (identifier.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
      if (error) throw toAuthError(error, 'Sign in failed');
    } else {
      // Usernames are resolved on the server so email addresses are never exposed to the browser.
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });
      } catch {
        throw toAuthError({ message: 'Failed to connect to server. Please try again.' }, 'Sign in failed');
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = toAuthError({ message: body.error, code: body.code }, 'Sign in failed');
        if (body.email) err.email = body.email;
        throw err;
      }
      const { error } = await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
      if (error) throw toAuthError(error, 'Sign in failed');
    }

    await checkAuthState();
    const { data } = await supabase.auth.getSession();
    return data.session ? { username: data.session.user.id } : null;
  };

  const handleSignUp = async (email: string, password: string, profile: SignUpProfile) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: profile,
        emailRedirectTo: `${window.location.origin}/confirm-signup`,
      },
    });
    if (error) throw toAuthError(error, 'Sign up failed');

    // Supabase hides duplicates when confirmation is on: an existing account comes back with no identities.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw toAuthError({ message: 'An account with this email already exists. Try signing in instead.', code: 'user_already_exists' }, 'Sign up failed');
    }
    return { userId: data.user?.id ?? null, hasSession: Boolean(data.session) };
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' });
    if (error) throw toAuthError(error, 'Confirmation failed');
  };

  const handleResendConfirmationCode = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) throw toAuthError(error, 'Failed to resend confirmation code');
  };

  const handleForgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/forgot-password`,
    });
    if (error) throw toAuthError(error, 'Failed to send reset code');
  };

  const handleResetPassword = async (email: string, code: string, newPassword: string) => {
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    if (verifyError) throw toAuthError(verifyError, 'Password reset failed');

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw toAuthError(updateError as AuthError, 'Password reset failed');

    await supabase.auth.signOut();
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw toAuthError(error, 'Sign out failed');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    resendConfirmationCode: handleResendConfirmationCode,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    refreshUser: checkAuthState,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
