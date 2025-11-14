import React, { useState, useEffect } from 'react';
import ChatPage from './components/ChatPage';
import AdminPage from './components/AdminPage';
import Header from './components/Header';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';

type Page = 'auth' | 'chat' | 'admin' | 'profile';

const App: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(!!localStorage.getItem('tchat_current_user'));
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>(isUserLoggedIn ? 'chat' : 'auth');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setCurrentPage('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentPage('auth');
  };
  
  const handleUserLogin = (email: string) => {
    // Update last login timestamp
    const users = JSON.parse(localStorage.getItem('tchat_users') || '[]');
    const userIndex = users.findIndex((user: any) => user.email === email);
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString();
      localStorage.setItem('tchat_users', JSON.stringify(users));
    }
    
    localStorage.setItem('tchat_current_user', email);
    setIsUserLoggedIn(true);
    setCurrentPage('chat');
  };

  const handleUserLogout = () => {
    localStorage.removeItem('tchat_current_user');
    setIsUserLoggedIn(false);
    setCurrentPage('auth');
  };

  const handleNavigateToProfile = () => {
    if (isUserLoggedIn) {
      setCurrentPage('profile');
    }
  };


  const renderPage = () => {
    if (isAdminLoggedIn && currentPage === 'admin') {
      return <AdminPage onLogout={handleAdminLogout} />;
    }
    
    if (isUserLoggedIn) {
      if (currentPage === 'chat') {
        return <ChatPage isSidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />;
      }
      if (currentPage === 'profile') {
        return <ProfilePage onNavigateToChat={() => setCurrentPage('chat')} />;
      }
    }
    
    switch (currentPage) {
      case 'admin': // Fallback for logged out admin
      case 'chat': // Fallback for logged out user
      case 'profile': // Fallback for logged out user
      case 'auth':
      default:
        return <AuthPage onUserLoginSuccess={handleUserLogin} onAdminLoginSuccess={handleAdminLoginSuccess} />;
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans text-gray-900 dark:text-gray-100 bg-transparent">
      <Header
        theme={theme}
        setTheme={setTheme}
        isUserLoggedIn={isUserLoggedIn}
        onUserLogout={handleUserLogout}
        onNavigateToProfile={handleNavigateToProfile}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isChatPage={currentPage === 'chat'}
      />
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
      <footer className="p-3 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <a href="https://fb.com/3craftdigital" target="_blank" rel="noopener noreferrer" className="hover:underline mx-2">Facebook Page</a>
        <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">&bull;</span>
        <a href="https://3craftdigital.top" target="_blank" rel="noopener noreferrer" className="hover:underline mx-2">Official Website</a>
      </footer>
    </div>
  );
};

export default App;