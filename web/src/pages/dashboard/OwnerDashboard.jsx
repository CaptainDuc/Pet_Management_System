import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Search,
  RefreshCw,
  BarChart2,
  ShieldAlert,
  Activity,
  Sparkles,
  Filter,
  ChevronRight,
} from "lucide-react";
import { Card, Button, Badge, Table, Input } from '../../design-system/components';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function OwnerDashboard({
  user,
  token,
  activeTab,
  setActiveTab,
  onApiLog,
}) {
  // Analytics state
  const [analyticsStats, setAnalyticsStats] = useState({
    monthlyRevenue: 128500000,
    grossProfit: 64200000,
    totalVisits: 482,
    customerSatisfaction: 4.9,
    branchRevenue: {
      baDinh: 76500000,
      quan1: 52000000,
    },
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Staff management state
  const [staffList, setStaffList] = useState([
    {
      id: "STF-01",
      name: "BS. Lê Minh Hoàng",
      role: "Bác sĩ trưởng khoa khám",
      branch: "Chi nhánh 1 (Ba Đình)",
      casesThisMonth: 142,
      rating: 4.95,
      status: "Đang trực khám",
    },
    {
      id: "STF-02",
      name: "BS. Nguyễn Phương Thảo",
      role: "Bác sĩ phẫu thuật & Chẩn đoán hình ảnh",
      branch: "Chi nhánh 1 (Ba Đình)",
      casesThisMonth: 98,
      rating: 4.9,
      status: "Đang phẫu thuật",
    },
    {
      id: "STF-03",
      name: "BS. Phạm Tuấn Anh",
      role: "Bác sĩ thú y đa khoa",
      branch: "Chi nhánh 2 (Quận 1)",
      casesThisMonth: 120,
      rating: 4.88,
      status: "Đang trực khám",
    },
    {
      id: "STF-04",
      name: "KTV. Trần Thảo Vy",
      role: "Kỹ thuật viên Spa & Làm đẹp",
      branch: "Chi nhánh 2 (Quận 1)",
      casesThisMonth: 122,
      rating: 4.92,
      status: "Đang phục vụ",
    },
  ]);

  // Pricing Catalog state
  const [services, setServices] = useState([
    {
      id: "SRV-01",
      name: "Khám lâm sàng tổng quát",
      category: "Khám chữa",
      price: 150000,
      duration: "30 phút",
    },
    {
      id: "SRV-02",
      name: "Tiêm phòng vaccine dại Rabisin",
      category: "Tiêm chủng",
      price: 120000,
      duration: "15 phút",
    },
    {
      id: "SRV-03",
      name: "Tiêm phòng vaccine 7 bệnh phòng dại",
      category: "Tiêm chủng",
      price: 280000,
      duration: "20 phút",
    },
    {
      id: "SRV-04",
      name: "Siêu âm ổ bụng chẩn đoán hình ảnh",
      category: "Cận lâm sàng",
      price: 250000,
      duration: "30 phút",
    },
    {
      id: "SRV-05",
      name: "Tắm sấy, cắt móng, vệ sinh tai (Chó < 5kg)",
      category: "Spa & Grooming",
      price: 180000,
      duration: "60 phút",
    },
    {
      id: "SRV-06",
      name: "Tắm sấy, cắt tỉa lông tạo kiểu (Chó 5-15kg)",
      category: "Spa & Grooming",
      price: 280000,
      duration: "90 phút",
    },
  ]);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Fetch Analytics from /api/v1/analytics/dashboard
  const fetchAnalytics = async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analytics/dashboard`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data) {
        if (data.revenue) {
          setAnalyticsStats((prev) => ({
            ...prev,
            monthlyRevenue: data.revenue || prev.monthlyRevenue,
            totalVisits: data.totalBookings || prev.totalVisits,
          }));
        }
      }
    } catch (err) {
      console.warn("Analytics fetch error:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch Audit Logs from /api/v1/audit
  const fetchAudit = async () => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/audit?page=0&size=20`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data?.content) {
        setAuditLogs(data.data.content);
      } else if (res.ok && Array.isArray(data?.data)) {
        setAuditLogs(data.data);
      }
    } catch (err) {
      console.warn("Audit fetch error:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    } else if (activeTab === "audit") {
      fetchAudit();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* TAB 1: BÁO CÁO DOANH THU & KPI */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-owner-bg)] text-[var(--color-role-owner-text)] flex items-center justify-center font-bold">
                📊
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Báo cáo Hoạt động & Doanh thu
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Tổng hợp tài chính, số lượng ca khám, năng suất chi nhánh và
                  biên lợi nhuận
                </Card.Description>
              </div>
            </Card.Header>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? "animate-spin" : ""}`} />}
              onClick={fetchAnalytics}
            >
              Cập nhật số liệu
            </Button>
          </Card>

          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="outlined" padding="md" className="space-y-2">
              <Card.Description className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Doanh thu tháng này
              </Card.Description>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsStats.monthlyRevenue.toLocaleString()}{" "}
                <span className="text-sm font-semibold">đ</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+14.2% so với tháng trước</span>
              </div>
            </Card>

            <Card variant="outlined" padding="md" className="space-y-2">
              <Card.Description className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Lợi nhuận gộp ước tính
              </Card.Description>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsStats.grossProfit.toLocaleString()}{" "}
                <span className="text-sm font-semibold">đ</span>
              </div>
              <div className="text-xs text-slate-500">
                Biên lợi nhuận gộp:{" "}
                <strong className="text-slate-800">49.9%</strong>
              </div>
            </Card>

            <Card variant="outlined" padding="md" className="space-y-2">
              <Card.Description className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Lượt tiếp nhận khám
              </Card.Description>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsStats.totalVisits}{" "}
                <span className="text-sm font-semibold">ca</span>
              </div>
              <div className="text-xs text-slate-500">
                TB: <strong className="text-slate-800">18.5 ca/ngày</strong>
              </div>
            </Card>

            <Card variant="outlined" padding="md" className="space-y-2">
              <Card.Description className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Đánh giá khách hàng
              </Card.Description>
              <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                <span>{analyticsStats.customerSatisfaction}</span>
                <span className="text-amber-500 text-lg">★</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium">
                Dựa trên 395 lượt đánh giá
              </div>
            </Card>
          </div>

          {/* Revenue Breakdown & Branch Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="outlined" padding="lg" className="space-y-4">
              <Card.Title className="font-bold text-sm text-slate-900">
                Cơ cấu doanh thu theo nhóm dịch vụ
              </Card.Title>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Khám chữa bệnh & Phẫu thuật (42%)</span>
                    <span>53.970.000 đ</span>
                  </div>
                  <div className="w-full bg-[var(--color-neutral-100)] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[var(--color-role-owner-main)] h-2 rounded-full"
                      style={{ width: "42%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Thuốc thú y & Dược phẩm đặc trị (26%)</span>
                    <span>33.410.000 đ</span>
                  </div>
                  <div className="w-full bg-[var(--color-neutral-100)] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[var(--color-status-success-main)] h-2 rounded-full"
                      style={{ width: "26%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Dịch vụ Spa, Tắm sấy & Grooming (22%)</span>
                    <span>28.270.000 đ</span>
                  </div>
                  <div className="w-full bg-[var(--color-neutral-100)] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[var(--color-role-admin-main)] h-2 rounded-full"
                      style={{ width: "22%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Thức ăn cao cấp & Phụ kiện (10%)</span>
                    <span>12.850.000 đ</span>
                  </div>
                  <div className="w-full bg-[var(--color-neutral-100)] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[var(--color-status-warning-main)] h-2 rounded-full"
                      style={{ width: "10%" }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="outlined" padding="lg" className="space-y-4">
              <Card.Title className="font-bold text-sm text-slate-900">
                Hiệu suất hoạt động theo 2 Chi nhánh
              </Card.Title>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="subtle" padding="md" className="space-y-2">
                  <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                    <span>Chi nhánh Ba Đình (Hà Nội)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {analyticsStats.branchRevenue.baDinh.toLocaleString()} đ
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đóng góp 59.5% tổng doanh thu toàn hệ thống
                  </p>
                </Card>

                <Card variant="subtle" padding="md" className="space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                    <span>Chi nhánh Quận 1 (TP.HCM)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {analyticsStats.branchRevenue.quan1.toLocaleString()} đ
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đóng góp 40.5% tổng doanh thu toàn hệ thống
                  </p>
                </Card>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ NHÂN SỰ & BÁC SĨ */}
      {activeTab === "staff-mgmt" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex items-center justify-between">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-owner-bg)] text-[var(--color-role-owner-text)] flex items-center justify-center font-bold">
                👨‍⚕️
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Đội ngũ Y Bác sĩ & Nhân sự
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Theo dõi hiệu suất ca khám, đánh giá chất lượng và trạng thái
                  phân ca của nhân viên
                </Card.Description>
              </div>
            </Card.Header>
            <Badge variant="success" size="sm">
              Tổng số nhân sự: {staffList.length}
            </Badge>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {staffList.map((st) => (
              <Card key={st.id} variant="outlined" padding="md" className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {st.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{st.role}</p>
                    <span className="text-[11px] text-blue-600 font-medium">
                      {st.branch}
                    </span>
                  </div>
                  <Badge variant="success" size="xs">
                    {st.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Card variant="subtle" padding="sm">
                    <span className="text-slate-400 block text-[10px]">
                      Ca đã tiếp nhận tháng này:
                    </span>
                    <strong className="text-sm text-slate-800">
                      {st.casesThisMonth} ca
                    </strong>
                  </Card>
                  <Card variant="subtle" padding="sm">
                    <span className="text-slate-400 block text-[10px]">
                      Đánh giá khách hàng:
                    </span>
                    <strong className="text-sm text-amber-600">
                      {st.rating} ★
                    </strong>
                  </Card>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BẢNG GIÁ & DỊCH VỤ */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex items-center justify-between">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-owner-bg)] text-[var(--color-role-owner-text)] flex items-center justify-center font-bold">
                🏷️
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Bảng giá Niêm yết Dịch vụ
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Quản lý biểu phí dịch vụ khám chữa, tiêm phòng và spa làm đẹp
                  toàn hệ thống
                </Card.Description>
              </div>
            </Card.Header>
          </Card>

          <Table
            columns={[
              { key: 'id', header: 'Mã DV', width: '100px' },
              { key: 'name', header: 'Tên dịch vụ' },
              { key: 'category', header: 'Phân loại', width: '150px', render: (val) => <Badge variant="ghost" size="xs">{val}</Badge> },
              { key: 'duration', header: 'Thời lượng ước tính', width: '150px' },
              { key: 'price', header: 'Đơn giá niêm yết', width: '150px', align: 'right', render: (val) => <span className="font-bold text-blue-600">{val.toLocaleString()} đ</span> },
            ]}
            data={services}
            keyField="id"
            striped
            hoverable
            className="table-wrapper"
          />
        </div>
      )}

      {/* TAB 4: NHẬT KÝ GIÁM SÁT AUDIT */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-owner-bg)] text-[var(--color-role-owner-text)] flex items-center justify-center font-bold">
                📜
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Nhật ký Giám sát Hoạt động (Audit Logs)
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Ghi nhận minh bạch mọi thao tác đổi trạng thái, phân quyền và
                  giao dịch trong hệ thống
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
              { key: 'action', header: 'Hành động', width: '150px', render: (_, row) => <Badge variant="primary" size="xs" className="font-mono">{row.action || "UPDATE"}</Badge> },
              { key: 'entityType', header: 'Đối tượng', width: '120px' },
              { key: 'userId', header: 'Người thực hiện', width: '180px', render: (_, row) => row.userId ? `User ID: ${row.userId.slice(0, 8)}...` : "System" },
              { key: 'newValue', header: 'Chi tiết thay đổi', render: (_, row) => row.newValue ? <span className="font-mono text-[11px] text-slate-500 max-w-xs truncate block">{JSON.stringify(row.newValue)}</span> : <span className="text-slate-500 font-mono text-[11px]">Thay đổi cấu hình thành công</span> },
            ]}
            data={auditLogs}
            keyField="id"
            striped
            hoverable
            emptyMessage={auditLoading ? "Đang tải dữ liệu nhật ký..." : "Chưa có bản ghi nhật ký mới hoặc hệ thống đang ghi nhận."}
            className="table-wrapper"
          />
        </div>
      )}
    </div>
  );
}
