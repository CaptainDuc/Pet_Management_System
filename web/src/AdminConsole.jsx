import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  User,
  Users,
  Lock,
  LogOut,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash,
  Settings,
  Send,
  Database,
  Server,
  UserCheck,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Table,
  Avatar,
} from './design-system/components';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState("auth");

  // Auth state
  const [token, setToken] = useState(localStorage.getItem("accessToken") || "");
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("refreshToken") || ""
  );
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );
  const [responseLog, setResponseLog] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginData, setLoginData] = useState({
    email: "owner@petcare.vn",
    password: "SecureP@ss1",
  });
  const [regData, setRegData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [profileData, setProfileData] = useState({
    fullName: "",
    phone: "",
    avatarUrl: "",
  });

  // Admin Users list & RBAC state
  const [usersList, setUsersList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);

  // Role & Perm form states
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [newPerm, setNewPerm] = useState({
    code: "",
    name: "",
    module: "",
    description: "",
  });
  const [selectedUserForRole, setSelectedUserForRole] = useState("");
  const [selectedRolesForUser, setSelectedRolesForUser] = useState([]);
  const [selectedRoleForPerm, setSelectedRoleForPerm] = useState("");
  const [selectedPermsForRole, setSelectedPermsForRole] = useState([]);

  // Save tokens to localStorage
  const saveAuth = (authRes) => {
    if (!authRes) return;
    setToken(authRes.accessToken);
    setRefreshToken(authRes.refreshToken);
    setCurrentUser(authRes.user);
    localStorage.setItem("accessToken", authRes.accessToken);
    localStorage.setItem("refreshToken", authRes.refreshToken);
    localStorage.setItem("user", JSON.stringify(authRes.user));
  };

  const clearAuth = () => {
    setToken("");
    setRefreshToken("");
    setCurrentUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  };

  // Generic fetch wrapper with Bearer token
  const apiCall = async (
    url,
    method = "GET",
    body = null,
    useRefreshToken = false
  ) => {
    setLoading(true);
    setResponseLog(null);
    try {
      const headers = { "Content-Type": "application/json" };
      const authToken = useRefreshToken ? refreshToken : token;
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const opts = { method, headers };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(`${API_BASE}${url}`, opts);
      const data = await res.json();

      setResponseLog({ status: res.status, data });
      setLoading(false);
      return { status: res.status, data };
    } catch (err) {
      setResponseLog({ status: "FETCH_ERROR", data: { message: err.message } });
      setLoading(false);
      return { status: "ERROR", data: null };
    }
  };

  // Auth Handlers
  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await apiCall("/auth/register", "POST", regData);
    if (res.status === 201 && res.data?.data) {
      saveAuth(res.data.data);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await apiCall("/auth/login", "POST", loginData);
    if (res.status === 200 && res.data?.data) {
      saveAuth(res.data.data);
    }
  };

  const handleRefresh = async () => {
    const res = await apiCall("/auth/refresh", "POST", { refreshToken }, true);
    if (res.status === 200 && res.data?.data) {
      saveAuth(res.data.data);
    }
  };

  const handleLogout = async (logoutAll = false) => {
    await apiCall("/auth/logout", "POST", { refreshToken, logoutAll });
    clearAuth();
  };

  // Profile Handlers
  const fetchMyProfile = async () => {
    const res = await apiCall("/users/me", "GET");
    if (res.status === 200 && res.data?.data) {
      setCurrentUser(res.data.data);
      setProfileData({
        fullName: res.data.data.fullName || "",
        phone: res.data.data.phone || "",
        avatarUrl: res.data.data.avatarUrl || "",
      });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await apiCall("/users/me", "PUT", profileData);
    if (res.status === 200 && res.data?.data) {
      setCurrentUser(res.data.data);
    }
  };

  // Admin Users & RBAC Handlers
  const fetchUsersList = async () => {
    const res = await apiCall("/users?page=0&size=50", "GET");
    if (res.status === 200 && res.data?.data?.content) {
      setUsersList(res.data.data.content);
    }
  };

  const handleUserStatus = async (userId, newStatus) => {
    await apiCall(`/users/${userId}/status`, "PATCH", { status: newStatus });
    fetchUsersList();
  };

  const handleAssignRolesToUser = async (e) => {
    e.preventDefault();
    if (!selectedUserForRole) return;
    await apiCall(`/users/${selectedUserForRole}/roles`, "POST", {
      roleIds: selectedRolesForUser,
    });
    fetchUsersList();
  };

  // RBAC Handlers
  const fetchRoles = async () => {
    const res = await apiCall("/rbac/roles", "GET");
    if (res.status === 200 && res.data?.data) {
      setRolesList(res.data.data);
    }
  };

  const fetchPermissions = async () => {
    const res = await apiCall("/rbac/permissions", "GET");
    if (res.status === 200 && res.data?.data) {
      setPermissionsList(res.data.data);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    await apiCall("/rbac/roles", "POST", newRole);
    setNewRole({ name: "", description: "" });
    fetchRoles();
  };

  const handleCreatePerm = async (e) => {
    e.preventDefault();
    await apiCall("/rbac/permissions", "POST", newPerm);
    setNewPerm({ code: "", name: "", module: "", description: "" });
    fetchPermissions();
  };

  const handleAssignPermsToRole = async (e) => {
    e.preventDefault();
    if (!selectedRoleForPerm) return;
    await apiCall(`/rbac/roles/${selectedRoleForPerm}/permissions`, "POST", {
      permissionIds: selectedPermsForRole,
    });
    fetchRoles();
  };

  useEffect(() => {
    if (token) {
      fetchMyProfile();
    }
  }, []);

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)] text-[var(--color-fg-primary)] font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        variant="permanent"
        position="left"
        width="md"
        header={
          <div className="p-4 border-b border-[var(--color-border-primary)] flex items-center space-x-3 bg-[var(--color-bg-secondary)]/50">
            <Shield className="w-7 h-7 text-[var(--color-brand-primary)]" />
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] bg-clip-text text-transparent block">
                PetCare Tester
              </span>
              <span className="text-[10px] text-[var(--color-fg-tertiary)] uppercase font-mono tracking-wider">
                Auth & RBAC Console
              </span>
            </div>
          </div>
        }
        footer={
          <div className="p-4 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/50">
            {currentUser ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Avatar
                    name={currentUser.fullName}
                    size="sm"
                    src={currentUser.avatarUrl}
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[var(--color-fg-primary)] truncate">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-[var(--color-brand-primary)] font-mono truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Badge variant="success" size="xs">
                    {currentUser.role || "CUSTOMER"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleLogout(false)}
                    leftIcon={<LogOut className="w-3 h-3" />}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[var(--color-fg-tertiary)] text-center py-2">
                Not logged in
              </div>
            )}
          </div>
        }
      >
        <Sidebar.NavItem
          icon={<Key className="w-4 h-4" />}
          label="Auth & Sessions"
          active={activeTab === "auth"}
          onClick={() => setActiveTab("auth")}
        />
        <Sidebar.NavItem
          icon={<User className="w-4 h-4" />}
          label="My Profile"
          active={activeTab === "profile"}
          onClick={() => {
            setActiveTab("profile");
            fetchMyProfile();
          }}
        />
        <Sidebar.NavItem
          icon={<Users className="w-4 h-4" />}
          label="User Management"
          active={activeTab === "users"}
          onClick={() => {
            setActiveTab("users");
            fetchUsersList();
            fetchRoles();
          }}
        />
        <Sidebar.NavItem
          icon={<Lock className="w-4 h-4" />}
          label="RBAC (Roles & Perms)"
          active={activeTab === "rbac"}
          onClick={() => {
            setActiveTab("rbac");
            fetchRoles();
            fetchPermissions();
          }}
        />
      </Sidebar>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
        {/* Top Header */}
        <header className="h-16 border-b border-[var(--color-border-primary)] flex items-center justify-between px-8 bg-[var(--color-bg-secondary)]/40 backdrop-blur">
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-[var(--color-brand-primary)]" />
            <span className="text-xs font-mono text-[var(--color-fg-tertiary)]">
              Target API:
            </span>
            <span className="text-xs font-mono text-[var(--color-status-success-main)] bg-[var(--color-bg-tertiary)] px-2.5 py-1 rounded border border-[var(--color-border-primary)]">
              {API_BASE}
            </span>
          </div>

          {token && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Rotate Refresh Token
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleLogout(true)}
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                Logout All Devices
              </Button>
            </div>
          )}
        </header>

        {/* Content Body & JSON Response Log Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          {/* Active Tab View */}
          <div className="lg:col-span-2 overflow-y-auto p-8 space-y-6">
            {/* AUTH TAB */}
            {activeTab === "auth" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Login Form */}
                <Card variant="outlined" padding="lg">
                  <Card.Header>
                    <Card.Title className="flex items-center space-x-2 text-[var(--color-brand-primary)]">
                      <Key className="w-5 h-5" />
                      <span>Login (POST /auth/login)</span>
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <Input
                        label="Email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        fullWidth
                      />
                      <Input
                        label="Password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        fullWidth
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                        size="md"
                      >
                        Login & Get Tokens
                      </Button>
                    </form>
                  </Card.Content>
                </Card>

                {/* Register Form */}
                <Card variant="outlined" padding="lg">
                  <Card.Header>
                    <Card.Title className="flex items-center space-x-2 text-[var(--color-brand-secondary)]">
                      <UserCheck className="w-5 h-5" />
                      <span>Register (POST /auth/register)</span>
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <Input
                        label="Full Name"
                        placeholder="Nguyễn Minh Anh"
                        value={regData.fullName}
                        onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                        required
                        fullWidth
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="newuser@petcare.vn"
                        value={regData.email}
                        onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                        required
                        fullWidth
                      />
                      <Input
                        label="Password"
                        type="password"
                        placeholder="SecureP@ss1"
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        required
                        fullWidth
                      />
                      <Input
                        label="Phone"
                        placeholder="0901234567"
                        value={regData.phone}
                        onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                        fullWidth
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                        size="md"
                      >
                        Register New User
                      </Button>
                    </form>
                  </Card.Content>
                </Card>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <Card variant="outlined" padding="lg">
                <Card.Header className="flex items-center justify-between border-b border-[var(--color-border-primary)] pb-4">
                  <Card.Title className="text-[var(--color-brand-primary)]">
                    My Profile (GET /users/me & PUT /users/me)
                  </Card.Title>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchMyProfile}
                  >
                    Refresh Profile
                  </Button>
                </Card.Header>
                <Card.Content>
                  <form
                    onSubmit={handleUpdateProfile}
                    className="space-y-4 max-w-md"
                  >
                    <Input
                      label="Full Name"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Avatar URL"
                      value={profileData.avatarUrl}
                      onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                      fullWidth
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                    >
                      Save Profile
                    </Button>
                  </form>
                </Card.Content>
              </Card>
            )}

            {/* USERS MANAGEMENT TAB */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <Card variant="outlined" padding="lg">
                  <Card.Header className="flex items-center justify-between border-b border-[var(--color-border-primary)] pb-3">
                    <Card.Title className="text-[var(--color-brand-primary)]">
                      Users List (GET /users)
                    </Card.Title>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={fetchUsersList}
                    >
                      Reload Users
                    </Button>
                  </Card.Header>
                  <Card.Content>
                    <Table
                      columns={[
                        { key: 'fullName', header: 'Name', sortable: true },
                        { key: 'email', header: 'Email', sortable: true },
                        { key: 'role', header: 'Role', sortable: true },
                        {
                          key: 'status',
                          header: 'Status',
                          sortable: true,
                          render: (value) => (
                            <Badge
                              variant={value === 'ACTIVE' ? 'success' : 'error'}
                              size="sm"
                            >
                              {value}
                            </Badge>
                          ),
                        },
                        {
                          key: 'actions',
                          header: 'Actions',
                          render: (_, row) => (
                            <div className="flex space-x-1">
                              {row.status === 'ACTIVE' ? (
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => handleUserStatus(row.id, 'INACTIVE')}
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleUserStatus(row.id, 'ACTIVE')}
                                >
                                  Activate
                                </Button>
                              )}
                            </div>
                          ),
                        },
                      ]}
                      data={usersList}
                      keyField="id"
                      striped
                      hoverable
                      bordered
                    />
                  </Card.Content>
                </Card>

                {/* Assign Roles to User Form */}
                <Card variant="outlined" padding="lg">
                  <Card.Header>
                    <Card.Title className="text-[var(--color-brand-secondary)]">
                      Assign RBAC Roles to User (POST /users/{{id}}/roles)
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <form
                      onSubmit={handleAssignRolesToUser}
                      className="space-y-4 max-w-md"
                    >
                      <Select
                        label="Select User"
                        placeholder="-- Choose User --"
                        value={selectedUserForRole}
                        onChange={(value) => setSelectedUserForRole(value)}
                        options={usersList.map((u) => ({
                          value: u.id,
                          label: `${u.fullName} (${u.email})`,
                        }))}
                        fullWidth
                      />

                      <div>
                        <label className="text-xs text-[var(--color-fg-tertiary)] block mb-1">
                          Select Roles
                        </label>
                        <div className="space-y-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] p-3 rounded max-h-40 overflow-y-auto">
                          {rolesList.map((r) => (
                            <label
                              key={r.id}
                              className="flex items-center space-x-2 text-xs text-[var(--color-fg-secondary)] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedRolesForUser.includes(r.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRolesForUser([
                                      ...selectedRolesForUser,
                                      r.id,
                                    ]);
                                  } else {
                                    setSelectedRolesForUser(
                                      selectedRolesForUser.filter(
                                        (id) => id !== r.id
                                      )
                                    );
                                  }
                                }}
                              />
                              <span>{r.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                      >
                        Assign Roles
                      </Button>
                    </form>
                  </Card.Content>
                </Card>
              </div>
            )}

            {/* RBAC MANAGEMENT TAB */}
            {activeTab === "rbac" && (
              <div className="space-y-6">
                {/* Create Role & Perm Forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Create Role */}
                  <Card variant="outlined" padding="lg">
                    <Card.Header>
                      <Card.Title className="text-[var(--color-brand-primary)]">
                        Create Role (POST /rbac/roles)
                      </Card.Title>
                    </Card.Header>
                    <Card.Content>
                      <form onSubmit={handleCreateRole} className="space-y-4">
                        <Input
                          label="Role Name"
                          placeholder="VETERINARIAN"
                          value={newRole.name}
                          onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                          required
                          fullWidth
                        />
                        <Input
                          label="Description"
                          placeholder="Bác sĩ thú y"
                          value={newRole.description}
                          onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                          fullWidth
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          fullWidth
                          size="md"
                        >
                          Create Role
                        </Button>
                      </form>
                    </Card.Content>
                  </Card>

                  {/* Create Permission */}
                  <Card variant="outlined" padding="lg">
                    <Card.Header>
                      <Card.Title className="text-[var(--color-brand-secondary)]">
                        Create Permission (POST /rbac/permissions)
                      </Card.Title>
                    </Card.Header>
                    <Card.Content>
                      <form onSubmit={handleCreatePerm} className="space-y-4">
                        <Input
                          label="Permission Code"
                          placeholder="medical:create"
                          value={newPerm.code}
                          onChange={(e) => setNewPerm({ ...newPerm, code: e.target.value })}
                          required
                          fullWidth
                        />
                        <Input
                          label="Permission Name"
                          placeholder="Tạo hồ sơ bệnh án"
                          value={newPerm.name}
                          onChange={(e) => setNewPerm({ ...newPerm, name: e.target.value })}
                          required
                          fullWidth
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          fullWidth
                          size="md"
                        >
                          Create Permission
                        </Button>
                      </form>
                    </Card.Content>
                  </Card>
                </div>

                {/* Assign Permissions to Role Form */}
                <Card variant="outlined" padding="lg">
                  <Card.Header>
                    <Card.Title className="text-[var(--color-status-success-main)]">
                      Assign Permissions to Role (POST /rbac/roles/{{id}}/permissions)
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <form
                      onSubmit={handleAssignPermsToRole}
                      className="space-y-4 max-w-md"
                    >
                      <Select
                        label="Select Role"
                        placeholder="-- Choose Role --"
                        value={selectedRoleForPerm}
                        onChange={(value) => setSelectedRoleForPerm(value)}
                        options={rolesList.map((r) => ({
                          value: r.id,
                          label: r.name,
                        }))}
                        fullWidth
                      />

                      <div>
                        <label className="text-xs text-[var(--color-fg-tertiary)] block mb-1">
                          Select Permissions
                        </label>
                        <div className="space-y-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] p-3 rounded max-h-48 overflow-y-auto">
                          {permissionsList.map((p) => (
                            <label
                              key={p.id}
                              className="flex items-center space-x-2 text-xs text-[var(--color-fg-secondary)] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermsForRole.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPermsForRole([
                                      ...selectedPermsForRole,
                                      p.id,
                                    ]);
                                  } else {
                                    setSelectedPermsForRole(
                                      selectedPermsForRole.filter(
                                        (id) => id !== p.id
                                      )
                                    );
                                  }
                                }}
                              />
                              <span className="font-mono text-[var(--color-brand-primary)]">
                                {p.code}
                              </span>
                              <span className="text-[var(--color-fg-tertiary)]">({p.name})</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        variant="success"
                        size="md"
                      >
                        Assign Permissions
                      </Button>
                    </form>
                  </Card.Content>
                </Card>
              </div>
            )}

          </div>

          {/* Right Panel: JSON Response Log */}
          <div className="border-l border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/60 flex flex-col overflow-hidden">
            <Card variant="ghost" padding="md" className="h-full flex flex-col">
              <Card.Header className="flex items-center justify-between border-b border-[var(--color-border-primary)] pb-3">
                <Card.Title className="text-sm text-[var(--color-fg-secondary)]">Live API Response Inspector</Card.Title>
                {loading && (
                  <span className="text-xs text-[var(--color-brand-primary)] animate-pulse">
                    Requesting...
                  </span>
                )}
              </Card.Header>
              <Card.Content className="flex-1 overflow-y-auto">
                {responseLog ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-fg-tertiary)]">HTTP Status:</span>
                      <Badge
                        variant={
                          responseLog.status >= 200 && responseLog.status < 300
                            ? 'success'
                            : 'error'
                        }
                        size="sm"
                      >
                        {responseLog.status}
                      </Badge>
                    </div>
                    <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] p-4 rounded-lg text-[var(--color-fg-secondary)] overflow-x-auto">
                      <pre>{JSON.stringify(responseLog.data, null, 2)}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-fg-tertiary)] text-xs text-center space-y-2">
                    <Database className="w-8 h-8 opacity-40" />
                    <span>Execute any action to inspect HTTP response payload</span>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}