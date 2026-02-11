'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  email?: string;
}

interface RegisterResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, name: string, password: string) => Promise<RegisterResult>;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'a4docs_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const validateToken = useCallback(async (tokenToValidate: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${tokenToValidate}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(tokenToValidate);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle NextAuth session (for Google sign-in)
  useEffect(() => {
    if (status === 'loading') return;

    if (session?.customToken) {
      // Google sign-in successful, use the custom token
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
      });
      setToken(session.customToken);
      localStorage.setItem(TOKEN_KEY, session.customToken);
      setIsLoading(false);
    } else if (status === 'unauthenticated') {
      // Check for existing token in localStorage
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        validateToken(savedToken);
      } else {
        setIsLoading(false);
      }
    }
  }, [session, status, validateToken]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error,
          requiresVerification: data.requiresVerification,
          email: data.email
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (email: string, name: string, password: string): Promise<RegisterResult> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful but requires verification
        return {
          success: true,
          requiresVerification: data.requiresVerification,
          email: data.email
        };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signInWithGoogle = async () => {
    await nextAuthSignIn('google', { callbackUrl: '/create' });
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);

    // Also sign out from NextAuth if using Google
    if (session) {
      await nextAuthSignOut({ redirect: false });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
