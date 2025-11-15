import React from 'react';
import { GoogleIcon, UserCircleIcon } from './icons/Icons';
import type { AppUser } from '../types';

interface GoogleSignInPageProps {
    onLoginSuccess: (email: string) => void;
}

const GoogleSignInPage: React.FC<GoogleSignInPageProps> = ({ onLoginSuccess }) => {
    
    const handleSignIn = () => {
        const mockGoogleEmail = "user@google.com";
        const users: AppUser[] = JSON.parse(localStorage.getItem('tchat_users') || '[]');
        let user = users.find(u => u.email === mockGoogleEmail);

        if (!user) {
            const now = new Date().toISOString();
            // Auto-register the user if they don't exist
            const newUser: AppUser = {
                id: Date.now().toString(),
                email: mockGoogleEmail,
                password: '__GOOGLE_AUTH__', // Special identifier for Google users
                name: 'Google User',
                role: 'User',
                lastLogin: now,
                knowledge: '',
                plan: 'Free',
                imageUsage: {
                    count: 0,
                    lastReset: now,
                },
                researchUsage: {
                    count: 0,
                    lastReset: now,
                },
                // FIX: Added missing 'videoUsage' property to match the AppUser type.
                videoUsage: {
                    count: 0,
                    lastReset: now,
                },
            };
            const newUsers = [...users, newUser];
            localStorage.setItem('tchat_users', JSON.stringify(newUsers));
        }
        
        onLoginSuccess(mockGoogleEmail);
    };

    return (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 p-4">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                    <GoogleIcon className="w-8 h-8 mx-auto mb-2" />
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Choose an account
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        to continue to TChat
                    </p>
                </div>
                
                <div className="space-y-3">
                    <button
                        onClick={handleSignIn}
                        className="w-full flex items-center p-3 space-x-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <UserCircleIcon className="w-10 h-10 text-gray-400" />
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">Google User</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">user@google.com</p>
                        </div>
                    </button>
                    
                     <button
                        className="w-full flex items-center p-3 space-x-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                        disabled
                    >
                        <UserCircleIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">Use another account</p>
                        </div>
                    </button>
                </div>
                
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
                    To continue, Google will share your name, email address, and profile picture with TChat.
                </p>
            </div>
        </div>
    );
};

export default GoogleSignInPage;