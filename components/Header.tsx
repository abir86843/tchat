import React from 'react';
import { SunIcon, MoonIcon, LogoutIcon, UserCircleIcon, MenuIcon } from './icons/Icons';

interface HeaderProps {
  theme: string;
  setTheme: (theme: string) => void;
  isUserLoggedIn: boolean;
  onUserLogout: () => void;
  onNavigateToProfile: () => void;
  onToggleSidebar: () => void;
  isChatPage: boolean;
}

const Header: React.FC<HeaderProps> = ({ theme, setTheme, isUserLoggedIn, onUserLogout, onNavigateToProfile, onToggleSidebar, isChatPage }) => {
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="flex items-center justify-between p-2 sm:p-4 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm">
      <div className="flex items-center space-x-2 sm:space-x-3">
        {isChatPage && (
            <button
                onClick={onToggleSidebar}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
                aria-label="Toggle sidebar"
            >
                <MenuIcon className="w-6 h-6" />
            </button>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400">
            TChat
        </h1>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <MoonIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <SunIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>
        {isUserLoggedIn && (
            <>
                <button
                    onClick={onNavigateToProfile}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    aria-label="Profile"
                >
                    <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                    onClick={onUserLogout}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    aria-label="Logout"
                >
                    <LogoutIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
           </>
        )}
      </div>
    </header>
  );
};

export default Header;