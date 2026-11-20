import React from 'react';
import { PawPrint, LayoutDashboard, CalendarDays, Gift, MessageCircle, UserRound, Home, LogOut, ArrowUpRight } from 'lucide-react';
import NotificationBell from './NotificationBell';
import '../customer.css';

const tabs = [
  ['overview', 'Tổng quan', LayoutDashboard], ['pets', 'Thú cưng của tôi', PawPrint],
  ['bookings', 'Lịch hẹn', CalendarDays], ['loyalty', 'Điểm thưởng', Gift],
  ['ai-chat', 'Trợ lý AI', MessageCircle], ['profile', 'Hồ sơ cá nhân', UserRound],
];

export function CustomerBrand({ href = '/' }) {
  return <a href={href} className="pc-brand" aria-label={href === '/' ? 'Pet Service — Trang chủ' : 'Pet Service — Bảng điều khiển'}><span><PawPrint size={25} /></span><div><strong>PET SERVICE</strong><small>Trao gửi yêu thương</small></div></a>;
}

export default function CustomerPortal({ user, token, activeTab, setActiveTab, onLogout, children }) {
  const initials = (user?.fullName || 'Bạn').split(' ').slice(-2).map(word => word[0]).join('');
  return <div className="pc-light pc-app">
    <header className="pc-topbar"><CustomerBrand /><div className="pc-topbar-right"><a className="pc-home-link" href="/"><Home size={16} />Về trang chủ</a><NotificationBell token={token} /><span className="pc-avatar" aria-label={user?.fullName}>{initials}</span></div></header>
    <div className="pc-frame">
      <aside className="pc-sidebar" aria-label="Điều hướng khách hàng">
        <div className="pc-sidebar-intro"><strong>Và những người bạn nhỏ.</strong></div>
        <nav className="pc-nav">{tabs.map(([id, label, Icon]) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}><Icon size={19} />{label}</button>)}</nav>
        <div className="pc-sidebar-bottom"><a href="/#dich-vu">Khám phá dịch vụ<ArrowUpRight size={15} /></a><div className="pc-user"><span className="pc-avatar">{initials}</span><div><strong>{user?.fullName}</strong><small>Khách hàng Pet Service</small></div></div><button className="pc-text-button" onClick={onLogout}><LogOut size={15} />Đăng xuất</button></div>
      </aside>
      <main className="pc-main"><div className="pc-content">{children}</div></main>
    </div>
    <nav className="pc-mobile-nav" aria-label="Điều hướng trên điện thoại">{tabs.filter(([id]) => ['overview', 'pets', 'bookings', 'ai-chat', 'profile'].includes(id)).map(([id, label, Icon]) => <button key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}><Icon size={21} />{id === 'pets' ? 'Thú cưng' : id === 'profile' ? 'Tài khoản' : label}</button>)}</nav>
  </div>;
}
