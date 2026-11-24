import React, { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Card, Button, Badge, Table } from '../../design-system/components';

import OwnerReport from '../../components/OwnerReport';
import DoctorRoster from '../../components/DoctorRoster';
import ShiftManager from '../../components/ShiftManager';
import PromotionsManager from '../../components/PromotionsManager';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function OwnerDashboard({
  user,
  token,
  activeTab,
  setActiveTab,
  onApiLog,
}) {
  const [rosterVersion, setRosterVersion] = useState(0);

  // Pricing Catalog state
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/services?page=0&size=50`);
      const data = await res.json();
      if (res.ok && data?.data?.content) {
        setServices(data.data.content.map((s, idx) => ({
          id: `SRV-${String(idx + 1).padStart(2, '0')}`,
          rawId: s.id,
          name: s.name,
          category: s.description || 'Dịch vụ phòng khám',
          duration: `${s.durationMinutes} phút`,
          price: Number(s.basePrice || 0)
        })));
      }
    } catch (err) {
      console.warn('Services fetch error:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

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
    if (activeTab === "audit") {
      fetchAudit();
    } else if (activeTab === 'services') {
      fetchServices();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {activeTab === 'analytics' && <OwnerReport token={token} />}

      {/* TAB 2: QUẢN LÝ NHÂN SỰ & BÁC SĨ */}
      {activeTab === "staff-mgmt" && <>
        <DoctorRoster token={token} onProfileCreated={() => setRosterVersion(n => n + 1)} />
        <ShiftManager token={token} rosterVersion={rosterVersion} />
      </>}

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
                <Activity size={18} />
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

      {/* TAB: QUẢN LÝ MÃ GIẢM GIÁ & KHUYẾN MÃI */}
      {activeTab === 'promotions' && (
        <PromotionsManager token={token} onApiLog={onApiLog} />
      )}
    </div>
  );
}
