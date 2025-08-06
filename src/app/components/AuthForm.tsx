'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AuthForm() {
  const searchParams = useSearchParams();
  const paramMode = searchParams.get('mode');
  // default to login or signup based on query
  const initialMode = paramMode === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [recoverySession, setRecoverySession] = useState<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // detect Supabase recovery link in hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) toast.error(error.message);
          });
        setRecoverySession({ accessToken, refreshToken });
        setMode('reset');
        // clear hash params
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Sign up successful! Check your email for verification.');
        router.push('/auth?mode=login');
      }
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Login successful!');
        router.push('/dashboard');
      }
      return;
    }

    // reset mode
    if (mode === 'reset') {
      if (recoverySession) {
        if (password !== confirmPassword) {
          setLoading(false);
          toast.error('Passwords must match.');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Password updated! Please login.');
          router.push('/auth?mode=login');
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        setLoading(false);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Password reset email sent! Check your inbox.');
          router.push('/auth?mode=login');
        }
      }
      return;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 animate-fadeIn">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="Ad Analyzer Logo"
            className="mx-auto mb-4 w-16 h-16"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'signup'
              ? 'Create Your Account'
              : mode === 'login'
              ? 'Welcome Back'
              : 'Reset Your Password'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {mode === 'signup'
              ? 'to start analyzing your ads.'
              : mode === 'login'
              ? 'to continue your analysis.'
              : recoverySession
              ? 'Enter a new password.'
              : 'Enter your email to receive a reset link.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
            />
          </div>
          {mode === 'reset' && recoverySession ? (
            <>
              <div>
                <label
                  htmlFor="new-password"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                />
              </div>
            </>
          ) : mode !== 'reset' ? (
            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
              />
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition"
          >
            {loading
              ? 'Processing...'
              : mode === 'signup'
              ? 'Sign Up'
              : mode === 'login'
              ? 'Login'
              : recoverySession
              ? 'Reset Password'
              : 'Send Reset Email'}
          </button>
          <div className="text-center text-sm text-gray-600 dark:text-gray-300 space-y-1">
            {mode !== 'signup' && (
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="underline text-primary"
              >
                Sign Up
              </button>
            )}
            {mode !== 'login' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="underline text-primary"
              >
                Login
              </button>
            )}
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="underline text-primary"
              >
                Forgot Password?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}