import React, { useState, useEffect } from 'react';
import { UsersIcon, ClockIcon, TrashIcon, PencilIcon, PlusCircleIcon, XIcon } from './icons/Icons';
import type { AppUser, Plan } from '../types';

interface AdminPageProps {
  onLogout: () => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number; }> = ({ icon, title, value }) => (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const AdminPage: React.FC<AdminPageProps> = ({ onLogout }) => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [stats, setStats] = useState({ total: 0, active24h: 0, active28d: 0, active90d: 0 });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'User' as AppUser['role'], plan: 'Free' as AppUser['plan'] });
    
    const fetchUsers = () => {
        const storedUsers = JSON.parse(localStorage.getItem('tchat_users') || '[]') as AppUser[];
        setUsers(storedUsers);
        calculateStats(storedUsers);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const calculateStats = (currentUsers: AppUser[]) => {
        const now = new Date();
        const aDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const daysAgo28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        const daysAgo90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const active24h = currentUsers.filter(u => u.lastLogin && new Date(u.lastLogin) > aDayAgo).length;
        const active28d = currentUsers.filter(u => u.lastLogin && new Date(u.lastLogin) > daysAgo28).length;
        const active90d = currentUsers.filter(u => u.lastLogin && new Date(u.lastLogin) > daysAgo90).length;

        setStats({ total: currentUsers.length, active24h, active28d, active90d });
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        const now = new Date().toISOString();
        const updatedUsers = [...users, { 
            ...newUser, 
            id: Date.now().toString(), 
            lastLogin: null, 
            knowledge: '', 
            planEndDate: undefined,
            imageUsage: { count: 0, lastReset: now },
            researchUsage: { count: 0, lastReset: now },
            videoUsage: { count: 0, lastReset: now }
        }];
        localStorage.setItem('tchat_users', JSON.stringify(updatedUsers));
        fetchUsers();
        setIsAddModalOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'User', plan: 'Free' });
    };

    const handleDeleteUser = () => {
        if (!selectedUser) return;
        const updatedUsers = users.filter(u => u.id !== selectedUser.id);
        localStorage.setItem('tchat_users', JSON.stringify(updatedUsers));
        fetchUsers();
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        const updatedUsers = users.map(u => u.id === selectedUser.id ? selectedUser : u);
        localStorage.setItem('tchat_users', JSON.stringify(updatedUsers));
        fetchUsers();
        setIsEditModalOpen(false);
        setSelectedUser(null);
    };
    
    const openEditModal = (user: AppUser) => {
      setSelectedUser(user);
      setIsEditModalOpen(true);
    }
    
    const openDeleteModal = (user: AppUser) => {
      setSelectedUser(user);
      setIsDeleteModalOpen(true);
    }

    const roles: AppUser['role'][] = ['User', 'Admin', 'Moderator'];
    const plans: Plan[] = ['Free', 'Pro', 'Business', 'Enterprise'];
    
  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 self-start sm:self-center"
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <StatCard icon={<UsersIcon className="w-6 h-6 text-primary-500" />} title="Total Users" value={stats.total} />
            <StatCard icon={<ClockIcon className="w-6 h-6 text-primary-500" />} title="Active (24h)" value={stats.active24h} />
            <StatCard icon={<ClockIcon className="w-6 h-6 text-primary-500" />} title="Active (28d)" value={stats.active28d} />
            <StatCard icon={<ClockIcon className="w-6 h-6 text-primary-500" />} title="Active (90d)" value={stats.active90d} />
        </div>

        {/* User Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-200 dark:border-gray-700 gap-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">User Management</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 self-start sm:self-center">
                    <PlusCircleIcon className="w-5 h-5" />
                    <span>Add User</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                            <th scope="col" className="px-6 py-3">Plan</th>
                            <th scope="col" className="px-6 py-3">Plan End Date</th>
                            <th scope="col" className="px-6 py-3">Images Used</th>
                            <th scope="col" className="px-6 py-3">Videos Summarized</th>
                            <th scope="col" className="px-6 py-3">Last Login</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.name || '-'}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.email}</td>
                                <td className="px-6 py-4">{user.role}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.plan !== 'Free' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {user.plan}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{user.plan !== 'Free' && user.planEndDate ? new Date(user.planEndDate).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4">{user.imageUsage?.count ?? 0}</td>
                                <td className="px-6 py-4">{user.videoUsage?.count ?? 0}</td>
                                <td className="px-6 py-4">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                                <td className="px-6 py-4 flex items-center space-x-3">
                                    <button onClick={() => openEditModal(user)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="w-5 h-5"/></button>
                                    <button onClick={() => openDeleteModal(user)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
      
      {/* Add User Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Add New User</h3>
                      <button onClick={() => setIsAddModalOpen(false)}><XIcon className="w-6 h-6 text-gray-500 dark:text-gray-400"/></button>
                  </div>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      {/* Form fields */}
                       <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                          <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                          <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                          <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                          <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as AppUser['role']})} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white">
                              {roles.map(role => <option key={role} value={role}>{role}</option>)}
                          </select>
                      </div>
                      <div className="flex justify-end space-x-3 pt-2">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Add User</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Edit User</h3>
                      <button onClick={() => setIsEditModalOpen(false)}><XIcon className="w-6 h-6 text-gray-500 dark:text-gray-400"/></button>
                  </div>
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">Editing user: <span className="font-semibold">{selectedUser.email}</span></p>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                          <select value={selectedUser.role} onChange={e => setSelectedUser({...selectedUser, role: e.target.value as AppUser['role']})} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white">
                              {roles.map(role => <option key={role} value={role}>{role}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plan</label>
                          <select 
                            value={selectedUser.plan} 
                            onChange={e => {
                                const newPlan = e.target.value as AppUser['plan'];
                                setSelectedUser({
                                    ...selectedUser,
                                    plan: newPlan,
                                    planEndDate: newPlan === 'Free' ? undefined : selectedUser.planEndDate
                                });
                            }} 
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white">
                              {plans.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                          </select>
                      </div>
                      {selectedUser.plan !== 'Free' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plan End Date</label>
                            <input
                                type="date"
                                value={selectedUser.planEndDate ? selectedUser.planEndDate.split('T')[0] : ''}
                                onChange={e => {
                                    if (e.target.value) {
                                        const date = new Date(e.target.value);
                                        date.setUTCHours(23, 59, 59, 999);
                                        setSelectedUser({...selectedUser, planEndDate: date.toISOString() });
                                    } else {
                                        setSelectedUser({...selectedUser, planEndDate: undefined });
                                    }
                                }}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 dark:text-white"
                            />
                        </div>
                      )}
                      <div className="flex justify-end space-x-3 pt-2">
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Save Changes</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Delete User Modal */}
      {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Confirm Deletion</h3>
                  <p className="my-4 text-gray-600 dark:text-gray-400">Are you sure you want to delete the user <span className="font-semibold">{selectedUser.email}</span>? This action cannot be undone.</p>
                  <div className="flex justify-end space-x-3">
                      <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                      <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPage;