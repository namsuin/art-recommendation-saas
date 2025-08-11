import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface AuthContextType {
  user: any;
  userProfile: any;
  loading: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, displayName?: string, role?: string, artistInfo?: any) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useSupabaseAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};