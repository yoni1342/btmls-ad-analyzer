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
   <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 animate-fadeIn" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
     <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
       <div className="text-center">
         <img src="/logo.png" alt="Ad Analyzer Logo" className="mx-auto mb-4 w-16 h-16" />
         <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
           {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
         </h1>
         <p className="text-gray-600 dark:text-gray-300">
           {mode === 'signup' ? 'to start analyzing your ads.' : 'to continue your analysis.'}
         </p>
       </div>
       <form onSubmit={handleSubmit} className="space-y-6">
         <div>
           <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
           <input
             id="email"
             type="email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             required
             className="mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
           />
         </div>
         <div>
           <label htmlFor="password"  className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
           <input
             id="password"
             type="password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required
             className="mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
           />
         </div>
         <button
           type="submit"
           disabled={loading}
           className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
           style={{ color: 'white' }}
         >
           {loading ? (mode === 'signup' ? 'Creating Account...' : 'Logging In...') : (mode === 'signup' ? 'Sign Up' : 'Login')}
         </button>
         <p className="text-center text-sm text-gray-600 dark:text-gray-300">
           {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
           <button
             type="button"
             onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
             className="font-medium text-primary hover:underline"
           >
             {mode === 'signup' ? 'Login' : 'Sign Up'}
           </button>
         </p>
       </form>
     </div>
   </div>
 );
}
  