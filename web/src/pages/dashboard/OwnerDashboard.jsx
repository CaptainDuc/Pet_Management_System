import React, { useState, useEffect } from "react";
import { Activity, RefreshCw, Plus, Pencil, Archive, Tag } from "lucide-react";
import { Card, Button, Badge, Table, Input, Select, Modal } from '../../design-system/components';

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

  // Service catalog state
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceMutationId, setServiceMutationId] = useState(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '', categoryId: '', description: '', basePrice: '', durationMinutes: 30
  });

  const request = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    const data = await res.json().catch(() => null);
    if (onApiLog) onApiLog({ status: res.status, data, label: path });
    if (!res.ok) throw new Error(data?.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.');
    return data?.data;
  };

  const fetchServices = async () => {
    if (!token) return;
    setServicesLoading(true);
    setServiceError('');
    try {
      const [serviceData, categoryData] = await Promise.all([
        request('/services?page=0&size=50'),
        request('/services/categories')
      ]);
      setServices(serviceData?.content || []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (err) {
      setServiceError(err.message || 'Không thể tải danh mục dịch vụ.');
    } finally {
      setServicesLoading(false);
    }
  };

  const openServiceForm = (service = null) => {
    setEditingService(service);
    setServiceForm(service ? {
      name: service.name || '',
      categoryId: service.categoryId || '',
      description: service.description || '',
      basePrice: service.basePrice ?? '',
      durationMinutes: service.durationMinutes || 30
    } : { name: '', categoryId: '', description: '', basePrice: '', durationMinutes: 30 });
    setServiceError('');
    setServiceModalOpen(true);
  };

  const saveService = async (event) => {
    event.preventDefault();
    const basePrice = Number(serviceForm.basePrice);
    const durationMinutes = Number(serviceForm.durationMinutes);
    if (!serviceForm.name.trim()) return setServiceError('Vui lòng nhập tên dịch vụ.');
    if (serviceForm.basePrice === '' || !Number.isFinite(basePrice) || basePrice < 0) return setServiceError('Giá dịch vụ không hợp lệ.');
    if (serviceForm.durationMinutes === '' || !Number.isInteger(durationMinutes) || durationMinutes < 5) return setServiceError('Thời lượng tối thiểu là 5 phút.');

    setServiceSaving(true);
    setServiceError('');
    try {
      const payload = {
        name: serviceForm.name.trim(),
        categoryId: serviceForm.categoryId || null,
        description: serviceForm.description.trim() || null,
        basePrice,
        durationMinutes
      };
      await request(editingService ? `/services/${editingService.id}` : '/services', {
        method: editingService ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      setServiceModalOpen(false);
      await fetchServices();
    } catch (err) {
      setServiceError(err.message || 'Không thể lưu dịch vụ.');
    } finally {
      setServiceSaving(false);
    }
  };

  const closeServiceModal = () => {
    if (serviceSaving) return;
    setServiceModalOpen(false);
    setServiceError('');
  };

  const deactivateService = async (service) => {
    if (serviceMutationId || !window.confirm(`Ngừng cung cấp dịch vụ “${service.name}”?`)) return;
    setServiceMutationId(service.id);
    setServiceError('');
    try {
      await request(`/services/${service.id}`, { method: 'DELETE' });
      await fetchServices();
    } catch (err) {
      setServiceError(err.message || 'Không thể ngừng dịch vụ.');
    } finally {
      setServiceMutationId(null);
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
  }, [activeTab, token]);

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
          <Card variant="outlined" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-owner-bg)] text-[var(--color-role-owner-text)] flex items-center justify-center">
                <Tag size={17} />
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">Dịch vụ & bảng giá</Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Cập nhật dịch vụ, giá niêm yết và thời lượng áp dụng khi khách đặt lịch.
                </Card.Description>
              </div>
            </Card.Header>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={fetchServices} disabled={servicesLoading}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${servicesLoading ? 'animate-spin' : ''}`} />}>
                Tải lại
              </Button>
              <Button variant="primary" size="sm" onClick={() => openServiceForm()}
                leftIcon={<Plus className="w-3.5 h-3.5" />}>Thêm dịch vụ</Button>
            </div>
          </Card>

          {serviceError && !serviceModalOpen && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{serviceError}</p>
          )}

          <Table
            columns={[
              { key: 'name', header: 'Tên dịch vụ', render: (_, row) => <div><span className="font-semibold">{row.name}</span>{row.description && <p className="mt-1 text-xs text-slate-500">{row.description}</p>}</div> },
              { key: 'categoryId', header: 'Danh mục', width: '170px', render: (id) => categories.find(category => category.id === id)?.name || 'Chưa phân loại' },
              { key: 'durationMinutes', header: 'Thời lượng', width: '130px', render: (minutes) => `${minutes} phút` },
              { key: 'basePrice', header: 'Đơn giá', width: '160px', render: (value) => <span className="font-bold tabular-nums">{Number(value || 0).toLocaleString('vi-VN')} đ</span> },
              { key: 'actions', header: 'Thao tác', width: '150px', render: (_, row) => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="xs" aria-label={`Sửa ${row.name}`} onClick={() => openServiceForm(row)} leftIcon={<Pencil size={13} />}>Sửa</Button>
                  <Button variant="ghost" size="xs" aria-label={`Ngừng ${row.name}`} onClick={() => deactivateService(row)} disabled={serviceMutationId !== null} leftIcon={<Archive size={13} />}>{serviceMutationId === row.id ? 'Đang xử lý' : 'Ngừng'}</Button>
                </div>
              )},
            ]}
            data={services}
            keyField="id"
            striped
            hoverable
            emptyMessage={servicesLoading ? 'Đang tải dịch vụ…' : 'Chưa có dịch vụ đang hoạt động.'}
            className="table-wrapper"
          />

          <Modal
            open={serviceModalOpen}
            onClose={closeServiceModal}
            title={editingService ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'}
            description="Giá và thời lượng này sẽ được dùng trong quy trình đặt lịch."
            size="md"
            variant="form"
            loading={serviceSaving}
          >
            <form onSubmit={saveService} className="space-y-4">
              {serviceError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{serviceError}</p>}
              <Input label="Tên dịch vụ" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} required maxLength={255} fullWidth />
              <Select label="Danh mục" value={serviceForm.categoryId} onChange={value => setServiceForm({ ...serviceForm, categoryId: value })}
                options={[{ value: '', label: 'Chưa phân loại' }, ...categories.map(category => ({ value: category.id, label: category.name }))]} fullWidth />
              <Input label="Mô tả" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} fullWidth />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Giá (VNĐ)" type="number" min="0" step="1000" value={serviceForm.basePrice} onChange={e => setServiceForm({ ...serviceForm, basePrice: e.target.value })} required fullWidth />
                <Input label="Thời lượng (phút)" type="number" min="5" step="5" value={serviceForm.durationMinutes} onChange={e => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })} required fullWidth />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={closeServiceModal} disabled={serviceSaving}>Hủy</Button>
                <Button type="submit" variant="primary" disabled={serviceSaving}>{editingService ? 'Lưu thay đổi' : 'Tạo dịch vụ'}</Button>
              </div>
            </form>
          </Modal>
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
