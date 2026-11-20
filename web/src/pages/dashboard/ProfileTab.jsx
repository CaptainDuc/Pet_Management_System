import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  Lock,
  Save,
  RefreshCw,
} from "lucide-react";
import { Card, Input, Button, Badge, Avatar } from '../../design-system/components';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function ProfileTab({ user, token, onApiLog }) {
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    avatarUrl: user?.avatarUrl || "",
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || "",
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.warn("Update profile error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined" padding="lg" className="max-w-2xl space-y-6">
      <Card.Header className="border-b border-slate-100 pb-4">
        <Card.Title className="font-bold text-base text-slate-900">
          Hồ sơ tài khoản cá nhân
        </Card.Title>
        <Card.Description className="text-xs text-slate-500 mt-0.5">
          Xem và cập nhật thông tin hiển thị, số điện thoại liên lạc của bạn
          trong hệ thống
        </Card.Description>
      </Card.Header>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-700 font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Thông tin hồ sơ của bạn đã được cập nhật thành công!</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
        <div className="flex items-center space-x-4 pb-2">
          <Avatar
            name={profileData.fullName}
            size="xl"
            src={profileData.avatarUrl}
          />
          <div>
            <div className="font-bold text-sm text-slate-900">
              {profileData.fullName || user?.email}
            </div>
            <div className="text-slate-500 font-mono text-[11px] mt-0.5">
              {user?.email}
            </div>
            <Badge variant="primary" size="xs" className="mt-1">
              {user?.role || (user?.roles && user.roles[0]) || "CUSTOMER"}
            </Badge>
          </div>
        </div>

        <Input
          label="Họ và tên *"
          required
          value={profileData.fullName}
          onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
          fullWidth
        />

        <Input
          label="Địa chỉ Email (Định danh hệ thống)"
          type="email"
          disabled
          value={user?.email || ""}
          hint="Email là tên tài khoản đăng nhập và không thể tự thay đổi"
          fullWidth
        />

        <Input
          label="Số điện thoại liên lạc"
          type="tel"
          placeholder="0912 345 678"
          value={profileData.phone}
          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
          fullWidth
        />

        <Input
          label="Đường dẫn ảnh đại diện (Avatar URL)"
          type="url"
          placeholder="https://example.com/avatar.jpg"
          value={profileData.avatarUrl}
          onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
          fullWidth
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            leftIcon={saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            size="md"
          >
            {saving ? "Đang lưu..." : "Lưu thông tin hồ sơ"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
