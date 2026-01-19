import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  signIn, 
  signUp, 
  signOut, 
  confirmSignUp, 
  getCurrentUser, 
  fetchUserAttributes,
  fetchAuthSession,
  resetPassword,
  confirmResetPassword
} from 'aws-amplify/auth';
import apiService, { User as ApiUser } from '../services/api';
import { UserRole, UserRoleType } from '../types/userRoles';

interface User {
  id: string;
  email: string;
  name?: string;
  userRole?: UserRoleType;
  groups?: string[];
  attributes?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<{ username: string } | null>;
  signUp: (email: string, password: string, attributes: Record<string, string>, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (usernameOrEmail: string, code: string) => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getRoleFromGroups = (groups: string[]): UserRoleType | undefined => {
    if (!groups || groups.length === 0) {
      return undefined;
    }
    
    if (groups.includes(UserRole.SITE_ADMIN) || groups.includes('site_admin') || groups.includes('admin')) {
      return UserRole.SITE_ADMIN;
    }
    if (groups.includes(UserRole.ARTIST) || groups.includes('artist')) {
      return UserRole.ARTIST;
    }
    if (groups.includes(UserRole.BUYER) || groups.includes('buyer')) {
      return UserRole.BUYER;
    }
    return undefined;
  };

  const decodeToken = (token: string): any => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const checkAuthState = useCallback(async () => {
    try {
      const cognitoUser = await getCurrentUser();
      if (cognitoUser) {
        const attributes = await fetchUserAttributes();
        const userAttributesObj = attributes;
        
        let groups: string[] = [];
        let userRole: UserRoleType | undefined;
        
        try {
          const session = await fetchAuthSession({ forceRefresh: true });
          
          if (session.tokens?.idToken) {
            const idToken = session.tokens.idToken.toString();
            const decodedIdToken = decodeToken(idToken);
            
            if (decodedIdToken['cognito:groups']) {
              groups = Array.isArray(decodedIdToken['cognito:groups']) 
                ? decodedIdToken['cognito:groups'] 
                : [decodedIdToken['cognito:groups']];
            } else if (decodedIdToken['groups']) {
              groups = Array.isArray(decodedIdToken['groups']) 
                ? decodedIdToken['groups'] 
                : [decodedIdToken['groups']];
            }
          }
          
          if (groups.length === 0 && session.tokens?.accessToken) {
            const accessToken = session.tokens.accessToken.toString();
            const decodedAccessToken = decodeToken(accessToken);
            
            if (decodedAccessToken['cognito:groups']) {
              groups = Array.isArray(decodedAccessToken['cognito:groups']) 
                ? decodedAccessToken['cognito:groups'] 
                : [decodedAccessToken['cognito:groups']];
            }
          }
          
          userRole = getRoleFromGroups(groups);
        } catch (tokenError) {
          // Token fetch/decoding failed, continue without groups
        }

        try {
          const dbUser: ApiUser = await apiService.getUser(cognitoUser.username);
          
          // Convert active to boolean (handle MySQL 0/1)
          const isActive = dbUser.active !== undefined 
            ? Boolean(dbUser.active)
            : true;
          
          setUser({
            id: cognitoUser.username,
            email: userAttributesObj.email || dbUser.email || '',
            name: dbUser.first_name && dbUser.last_name 
              ? `${dbUser.first_name} ${dbUser.last_name}`
              : userAttributesObj.name || (userAttributesObj.given_name ? `${userAttributesObj.given_name} ${userAttributesObj.family_name || ''}`.trim() : ''),
            userRole: userRole,
            groups: groups,
            attributes: { ...userAttributesObj, ...dbUser, active: isActive } as Record<string, any>,
          });
        } catch (dbError) {
          setUser({
            id: cognitoUser.username,
            email: userAttributesObj.email || '',
            name: userAttributesObj.name || (userAttributesObj.given_name ? `${userAttributesObj.given_name} ${userAttributesObj.family_name || ''}`.trim() : ''),
            userRole: userRole,
            groups: groups,
            attributes: { ...userAttributesObj, active: true },
          });
        }
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        checkAuthState();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, checkAuthState]);

  const handleSignIn = async (usernameOrEmail: string, password: string) => {
    try {
      await signIn({ username: usernameOrEmail, password });
      await checkAuthState();
      // Return the current user so caller can check if they exist in DB
      const cognitoUser = await getCurrentUser();
      return cognitoUser;
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed');
    }
  };

  const handleSignUp = async (email: string, password: string, attributes: Record<string, string>, username?: string) => {
    try {
      // Use provided username or generate a unique one
      const finalUsername = username || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await signUp({
        username: finalUsername,
        password,
        options: {
          userAttributes: {
            email: email,
            ...attributes,
          },
        },
      });
    } catch (error: any) {
      throw new Error(error.message || 'Sign up failed');
    }
  };

  const handleConfirmSignUp = async (usernameOrEmail: string, code: string) => {
    try {
      await confirmSignUp({ username: usernameOrEmail, confirmationCode: code });
    } catch (error: any) {
      throw new Error(error.message || 'Confirmation failed');
    }
  };

  const handleResendConfirmationCode = async (_email: string) => {
    try {
      // In AWS Amplify v6, resending confirmation codes requires backend support
      // or using AWS SDK directly. For now, we'll show a helpful error message.
      // TODO: Implement backend endpoint or AWS SDK call for resending codes
      throw new Error('Resend confirmation code feature is not available. Please contact support or try signing up again.');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend confirmation code');
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await resetPassword({ username: email });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send reset code');
    }
  };

  const handleResetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error: any) {
      throw new Error(error.message || 'Sign out failed');
    }
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
