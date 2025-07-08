'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AuthForm() {
  const searchParams = useSearchParams();
  const paramMode = searchParams.get('mode');
  const initialMode = paramMode === 'login' ? 'login' : 'signup';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Login successful!');
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 animate-fadeIn">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          {mode === 'signup' ? 'Sign Up' : 'Login'}
        </h1>
        <label className="block mb-4">
          <span className="text-gray-700 dark:text-gray-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block mb-6">
          <span className="text-gray-700 dark:text-gray-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
        >
          {loading ? (mode === 'signup' ? 'Signing Up...' : 'Logging In...') : (mode === 'signup' ? 'Sign Up' : 'Login')}
        </button>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-blue-600 hover:underline"
          >
            {mode === 'signup' ? 'Login' : 'Sign Up'}
          </button>
        </p>
      </form>
    </div>
  );
}
  