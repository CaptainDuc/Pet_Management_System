import React, { useState, useEffect } from 'react';
import {
  Shield, Key, User, Users, Lock, LogOut,
  CheckCircle, XCircle, Plus, Edit, Trash, Settings,
  Send, Database, Server, UserCheck, AlertTriangle, ArrowRight,
  ExternalLink, Sparkles, Stethoscope, Calendar, CreditCard,
  TrendingUp, Building2, ChevronDown, Eye, Layers
} from 'lucide-react';
import { Sidebar, Button, Badge, Avatar } from './design-system/components';
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
import NotificationBell from './components/NotificationBell';
import CustomerPortal from './components/CustomerPortal';

// Role configurations using design tokens (CSS custom properties)
const ROLE_CONFIGS = {
  CUSTOMER: {
    name: 'Khách hàng',
    title: 'PetCare Customer Portal',
    subtitle: 'Chăm sóc & Lịch hẹn thú cưng',
    badgeVariant: 'info',
    accentToken: 'var(--color-brand-primary)',
    defaultTab: 'overview',
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
    badgeVariant: 'success',
    accentToken: 'var(--color-brand-secondary)',
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
    badgeVariant: 'info',
    accentToken: 'var(--color-brand-accent)',
    defaultTab: 'reception',
    tabs: [
      { id: 'reception', label: 'Bàn tiếp đón & Check-in', icon: '🛎️' },
      { id: 'bookings', label: 'Lịch hẹn', icon: '📅' },
      { id: 'invoices', label: 'Quầy Thu ngân & Hóa đơn', icon: '🧾' },
      { id: 'customers', label: 'Danh bạ Khách hàng', icon: '👥' },
      { id: 'profile', label: 'Hồ sơ Nhân viên', icon: '👤' }
    ]
  },
  OWNER: {
    name: 'Chủ phòng khám',
    title: 'PetCare Executive Suite',
    subtitle: 'Doanh thu, Nhân sự & KPI',
    badgeVariant: 'primary',
    accentToken: 'var(--color-brand-primary)',
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
    badgeVariant: 'warning',
    accentToken: 'var(--color-brand-warning)',
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
  const { user, token, isAuthenticated, isInitializing, logout } = useAuth();

  // Navigation state: 'login' | 'register' | 'forgot-password' | 'dashboard'
  const [screen, setScreen] = useState(initialScreen);

  // Detect user's primary role or allow Admin / Multi-role user to switch perspective
  const [activeRole, setActiveRole] = useState('CUSTOMER');
  const [activeTab, setActiveTab] = useState('overview');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
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
    if (isInitializing) return;
    if (isAuthenticated && user) {
      const primaryRole = getAssignedRoles(user)[0] || 'CUSTOMER';
      if (primaryRole === 'CUSTOMER' && ['/login', '/register'].includes(window.location.pathname)) {
        window.location.replace('/');
        return;
      }
      setScreen('dashboard');
      if (window.location.pathname !== '/dashboard') {
        window.history.replaceState(null, '', '/dashboard');
      }
      setActiveRole(primaryRole);
      setActiveTab(ROLE_CONFIGS[primaryRole]?.defaultTab || 'profile');
    } else if (!isAuthenticated && window.location.pathname === '/dashboard') {
      setScreen('login');
      window.history.replaceState(null, '', '/login');
    }
  }, [isAuthenticated, user, isInitializing]);

  // Only allow switching between roles actually assigned to the user
  const handleRoleChange = (newRole) => {
    if (!userRoles.includes(newRole)) return;
    setActiveRole(newRole);
    setActiveTab(ROLE_CONFIGS[newRole]?.defaultTab || 'profile');
    setShowRoleDropdown(false);
  };

  const currentRoleConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.CUSTOMER;

  // Top navigation bar using design tokens
  const renderNavSwitcher = () => (
    <div className="bg-[var(--color-bg-primary)]/90 backdrop-blur-md border-b border-[var(--color-border-primary)] px-4 py-2 flex items-center justify-between text-xs font-sans sticky top-0 z-50 shadow-[var(--shadow-sm)]">
      <div className="flex items-center space-x-3">
        <span className="font-bold text-[var(--color-fg-primary)] flex items-center space-x-2">
          <img src="/logo.png" alt="PetCare Logo" className="h-6 w-auto object-contain" />
          <span className="text-sm tracking-tight" style={{ color: 'var(--color-brand-primary)' }}>PetCare Platform</span>
        </span>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        <Button
          variant={screen === 'login' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => navigate('login')}
        >
          Đăng nhập
        </Button>
        <Button
          variant={screen === 'register' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => navigate('register')}
        >
          Đăng ký
        </Button>
        <Button
          variant={screen === 'forgot-password' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => navigate('forgot-password')}
        >
          Quên mật khẩu
        </Button>
        {isAuthenticated && (
          <Button
            variant={screen === 'dashboard' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => navigate('dashboard')}
          >
            Bảng điều khiển
          </Button>
        )}
      </div>

      <div className="hidden md:flex items-center space-x-2 text-[var(--color-fg-tertiary)]">
        {user ? (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[var(--color-fg-primary)] font-medium">{user.fullName || user.email}</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={async () => {
                await logout();
                navigate('login');
              }}
            >
              Thoát
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--color-fg-disabled)]">Chưa xác thực</span>
        )}
      </div>
    </div>
  );

  // AUTH SCREENS
  if (isInitializing) return <div className="pc-light min-h-screen flex items-center justify-center" role="status">Đang khôi phục phiên đăng nhập...</div>;
  if (screen === 'login') {
    return (
      <div className="min-h-screen flex flex-col">
        <LoginPage
          onNavigate={navigate}
        />
      </div>
    );
  }

  if (screen === 'register') {
    return (
      <div className="min-h-screen flex flex-col">
        <RegisterPage
          onNavigate={navigate}
        />
      </div>
    );
  }

  if (screen === 'forgot-password') {
    return (
      <div className="min-h-screen flex flex-col">
        <ForgotPasswordPage onNavigate={navigate} />
      </div>
    );
  }

  if (activeRole === 'CUSTOMER' && userRoles.length === 1) return <CustomerPortal user={user} token={token} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={async () => { await logout(); window.location.assign('/'); }}>
    {activeTab === 'profile' ? <><div className="pc-heading"><div><h1>Hồ sơ cá nhân</h1><p>Thông tin của bạn, luôn được cập nhật.</p></div></div><ProfileTab user={user} token={token} /><button className="pc-text-button" onClick={async () => { await logout(); window.location.assign('/'); }}><LogOut size={16} />Đăng xuất</button><div className="pc-form-actions"><button className="pc-button pc-button--soft" onClick={() => setActiveTab('loyalty')}>Điểm thưởng</button><button className="pc-button pc-button--soft" onClick={() => setActiveTab('ai-chat')}>Trợ lý AI</button></div></> : <CustomerDashboard user={user} token={token} activeTab={activeTab} setActiveTab={setActiveTab} />}
  </CustomerPortal>;

  // AUTHENTICATED ROLE-BASED DASHBOARD - using design tokens for layout theme
  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-secondary)] text-[var(--color-fg-primary)] font-sans overflow-hidden">
      {renderNavSwitcher()}

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <Sidebar
          variant="permanent"
          position="left"
          width="md"
          header={
            <div className="p-4 border-b border-[var(--color-border-primary)] flex items-center space-x-3 bg-[var(--color-bg-tertiary)]/50">
              <div className="w-10 h-10 rounded-[var(--radius-card-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)]/80 flex items-center justify-center p-1.5 overflow-hidden shadow-[var(--shadow-sm)]">
                <img src="/logo.png" alt="PetCare Logo" className="h-full w-auto object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-[var(--color-fg-primary)] block truncate">{currentRoleConfig.title}</span>
                <span className="text-[10px] text-[var(--color-fg-tertiary)] block truncate">{currentRoleConfig.subtitle}</span>
              </div>
            </div>
          }
          footer={
            <div className="p-4 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]/70">
              {user ? (
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2.5">
                    <Avatar
                      name={user.fullName}
                      size="md"
                      src={user.avatarUrl}
                    />
                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-bold text-[var(--color-fg-primary)] truncate">{user.fullName || 'Người dùng'}</div>
                      <div className="text-[11px] text-[var(--color-fg-tertiary)] truncate font-mono">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <Badge variant={currentRoleConfig.badgeVariant} size="xs">
                      {activeRole}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={async () => {
                        await logout();
                        navigate('login');
                      }}
                      leftIcon={<LogOut className="w-3 h-3" />}
                    >
                      Đăng xuất
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--color-fg-disabled)] text-center">Chưa xác thực</div>
              )}
            </div>
          }
        >
          {/* Role Selector */}
          {userRoles.length > 1 && (
            <div className="px-3 pt-3">
              <div className="relative">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span className="text-xs">{ROLE_ICONS[activeRole] || '🐾'}</span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--color-fg-tertiary)] uppercase font-semibold block leading-tight">Vai trò</span>
                      <span className="text-xs font-bold text-[var(--color-fg-primary)] truncate block">{currentRoleConfig.name}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[var(--color-fg-tertiary)] flex-shrink-0" />
                </Button>

                {showRoleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-card-lg)] shadow-[var(--shadow-card-lg)] z-50 p-1.5 space-y-1 animate-fadeIn">
                    <div className="px-2 py-1 text-[10px] font-bold text-[var(--color-fg-disabled)] uppercase tracking-wider">
                      Vai trò của bạn:
                    </div>
                    {userRoles.map((roleKey) => (
                      <Button
                        key={roleKey}
                        variant={activeRole === roleKey ? 'primary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => handleRoleChange(roleKey)}
                      >
                        <span className="flex items-center space-x-2 flex-1">
                          <span>{ROLE_ICONS[roleKey] || '🐾'}</span>
                          <span>{ROLE_CONFIGS[roleKey].name}</span>
                        </span>
                        {activeRole === roleKey && <CheckCircle className="w-3.5 h-3.5" />}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Role-Specific Navigation Menu */}
          <nav className="p-3 space-y-1 mt-1">
            {currentRoleConfig.tabs.map(tab => (
              <Sidebar.NavItem
                key={tab.id}
                label={tab.label}
                icon={<span className="text-sm">{tab.icon}</span>}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </nav>
        </Sidebar>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-secondary)]">
          {/* Top Bar */}
          <header className="h-14 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-[var(--color-fg-primary)] flex items-center space-x-1.5">
                <span>{currentRoleConfig.title}</span>
                <Badge variant="ghost" size="xs">/</Badge>
                <Badge variant="primary" size="xs">
                  {currentRoleConfig.tabs.find(t => t.id === activeTab)?.label || 'Bảng điều khiển'}
                </Badge>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationBell token={token} />
            </div>
          </header>

          {/* Dynamic Role Dashboard Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Role Content View */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'profile' ? (
                <ProfileTab user={user} token={token} />
              ) : activeRole === 'CUSTOMER' ? (
                <CustomerDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              ) : activeRole === 'VETERINARIAN' ? (
                <VetDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              ) : activeRole === 'STAFF' ? (
                <StaffDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              ) : activeRole === 'OWNER' ? (
                <OwnerDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              ) : (
                <AdminDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              )}
            </div>
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
