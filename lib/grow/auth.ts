import { supabase } from '../supabase/client';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;

export class AuthService {
  private listeners: Set<AuthStateCallback> = new Set();
  private currentSession: Session | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Subscribe to auth state changes - this handles initial session load from cookies
    if (typeof window !== 'undefined') {
      supabase.auth.onAuthStateChange((event, session) => {
        this.currentSession = session;
        this.initialized = true;
        
        // Update localStorage with token
        if (session?.access_token) {
          localStorage.setItem('access_token', session.access_token);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('access_token');
        }
        
        // Notify all listeners
        this.listeners.forEach(callback => callback(event, session));
      });
    }
  }

  /**
   * Wait for the initial session to be loaded from cookies.
   * This is important on page refresh to ensure we have the session before checking auth.
   */
  private async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      // If already initialized while we were setting up, resolve immediately
      if (this.initialized) {
        resolve();
        return;
      }

      // Set up a one-time listener for the initial session
      const unsubscribe = this.onAuthStateChange(() => {
        unsubscribe();
        resolve();
      });

      // Also set a timeout in case onAuthStateChange never fires (no session)
      setTimeout(() => {
        this.initialized = true;
        resolve();
      }, 1000);
    });

    return this.initPromise;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: AuthStateCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser; accessToken: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session?.access_token) {
      throw new Error('No access token received');
    }

    localStorage.setItem('access_token', data.session.access_token);

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata.name || '',
      },
      accessToken: data.session.access_token,
    };
  }

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (_error) {
      // Silently handle auth service being unavailable
    }
    localStorage.removeItem('access_token');
  }

  async getSession(): Promise<{ user: AuthUser; accessToken: string } | null> {
    try {
      // Wait for initial session load from cookies on page refresh
      await this.waitForInitialization();

      // Use cached session if available (from onAuthStateChange)
      if (this.currentSession) {
        return {
          user: {
            id: this.currentSession.user.id,
            email: this.currentSession.user.email!,
            name: this.currentSession.user.user_metadata.name || '',
          },
          accessToken: this.currentSession.access_token,
        };
      }

      // Fallback to fetching from Supabase
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        return null;
      }

      // Update localStorage with fresh token
      localStorage.setItem('access_token', data.session.access_token);

      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email!,
          name: data.session.user.user_metadata.name || '',
        },
        accessToken: data.session.access_token,
      };
    } catch (_error) {
      // Auth service unavailable
      return null;
    }
  }

  async refreshSession(): Promise<{ user: AuthUser; accessToken: string } | null> {
    try {
      console.log('🔄 Refreshing authentication session...');
      window.dispatchEvent(new CustomEvent('auth:refreshing'));
      
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error('❌ Session refresh failed:', error?.message);
        // Clear invalid token
        localStorage.removeItem('access_token');
        window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
        return null;
      }

      console.log('✅ Session refreshed successfully');
      // Update localStorage with fresh token
      localStorage.setItem('access_token', data.session.access_token);
      window.dispatchEvent(new CustomEvent('auth:refresh-success'));

      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email!,
          name: data.session.user.user_metadata.name || '',
        },
        accessToken: data.session.access_token,
      };
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      localStorage.removeItem('access_token');
      window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
      return null;
    }
  }

  getCurrentAccessToken(): string | null {
    // Use cached session first, then fall back to localStorage
    return this.currentSession?.access_token ?? localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    // Use cached session first, then fall back to localStorage
    return !!(this.currentSession?.access_token || localStorage.getItem('access_token'));
  }

  /**
   * Check if session has been initialized (useful for loading states)
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  async getUser(): Promise<AuthUser | null> {
    try {
      const session = await this.getSession();
      return session?.user || null;
    } catch (error) {
      console.warn('Failed to get user:', error);
      return null;
    }
  }
}

export const auth = new AuthService();