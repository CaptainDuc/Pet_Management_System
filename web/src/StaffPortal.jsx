import React, { useState, useEffect } from 'react';
import {
  Shield, Key, User, Users, Lock, LogOut, RefreshCw,
  CheckCircle, XCircle, Plus, Edit, Trash, Settings,
  Send, Database, Server, UserCheck, AlertTriangle, ArrowRight,
  ExternalLink, Sparkles, Stethoscope, Calendar, CreditCard,
  TrendingUp, Building2, ChevronDown, Eye, Code, Layers
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import VetDashboard from './pages/dashboard/VetDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import OwnerDashboard from './pages/dashboard/OwnerDashboard';
import ProfileTab from './pages/dashboard/ProfileTab';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Role configurations
const ROLE_CONFIGS = {
  CUSTOMER: {
    name: 'Khách hàng',
    title: 'PetCare Customer Portal',
    subtitle: 'Chăm sóc & Lịch hẹn thú cưng',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: '#2563EB',
    defaultTab: 'pets',
    tabs: [
      { id: 'pets', label: 'Thú cưng của tôi', icon: '🐾' },
      { id: 'bookings', label: 'Đặt lịch hẹn', icon: '📅' },
      { id: 'loyalty', label: 'Điểm thưởng & Hạng thẻ', icon: '⭐' },
      { id: 'ai-chat', label: 'Trợ lý AI Thú y', icon: '🤖' },
      { id: 'profile', label: 'Hồ sơ cá nhân', icon: '👤' }
    ]
  },
  VETERINARIAN: {
    name: 'Bác sĩ thú y',
    title: 'PetCare Clinical EMR',
    subtitle: 'Hồ sơ bệnh án & Khám bệnh',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    accentColor: '#0D9488',
    defaultTab: 'medical',
    tabs: [
      { id: 'medical', label: 'Bệnh án điện tử', icon: '🩺' },
      { id: 'schedule', label: 'Lịch khám hôm nay', icon: '📅' },
      { id: 'prescriptions', label: 'Kê đơn thuốc', icon: '💊' },
      { id: 'ai-diagnostics', label: 'AI Tham vấn lâm sàng', icon: '✨' },
      { id: 'profile', label: 'Hồ sơ Bác sĩ', icon: '👤' }
    ]
  },
  STAFF: {
    name: 'Lễ tân & Thu ngân',
    title: 'PetCare Reception Desk',
    subtitle: 'Tiếp đón, Check-in & Hóa đơn',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    accentColor: '#0284C7',
    defaultTab: 'reception',
    tabs: [
      { id: 'reception', label: 'Bàn tiếp đón & Check-in', icon: '🛎️' },
      { id: 'invoices', label: 'Quầy Thu ngân & Hóa đơn', icon: '🧾' },
      { id: 'customers', label: 'Danh bạ Khách hàng', icon: '👥' },
      { id: 'profile', label: 'Hồ sơ Nhân viên', icon: '👤' }
    ]
  },
  OWNER: {
    name: 'Chủ phòng khám',
    title: 'PetCare Executive Suite',
    subtitle: 'Doanh thu, Nhân sự & KPI',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentColor: '#4F46E5',
    defaultTab: 'analytics',
    tabs: [
      { id: 'analytics', label: 'Báo cáo Doanh thu & KPI', icon: '📊' },
      { id: 'staff-mgmt', label: 'Đội ngũ Y Bác sĩ', icon: '👨‍⚕️' },
      { id: 'services', label: 'Bảng giá niêm yết', icon: '🏷️' },
      { id: 'audit', label: 'Nhật ký giám sát', icon: '📜' },
      { id: 'profile', label: 'Hồ sơ Chủ phòng khám', icon: '👤' }
    ]
  },
  ADMIN: {
    name: 'Quản trị viên',
    title: 'PetCare System Admin',
    subtitle: 'Người dùng, RBAC & Hệ thống',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    accentColor: '#7C3AED',
    defaultTab: 'users',
    tabs: [
      { id: 'users', label: 'Quản lý người dùng', icon: '👥' },
      { id: 'rbac', label: 'Phân quyền RBAC', icon: '🛡️' },
      { id: 'audit', label: 'Nhật ký kiểm toán', icon: '📜' },
      { id: 'system', label: 'Giám sát hạ tầng & AI', icon: '⚡' },
      { id: 'profile', label: 'Hồ sơ Quản trị', icon: '👤' }
    ]
  }
};

const ROLE_PRIORITY = ['ADMIN', 'OWNER', 'VETERINARIAN', 'STAFF', 'CUSTOMER'];
const ROLE_ICONS = {
  ADMIN: '👑',
  OWNER: '🏢',
  VETERINARIAN: '🩺',
  STAFF: '🛎️',
  CUSTOMER: '🐾',
};

function normalizeRoleName(value) {
  const raw = typeof value === 'string' ? value : value?.name;
  if (!raw) return '';
  return raw.replace(/^ROLE_/i, '').toUpperCase();
}

function getAssignedRoles(user) {
  const rawRoles = [];
  if (user?.role) rawRoles.push(user.role);
  if (Array.isArray(user?.roles)) rawRoles.push(...user.roles);

  const normalized = rawRoles.map(normalizeRoleName).filter((role) => ROLE_CONFIGS[role]);
  const unique = [...new Set(normalized)];
  if (unique.length === 0) return ['CUSTOMER'];

  return ROLE_PRIORITY.filter((role) => unique.includes(role));
}

function AppContent({ initialScreen = 'login' }) {
  const { user, token, refreshToken, isAuthenticated, logout, saveAuthSession } = useAuth();

  // Navigation state: 'login' | 'register' | 'forgot-password' | 'dashboard'
  const [screen, setScreen] = useState(initialScreen);

  // Detect user's primary role or allow Admin / Multi-role user to switch perspective
  const [activeRole, setActiveRole] = useState('CUSTOMER');
  const [activeTab, setActiveTab] = useState('pets');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [responseLog, setResponseLog] = useState(null);
  const userRoles = getAssignedRoles(user);

  const navigate = (target) => {
    setScreen(target);
    const targetPath = target === 'dashboard' ? '/dashboard' : `/${target}`;
    if (window.location.pathname !== targetPath) {
      window.history.replaceState(null, '', targetPath);
    }
  };

  // Determine user primary role on login
  useEffect(() => {
    if (isAuthenticated && user) {
      setScreen('dashboard');
      if (window.location.pathname !== '/dashboard') {
        window.history.replaceState(null, '', '/dashboard');
      }
      const primaryRole = getAssignedRoles(user)[0] || 'CUSTOMER';
      setActiveRole(primaryRole);
      setActiveTab(ROLE_CONFIGS[primaryRole]?.defaultTab || 'profile');
    } else if (!isAuthenticated && window.location.pathname === '/dashboard') {
      setScreen('login');
      window.history.replaceState(null, '', '/login');
    }
  }, [isAuthenticated, user]);

  // Only allow switching between roles actually assigned to the user
  const handleRoleChange = (newRole) => {
    if (!userRoles.includes(newRole)) return;
    setActiveRole(newRole);
    setActiveTab(ROLE_CONFIGS[newRole]?.defaultTab || 'profile');
    setShowRoleDropdown(false);
  };

  const handleRotateToken = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const data = await res.json();
      setResponseLog({ status: res.status, data });
      if (res.ok && data?.data) {
        saveAuthSession(data.data);
      }
    } catch (err) {
      setResponseLog({ status: 'ERROR', data: { message: err.message } });
    }
  };

  const handleLogoutAll = async () => {
    await logout(true);
    navigate('login');
  };

  const currentRoleConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.CUSTOMER;

  // Top navigation bar
  const renderNavSwitcher = () => (
    <div className="bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] px-4 py-2 flex items-center justify-between text-xs font-sans sticky top-0 z-50 shadow-xs">
      <div className="flex items-center space-x-3">
        <span className="font-bold text-[#0F172A] flex items-center space-x-2">
          <img src="/logo.png" alt="PetCare Logo" className="h-6 w-auto object-contain" />
          <span className="text-sm tracking-tight text-blue-600">PetCare Platform</span>
        </span>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => navigate('login')}
          className={`px-3 py-1.5 rounded-xl transition-all duration-150 font-medium active:scale-95 ${screen === 'login'
            ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/30'
            : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
            }`}
        >
          Đăng nhập
        </button>
        <button
          onClick={() => navigate('register')}
          className={`px-3 py-1.5 rounded-xl transition-all duration-150 font-medium active:scale-95 ${screen === 'register'
            ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/30'
            : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
            }`}
        >
          Đăng ký
        </button>
        <button
          onClick={() => navigate('forgot-password')}
          className={`px-3 py-1.5 rounded-xl transition-all duration-150 font-medium active:scale-95 ${screen === 'forgot-password'
            ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/30'
            : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100'
            }`}
        >
          Quên mật khẩu
        </button>
        {isAuthenticated && (
          <button
            onClick={() => navigate('dashboard')}
            className={`px-3 py-1.5 rounded-xl transition-all duration-150 font-medium active:scale-95 ${screen === 'dashboard'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'text-[#0F172A] bg-slate-100 hover:bg-slate-200'
              }`}
          >
            Bảng điều khiển
          </button>
        )}
      </div>

      <div className="hidden md:flex items-center space-x-2 text-[#64748B]">
        {user ? (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#0F172A] font-medium">{user.fullName || user.email}</span>
            <button
              onClick={async () => {
                await logout();
                navigate('login');
              }}
              className="text-[#DC2626] hover:underline font-medium"
            >
              Thoát
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-[#94A3B8]">Chưa xác thực</span>
        )}
      </div>
    </div>
  );

  // AUTH SCREENS
  if (screen === 'login') {
    return (
      <div className="min-h-screen flex flex-col">
        {renderNavSwitcher()}
        <LoginPage
          onNavigate={navigate}
          onSuccess={() => navigate('dashboard')}
        />
      </div>
    );
  }

  if (screen === 'register') {
    return (
      <div className="min-h-screen flex flex-col">
        {renderNavSwitcher()}
        <RegisterPage
          onNavigate={navigate}
          onSuccess={() => navigate('dashboard')}
        />
      </div>
    );
  }

  if (screen === 'forgot-password') {
    return (
      <div className="min-h-screen flex flex-col">
        {renderNavSwitcher()}
        <ForgotPasswordPage onNavigate={navigate} />
      </div>
    );
  }

  // AUTHENTICATED ROLE-BASED DASHBOARD
  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] text-[#0F172A] font-sans overflow-hidden">
      {renderNavSwitcher()}

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col justify-between flex-shrink-0 z-20">
          <div>
            {/* Header / Brand for current role */}
            <div className="p-4 border-b border-[#E2E8F0] flex items-center space-x-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center p-1.5 overflow-hidden shadow-xs">
                <img src="/logo.png" alt="PetCare Logo" className="h-full w-auto object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-[#0F172A] block truncate">{currentRoleConfig.title}</span>
                <span className="text-[10px] text-[#64748B] block truncate">{currentRoleConfig.subtitle}</span>
              </div>
            </div>

            {/* Role badge — users only see dashboards for roles they actually own */}
            <div className="px-3 pt-3">
              {userRoles.length > 1 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/90 hover:bg-slate-100/90 text-left flex items-center justify-between transition group shadow-2xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-xs">{ROLE_ICONS[activeRole] || '🐾'}</span>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block leading-tight">Vai trò</span>
                        <span className="text-xs font-bold text-slate-900 truncate block">{currentRoleConfig.name}</span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition flex-shrink-0" />
                  </button>

                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 space-y-1 animate-fadeIn">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Vai trò của bạn:
                      </div>
                      {userRoles.map((roleKey) => (
                        <button
                          key={roleKey}
                          onClick={() => handleRoleChange(roleKey)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${activeRole === roleKey
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <span className="flex items-center space-x-2">
                            <span>{ROLE_ICONS[roleKey] || '🐾'}</span>
                            <span>{ROLE_CONFIGS[roleKey].name}</span>
                          </span>
                          {activeRole === roleKey && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
                  <span className="text-xs">{ROLE_ICONS[activeRole] || '🐾'}</span>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block leading-tight">Vai trò</span>
                    <span className="text-xs font-bold text-slate-900 truncate block">{currentRoleConfig.name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Role-Specific Navigation Menu */}
            <nav className="p-3 space-y-1 mt-1">
              {currentRoleConfig.tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* User Session Info Box */}
          <div className="p-4 border-t border-[#E2E8F0] bg-slate-50/70">
            {user ? (
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="truncate flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#0F172A] truncate">{user.fullName || 'Người dùng'}</div>
                    <div className="text-[11px] text-[#64748B] truncate font-mono">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${currentRoleConfig.badgeColor}`}>
                    {activeRole}
                  </span>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate('login');
                    }}
                    className="text-[#DC2626] hover:underline flex items-center space-x-1 font-medium"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#64748B] text-center">Chưa xác thực</div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
          {/* Top Bar */}
          <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <span>{currentRoleConfig.title}</span>
                <span className="text-slate-300">/</span>
                <span className="text-blue-600 font-medium">
                  {currentRoleConfig.tabs.find(t => t.id === activeTab)?.label || 'Bảng điều khiển'}
                </span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowInspector(!showInspector)}
                className={`text-xs px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition ${showInspector
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <Code className="w-3.5 h-3.5 text-blue-500" />
                <span>{showInspector ? 'Ẩn API Inspector' : 'Hiện API Inspector'}</span>
              </button>

              {token && (
                <>
                  <button
                    onClick={handleRotateToken}
                    className="text-xs bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Xoay Token</span>
                  </button>
                  <button
                    onClick={handleLogoutAll}
                    className="text-xs bg-[#FEF2F2] hover:bg-red-100 text-[#DC2626] border border-[#FECACA] px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất mọi nơi</span>
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Dynamic Role Dashboard Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Role Content View */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'profile' ? (
                <ProfileTab user={user} token={token} onApiLog={setResponseLog} />
              ) : activeRole === 'CUSTOMER' ? (
                <CustomerDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onApiLog={setResponseLog}
                />
              ) : activeRole === 'VETERINARIAN' ? (
                <VetDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onApiLog={setResponseLog}
                />
              ) : activeRole === 'STAFF' ? (
                <StaffDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onApiLog={setResponseLog}
                />
              ) : activeRole === 'OWNER' ? (
                <OwnerDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onApiLog={setResponseLog}
                />
              ) : (
                <AdminDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onApiLog={setResponseLog}
                />
              )}
            </div>

            {/* Collapsible HTTP Response Inspector */}
            {showInspector && (
              <div className="w-96 bg-slate-900 border-l border-slate-800 p-4 flex flex-col overflow-hidden text-slate-200 flex-shrink-0 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono font-semibold text-slate-300">Live API Inspector</span>
                  <button
                    onClick={() => setShowInspector(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Đóng ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto mt-3 font-mono text-xs">
                  {responseLog ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">Status:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${responseLog.status >= 200 && responseLog.status < 300
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                        >
                          {responseLog.status}
                        </span>
                      </div>
                      <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto text-[11px] text-slate-300">
                        {JSON.stringify(responseLog.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic mt-4 text-[11px]">
                      Chưa có phản hồi mạng mới. Thao tác trên màn hình (đổi trạng thái, đổi điểm, chat AI...) sẽ hiển thị JSON tại đây.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App({ initialScreen = 'login' }) {
  return (
    <AuthProvider>
      <AppContent initialScreen={initialScreen} />
    </AuthProvider>
  );
}
