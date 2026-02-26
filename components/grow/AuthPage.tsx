import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Sprout, Eye, EyeOff } from 'lucide-react';
import { auth, AuthUser } from '../../lib/grow/auth';
import { api } from '../../lib/grow/api';

interface AuthPageProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Sign in form
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Sign up form
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { user } = await auth.signIn(signInData.email, signInData.password);
      onAuthSuccess(user);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (signUpData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      await api.signup(
        signUpData.email,
        signUpData.password,
        signUpData.name,
        null // Interests will be set during onboarding
      );

      // Now sign them in
      const { user: signedInUser } = await auth.signIn(signUpData.email, signUpData.password);
      onAuthSuccess(signedInUser);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoMode = () => {
    setIsLoading(true);
    setError('');

    // Create a demo user
    const demoUser: AuthUser = {
      id: 'demo-user-' + Date.now(),
      email: 'demo@growdaisy.com',
      name: 'Demo User'
    };

    // Simulate loading
    setTimeout(() => {
      onAuthSuccess(demoUser);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sprout className="h-10 w-10 text-emerald-600" />
            <h1 className="text-3xl font-semibold text-emerald-900">Grow Daisy</h1>
          </div>
          <p className="text-emerald-700">
            Your garden, guided by the weather
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      autoComplete="email"
                      value={signInData.email}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignInData({ ...signInData, email: event.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="current-password"
                      value={signInData.password}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignInData({ ...signInData, password: event.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Full Name"
                      autoComplete="name"
                      value={signUpData.name}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignUpData({ ...signUpData, name: event.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      autoComplete="email"
                      value={signUpData.email}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignUpData({ ...signUpData, email: event.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="new-password"
                      value={signUpData.password}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignUpData({ ...signUpData, password: event.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      autoComplete="new-password"
                      value={signUpData.confirmPassword}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignUpData({ ...signUpData, confirmPassword: event.target.value })}
                      required
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 border-t pt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDemoMode}
                disabled={isLoading}
              >
                Try Demo Mode
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Experience the app without creating an account
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
