import React, { useState, useEffect } from 'react';
import type { AppUser, Plan } from '../types';
import { generateUserKnowledge } from '../services/geminiService';
import { UserCircleIcon, CheckIcon, CheckCircleIcon, XCircleIcon, SparklesIcon } from './icons/Icons';

interface ProfilePageProps {
  onNavigateToChat: () => void;
}

const planDetails: Record<Plan, { name: string; price: string; research: string; videos: string; features: string[] }> = {
    'Free': { name: 'Free', price: '0TK/Month', research: '3 Research/Month', videos: '2 Videos/Month', features: ['Standard AI model', 'Basic chat history', 'Video Summaries'] },
    'Pro': { name: 'Pro', price: '499TK/Month', research: '26 Research/Month', videos: 'Unlimited', features: ['Advanced AI model (Thinking)', 'Priority support'] },
    'Business': { name: 'Business', price: '899TK/Month', research: '70 Research/Month', videos: 'Unlimited', features: ['All Pro features', 'Increased limits', 'Team features (soon)'] },
    'Enterprise': { name: 'Enterprise', price: '1599TK/Month', research: '136 Research/Month', videos: 'Unlimited', features: ['All Business features', 'Highest limits', 'Custom solutions'] }
};
const limits: Record<Plan, { research: number; video: number; }> = {
    'Free': { research: 3, video: 2 },
    'Pro': { research: 26, video: Infinity },
    'Business': { research: 70, video: Infinity },
    'Enterprise': { research: 136, video: Infinity },
};

type Feedback = { type: 'success' | 'error'; message: string } | null;

const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateToChat }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({ name: '', knowledge: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: ''});
  const [usage, setUsage] = useState({ research: 0, video: 0 });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isGeneratingKnowledge, setIsGeneratingKnowledge] = useState(false);

  const loadCurrentUser = () => {
    const userEmail = localStorage.getItem('tchat_current_user');
    if (userEmail) {
      const users: AppUser[] = JSON.parse(localStorage.getItem('tchat_users') || '[]');
      const user = users.find(u => u.email === userEmail);
      if (user) {
        setCurrentUser(user);
        setFormData({ name: user.name || '', knowledge: user.knowledge || '' });
        
        const now = new Date();
        const researchLastReset = new Date(user.researchUsage.lastReset);
        const researchCount = (now.getFullYear() > researchLastReset.getFullYear() || now.getMonth() > researchLastReset.getMonth()) ? 0 : user.researchUsage.count;
        
        const videoLastReset = user.videoUsage ? new Date(user.videoUsage.lastReset) : now;
        const videoCount = (user.videoUsage && (now.getFullYear() > videoLastReset.getFullYear() || now.getMonth() > videoLastReset.getMonth())) ? 0 : user.videoUsage?.count ?? 0;

        setUsage({ research: researchCount, video: videoCount });
      }
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  }
  
  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const users: AppUser[] = JSON.parse(localStorage.getItem('tchat_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], name: formData.name, knowledge: formData.knowledge };
        localStorage.setItem('tchat_users', JSON.stringify(users));
        setCurrentUser(users[userIndex]);
        showFeedback('success', 'Profile updated successfully!');
    } else {
        showFeedback('error', 'Could not find user to update.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (passwordData.new !== passwordData.confirm) {
        showFeedback('error', "New passwords don't match.");
        return;
    }
    if (currentUser.password !== passwordData.current) {
        showFeedback('error', "Incorrect current password.");
        return;
    }
    const users: AppUser[] = JSON.parse(localStorage.getItem('tchat_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].password = passwordData.new;
        localStorage.setItem('tchat_users', JSON.stringify(users));
        setPasswordData({ current: '', new: '', confirm: '' });
        showFeedback('success', 'Password changed successfully!');
    } else {
        showFeedback('error', 'Could not find user to update password.');
    }
  };

  const handleGenerateKnowledge = async () => {
    if (!formData.name) {
        showFeedback('error', 'Please enter your name first to generate knowledge.');
        return;
    }
    setIsGeneratingKnowledge(true);
    setFeedback(null);
    try {
        const generatedText = await generateUserKnowledge(formData.name);
        setFormData(prev => ({ ...prev, knowledge: generatedText }));
    } catch (error) {
        console.error("Failed to generate knowledge:", error);
        showFeedback('error', 'Failed to generate AI knowledge. Please try again.');
    } finally {
        setIsGeneratingKnowledge(false);
    }
};

  if (!currentUser) return <div className="flex items-center justify-center h-full text-gray-500">Loading profile...</div>;

  const { plan } = currentUser;
  const currentResearchLimit = limits[plan].research;
  const currentVideoLimit = limits[plan].video;

  return (
    <div className="flex justify-center h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="w-full max-w-5xl mx-auto space-y-12">
        {/* User Dashboard */}
        <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">My Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Manage your profile, password, and subscriptions.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Info Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Profile Information</h3>
                <form onSubmit={handleUpdateInfo} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center">
                            <label htmlFor="knowledge" className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Knowledge</label>
                            <button type="button" onClick={handleGenerateKnowledge} disabled={isGeneratingKnowledge} className="flex items-center space-x-1 text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50">
                                <SparklesIcon className="w-4 h-4" />
                                <span>{isGeneratingKnowledge ? 'Generating...' : 'Generate with AI'}</span>
                            </button>
                        </div>
                        <textarea id="knowledge" value={formData.knowledge} onChange={e => setFormData({...formData, knowledge: e.target.value})} rows={4} placeholder="Tell the AI a bit about yourself..." className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white"></textarea>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This helps the AI personalize its responses for you.</p>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700">Save Changes</button>
                    </div>
                </form>
            </div>
            {/* Change Password Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                        <input type="password" value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                        <input type="password" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                        <input type="password" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700">Update Password</button>
                    </div>
                </form>
            </div>
        </div>

        {feedback && (
            <div className={`mt-4 flex items-center space-x-2 p-3 rounded-lg ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'}`}>
                {feedback.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                <span className="text-sm font-medium">{feedback.message}</span>
            </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Current Usage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                    <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Research Usage (This Month)</span><span className="text-sm font-medium text-gray-500 dark:text-gray-400">{usage.research} / {currentResearchLimit}</span></div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${(usage.research / currentResearchLimit) * 100}%` }}></div></div>
                </div>
                 <div>
                    <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Summaries (This Month)</span><span className="text-sm font-medium text-gray-500 dark:text-gray-400">{usage.video} / {isFinite(currentVideoLimit) ? currentVideoLimit : '∞'}</span></div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(usage.video / (isFinite(currentVideoLimit) ? currentVideoLimit : usage.video || 1)) * 100}%` }}></div></div>
                </div>
            </div>
        </div>
        
        {/* Plans */}
        <div className="pt-8">
             <div className="text-center mb-10"><h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Plans & Pricing</h2><p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Choose the plan that's right for you.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {(Object.keys(planDetails) as Plan[]).map(p => (
                    <div key={p} className={`rounded-lg shadow-lg p-6 flex flex-col ${p === plan ? 'border-2 border-primary-500 bg-primary-50 dark:bg-gray-800 relative' : 'bg-white dark:bg-gray-800'}`}>
                        {p === plan && <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-3 py-1 text-sm bg-primary-500 text-white rounded-full font-semibold">Current Plan</div>}
                        <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white">{planDetails[p].name}</h3>
                        <p className="text-center text-gray-500 dark:text-gray-400 mt-2">{planDetails[p].price}</p>
                        <div className="mt-6 mb-8 text-center"><p className="text-4xl font-extrabold text-gray-900 dark:text-white">{planDetails[p].research}</p><p className="text-sm text-gray-500 dark:text-gray-400">{planDetails[p].videos}</p></div>
                        <ul className="space-y-4 flex-grow">
                            {planDetails[p].features.map(feature => (<li key={feature} className="flex items-start"><CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span></li>))}
                        </ul>
                        {p !== plan && (
                            <a href="https://wa.me/+8801736457957" target="_blank" rel="noopener noreferrer" className="mt-8 block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                               {plan === 'Free' ? 'Upgrade' : 'Switch to ' + p}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <div className="flex items-center justify-center pt-8">
            <button type="button" onClick={onNavigateToChat} className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Back to Chat</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;