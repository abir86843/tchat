import React, { useState } from 'react';
import type { AppUser } from '../types';

interface AuthPageProps {
  onUserLoginSuccess: (email: string) => void;
  onAdminLoginSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onUserLoginSuccess, onAdminLoginSuccess }) => {
  const [view, setView] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setMessage('');
  };

  const handleSetView = (newView: 'signIn' | 'signUp') => {
    setView(newView);
    resetForm();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const users: AppUser[] = JSON.parse(localStorage.getItem('tchat_users') || '[]');

      if (view === 'signUp') {
        if (password !== confirmPassword) {
          setError("Passwords don't match.");
          return;
        }
        if (users.find((user: any) => user.email === email)) {
          setError('User with this email already exists.');
          return;
        }
        
        const now = new Date().toISOString();
        const newUser: AppUser = { 
            id: Date.now().toString(),
            email, 
            password, 
            name: '',
            role: 'User', 
            lastLogin: now,
            knowledge: '',
            plan: 'Free',
            researchUsage: {
                count: 0,
                lastReset: now,
            },
            videoUsage: {
                count: 0,
                lastReset: now,
            },
        };

        const newUsers = [...users, newUser];
        localStorage.setItem('tchat_users', JSON.stringify(newUsers));
        onUserLoginSuccess(email);
      } else { // Sign In
        if (email === 'abiralam449@gmail.com' && password === 'AbIr@2025.Alam.123') {
          onAdminLoginSuccess();
          return;
        }
        
        const user = users.find((user: any) => user.email === email && user.password === password);
        if (user) {
          onUserLoginSuccess(email);
        } else {
          setError('Invalid email or password.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    }
  };
  
  return (
    <div className="flex items-center justify-center h-full bg-gray-50/0 dark:bg-gray-900/0 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
            {view === 'signUp' ? 'Create Your Account' : 'Welcome Back to TChat'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {view === 'signUp' ? 'Get started with your personal AI assistant.' : 'Sign in to continue.'}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={view === 'signUp' ? "new-password" : "current-password"}
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${view === 'signUp' ? '' : 'rounded-b-md'} focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {view === 'signUp' && (
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>
          
          {error && <p className="text-sm text-center text-red-500">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {view === 'signUp' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>
        <div className="text-center">
            <button onClick={() => handleSetView(view === 'signIn' ? 'signUp' : 'signIn')} className="font-medium text-sm text-primary-600 dark:text-primary-400 hover:underline">
                {view === 'signUp' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;