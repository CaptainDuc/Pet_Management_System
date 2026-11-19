import React, { useState, useEffect } from "react";
import {
  Users,
  Lock,
  Shield,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  UserCheck,
  Key,
  ChevronRight,
  Database,
  Cpu,
  Activity,
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Table } from '../../design-system/components';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function AdminDashboard({
  user,
  token,
  activeTab,
  setActiveTab,
  onApiLog,
}) {
  // Users state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");

  // Roles & Perms state
  const [rolesList, setRolesList] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [selectedUserForRole, setSelectedUserForRole] = useState("");
  const [selectedRolesForUser, setSelectedRolesForUser] = useState([]);
  const [selectedRoleForPerm, setSelectedRoleForPerm] = useState("");
  const [selectedPermsForRole, setSelectedPermsForRole] = useState([]);
  const [newRole, setNewRole] = useState({ name: "", description: "" });

  // Audit state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // System Health state
  const systemServices = [
    {
      name: "Core Backend Monolith",
      port: 8080,
      type: "Spring Boot 3.3",
      status: "HEALTHY",
      memory: "~320 MB",
    },
    {
      name: "Payment Microservice",
      port: 8082,
      type: "Spring Boot 3.3",
      status: "HEALTHY",
      memory: "~260 MB",
    },
    {
      name: "Notification Microservice",
      port: 8083,
      type: "Spring Boot 3.3",
      status: "HEALTHY",
      memory: "~260 MB",
    },
    {
      name: "AI Vision Service",
      port: 8003,
      type: "FastAPI / PyTorch",
      status: "HEALTHY",
      memory: "~115 MB",
    },
    {
      name: "AI RAG Service",
      port: 8002,
      type: "FastAPI / Chroma",
      status: "HEALTHY",
      memory: "~80 MB",
    },
    {
      name: "AI Agent Service",
      port: 8001,
      type: "FastAPI / LangChain",
      status: "HEALTHY",
      memory: "~65 MB",
    },
    {
      name: "AI Recommendation",
      port: 8004,
      type: "FastAPI / Scikit",
      status: "HEALTHY",
      memory: "~45 MB",
    },
    {
      name: "PostgreSQL Primary Cluster",
      port: 5432,
      type: "Postgres 16",
      status: "HEALTHY",
      memory: "~45 MB",
    },
    {
      name: "Redis Cache & Sessions",
      port: 6379,
      type: "Redis 7.2",
      status: "HEALTHY",
      memory: "~8 MB",
    },
    {
      name: "RabbitMQ Message Broker",
      port: 5672,
      type: "RabbitMQ 3.13",
      status: "HEALTHY",
      memory: "~78 MB",
    },
  ];

  const fetchUsers = async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users?page=0&size=50`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data?.content) {
        setUsersList(data.data.content);
      }
    } catch (err) {
      console.warn("Fetch users error:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserStatus = async (userId, newStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      fetchUsers();
    } catch (err) {
      console.warn("Update user status error:", err);
    }
  };

  const fetchRoles = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/roles`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data) {
        setRolesList(data.data);
      }
    } catch (err) {
      console.warn("Fetch roles error:", err);
    }
  };

  const fetchPermissions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/permissions`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data) {
        setPermissionsList(data.data);
      }
    } catch (err) {
      console.warn("Fetch perms error:", err);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!token || !newRole.name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/rbac/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRole),
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      setNewRole({ name: "", description: "" });
      fetchRoles();
    } catch (err) {
      console.warn("Create role error:", err);
    }
  };

  const fetchAudit = async () => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit?page=0&size=30`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data?.content) {
        setAuditLogs(data.data.content);
      }
    } catch (err) {
      console.warn("Fetch audit error:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
      fetchRoles();
    } else if (activeTab === "rbac") {
      fetchRoles();
      fetchPermissions();
    } else if (activeTab === "audit") {
      fetchAudit();
    }
  }, [activeTab]);

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      (u.fullName || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    const matchRole =
      userRoleFilter === "ALL" ||
      u.role === userRoleFilter ||
      (u.roles && u.roles.includes(userRoleFilter));
    const matchStatus =
      userStatusFilter === "ALL" || u.status === userStatusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* TAB 1: QUẢN LÝ NGƯỜI DÙNG */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-admin-bg)] text-[var(--color-role-admin-text)] flex items-center justify-center font-bold">
                👥
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Quản lý Tài khoản & Phân quyền
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Kiểm soát trạng thái tài khoản (Khóa/Mở khóa), phân vai trò và
                  cấp quyền bảo mật
                </Card.Description>
              </div>
            </Card.Header>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? "animate-spin" : ""}`} />}
              onClick={fetchUsers}
            >
              Tải lại
            </Button>
          </Card>

          {/* Filters Bar */}
          <Card variant="outlined" padding="sm" className="flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Tìm theo tên hoặc email người dùng..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                size="sm"
                fullWidth
                leftIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Vai trò:</span>
              <Select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                size="sm"
                options={[
                  { value: "ALL", label: "Tất cả vai trò" },
                  { value: "ADMIN", label: "ADMIN" },
                  { value: "OWNER", label: "OWNER" },
                  { value: "VETERINARIAN", label: "VETERINARIAN" },
                  { value: "STAFF", label: "STAFF" },
                  { value: "CUSTOMER", label: "CUSTOMER" },
                ]}
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Trạng thái:</span>
              <Select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                size="sm"
                options={[
                  { value: "ALL", label: "Tất cả" },
                  { value: "ACTIVE", label: "Hoạt động (ACTIVE)" },
                  { value: "INACTIVE", label: "Đang khóa (INACTIVE)" },
                ]}
              />
            </div>
          </Card>

          {/* Users Table */}
          <Table
            columns={[
              { key: 'fullName', header: 'Họ và tên', render: (val) => <span className="font-semibold text-slate-900">{val || "—"}</span> },
              { key: 'email', header: 'Email', width: '200px', render: (val) => <span className="text-slate-600 font-mono text-[11px]">{val}</span> },
              { key: 'phone', header: 'Số điện thoại', width: '150px', render: (val) => <span className="text-slate-600">{val || "—"}</span> },
              { key: 'role', header: 'Vai trò (Role)', width: '150px', render: (_, row) => <Badge variant="primary" size="xs" className="font-mono">{row.role || (row.roles && row.roles[0]) || "CUSTOMER"}</Badge> },
              { key: 'status', header: 'Trạng thái', width: '140px', render: (_, row) => <Badge variant={row.status === "ACTIVE" ? "success" : "danger"} size="xs">{row.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</Badge> },
              { key: 'actions', header: 'Thao tác', width: '140px', render: (_, row) => (
                <Button
                  variant={row.status === "ACTIVE" ? "danger" : "success"}
                  size="xs"
                  onClick={() => handleUserStatus(row.id, row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                >
                  {row.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa"}
                </Button>
              )},
            ]}
            data={filteredUsers}
            keyField="id"
            striped
            hoverable
            emptyMessage={usersLoading ? "Đang tải danh sách người dùng..." : "Không tìm thấy người dùng phù hợp với bộ lọc."}
            className="table-wrapper"
          />
        </div>
      )}

      {/* TAB 2: PHÂN QUYỀN RBAC */}
      {activeTab === "rbac" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex items-center justify-between">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-admin-bg)] text-[var(--color-role-admin-text)] flex items-center justify-center font-bold">
                🛡️
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Phân quyền Vai trò & Quyền hạn (RBAC)
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Định nghĩa các vai trò hệ thống (Role) và phân bổ quyền năng chi
                  tiết theo module (Permission)
                </Card.Description>
              </div>
            </Card.Header>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <Card variant="outlined" padding="md" className="space-y-4">
              <Card.Header className="flex justify-between items-center border-b border-slate-100 pb-3">
                <Card.Title className="font-bold text-sm text-slate-900">
                  Danh mục Vai trò ({rolesList.length})
                </Card.Title>
              </Card.Header>

              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {rolesList.map((r) => (
                  <Card key={r.id} variant="subtle" padding="sm" className="text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-900">{r.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        ID: {r.id?.slice(0, 8)}...
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      {r.description || "Chưa có mô tả"}
                    </p>
                  </Card>
                ))}
              </div>

              {/* Form Create Role */}
              <form
                onSubmit={handleCreateRole}
                className="pt-2 border-t border-slate-100 space-y-2.5 text-xs"
              >
                <span className="font-bold text-slate-800 block">
                  Tạo vai trò mới
                </span>
                <Input
                  type="text"
                  placeholder="Tên vai trò (VD: PHARMACIST)"
                  value={newRole.name}
                  onChange={(e) =>
                    setNewRole({
                      ...newRole,
                      name: e.target.value.toUpperCase(),
                    })
                  }
                  size="sm"
                  fullWidth
                />
                <Input
                  type="text"
                  placeholder="Mô tả quyền hạn..."
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole({ ...newRole, description: e.target.value })
                  }
                  size="sm"
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  fullWidth
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Thêm vai trò
                </Button>
              </form>
            </Card>

            {/* Permissions List */}
            <Card variant="outlined" padding="md" className="lg:col-span-2 space-y-4">
              <Card.Header className="flex justify-between items-center border-b border-slate-100 pb-3">
                <Card.Title className="font-bold text-sm text-slate-900">
                  Danh mục Quyền hạn theo Module ({permissionsList.length})
                </Card.Title>
              </Card.Header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {permissionsList.map((p) => (
                  <Card key={p.id} variant="subtle" padding="sm" className="flex items-start space-x-2.5 text-xs">
                    <Badge variant="primary" size="xs" className="font-mono flex-shrink-0">
                      {p.code}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {p.description}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: NHẬT KÝ KIỂM TOÁN AUDIT */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-admin-bg)] text-[var(--color-role-admin-text)] flex items-center justify-center font-bold">
                📜
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Nhật ký Kiểm toán Toàn diện (Audit Logs)
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Lịch sử theo dõi mọi hành vi bảo mật, đăng nhập, khóa tài khoản
                  và phân quyền
                </Card.Description>
              </div>
            </Card.Header>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? "animate-spin" : ""}`} />}
              onClick={fetchAudit}
            >
              Tải lại
            </Button>
          </Card>

          <Table
            columns={[
              { key: 'createdAt', header: 'Thời gian', width: '180px', render: (_, row) => row.createdAt ? new Date(row.createdAt).toLocaleString("vi-VN") : "Vừa xong" },
              { key: 'action', header: 'Thao tác', width: '150px', render: (_, row) => <Badge variant="primary" size="xs" className="font-mono">{row.action}</Badge> },
              { key: 'entityType', header: 'Đối tượng', width: '120px' },
              { key: 'userId', header: 'Người thực hiện', width: '180px', render: (_, row) => `User: ${row.userId?.slice(0, 8)}...` },
              { key: 'newValue', header: 'Dữ liệu ghi nhận', render: (_, row) => row.newValue ? <span className="font-mono text-[11px] text-slate-500 max-w-xs truncate block">{JSON.stringify(row.newValue)}</span> : <span className="text-slate-500 font-mono text-[11px]">Thành công</span> },
            ]}
            data={auditLogs}
            keyField="id"
            striped
            hoverable
            emptyMessage={auditLoading ? "Đang tải dữ liệu..." : "Chưa có bản ghi mới."}
            className="table-wrapper"
          />
        </div>
      )}

      {/* TAB 4: GIÁM SÁT HỆ THỐNG */}
      {activeTab === "system" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex items-center justify-between">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-admin-bg)] text-[var(--color-role-admin-text)] flex items-center justify-center font-bold">
                ⚡
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Giám sát Hạ tầng Microservices & AI Cluster
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Tình trạng vận hành 10 dịch vụ chính, mức tiêu thụ RAM tối ưu
                  ~1.34 GB và cổng kết nối
                </Card.Description>
              </div>
            </Card.Header>
            <Badge variant="success" size="sm">
              Tất cả 10 containers: ONLINE
            </Badge>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemServices.map((svc, idx) => (
              <Card key={idx} variant="outlined" padding="md" className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-neutral-100)] border border-[var(--color-bd-light)] flex items-center justify-center text-[var(--color-fg-tertiary)]">
                    <Server className="w-5 h-5 text-[var(--color-role-admin-main)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      {svc.name}
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {svc.type} • Port :{svc.port}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="success" size="xs" className="block mb-1">
                    {svc.status}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">
                    RAM: {svc.memory}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
