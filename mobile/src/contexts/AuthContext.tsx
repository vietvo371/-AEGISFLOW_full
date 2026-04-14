import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types/api/auth';
import { authService } from '../services/authService';
import NotificationTokenService from '../services/NotificationTokenService';
import PushNotificationHelper from '../utils/PushNotificationHelper';
import { resetTo } from '../navigation/NavigationService';

// ============================================================================
// TYPES — AegisFlowAI
// ============================================================================

export interface LoginValidationResult {
  isValid: boolean;
  errors: {
    email?: string;
    password?: string;
  };
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
  errors?: {
    email?: string;
    password?: string;
  };
}

interface AuthContextData {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;

  // Computed
  userRole: UserRole | null;
  isCitizen: boolean;
  isEmergency: boolean;
  isOperator: boolean;

  // Auth Methods
  validateLogin: (email: string, password: string) => LoginValidationResult;
  signIn: (credentials: { email: string; password: string }) => Promise<LoginResult>;
  signUp: (userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = PushNotificationHelper.onTokenRefresh(async (newToken) => {
      try {
        await NotificationTokenService.updateTokenOnRefresh(newToken);
      } catch (error) {
        console.log('FCM token refresh error:', error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const initializeApp = async () => {
    try {
      const token = await authService.getToken();
      if (token) {
        try {
          const userProfile = await authService.getProfile();
          setUser(userProfile);
        } catch (error) {
          console.log('Token invalid:', error);
          await signOut();
        }
      }
    } catch (error) {
      console.log('Init error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // AUTH METHODS
  // ============================================================================

  const validateLogin = (email: string, password: string): LoginValidationResult => {
    const errors: { email?: string; password?: string } = {};

    if (!email) {
      errors.email = 'EMAIL_REQUIRED';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'VALID_EMAIL';
    }

    if (!password) {
      errors.password = 'PASSWORD_REQUIRED';
    } else if (password.length < 6) {
      errors.password = 'PASSWORD_MIN_LENGTH';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const signIn = async (credentials: { email: string; password: string }): Promise<LoginResult> => {
    try {
      const response = await authService.login({
        email: credentials.email,
        password: credentials.password,
      });

      setUser(response.user);
 
       // Register FCM token
       try {
         await NotificationTokenService.registerTokenAfterLogin();
       } catch (fcmError) {
         console.log('FCM register error (non-blocking):', fcmError);
       }
 
       return { success: true, user: response.user };
    } catch (error: any) {
      let errorMessage = 'Login failed';
      const errors: { email?: string; password?: string } = {};

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        errors.email = errorMessage;
      }

      return { success: false, error: errorMessage, errors };
    }
  };

  const signUp = async (userData: any) => {
    try {
      await authService.register(userData);
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      try {
        await NotificationTokenService.unregisterTokenAfterLogout();
      } catch (fcmError) {
        console.log('FCM unregister error:', fcmError);
      }

      await authService.logout();
      setUser(null);
      
      // Force direct navigation back to Login screen
      resetTo('Login');
    } catch (error: any) {
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      const userProfile = await authService.getProfile();
      setUser(userProfile);
    } catch (error) {
      console.log('Profile refresh error:', error);
    }
  };

  // ============================================================================
  // COMPUTED — Role-based helpers
  // ============================================================================

  const getPrimaryRole = (): UserRole | null => {
    if (!user?.roles?.length) return null;
    // Priority: admin > emergency > traffic_operator > urban_planner > citizen
    const priority: UserRole[] = ['admin', 'emergency', 'traffic_operator', 'urban_planner', 'citizen'];
    for (const role of priority) {
      if (user.roles.includes(role)) return role;
    }
    return user.roles[0] as UserRole;
  };

  const userRole = getPrimaryRole();
  const isCitizen = userRole === 'citizen';
  const isEmergency = userRole === 'emergency';
  const isOperator = userRole === 'traffic_operator' || userRole === 'urban_planner' || userRole === 'admin';

  // ============================================================================
  // PROVIDER
  // ============================================================================

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        loading,
        userRole,
        isCitizen,
        isEmergency,
        isOperator,
        validateLogin,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export type { AuthContextData };