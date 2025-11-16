import { supabase } from '../supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export class AuthService {
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
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
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