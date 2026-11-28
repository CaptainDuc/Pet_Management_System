import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getAssignedRoles, getLoginPath } from './utils/roles';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import VetDashboard from './pages/dashboard/VetDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import OwnerDashboard from './pages/dashboard/OwnerDashboard';
import ProfileTab from './pages/dashboard/ProfileTab';
import CustomerPortal from './components/CustomerPortal';
import WorkPortal from './components/WorkPortal';

const ROLE_CONFIGS = {
  CUSTOMER: {
    name: 'Khách hàng',
    title: 'PetCare Customer Portal',
    subtitle: 'Chăm sóc & Lịch hẹn thú cưng',
    badgeVariant: 'info',
    accentToken: 'var(--color-brand-primary)',
    defaultTab: 'overview',
    tabs: [
      { id: 'overview', label: 'Tổng quan' },
      { id: 'pets', label: 'Thú cưng của tôi' },
      { id: 'bookings', label: 'Đặt lịch hẹn' },
      { id: 'loyalty', label: 'Điểm thưởng & Hạng thẻ' },
      { id: 'ai-chat', label: 'Trợ lý AI Thú y' },
      { id: 'profile', label: 'Hồ sơ cá nhân' }
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
      { id: 'medical', label: 'Bệnh án' },
      { id: 'schedule', label: 'Lịch khám' },
      { id: 'prescriptions', label: 'Đơn thuốc' },
      { id: 'ai-diagnostics', label: 'Tham vấn AI' },
      { id: 'profile', label: 'Hồ sơ Bác sĩ' }
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
      { id: 'reception', label: 'Tiếp đón' },
      { id: 'bookings', label: 'Lịch hẹn' },
      { id: 'invoices', label: 'Hóa đơn' },
      { id: 'customers', label: 'Khách hàng' },
      { id: 'my-shifts', label: 'Ca của tôi' },
      { id: 'profile', label: 'Hồ sơ Nhân viên' }
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
      { id: 'analytics', label: 'Tổng quan kinh doanh' },
      { id: 'promotions', label: 'Khuyến mãi' },
      { id: 'staff-mgmt', label: 'Nhân sự' },
      { id: 'services', label: 'Dịch vụ & bảng giá' },
      { id: 'audit', label: 'Nhật ký giám sát' },
      { id: 'profile', label: 'Hồ sơ Chủ phòng khám' }
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
      { id: 'users', label: 'Tài khoản' },
      { id: 'promotions', label: 'Khuyến mãi' },
      { id: 'rbac', label: 'Vai trò & quyền' },
      { id: 'audit', label: 'Nhật ký kiểm toán' },
      { id: 'system', label: 'Hệ thống & AI' },
      { id: 'profile', label: 'Hồ sơ Quản trị' }
    ]
  }
};

const dashboards = { ADMIN: AdminDashboard, OWNER: OwnerDashboard, STAFF: StaffDashboard, VETERINARIAN: VetDashboard, CUSTOMER: CustomerDashboard };

function AppContent({ initialScreen = 'login' }) {
  const { user, token, isAuthenticated, isInitializing, logout } = useAuth();
  const userRoles = getAssignedRoles(user);
  const roleKey = userRoles.join(',');
  const [screen, setScreen] = useState(initialScreen);
  const [activeRole, setActiveRole] = useState(userRoles[0]);
  const [activeTab, setActiveTab] = useState(ROLE_CONFIGS[userRoles[0]].defaultTab);
  const role = userRoles.includes(activeRole) ? activeRole : userRoles[0];
  const config = ROLE_CONFIGS[role];

  function navigate(target) {
    setScreen(target);
    window.history.replaceState(null, '', target === 'dashboard' ? '/dashboard' : `/${target}`);
  }

  useEffect(() => {
    if (isInitializing) return;
    if (isAuthenticated && user) {
      if (getLoginPath(user) === '/' && ['/login', '/register'].includes(window.location.pathname)) {
        window.location.replace('/');
        return;
      }
      setScreen('dashboard');
      if (window.location.pathname !== '/dashboard') window.history.replaceState(null, '', '/dashboard');
      setActiveRole(userRoles[0]);
      setActiveTab(ROLE_CONFIGS[userRoles[0]].defaultTab);
    } else if (window.location.pathname === '/dashboard') {
      navigate('login');
    }
  }, [isAuthenticated, user?.id, isInitializing, roleKey]);

  const loading = <div className="pc-light min-h-screen flex items-center justify-center" role="status">Đang khôi phục phiên đăng nhập...</div>;
  if (isInitializing) return loading;
  if (!isAuthenticated) {
    if (screen === 'register') return <RegisterPage onNavigate={navigate} />;
    if (screen === 'forgot-password') return <ForgotPasswordPage onNavigate={navigate} />;
    return <LoginPage onNavigate={navigate} />;
  }
  if (screen !== 'dashboard') return loading;

  const Dashboard = dashboards[role];
  const content = activeTab === 'profile' ? <ProfileTab user={user} token={token} /> : <Dashboard user={user} token={token} activeTab={activeTab} setActiveTab={setActiveTab} />;
  if (role === 'CUSTOMER' && userRoles.length === 1) return <CustomerPortal user={user} token={token} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={async () => { await logout(); window.location.assign('/'); }}>
    {activeTab === 'profile' ? <><div className="pc-heading"><div><h1>Hồ sơ cá nhân</h1><p>Thông tin của bạn, luôn được cập nhật.</p></div></div>{content}<button className="pc-text-button" onClick={async () => { await logout(); window.location.assign('/'); }}><LogOut size={16} />Đăng xuất</button><div className="pc-form-actions"><button className="pc-button pc-button--soft" onClick={() => setActiveTab('loyalty')}>Điểm thưởng</button><button className="pc-button pc-button--soft" onClick={() => setActiveTab('ai-chat')}>Trợ lý AI</button></div></> : content}
  </CustomerPortal>;

  return <WorkPortal user={user} token={token} role={role} config={config} activeTab={activeTab}
    roleOptions={userRoles.map(id => ({ id, label: ROLE_CONFIGS[id].name }))}
    onTabChange={setActiveTab}
    onRoleChange={nextRole => { if (userRoles.includes(nextRole)) { setActiveRole(nextRole); setActiveTab(ROLE_CONFIGS[nextRole].defaultTab); } }}
    onLogout={async () => { await logout(); window.location.assign('/login'); }}>
    {content}
  </WorkPortal>;
}

export default function StaffPortal({ initialScreen = 'login' }) {
  return <AuthProvider><AppContent initialScreen={initialScreen} /></AuthProvider>;
}
