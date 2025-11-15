import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signIn, 
  signUp, 
  signOut, 
  confirmSignUp, 
  getCurrentUser, 
  fetchUserAttributes,
  resetPassword,
  confirmResetPassword
} from 'aws-amplify/auth';
import apiService, { User as ApiUser } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  userType?: 'artist' | 'buyer' | 'admin';
  attributes?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, attributes: Record<string, string>, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (usernameOrEmail: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
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

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const cognitoUser = await getCurrentUser();
      if (cognitoUser) {
        const attributes = await fetchUserAttributes();
        const userAttributesObj = attributes;

        // Default to 'artist' if userType is not set (since custom attributes aren't configured yet)
        // Users signing up through artist signup should be treated as artists
        const userType = userAttributesObj['custom:user_type'] as 'artist' | 'buyer' | 'admin' || 'artist';
        
        // Try to fetch user data from database
        try {
          const dbUser: ApiUser = await apiService.getUser(cognitoUser.username);
          setUser({
            id: cognitoUser.username,
            email: userAttributesObj.email || dbUser.email || '',
            name: dbUser.first_name && dbUser.last_name 
              ? `${dbUser.first_name} ${dbUser.last_name}`
              : userAttributesObj.name || (userAttributesObj.given_name ? `${userAttributesObj.given_name} ${userAttributesObj.family_name || ''}`.trim() : ''),
            userType: userType,
            attributes: { ...userAttributesObj, ...dbUser } as Record<string, any>,
          });
        } catch (dbError) {
          // If user doesn't exist in DB yet, use Cognito data only
          setUser({
            id: cognitoUser.username,
            email: userAttributesObj.email || '',
            name: userAttributesObj.name || (userAttributesObj.given_name ? `${userAttributesObj.given_name} ${userAttributesObj.family_name || ''}`.trim() : ''),
            userType: userType,
            attributes: userAttributesObj,
          });
        }
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (usernameOrEmail: string, password: string) => {
    try {
      await signIn({ username: usernameOrEmail, password });
      await checkAuthState();
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
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
