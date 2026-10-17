import React, { useState, useEffect } from 'react';
import { 
  Shield, Key, User, Users, Lock, LogOut, RefreshCw, 
  CheckCircle, XCircle, Plus, Edit, Trash, Settings, 
  Send, Database, Server, UserCheck, AlertTriangle
} from 'lucide-react';

const API_BASE = 'http://localhost:8080/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('auth');
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('accessToken') || '');
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || '');
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [responseLog, setResponseLog] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginData, setLoginData] = useState({ email: 'owner@petcare.vn', password: 'SecureP@ss1' });
  const [regData, setRegData] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [profileData, setProfileData] = useState({ fullName: '', phone: '', avatarUrl: '' });
  
  // Admin Users list & RBAC state
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  
  // Role & Perm form states
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [newPerm, setNewPerm] = useState({ code: '', name: '', module: '', description: '' });
  const [selectedUserForRole, setSelectedUserForRole] = useState('');
  const [selectedRolesForUser, setSelectedRolesForUser] = useState([]);
  const [selectedRoleForPerm, setSelectedRoleForPerm] = useState('');
  const [selectedPermsForRole, setSelectedPermsForRole] = useState([]);

  // Save tokens to localStorage
  const saveAuth = (authRes) => {
    if (!authRes) return;
    setToken(authRes.accessToken);
    setRefreshToken(authRes.refreshToken);
    setCurrentUser(authRes.user);
    localStorage.setItem('accessToken', authRes.accessToken);
    localStorage.setItem('refreshToken', authRes.refreshToken);
    localStorage.setItem('user', JSON.stringify(authRes.user));
  };

  const clearAuth = () => {
    setToken('');
    setRefreshToken('');
    setCurrentUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  // Generic fetch wrapper with Bearer token
  const apiCall = async (url, method = 'GET', body = null, useRefreshToken = false) => {
    setLoading(true);
    setResponseLog(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const authToken = useRefreshToken ? refreshToken : token;
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const opts = { method, headers };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(`${API_BASE}${url}`, opts);
      const data = await res.json();
      
      setResponseLog({ status: res.status, data });
      setLoading(false);
      return { status: res.status, data };
    } catch (err) {
      setResponseLog({ status: 'FETCH_ERROR', data: { message: err.message } });
      setLoading(false);
      return { status: 'ERROR', data: null };
    }
  };

  // Auth Handlers
  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await apiCall('/auth/register', 'POST', regData);
    if (res.status === 201 && res.data?.data) {
      saveAuth(res.data.data);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await apiCall('/auth/login', 'POST', loginData);
    if (res.status === 200 && res.data?.data) {
      saveAuth(res.data.data);
    }
  };

  const handleRefresh = async () => {
    const res = await apiCall('/auth/refresh', 'POST', { refreshToken }, true);
    if (res.status === 200 && res.data?.data) {
      saveAuth(res.data.data);
    }
  };

  const handleLogout = async (logoutAll = false) => {
    await apiCall('/auth/logout', 'POST', { refreshToken, logoutAll });
    clearAuth();
  };

  // Profile Handlers
  const fetchMyProfile = async () => {
    const res = await apiCall('/users/me', 'GET');
    if (res.status === 200 && res.data?.data) {
      setCurrentUser(res.data.data);
      setProfileData({
        fullName: res.data.data.fullName || '',
        phone: res.data.data.phone || '',
        avatarUrl: res.data.data.avatarUrl || ''
      });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await apiCall('/users/me', 'PUT', profileData);
    if (res.status === 200 && res.data?.data) {
      setCurrentUser(res.data.data);
    }
  };

  // Admin Users & RBAC Handlers
  const fetchUsersList = async () => {
    const res = await apiCall('/users?page=0&size=50', 'GET');
    if (res.status === 200 && res.data?.data?.content) {
      setUsersList(res.data.data.content);
    }
  };

  const handleUserStatus = async (userId, newStatus) => {
    await apiCall(`/users/${userId}/status`, 'PATCH', { status: newStatus });
    fetchUsersList();
  };

  const handleAssignRolesToUser = async (e) => {
    e.preventDefault();
    if (!selectedUserForRole) return;
    await apiCall(`/users/${selectedUserForRole}/roles`, 'POST', { roleIds: selectedRolesForUser });
    fetchUsersList();
  };

  // RBAC Handlers
  const fetchRoles = async () => {
    const res = await apiCall('/rbac/roles', 'GET');
    if (res.status === 200 && res.data?.data) {
      setRolesList(res.data.data);
    }
  };

  const fetchPermissions = async () => {
    const res = await apiCall('/rbac/permissions', 'GET');
    if (res.status === 200 && res.data?.data) {
      setPermissionsList(res.data.data);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    await apiCall('/rbac/roles', 'POST', newRole);
    setNewRole({ name: '', description: '' });
    fetchRoles();
  };

  const handleCreatePerm = async (e) => {
    e.preventDefault();
    await apiCall('/rbac/permissions', 'POST', newPerm);
    setNewPerm({ code: '', name: '', module: '', description: '' });
    fetchPermissions();
  };

  const handleAssignPermsToRole = async (e) => {
    e.preventDefault();
    if (!selectedRoleForPerm) return;
    await apiCall(`/rbac/roles/${selectedRoleForPerm}/permissions`, 'POST', { permissionIds: selectedPermsForRole });
    fetchRoles();
  };

  useEffect(() => {
    if (token) {
      fetchMyProfile();
    }
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <Shield className="w-7 h-7 text-indigo-400" />
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent block">
              PetCare Tester
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Auth & RBAC Console</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('auth')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'auth' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Auth & Sessions</span>
          </button>

          <button
            onClick={() => { setActiveTab('profile'); fetchMyProfile(); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => { setActiveTab('users'); fetchUsersList(); fetchRoles(); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </button>

          <button
            onClick={() => { setActiveTab('rbac'); fetchRoles(); fetchPermissions(); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'rbac' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>RBAC (Roles & Perms)</span>
          </button>
        </nav>

        {/* User Session Info Box */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          {currentUser ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">
                  {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-200 truncate">{currentUser.fullName}</div>
                  <div className="text-[10px] text-indigo-400 font-mono truncate">{currentUser.email}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  {currentUser.role || 'CUSTOMER'}
                </span>
                <button
                  onClick={() => handleLogout(false)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-2">Not logged in</div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/40 backdrop-blur">
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-mono text-slate-400">Target API:</span>
            <span className="text-xs font-mono text-emerald-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              {API_BASE}
            </span>
          </div>

          {token && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded flex items-center space-x-1.5 transition border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                <span>Rotate Refresh Token</span>
              </button>
              <button
                onClick={() => handleLogout(true)}
                className="text-xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-3 py-1.5 rounded flex items-center space-x-1.5 transition border border-rose-800/50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout All Devices</span>
              </button>
            </div>
          )}
        </header>

        {/* Content Body & JSON Response Log Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          {/* Active Tab View */}
          <div className="lg:col-span-2 overflow-y-auto p-8 space-y-6">
            {/* AUTH TAB */}
            {activeTab === 'auth' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Login Form */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-lg text-indigo-300 flex items-center space-x-2">
                    <Key className="w-5 h-5" />
                    <span>Login (POST /auth/login)</span>
                  </h3>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Email</label>
                      <input
                        type="email"
                        value={loginData.email}
                        onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Password</label>
                      <input
                        type="password"
                        value={loginData.password}
                        onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded text-sm transition"
                    >
                      Login & Get Tokens
                    </button>
                  </form>
                </div>

                {/* Register Form */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-lg text-cyan-300 flex items-center space-x-2">
                    <UserCheck className="w-5 h-5" />
                    <span>Register (POST /auth/register)</span>
                  </h3>
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="Nguyễn Minh Anh"
                        value={regData.fullName}
                        onChange={e => setRegData({ ...regData, fullName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Email</label>
                      <input
                        type="email"
                        placeholder="newuser@petcare.vn"
                        value={regData.email}
                        onChange={e => setRegData({ ...regData, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="SecureP@ss1"
                        value={regData.password}
                        onChange={e => setRegData({ ...regData, password: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Phone</label>
                      <input
                        type="text"
                        placeholder="0901234567"
                        value={regData.phone}
                        onChange={e => setRegData({ ...regData, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded text-sm transition"
                    >
                      Register New User
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="font-bold text-lg text-indigo-300">My Profile (GET /users/me & PUT /users/me)</h3>
                  <button
                    onClick={fetchMyProfile}
                    className="text-xs bg-slate-800 px-3 py-1.5 rounded text-slate-300 hover:bg-slate-700"
                  >
                    Refresh Profile
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={e => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Phone</label>
                    <input
                      type="text"
                      value={profileData.phone}
                      onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Avatar URL</label>
                    <input
                      type="text"
                      value={profileData.avatarUrl}
                      onChange={e => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded text-sm transition"
                  >
                    Save Profile
                  </button>
                </form>
              </div>
            )}

            {/* USERS MANAGEMENT TAB */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-lg text-indigo-300">Users List (GET /users)</h3>
                    <button
                      onClick={fetchUsersList}
                      className="text-xs bg-indigo-600 px-3 py-1.5 rounded text-white hover:bg-indigo-500"
                    >
                      Reload Users
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="p-2">Name</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Role</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map(u => (
                          <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="p-2 font-medium text-slate-200">{u.fullName}</td>
                            <td className="p-2 font-mono text-slate-400">{u.email}</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                                {u.role}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded font-mono ${
                                u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-2 space-x-1">
                              {u.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleUserStatus(u.id, 'INACTIVE')}
                                  className="px-2 py-1 bg-amber-950 text-amber-300 rounded hover:bg-amber-900"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserStatus(u.id, 'ACTIVE')}
                                  className="px-2 py-1 bg-emerald-950 text-emerald-300 rounded hover:bg-emerald-900"
                                >
                                  Activate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Assign Roles to User Form */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-lg text-cyan-300">Assign RBAC Roles to User (POST /users/&#123;id&#125;/roles)</h3>
                  <form onSubmit={handleAssignRolesToUser} className="space-y-4 max-w-md">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Select User</label>
                      <select
                        value={selectedUserForRole}
                        onChange={e => setSelectedUserForRole(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="">-- Choose User --</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Select Roles</label>
                      <div className="space-y-1 bg-slate-950 border border-slate-800 p-3 rounded max-h-40 overflow-y-auto">
                        {rolesList.map(r => (
                          <label key={r.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedRolesForUser.includes(r.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedRolesForUser([...selectedRolesForUser, r.id]);
                                } else {
                                  setSelectedRolesForUser(selectedRolesForUser.filter(id => id !== r.id));
                                }
                              }}
                            />
                            <span>{r.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-5 py-2 rounded text-sm transition"
                    >
                      Assign Roles
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* RBAC MANAGEMENT TAB */}
            {activeTab === 'rbac' && (
              <div className="space-y-6">
                {/* Create Role & Perm Forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Create Role */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                    <h3 className="font-bold text-lg text-indigo-300">Create Role (POST /rbac/roles)</h3>
                    <form onSubmit={handleCreateRole} className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Role Name</label>
                        <input
                          type="text"
                          placeholder="VETERINARIAN"
                          value={newRole.name}
                          onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Description</label>
                        <input
                          type="text"
                          placeholder="Bác sĩ thú y"
                          value={newRole.description}
                          onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                        />
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-medium hover:bg-indigo-500">
                        Create Role
                      </button>
                    </form>
                  </div>

                  {/* Create Permission */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                    <h3 className="font-bold text-lg text-cyan-300">Create Permission (POST /rbac/permissions)</h3>
                    <form onSubmit={handleCreatePerm} className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Permission Code</label>
                        <input
                          type="text"
                          placeholder="medical:create"
                          value={newPerm.code}
                          onChange={e => setNewPerm({ ...newPerm, code: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Permission Name</label>
                        <input
                          type="text"
                          placeholder="Tạo hồ sơ bệnh án"
                          value={newPerm.name}
                          onChange={e => setNewPerm({ ...newPerm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                          required
                        />
                      </div>
                      <button type="submit" className="w-full bg-cyan-600 text-white py-2 rounded text-sm font-medium hover:bg-cyan-500">
                        Create Permission
                      </button>
                    </form>
                  </div>
                </div>

                {/* Assign Permissions to Role Form */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-lg text-emerald-300">Assign Permissions to Role (POST /rbac/roles/&#123;id&#125;/permissions)</h3>
                  <form onSubmit={handleAssignPermsToRole} className="space-y-4 max-w-md">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Select Role</label>
                      <select
                        value={selectedRoleForPerm}
                        onChange={e => setSelectedRoleForPerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="">-- Choose Role --</option>
                        {rolesList.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Select Permissions</label>
                      <div className="space-y-1 bg-slate-950 border border-slate-800 p-3 rounded max-h-48 overflow-y-auto">
                        {permissionsList.map(p => (
                          <label key={p.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPermsForRole.includes(p.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedPermsForRole([...selectedPermsForRole, p.id]);
                                } else {
                                  setSelectedPermsForRole(selectedPermsForRole.filter(id => id !== p.id));
                                }
                              }}
                            />
                            <span className="font-mono text-cyan-400">{p.code}</span>
                            <span className="text-slate-500">({p.name})</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded text-sm transition"
                    >
                      Assign Permissions
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: JSON Response Log */}
          <div className="border-l border-slate-800 bg-slate-900/60 p-6 flex flex-col space-y-4 overflow-hidden">
            <h3 className="font-bold text-sm text-slate-300 flex items-center justify-between border-b border-slate-800 pb-3">
              <span>Live API Response Inspector</span>
              {loading && <span className="text-xs text-indigo-400 animate-pulse">Requesting...</span>}
            </h3>

            {responseLog ? (
              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">HTTP Status:</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    responseLog.status >= 200 && responseLog.status < 300 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {responseLog.status}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-slate-300 overflow-x-auto">
                  <pre>{JSON.stringify(responseLog.data, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs text-center space-y-2">
                <Database className="w-8 h-8 opacity-40" />
                <span>Execute any action to inspect HTTP response payload</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
