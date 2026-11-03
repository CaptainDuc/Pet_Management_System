import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Shield, CheckCircle2, Lock, Save, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export default function ProfileTab({ user, token, onApiLog }) {
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || ''
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || ''
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Update profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-bold text-base text-slate-900">Hồ sơ tài khoản cá nhân</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Xem và cập nhật thông tin hiển thị, số điện thoại liên lạc của bạn trong hệ thống
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-700 font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Thông tin hồ sơ của bạn đã được cập nhật thành công!</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
        <div className="flex items-center space-x-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-xs overflow-hidden">
            {profileData.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'U'}</span>
            )}
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">{profileData.fullName || user?.email}</div>
            <div className="text-slate-500 font-mono text-[11px] mt-0.5">{user?.email}</div>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              {user?.role || (user?.roles && user.roles[0]) || 'CUSTOMER'}
            </span>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Họ và tên *</label>
          <input
            type="text"
            required
            value={profileData.fullName}
            onChange={e => setProfileData({ ...profileData, fullName: e.target.value })}
            className="w-full h-10 px-3.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Địa chỉ Email (Định danh hệ thống)</label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full h-10 px-3.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed font-mono text-[11px]"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">Email là tên tài khoản đăng nhập và không thể tự thay đổi</span>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Số điện thoại liên lạc</label>
          <input
            type="tel"
            placeholder="0912 345 678"
            value={profileData.phone}
            onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
            className="w-full h-10 px-3.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Đường dẫn ảnh đại diện (Avatar URL)</label>
          <input
            type="url"
            placeholder="https://example.com/avatar.jpg"
            value={profileData.avatarUrl}
            onChange={e => setProfileData({ ...profileData, avatarUrl: e.target.value })}
            className="w-full h-10 px-3.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-semibold shadow-xs transition active:scale-95 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Đang lưu...' : 'Lưu thông tin hồ sơ'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
