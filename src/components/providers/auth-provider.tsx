'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { account } from '@/lib/appwrite-client';
import { User } from '@/types';
import { useRouter } from 'next/navigation';
import { Models, Query } from 'appwrite';

interface AuthContextType {
  user: User | null;
  session: Models.Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Models.Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = async () => {
    try {
      const currentSession = await account.getSession('current');
      setSession(currentSession);

      const currentUser = await account.get();

      // Fetch user data from database
      try {
        const { databases } = await import('@/lib/appwrite-client');
        const { DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite-config');

        // Try to find user in USERS collection by email
        const usersResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USERS,
          [Query.equal('email', currentUser.email)]
        );

        if (usersResponse.documents.length > 0) {
          // User exists in database
          const dbUser = usersResponse.documents[0];
          const userData: User = {
            $id: dbUser.$id,
            email: dbUser.email,
            name: dbUser.name,
            phone: dbUser.phone,
            avatar: dbUser.avatar,
            role: dbUser.role,
            workspaceId: dbUser.workspaceId,
            status: dbUser.status,
            $createdAt: dbUser.$createdAt,
            $updatedAt: dbUser.$updatedAt,
          };
          setUser(userData);
        } else {
          // User doesn&apos;t exist in database yet - create minimal user object
          const userData: User = {
            $id: currentUser.$id,
            email: currentUser.email,
            name: currentUser.name,
            role: 'SOFTWARE_DEVELOPER', // Default role
            workspaceId: '', // No workspace yet
            status: 'ACTIVE',
            $createdAt: currentUser.$createdAt,
            $updatedAt: currentUser.$updatedAt,
          };
          setUser(userData);
        }
      } catch (dbError) {
        console.error('Error fetching user from database:', dbError);
        // Fallback to minimal user object
        const userData: User = {
          $id: currentUser.$id,
          email: currentUser.email,
          name: currentUser.name,
          role: 'SOFTWARE_DEVELOPER',
          workspaceId: '',
          status: 'ACTIVE',
          $createdAt: currentUser.$createdAt,
          $updatedAt: currentUser.$updatedAt,
        };
        setUser(userData);
      }
    } catch (error) {
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Create session
      await account.createEmailPasswordSession(email, password);

      // Load user data
      await loadUser();

      // Get current user
      const currentUser = await account.get();

      // Check app_users collection for admin status and temp password
      const { databases } = await import('@/lib/appwrite-client');
      const APP_USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_APP_USERS_ID || 'app_users';
      const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

      try {
        const appUsersResponse = await databases.listDocuments(
          DATABASE_ID,
          APP_USERS_COLLECTION_ID,
          [Query.equal('userId', currentUser.$id), Query.limit(1)]
        );

        if (appUsersResponse.documents.length > 0) {
          const appUser = appUsersResponse.documents[0];

          // Check if user has temp password - force change
          if (appUser.hasTempPassword === true) {
            router.push('/change-password?forced=true');
            return;
          }

          // Check if user has workspaces
          const workspaceIds = appUser.workspaceIds || [];

          if (workspaceIds.length === 0) {
            // No workspaces - check if admin
            if (appUser.isAdmin === true) {
              // Admin with no workspace - send to onboarding to create one
              router.push('/onboarding');
              return;
            } else {
              // Non-admin with no workspace - should not happen, but handle gracefully
              throw new Error('Your account is not associated with any workspace. Please contact your administrator.');
            }
          }

          // Has workspace(s) - go to dashboard
          router.push('/dashboard');
        } else {
          // No app_users record - should not happen with new system
          // But handle gracefully for migration period
          router.push('/dashboard');
        }
      } catch (dbError) {
        console.error('Error checking app user:', dbError);
        // Fallback to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout, refreshUser }}>
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
