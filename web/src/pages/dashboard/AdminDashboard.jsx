import React, { useState, useEffect } from 'react';
import {
  Users, Lock, Shield, Server, RefreshCw, CheckCircle2,
  AlertTriangle, Search, Filter, Plus, UserCheck, Key,
  ChevronRight, Database, Cpu, Activity
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export default function AdminDashboard({ user, token, activeTab, setActiveTab, onApiLog }) {
  // Users state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  // Roles & Perms state
  const [rolesList, setRolesList] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [selectedUserForRole, setSelectedUserForRole] = useState('');
  const [selectedRolesForUser, setSelectedRolesForUser] = useState([]);
  const [selectedRoleForPerm, setSelectedRoleForPerm] = useState('');
  const [selectedPermsForRole, setSelectedPermsForRole] = useState([]);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  // Audit state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // System Health state
  const systemServices = [
    { name: 'Core Backend Monolith', port: 8080, type: 'Spring Boot 3.3', status: 'HEALTHY', memory: '~320 MB' },
    { name: 'Payment Microservice', port: 8082, type: 'Spring Boot 3.3', status: 'HEALTHY', memory: '~260 MB' },
    { name: 'Notification Microservice', port: 8083, type: 'Spring Boot 3.3', status: 'HEALTHY', memory: '~260 MB' },
    { name: 'AI Vision Service', port: 8003, type: 'FastAPI / PyTorch', status: 'HEALTHY', memory: '~115 MB' },
    { name: 'AI RAG Service', port: 8002, type: 'FastAPI / Chroma', status: 'HEALTHY', memory: '~80 MB' },
    { name: 'AI Agent Service', port: 8001, type: 'FastAPI / LangChain', status: 'HEALTHY', memory: '~65 MB' },
    { name: 'AI Recommendation', port: 8004, type: 'FastAPI / Scikit', status: 'HEALTHY', memory: '~45 MB' },
    { name: 'PostgreSQL Primary Cluster', port: 5432, type: 'Postgres 16', status: 'HEALTHY', memory: '~45 MB' },
    { name: 'Redis Cache & Sessions', port: 6379, type: 'Redis 7.2', status: 'HEALTHY', memory: '~8 MB' },
    { name: 'RabbitMQ Message Broker', port: 5672, type: 'RabbitMQ 3.13', status: 'HEALTHY', memory: '~78 MB' }
  ];

  const fetchUsers = async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users?page=0&size=50`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data?.content) {
        setUsersList(data.data.content);
      }
    } catch (err) {
      console.warn('Fetch users error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserStatus = async (userId, newStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      fetchUsers();
    } catch (err) {
      console.warn('Update user status error:', err);
    }
  };

  const fetchRoles = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/roles`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data) {
        setRolesList(data.data);
      }
    } catch (err) {
      console.warn('Fetch roles error:', err);
    }
  };

  const fetchPermissions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/permissions`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data) {
        setPermissionsList(data.data);
      }
    } catch (err) {
      console.warn('Fetch perms error:', err);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!token || !newRole.name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRole)
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      setNewRole({ name: '', description: '' });
      fetchRoles();
    } catch (err) {
      console.warn('Create role error:', err);
    }
  };

  const fetchAudit = async () => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit?page=0&size=30`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data?.content) {
        setAuditLogs(data.data.content);
      }
    } catch (err) {
      console.warn('Fetch audit error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
      fetchRoles();
    } else if (activeTab === 'rbac') {
      fetchRoles();
      fetchPermissions();
    } else if (activeTab === 'audit') {
      fetchAudit();
    }
  }, [activeTab]);

  const filteredUsers = usersList.filter(u => {
    const matchSearch = (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter || (u.roles && u.roles.includes(userRoleFilter));
    const matchStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* TAB 1: QUẢN LÝ NGƯỜI DÙNG */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  👥
                </span>
                <h2 className="text-lg font-bold text-slate-900">Quản lý Tài khoản & Phân quyền</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kiểm soát trạng thái tài khoản (Khóa/Mở khóa), phân vai trò và cấp quyền bảo mật
              </p>
            </div>
            <button
              onClick={fetchUsers}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email người dùng..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Vai trò:</span>
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
                <option value="VETERINARIAN">VETERINARIAN</option>
                <option value="STAFF">STAFF</option>
                <option value="CUSTOMER">CUSTOMER</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Trạng thái:</span>
              <select
                value={userStatusFilter}
                onChange={e => setUserStatusFilter(e.target.value)}
                className="h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Đang khóa (INACTIVE)</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Họ và tên</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Số điện thoại</th>
                    <th className="py-3 px-4 font-semibold">Vai trò (Role)</th>
                    <th className="py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="py-3 px-4 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{u.fullName || '—'}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-3 px-4 text-slate-600">{u.phone || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {u.role || (u.roles && u.roles[0]) || 'CUSTOMER'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                          >
                            {u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleUserStatus(u.id, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${u.status === 'ACTIVE'
                              ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                              }`}
                          >
                            {u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        {usersLoading ? 'Đang tải danh sách người dùng...' : 'Không tìm thấy người dùng phù hợp với bộ lọc.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PHÂN QUYỀN RBAC */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  🛡️
                </span>
                <h2 className="text-lg font-bold text-slate-900">Phân quyền Vai trò & Quyền hạn (RBAC)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Định nghĩa các vai trò hệ thống (Role) và phân bổ quyền năng chi tiết theo module (Permission)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">Danh mục Vai trò ({rolesList.length})</h3>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {rolesList.map(r => (
                  <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900">{r.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">ID: {r.id?.slice(0, 8)}...</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{r.description || 'Chưa có mô tả'}</p>
                  </div>
                ))}
              </div>

              {/* Form Create Role */}
              <form onSubmit={handleCreateRole} className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                <span className="font-bold text-slate-800 block">Tạo vai trò mới</span>
                <input
                  type="text"
                  placeholder="Tên vai trò (VD: PHARMACIST)"
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value.toUpperCase() })}
                  className="w-full h-8 px-3 border border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none font-mono"
                />
                <input
                  type="text"
                  placeholder="Mô tả quyền hạn..."
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full h-8 px-3 border border-slate-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                >
                  + Thêm vai trò
                </button>
              </form>
            </div>

            {/* Permissions List */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Danh mục Quyền hạn theo Module ({permissionsList.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {permissionsList.map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 flex items-start space-x-2.5 text-xs">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                      {p.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{p.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NHẬT KÝ KIỂM TOÁN AUDIT */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  📜
                </span>
                <h2 className="text-lg font-bold text-slate-900">Nhật ký Kiểm toán Toàn diện (Audit Logs)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lịch sử theo dõi mọi hành vi bảo mật, đăng nhập, khóa tài khoản và phân quyền
              </p>
            </div>
            <button
              onClick={fetchAudit}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Thời gian</th>
                    <th className="py-3 px-4 font-semibold">Thao tác</th>
                    <th className="py-3 px-4 font-semibold">Đối tượng</th>
                    <th className="py-3 px-4 font-semibold">Người thực hiện</th>
                    <th className="py-3 px-4 font-semibold">Dữ liệu ghi nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{log.entityType}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">User: {log.userId?.slice(0, 8)}...</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                          {log.newValue ? JSON.stringify(log.newValue) : 'Thành công'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        {auditLoading ? 'Đang tải dữ liệu...' : 'Chưa có bản ghi mới.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GIÁM SÁT HỆ THỐNG */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  ⚡
                </span>
                <h2 className="text-lg font-bold text-slate-900">Giám sát Hạ tầng Microservices & AI Cluster</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tình trạng vận hành 10 dịch vụ chính, mức tiêu thụ RAM tối ưu ~1.34 GB và cổng kết nối
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-xs border border-emerald-200">
              Tất cả 10 containers: ONLINE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemServices.map((svc, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                    <Server className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{svc.name}</h4>
                    <span className="text-[11px] text-slate-500">{svc.type} • Port :{svc.port}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 block mb-1">
                    {svc.status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">RAM: {svc.memory}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
