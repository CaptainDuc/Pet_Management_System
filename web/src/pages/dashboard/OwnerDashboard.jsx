import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, DollarSign, Award, Building2,
  Calendar, CheckCircle2, Search, RefreshCw, BarChart2,
  ShieldAlert, Activity, Sparkles, Filter, ChevronRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export default function OwnerDashboard({ user, token, activeTab, setActiveTab, onApiLog }) {
  // Analytics state
  const [analyticsStats, setAnalyticsStats] = useState({
    monthlyRevenue: 128500000,
    grossProfit: 64200000,
    totalVisits: 482,
    customerSatisfaction: 4.9,
    branchRevenue: {
      baDinh: 76500000,
      quan1: 52000000
    }
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Staff management state
  const [staffList, setStaffList] = useState([
    {
      id: 'STF-01',
      name: 'BS. Lê Minh Hoàng',
      role: 'Bác sĩ trưởng khoa khám',
      branch: 'Chi nhánh 1 (Ba Đình)',
      casesThisMonth: 142,
      rating: 4.95,
      status: 'Đang trực khám'
    },
    {
      id: 'STF-02',
      name: 'BS. Nguyễn Phương Thảo',
      role: 'Bác sĩ phẫu thuật & Chẩn đoán hình ảnh',
      branch: 'Chi nhánh 1 (Ba Đình)',
      casesThisMonth: 98,
      rating: 4.9,
      status: 'Đang phẫu thuật'
    },
    {
      id: 'STF-03',
      name: 'BS. Phạm Tuấn Anh',
      role: 'Bác sĩ thú y đa khoa',
      branch: 'Chi nhánh 2 (Quận 1)',
      casesThisMonth: 120,
      rating: 4.88,
      status: 'Đang trực khám'
    },
    {
      id: 'STF-04',
      name: 'KTV. Trần Thảo Vy',
      role: 'Kỹ thuật viên Spa & Làm đẹp',
      branch: 'Chi nhánh 2 (Quận 1)',
      casesThisMonth: 122,
      rating: 4.92,
      status: 'Đang phục vụ'
    }
  ]);

  // Pricing Catalog state
  const [services, setServices] = useState([
    { id: 'SRV-01', name: 'Khám lâm sàng tổng quát', category: 'Khám chữa', price: 150000, duration: '30 phút' },
    { id: 'SRV-02', name: 'Tiêm phòng vaccine dại Rabisin', category: 'Tiêm chủng', price: 120000, duration: '15 phút' },
    { id: 'SRV-03', name: 'Tiêm phòng vaccine 7 bệnh phòng dại', category: 'Tiêm chủng', price: 280000, duration: '20 phút' },
    { id: 'SRV-04', name: 'Siêu âm ổ bụng chẩn đoán hình ảnh', category: 'Cận lâm sàng', price: 250000, duration: '30 phút' },
    { id: 'SRV-05', name: 'Tắm sấy, cắt móng, vệ sinh tai (Chó < 5kg)', category: 'Spa & Grooming', price: 180000, duration: '60 phút' },
    { id: 'SRV-06', name: 'Tắm sấy, cắt tỉa lông tạo kiểu (Chó 5-15kg)', category: 'Spa & Grooming', price: 280000, duration: '90 phút' }
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data) {
        if (data.revenue) {
          setAnalyticsStats(prev => ({
            ...prev,
            monthlyRevenue: data.revenue || prev.monthlyRevenue,
            totalVisits: data.totalBookings || prev.totalVisits
          }));
        }
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data?.content) {
        setAuditLogs(data.data.content);
      } else if (res.ok && Array.isArray(data?.data)) {
        setAuditLogs(data.data);
      }
    } catch (err) {
      console.warn('Audit fetch error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'audit') {
      fetchAudit();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* TAB 1: BÁO CÁO DOANH THU & KPI */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  📊
                </span>
                <h2 className="text-lg font-bold text-slate-900">Báo cáo Hoạt động & Doanh thu</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tổng hợp tài chính, số lượng ca khám, năng suất chi nhánh và biên lợi nhuận
              </p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
              <span>Cập nhật số liệu</span>
            </button>
          </div>

          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Doanh thu tháng này</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsStats.monthlyRevenue.toLocaleString()} <span className="text-sm font-semibold">đ</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+14.2% so với tháng trước</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Lợi nhuận gộp ước tính</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsStats.grossProfit.toLocaleString()} <span className="text-sm font-semibold">đ</span>
              </div>
              <div className="text-xs text-slate-500">
                Biên lợi nhuận gộp: <strong className="text-slate-800">49.9%</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Lượt tiếp nhận khám</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsStats.totalVisits} <span className="text-sm font-semibold">ca</span>
              </div>
              <div className="text-xs text-slate-500">
                TB: <strong className="text-slate-800">18.5 ca/ngày</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Đánh giá khách hàng</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                <span>{analyticsStats.customerSatisfaction}</span>
                <span className="text-amber-500 text-lg">★</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium">
                Dựa trên 395 lượt đánh giá
              </div>
            </div>
          </div>

          {/* Revenue Breakdown & Branch Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Cơ cấu doanh thu theo nhóm dịch vụ</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Khám chữa bệnh & Phẫu thuật (42%)</span>
                    <span>53.970.000 đ</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Thuốc thú y & Dược phẩm đặc trị (26%)</span>
                    <span>33.410.000 đ</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-teal-500 h-2 rounded-full" style={{ width: '26%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Dịch vụ Spa, Tắm sấy & Grooming (22%)</span>
                    <span>28.270.000 đ</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Thức ăn cao cấp & Phụ kiện (10%)</span>
                    <span>12.850.000 đ</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Hiệu suất hoạt động theo 2 Chi nhánh</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                    <span>Chi nhánh Ba Đình (Hà Nội)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {analyticsStats.branchRevenue.baDinh.toLocaleString()} đ
                  </div>
                  <p className="text-[11px] text-slate-500">Đóng góp 59.5% tổng doanh thu toàn hệ thống</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                    <span>Chi nhánh Quận 1 (TP.HCM)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {analyticsStats.branchRevenue.quan1.toLocaleString()} đ
                  </div>
                  <p className="text-[11px] text-slate-500">Đóng góp 40.5% tổng doanh thu toàn hệ thống</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ NHÂN SỰ & BÁC SĨ */}
      {activeTab === 'staff-mgmt' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  👨‍⚕️
                </span>
                <h2 className="text-lg font-bold text-slate-900">Đội ngũ Y Bác sĩ & Nhân sự</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi hiệu suất ca khám, đánh giá chất lượng và trạng thái phân ca của nhân viên
              </p>
            </div>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 font-semibold rounded-xl text-xs border border-teal-200">
              Tổng số nhân sự: {staffList.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {staffList.map(st => (
              <div key={st.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{st.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{st.role}</p>
                    <span className="text-[11px] text-blue-600 font-medium">{st.branch}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {st.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Ca đã tiếp nhận tháng này:</span>
                    <strong className="text-sm text-slate-800">{st.casesThisMonth} ca</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Đánh giá khách hàng:</span>
                    <strong className="text-sm text-amber-600">{st.rating} ★</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BẢNG GIÁ & DỊCH VỤ */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  🏷️
                </span>
                <h2 className="text-lg font-bold text-slate-900">Bảng giá Niêm yết Dịch vụ</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý biểu phí dịch vụ khám chữa, tiêm phòng và spa làm đẹp toàn hệ thống
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Mã DV</th>
                    <th className="py-3 px-4 font-semibold">Tên dịch vụ</th>
                    <th className="py-3 px-4 font-semibold">Phân loại</th>
                    <th className="py-3 px-4 font-semibold">Thời lượng ước tính</th>
                    <th className="py-3 px-4 font-semibold">Đơn giá niêm yết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.duration}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">{s.price.toLocaleString()} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NHẬT KÝ GIÁM SÁT AUDIT */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  📜
                </span>
                <h2 className="text-lg font-bold text-slate-900">Nhật ký Giám sát Hoạt động (Audit Logs)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ghi nhận minh bạch mọi thao tác đổi trạng thái, phân quyền và giao dịch trong hệ thống
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
                    <th className="py-3 px-4 font-semibold">Hành động</th>
                    <th className="py-3 px-4 font-semibold">Đối tượng</th>
                    <th className="py-3 px-4 font-semibold">Người thực hiện</th>
                    <th className="py-3 px-4 font-semibold">Chi tiết thay đổi</th>
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
                            {log.action || 'UPDATE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{log.entityType || 'USER'}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{log.userId ? `User ID: ${log.userId.slice(0, 8)}...` : 'System'}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                          {log.newValue ? JSON.stringify(log.newValue) : 'Thay đổi cấu hình thành công'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        {auditLoading ? 'Đang tải dữ liệu nhật ký...' : 'Chưa có bản ghi nhật ký mới hoặc hệ thống đang ghi nhận.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
