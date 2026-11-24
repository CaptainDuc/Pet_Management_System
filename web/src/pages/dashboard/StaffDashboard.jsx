import React, { useEffect, useState } from 'react';
import {
  Bell, CreditCard, Users, Plus, Search, CheckCircle2,
  Clock, DollarSign, Printer, ArrowRight, X, Phone,
  FileText, Check, AlertCircle, Sparkles, QrCode, CalendarDays, PawPrint
} from 'lucide-react';
import { clinicApi, invoiceApi } from '../../api/clinic';
import ClinicVisitQueue from '../../components/ClinicVisitQueue';
import RescheduleDialog from '../../components/RescheduleDialog';
import VietQrPaymentModal from '../../components/VietQrPaymentModal';
import { Card, Button, Badge, Table, Input, Select, Modal, Avatar } from '../../design-system/components';

const INVOICE_STATUS = {
  ISSUED: { label: 'Đã phát hành', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  PENDING_PAYMENT: { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  PAID: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIALLY_PAID: { label: 'Thanh toán một phần', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  REFUNDED: { label: 'Đã hoàn tiền', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const BOOKING_STATUS = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  IN_PROGRESS: { label: 'Đang thực hiện', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  COMPLETED: { label: 'Đã hoàn tất', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const BOOKING_PAYMENT = {
  UNPAID: { label: 'Chưa thanh toán', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  PAID: { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REFUNDED: { label: 'Đã hoàn tiền', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function StaffDashboard({ user, token, activeTab, setActiveTab }) {
  // Billing / Invoices state
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');
  const [completedBookings, setCompletedBookings] = useState([]);

  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ bookingId: '' });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);

  const [moveBooking, setMoveBooking] = useState(null);
  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [bookingActionId, setBookingActionId] = useState(null);
  const [reportingBooking, setReportingBooking] = useState(null);
  const [reportMessage, setReportMessage] = useState('');

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  };

  const mapInvoice = (inv) => ({
    id: inv.id,
    number: inv.invoiceNumber,
    bookingId: inv.bookingId,
    items: (inv.items || []).map(i => i.description).join(' + ') || 'Dịch vụ khám & Thuốc',
    total: Number(inv.totalAmount || 0),
    currency: inv.currency || 'VND',
    status: inv.status,
    issuedAt: inv.issuedAt,
  });

  const fetchInvoices = async () => {
    if (!token) return;
    setInvoicesLoading(true);
    setInvoicesError('');
    try {
      const page = await invoiceApi.listInvoices(token);
      setInvoices((page?.content || []).map(mapInvoice));
    } catch (err) {
      setInvoicesError(err.message || 'Không tải được danh sách hóa đơn.');
    } finally {
      setInvoicesLoading(false);
    }
  };

  const mapStaffBooking = (booking) => {
    const items = booking.items || [];
    const firstItem = items[0];
    const startTime = firstItem?.startTime ? new Date(firstItem.startTime) : null;
    return {
      id: booking.id,
      code: `BK-${String(booking.id).slice(0, 8).toUpperCase()}`,
      items,
      customerId: booking.customerId,
      petId: booking.petId,
      petName: booking.petId ? `Bé #${String(booking.petId).slice(0, 8)}` : 'Thú cưng',
      service: items.map(i => i.serviceName).filter(Boolean).join(', ') || 'Dịch vụ khám',
      dateTime: startTime
        ? startTime.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
        : 'Chưa xác định',
      status: booking.status || 'PENDING',
      paymentStatus: booking.paymentStatus || 'UNPAID',
      amount: Number(booking.totalAmount || 0),
      promotionCode: booking.promotionCode || '',
      staffNote: booking.staffNote || '',
    };
  };

  const fetchBookings = async () => {
    if (!token) return;
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const params = { page: 0, size: 100 };
      if (bookingStatusFilter !== 'ALL') params.status = bookingStatusFilter;
      const page = await clinicApi.listBookings(token, params);
      setBookings((page?.content || []).map(mapStaffBooking));
    } catch (err) {
      setBookingsError(err.message || 'Không tải được danh sách lịch hẹn.');
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleCounterPay = async (booking) => {
    if (!token) return;
    if (!window.confirm(`Xác nhận đã thu tiền mặt cho lịch hẹn ${booking.code}?\nSố tiền: ${booking.amount.toLocaleString('vi-VN')} đ`)) return;
    setBookingActionId(booking.id);
    try {
      await clinicApi.markBookingPaid(booking.id, token);
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Không thể ghi nhận thanh toán.');
    } finally {
      setBookingActionId(null);
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!token || !reportingBooking) return;
    if (!reportMessage.trim()) return;
    setBookingActionId(reportingBooking.id);
    try {
      await clinicApi.reportBookingIssue(reportingBooking.id, reportMessage.trim(), token);
      setReportingBooking(null);
      setReportMessage('');
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Không thể gửi báo cáo sự cố.');
    } finally {
      setBookingActionId(null);
    }
  };

  const fetchCompletedBookings = async () => {
    if (!token) return;
    try {
      const page = await clinicApi.listBookings(token, { status: 'COMPLETED' });
      setCompletedBookings(page?.content || []);
    } catch {
      setCompletedBookings([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
      fetchCompletedBookings();
    }
    if (activeTab === 'bookings') {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, bookingStatusFilter]);

  // Client Directory search state
  const [clientSearch, setClientSearch] = useState('');
  const [clients] = useState([
    {
      id: 'CLI-01',
      fullName: 'Nguyễn Minh Anh',
      phone: '0901234567',
      email: 'minhanh.nguyen@gmail.com',
      tier: 'GOLD',
      totalSpent: '4.850.000 đ',
      pets: ['Lu Lu (Chó Husky - 2 tuổi)']
    },
    {
      id: 'CLI-02',
      fullName: 'Trần Thu Hà',
      phone: '0988765432',
      email: 'thuha.tran@gmail.com',
      tier: 'SILVER',
      totalSpent: '1.920.000 đ',
      pets: ['Miu Miu (Mèo Anh lông ngắn - 1.5 tuổi)']
    },
    {
      id: 'CLI-03',
      fullName: 'Hoàng Quốc Việt',
      phone: '0912334455',
      email: 'quocviet.hoang@gmail.com',
      tier: 'PLATINUM',
      totalSpent: '9.200.000 đ',
      pets: ['Bơ (Golden Retriever - 3 tuổi)', 'Ken (Chó Corgi - 1 tuổi)']
    }
  ]);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!newInvoice.bookingId) return;
    setInvoiceSubmitting(true);
    try {
      await invoiceApi.issueInvoice(newInvoice.bookingId, token);
      setShowAddInvoiceModal(false);
      setNewInvoice({ bookingId: '' });
      await fetchInvoices();
      await fetchCompletedBookings();
    } catch (err) {
      alert(err.message || 'Không thể tạo hóa đơn.');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c =>
    c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  );

  return (
    <div className="space-y-6">
      {activeTab === 'customers' && <p className="pc-demo-note">Danh bạ trên màn hình này dùng dữ liệu minh họa.</p>}
      {activeTab === 'reception' && <ClinicVisitQueue token={token} reception />}

      {/* TAB: LỊCH HẸN */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-staff-bg)] text-[var(--color-role-staff-text)] flex items-center justify-center font-bold">
                  <CalendarDays size={18} />
                </span>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">Quản lý lịch hẹn</Card.Title>
              </div>
              <Card.Description className="text-xs text-slate-500 mt-1">
                Theo dõi lịch hẹn, thu tiền mặt tại quầy và báo trùng lịch / sự cố cho khách hàng
              </Card.Description>
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={bookingStatusFilter}
                onChange={e => setBookingStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'PENDING', label: 'Chờ xác nhận' },
                  { value: 'CONFIRMED', label: 'Đã xác nhận' },
                  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
                  { value: 'COMPLETED', label: 'Đã hoàn tất' },
                  { value: 'CANCELLED', label: 'Đã hủy' },
                ]}
                className="w-48"
              />
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Search className="w-4 h-4" />}
                onClick={fetchBookings}
              >
                Làm mới
              </Button>
            </div>
          </Card>

          <Table
            columns={[
              { key: 'code', header: 'Mã' },
              { key: 'petName', header: 'Thú cưng' },
              { key: 'service', header: 'Dịch vụ', render: (value, b) => <div>{value}
                {b.promotionCode && <small className="block">Mã ưu đãi: {b.promotionCode}</small>}
                {b.staffNote && <small className="block">Ghi chú: {b.staffNote}</small>}
              </div> },
              { key: 'dateTime', header: 'Thời gian' },
              { key: 'amount', header: 'Số tiền', render: value => value.toLocaleString('vi-VN') + ' đ' },
              { key: 'paymentStatus', header: 'Thanh toán', render: value => BOOKING_PAYMENT[value]?.label || value },
              { key: 'status', header: 'Trạng thái', render: value => BOOKING_STATUS[value]?.label || value },
              { key: 'actions', header: 'Thao tác', sortable: false, render: (_, b) => <div className="flex flex-col gap-1.5">
                {['PENDING', 'CONFIRMED'].includes(b.status) && b.items.some(i => new Date(i.startTime) > new Date()) &&
                  <Button size="xs" onClick={() => setMoveBooking(b)}>Đổi lịch hẹn</Button>}
                {b.paymentStatus !== 'PAID' && b.status !== 'CANCELLED' &&
                  <Button size="xs" variant="success" disabled={bookingActionId === b.id} onClick={() => handleCounterPay(b)}>
                    Thu tiền tại quầy
                  </Button>}
                {b.status !== 'CANCELLED' && <Button size="xs" variant="warning"
                  onClick={() => { setReportingBooking(b); setReportMessage(''); }}>Báo trùng / sự cố</Button>}
              </div> },
            ]}
            data={bookings}
            loading={bookingsLoading}
            emptyMessage="Không có lịch hẹn nào."
          />

          {moveBooking && <RescheduleDialog booking={moveBooking} token={token} onClose={() => setMoveBooking(null)}
            onSaved={() => { setMoveBooking(null); fetchBookings(); }} />}
          <Modal
            className="pc-light pc-work pc-work-dialog"
            open={Boolean(reportingBooking)}
            onClose={() => setReportingBooking(null)}
            title="Báo trùng lịch / sự cố"
            size="md"
          >
            <p className="text-xs text-slate-500 mb-4">
              Lịch hẹn <span className="font-semibold text-slate-800">{reportingBooking?.code}</span> — khách hàng sẽ nhận được thông báo kèm nội dung bên dưới.
            </p>
            <form onSubmit={handleReportIssue} className="space-y-3.5 text-xs">
              <Input
                label="Nội dung thông báo *"
                as="textarea"
                rows={3}
                required
                value={reportMessage}
                onChange={e => setReportMessage(e.target.value)}
                placeholder="VD: Khung giờ này đã có bác sĩ bận, vui lòng chọn giờ khác..."
              />
              <div className="pt-2 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setReportingBooking(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={bookingActionId === reportingBooking?.id || !reportMessage.trim()}
                  loading={bookingActionId === reportingBooking?.id}
                >
                  Gửi báo cáo
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 2: HÓA ĐƠN & THU NGÂN */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-staff-bg)] text-[var(--color-role-staff-text)] flex items-center justify-center font-bold">
                  <FileText size={18} />
                </span>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">Quầy Thu ngân & Hóa đơn viện phí</Card.Title>
              </div>
              <Card.Description className="text-xs text-slate-500 mt-1">
                Tạo hóa đơn dịch vụ, thanh toán VNPay QR, Tiền mặt, Thẻ và áp dụng giảm giá điểm thưởng
              </Card.Description>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddInvoiceModal(true)}
            >
              Tạo hóa đơn mới
            </Button>
          </Card>

          <Table
            columns={[
              { key: 'number', header: 'Số HĐ', width: '140px' },
              { key: 'bookingId', header: 'Lịch hẹn', width: '120px' },
              { key: 'items', header: 'Chi tiết dịch vụ & Thuốc', minWidth: '280px' },
              { key: 'total', header: 'Số tiền', width: '160px' },
              { key: 'issuedAt', header: 'Ngày phát hành', width: '160px' },
              { key: 'status', header: 'Trạng thái', width: '140px' },
            ]}
            data={invoices.map(inv => ({
              ...inv,
              bookingId: `#${String(inv.bookingId).slice(0, 8)}`,
              total: `${inv.total.toLocaleString('vi-VN')} ${inv.currency}`,
              issuedAt: formatDateTime(inv.issuedAt),
            }))}
            keyField="id"
            loading={invoicesLoading}
            emptyMessage="Chưa có hóa đơn nào."
            striped
            hoverable
            className="table-wrapper"
            renderRow={(inv) => {
              const statusConfig = {
                ISSUED: { label: 'Đã phát hành', variant: 'info' },
                PENDING_PAYMENT: { label: 'Chờ thanh toán', variant: 'warning' },
                PAID: { label: 'Đã thanh toán', variant: 'success' },
                PARTIALLY_PAID: { label: 'Thanh toán một phần', variant: 'warning' },
                CANCELLED: { label: 'Đã hủy', variant: 'ghost' },
                REFUNDED: { label: 'Đã hoàn tiền', variant: 'ghost' },
              };
              const statusMeta = statusConfig[inv.status] || { label: inv.status, variant: 'ghost' };

              return (
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.number}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{inv.bookingId}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">{inv.items}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{inv.total}</td>
                  <td className="py-3.5 px-4 text-slate-600">{inv.issuedAt}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={statusMeta.variant} size="xs">
                      {statusMeta.label}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'REFUNDED' && (
                        <Button
                          variant="info"
                          size="xs"
                          leftIcon={<QrCode className="w-3.5 h-3.5" />}
                          onClick={() => setPayingInvoice({ ...inv, amount: inv.total })}
                        >
                          VietQR
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => alert(`Đang in hóa đơn điện tử ${inv.number}...`)}
                      >
                        In phiếu
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />

          <VietQrPaymentModal
            open={Boolean(payingInvoice)}
            invoice={payingInvoice}
            onClose={() => setPayingInvoice(null)}
            onPaid={() => fetchInvoices()}
          />

          <Modal
            className="pc-light pc-work pc-work-dialog"
            open={showAddInvoiceModal}
            onClose={() => setShowAddInvoiceModal(false)}
            title="Phát hành hóa đơn từ lịch hẹn"
            size="md"
          >
            <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
              <Select
                label="Lịch hẹn đã hoàn thành *"
                required
                value={newInvoice.bookingId}
                onChange={e => setNewInvoice({ bookingId: e.target.value })}
                options={completedBookings.map(b => ({
                  value: b.id,
                  label: `#${b.id.slice(0, 8)} • ${(b.items || []).map(i => i.serviceName).join(', ') || 'Dịch vụ'} • ${(Number(b.totalAmount) || 0).toLocaleString('vi-VN')} đ`
                }))}
                placeholder="-- Chọn lịch hẹn --"
              />
              {completedBookings.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">Chưa có lịch hẹn nào ở trạng thái COMPLETED.</p>
              )}
              <p className="text-[11px] text-slate-500">
                Hóa đơn được tạo tự động từ các dịch vụ của lịch hẹn. Số tiền do hệ thống tính toán.
              </p>
              <div className="pt-2 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowAddInvoiceModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={invoiceSubmitting || !newInvoice.bookingId}
                  loading={invoiceSubmitting}
                >
                  Phát hành hóa đơn
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 3: TRA CỨU KHÁCH HÀNG & THÚ CƯNG */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-staff-bg)] text-[var(--color-role-staff-text)] flex items-center justify-center font-bold">
                  <Users size={18} />
                </span>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">Danh bạ Khách hàng & Hồ sơ chủ nuôi</Card.Title>
              </div>
              <Card.Description className="text-xs text-slate-500 mt-1">
                Tra cứu nhanh thông tin liên lạc, hạng thẻ tích điểm và các thú cưng đang sở hữu
              </Card.Description>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Tìm theo tên hoặc SĐT..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                size="sm"
                className="pl-9"
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredClients.map(c => (
              <Card key={c.id} variant="outlined" padding="lg" className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.fullName}</h4>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                  <Badge variant="warning" size="xs">
                    {c.tier}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-500">Thú cưng đã đăng ký:</div>
                  {c.pets.map((p, idx) => (
                    <Badge key={idx} variant="ghost" size="xs" className="w-full justify-start">
                      <PawPrint size={13} /> {p}
                    </Badge>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tổng chi tiêu:</span>
                  <span className="font-bold text-slate-900">{c.totalSpent}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
