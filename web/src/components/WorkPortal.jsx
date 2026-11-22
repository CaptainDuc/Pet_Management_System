import React, { useState } from 'react';
import { Activity, CalendarDays, BarChart2, ClipboardList, FileClock, FileText, Gift, LayoutDashboard, LogOut, Menu, MessageCircle, PawPrint, Pill, Scissors, ShieldCheck, Stethoscope, UserRound, Users, X } from 'lucide-react';
import { CustomerBrand } from './CustomerPortal';
import NotificationBell from './NotificationBell';
import { Avatar } from '../design-system/components';
import '../workspace.css';

const icons = { overview: LayoutDashboard, pets: PawPrint, bookings: CalendarDays, loyalty: Gift, 'ai-chat': MessageCircle, profile: UserRound, users: Users, roles: ShieldCheck, rbac: ShieldCheck, audit: FileClock, system: Activity, promotions: Gift, analytics: BarChart2, 'staff-mgmt': Users, services: Scissors, reception: ClipboardList, invoices: FileText, customers: Users, medical: Stethoscope, schedule: CalendarDays, prescriptions: Pill, 'ai-diagnostics': MessageCircle };

export default function WorkPortal({ user, token, role, config, roleOptions, activeTab, onTabChange, onRoleChange, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = config.tabs.find(tab => tab.id === activeTab);
  return <div className="pc-light pc-app pc-work">
    <header className="pc-topbar">
      <div className="pc-work-brand"><button className="pc-work-menu pc-icon-button" type="button" aria-label={menuOpen ? 'Đóng menu làm việc' : 'Mở menu làm việc'} aria-expanded={menuOpen} aria-controls="work-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button><CustomerBrand href="/dashboard" /></div>
      <div className="pc-topbar-right"><span className="pc-work-role">{config.name}</span><NotificationBell token={token} /><Avatar className="pc-avatar" src={user?.avatarUrl} name={user?.fullName} aria-label="Mở hồ sơ cá nhân" onClick={() => onTabChange('profile')} /></div>
    </header>
    <div className="pc-frame">
      <aside id="work-navigation" className={`pc-sidebar pc-work-sidebar ${menuOpen ? 'pc-work-sidebar--open' : ''}`} aria-label="Điều hướng làm việc">
        <div className="pc-sidebar-intro"><strong>Không gian làm việc</strong><span>{config.name}</span></div>
        {roleOptions.length > 1 && <label className="pc-field pc-work-role-select">Vai trò làm việc<select value={role} onChange={event => { onRoleChange(event.target.value); setMenuOpen(false); }}>{roleOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}
        <nav className="pc-nav">{config.tabs.map(tab => { const Icon = icons[tab.id] || LayoutDashboard; return <button key={tab.id} type="button" aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => { onTabChange(tab.id); setMenuOpen(false); }}><Icon size={19} />{tab.label}</button>; })}</nav>
        <div className="pc-sidebar-bottom"><div className="pc-user"><Avatar className="pc-avatar" src={user?.avatarUrl} name={user?.fullName} /><div><strong>{user?.fullName}</strong><small>{user?.email}</small></div></div><button className="pc-text-button" onClick={onLogout}><LogOut size={16} />Đăng xuất</button></div>
      </aside>
      <main className="pc-main"><div className="pc-content"><div className="pc-heading pc-work-heading"><div><h1>{current?.label || 'Bảng điều khiển'}</h1><p>{config.subtitle}</p></div><span className="pc-work-session"><span />Đang làm việc</span></div><div className="pc-work-content">{children}</div></div></main>
    </div>
  </div>;
}
