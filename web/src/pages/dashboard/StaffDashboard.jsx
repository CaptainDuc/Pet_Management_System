import React, { useEffect, useState } from 'react';
import {
  Bell, CreditCard, Users, Plus, Search, CheckCircle2,
  Clock, DollarSign, Printer, ArrowRight, X, Phone,
  FileText, Check, AlertCircle, Sparkles, QrCode, CalendarDays, PawPrint,
  Calendar, UserPlus, Trash2, Edit3, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight,
  Clock3, Building2
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
const clinicDay = value => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

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
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingActionId, setBookingActionId] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState('');

  // ===== SHIFT MANAGEMENT STATE =====
  const [shiftWeekStart, setShiftWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d;
  });
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsError, setShiftsError] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    staffId: '',
    workDate: '',
    startTime: '08:00',
    endTime: '16:30',
    slotDurationMinutes: 30,
    isAvailable: true
  });
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [shiftFormError, setShiftFormError] = useState('');
  const [selectedShiftBookings, setSelectedShiftBookings] = useState([]);
  const [showShiftBookingsModal, setShowShiftBookingsModal] = useState(false);
  const [shiftBookingsLoading, setShiftBookingsLoading] = useState(false);

  const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  };

  const mapInvoice = (inv) => ({
    id: inv.id,
    number: inv.invoiceNumber,
    bookingId: inv.bookingId,
    items: (inv.items || []).map(i => i.description).join(' + ') || 'Dịch vụ',
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
      petName: booking.petName || 'Thú cưng',
      customerName: booking.customerName || 'Khách hàng',
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
      const first = await clinicApi.listBookings(token, { page: 0, size: 50 });
      const remaining = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, page) =>
        clinicApi.listBookings(token, { page: page + 1, size: 50 })));
      setBookings([first, ...remaining].flatMap(page => page.content || []).map(mapStaffBooking));
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

  const handleCheckIn = async (booking) => {
    const item = booking.items.find(i => i.timeSlotId && i.startTime && i.staffId && !i.checkedInAt
      && ['PENDING', 'CONFIRMED'].includes(i.status) && clinicDay(i.startTime) === clinicDay(Date.now()));
    if (!item) return;
    setBookingActionId(booking.id);
    try {
      await clinicApi.visitAction({ bookingId: booking.id, itemId: item.id, slotId: item.timeSlotId }, 'check-in', token);
      await fetchBookings();
    } catch (err) { alert(err.message || 'Không thể xác nhận khách đã đến.'); }
    finally { setBookingActionId(null); }
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

  // ===== SHIFT MANAGEMENT FUNCTIONS =====
  const isoDate = (d) => d.toISOString().slice(0, 10);

  const fetchStaffList = async () => {
    if (!token) return;
    setStaffLoading(true);
    try {
      const data = await clinicApi.shiftStaff(token);
      setStaffList(data || []);
    } catch (err) {
      console.warn('Failed to load staff list:', err);
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchShifts = async () => {
    if (!token) return;
    setShiftsLoading(true);
    setShiftsError('');
    const monday = new Date(shiftWeekStart);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    try {
      const data = await clinicApi.shifts(isoDate(monday), isoDate(sunday), token);
      setShifts(data || []);
    } catch (err) {
      setShiftsError(err.message || 'Không tải được lịch ca làm việc.');
      setShifts([]);
    } finally {
      setShiftsLoading(false);
    }
  };

  const handleShiftWeekChange = (delta) => {
    const newStart = new Date(shiftWeekStart);
    newStart.setDate(newStart.getDate() + delta * 7);
    setShiftWeekStart(newStart);
  };

  const openShiftModal = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({
        staffId: shift.staffId,
        workDate: shift.workDate,
        startTime: shift.startTime?.slice(0, 5) || '08:00',
        endTime: shift.endTime?.slice(0, 5) || '16:30',
        slotDurationMinutes: 30,
        isAvailable: shift.isAvailable !== false
      });
    } else {
      setEditingShift(null);
      const monday = new Date(shiftWeekStart);
      setShiftForm({
        staffId: '',
        workDate: isoDate(monday),
        startTime: '08:00',
        endTime: '16:30',
        slotDurationMinutes: 30,
        isAvailable: true
      });
    }
    setShiftFormError('');
    setShowShiftModal(true);
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    if (!shiftForm.staffId || !shiftForm.workDate) {
      setShiftFormError('Vui lòng chọn nhân viên và ngày làm việc.');
      return;
    }
    if (shiftForm.startTime >= shiftForm.endTime) {
      setShiftFormError('Giờ bắt đầu phải trước giờ kết thúc.');
      return;
    }
    setShiftSubmitting(true);
    setShiftFormError('');
    try {
      if (editingShift) {
        // For editing, we only toggle availability via PATCH
        if (editingShift.isAvailable !== shiftForm.isAvailable) {
          await clinicApi.setShiftAvailability(editingShift.id, shiftForm.isAvailable, token);
        }
        // Note: Full edit (changing time/staff) would require delete + recreate
        // For simplicity, we only support availability toggle on edit
      } else {
        await clinicApi.createShift({
          staffId: shiftForm.staffId,
          workDate: shiftForm.workDate,
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          slotDurationMinutes: shiftForm.slotDurationMinutes,
          isAvailable: shiftForm.isAvailable
        }, token);
      }
      setShowShiftModal(false);
      fetchShifts();
    } catch (err) {
      setShiftFormError(err.message || 'Không thể lưu ca làm việc.');
    } finally {
      setShiftSubmitting(false);
    }
  };

  const handleToggleAvailability = async (shift) => {
    if (!token) return;
    try {
      await clinicApi.setShiftAvailability(shift.id, !shift.isAvailable, token);
      fetchShifts();
    } catch (err) {
      alert(err.message || 'Không thể thay đổi trạng thái ca.');
    }
  };

  const handleViewShiftBookings = async (shift) => {
    if (!token) return;
    setShiftBookingsLoading(true);
    try {
      const data = await clinicApi.shiftBookings(shift.id, token);
      setSelectedShiftBookings(data || []);
      setShowShiftBookingsModal(true);
    } catch (err) {
      alert(err.message || 'Không tải được danh sách lịch hẹn của ca này.');
      setSelectedShiftBookings([]);
    } finally {
      setShiftBookingsLoading(false);
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
    if (activeTab === 'shifts') {
      fetchStaffList();
      fetchShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, shiftWeekStart]);

  // Client Directory search state
  const [clientSearch, setClientSearch] = useState('');
  useEffect(() => {
    if (activeTab !== 'customers' || !token) return;
    let active = true;
    setClientsLoading(true); setClientsError('');
    const timer = setTimeout(() => clinicApi.clients(clientSearch, token)
      .then(rows => { if (active) setClients(rows); })
      .catch(err => { if (active) setClientsError(err.message); })
      .finally(() => { if (active) setClientsLoading(false); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [activeTab, clientSearch, token]);

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

  const filteredBookings = bookings.filter(b =>
    `${b.customerName} ${b.petName}`.toLocaleLowerCase('vi').includes(bookingSearch.trim().toLocaleLowerCase('vi')));

  return (
    <div className="space-y-6">
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
                Theo dõi lịch hẹn, tiếp đón khách và thu tiền tại quầy
              </Card.Description>
            </div>
            <div className="flex items-center space-x-2">
              <Input value={bookingSearch} onChange={e => setBookingSearch(e.target.value)}
                placeholder="Tìm chủ nuôi hoặc thú cưng" aria-label="Tìm chủ nuôi hoặc thú cưng" />
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
              { key: 'customerName', header: 'Chủ nuôi' },
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
                {['PENDING', 'CONFIRMED'].includes(b.status) && b.items.some(i => i.timeSlotId && i.startTime && i.staffId && !i.checkedInAt
                  && ['PENDING', 'CONFIRMED'].includes(i.status) && clinicDay(i.startTime) === clinicDay(Date.now())) &&
                  <Button size="xs" disabled={bookingActionId === b.id} onClick={() => handleCheckIn(b)}>
                    Xác nhận đã đến
                  </Button>}
              </div> },
            ]}
            data={filteredBookings}
            loading={bookingsLoading}
            emptyMessage="Không có lịch hẹn nào."
          />

          {moveBooking && <RescheduleDialog booking={moveBooking} token={token} onClose={() => setMoveBooking(null)}
            onSaved={() => { setMoveBooking(null); fetchBookings(); }} />}
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
                Phát hành hóa đơn sau khi hoàn tất dịch vụ. Lịch đã thanh toán sẽ có hóa đơn đã thanh toán.
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
                options={completedBookings.filter(b => !invoices.some(inv => inv.bookingId === b.id)).map(b => ({
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
                Tra cứu thông tin liên lạc, hạng thành viên và thú cưng đã đăng ký
              </Card.Description>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Tìm tên, SĐT hoặc thú cưng..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                size="sm"
                className="pl-9"
              />
            </div>
          </Card>

          {clientsError && <p role="alert" className="pc-notice">{clientsError}</p>}
          {clientsLoading && <p role="status">Đang tải khách hàng…</p>}
          {!clientsLoading && !clientsError && !clients.length && <p className="pc-muted">Không tìm thấy khách hàng.</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {clients.map(c => (
              <Card key={c.id} variant="outlined" padding="lg" className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.fullName}</h4>
                    <p className="text-xs text-slate-500">{c.phone || 'Chưa có SĐT'}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </div>
                  {c.tier && <Badge variant="warning" size="xs">{c.tier}</Badge>}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-500">Thú cưng đã đăng ký:</div>
                  {c.pets ? <Badge variant="ghost" size="xs" className="w-full justify-start">
                    <PawPrint size={13} /> {c.pets}
                  </Badge> : <span>Chưa có thú cưng</span>}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tổng chi tiêu:</span>
                  <span className="font-bold text-slate-900">{Number(c.totalSpent || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: QUẢN LÝ CA LÀM VIỆC */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-staff-bg)] text-[var(--color-role-staff-text)] flex items-center justify-center font-bold">
                  <Building2 size={18} />
                </span>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">Quản lý ca làm việc</Card.Title>
              </div>
              <Card.Description className="text-xs text-slate-500 mt-1">
                Xem, tạo và quản lý lịch trực nhân viên theo tuần
              </Card.Description>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />} onClick={() => handleShiftWeekChange(-1)}>Tuần trước</Button>
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Tuần {isoDate(shiftWeekStart)} - {isoDate(new Date(shiftWeekStart.getTime() + 6*86400000))}
              </span>
              <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={() => handleShiftWeekChange(1)}>Tuần sau</Button>
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openShiftModal()}>
                Thêm ca
              </Button>
            </div>
          </Card>

          {shiftsError && <p role="alert" className="pc-notice">{shiftsError}</p>}
          {shiftsLoading && <p role="status">Đang tải lịch ca làm việc…</p>}

          {!shiftsLoading && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" role="grid">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 w-40">Nhân viên</th>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date(shiftWeekStart);
                      d.setDate(d.getDate() + i);
                      return (
                        <th key={i} className="p-3 text-center font-semibold text-slate-600 min-w-[120px]">
                          <div className="font-medium">{d.toLocaleDateString('vi-VN', { weekday: 'short' })}</div>
                          <div className="text-xs text-slate-400">{d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {staffList.length > 0 ? staffList.map(staff => (
                    <tr key={staff.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-900 sticky left-0 bg-white z-10 w-40">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--color-role-staff-bg)] text-[var(--color-role-staff-text)] flex items-center justify-center text-xs font-bold">
                            {staff.fullName?.split(' ').pop()?.[0] || '?'}
                          </div>
                          <span>{staff.fullName}</span>
                        </div>
                      </td>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date(shiftWeekStart);
                        d.setDate(d.getDate() + i);
                        const dateStr = isoDate(d);
                        const dayShifts = shifts.filter(s => s.staffId === staff.id && s.workDate === dateStr);
                        return (
                          <td key={i} className="p-2 align-top min-w-[120px]">
                            {dayShifts.length === 0 ? (
                              <div className="text-xs text-slate-300 h-16 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg">
                                —
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {dayShifts.map(shift => (
                                  <div
                                    key={shift.id}
                                    className={`px-2 py-1.5 rounded-lg text-xs border transition-all ${
                                      shift.isAvailable
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-slate-100 border-slate-200 text-slate-600 line-through'
                                    }`}
                                  >
                                    <div className="font-medium flex items-center justify-between">
                                      <span>{shift.startTime?.slice(0,5)} - {shift.endTime?.slice(0,5)}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${shift.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {shift.isAvailable ? 'Có sẵn' : 'Bận'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => handleToggleAvailability(shift)}
                                        title={shift.isAvailable ? 'Đánh dấu bận' : 'Đánh dấu có sẵn'}
                                      >
                                        {shift.isAvailable ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => handleViewShiftBookings(shift)}
                                        disabled={shiftBookingsLoading}
                                        title="Xem lịch hẹn trong ca"
                                      >
                                        <Calendar className="w-3.5 h-3.5" />
                                      </Button>
                                      {!shift.isAvailable && (
                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          onClick={async () => {
                                            if (confirm('Xóa ca làm việc này?')) {
                                              try {
                                                await clinicApi.deleteShift(shift.id, token);
                                                fetchShifts();
                                              } catch (err) {
                                                alert(err.message || 'Không thể xóa ca làm việc.');
                                              }
                                            }
                                          }}
                                          title="Xóa ca"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">Chưa có nhân viên nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Shift Modal */}
          <Modal
            className="pc-light pc-work pc-work-dialog"
            open={showShiftModal}
            onClose={() => setShowShiftModal(false)}
            title={editingShift ? 'Chỉnh sửa ca làm việc' : 'Tạo ca làm việc mới'}
            size="md"
          >
            <form onSubmit={handleShiftSubmit} className="space-y-3.5 text-xs">
              {shiftFormError && <p role="alert" className="text-rose-600">{shiftFormError}</p>}
              <Select
                label="Nhân viên *"
                required
                value={shiftForm.staffId}
                onChange={e => setShiftForm({ ...shiftForm, staffId: e.target.value })}
                options={staffList.map(s => ({ value: s.id, label: s.fullName }))}
                placeholder="-- Chọn nhân viên --"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ngày làm việc *"
                  type="date"
                  required
                  value={shiftForm.workDate}
                  onChange={e => setShiftForm({ ...shiftForm, workDate: e.target.value })}
                />
                <Select
                  label="Thời lượng khung giờ (phút)"
                  value={shiftForm.slotDurationMinutes}
                  onChange={e => setShiftForm({ ...shiftForm, slotDurationMinutes: Number(e.target.value) })}
                  options={[
                    { value: 15, label: '15 phút' },
                    { value: 20, label: '20 phút' },
                    { value: 30, label: '30 phút' },
                    { value: 45, label: '45 phút' },
                    { value: 60, label: '60 phút' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Giờ bắt đầu *"
                  type="time"
                  required
                  value={shiftForm.startTime}
                  onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                />
                <Input
                  label="Giờ kết thúc *"
                  type="time"
                  required
                  value={shiftForm.endTime}
                  onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftForm.isAvailable}
                  onChange={e => setShiftForm({ ...shiftForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-[var(--color-role-staff-text)] focus:ring-[var(--color-role-staff-text)]"
                />
                <span>Ca có sẵn để đặt lịch (mặc định bật)</span>
              </label>
              {editingShift && (
                <p className="text-[11px] text-slate-500">
                  Lưu ý: Chỉ có thể bật/tắt trạng thái "Có sẵn" khi chỉnh sửa. Để đổi giờ/ngày/nhân viên, hãy xóa ca cũ và tạo mới.
                </p>
              )}
              <div className="pt-2 flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setShowShiftModal(false)}>Hủy</Button>
                <Button type="submit" disabled={shiftSubmitting} loading={shiftSubmitting}>
                  {editingShift ? 'Cập nhật' : 'Tạo ca'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Shift Bookings Modal */}
          <Modal
            className="pc-light pc-work pc-work-dialog"
            open={showShiftBookingsModal}
            onClose={() => setShowShiftBookingsModal(false)}
            title="Lịch hẹn trong ca"
            size="lg"
          >
            {shiftBookingsLoading ? (
              <p role="status" className="text-center py-8">Đang tải lịch hẹn…</p>
            ) : selectedShiftBookings.length === 0 ? (
              <p className="text-center py-8 text-slate-500">Ca này chưa có lịch hẹn nào.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table
                  columns={[
                    { key: 'code', header: 'Mã lịch', width: '120px' },
                    { key: 'customerName', header: 'Chủ nuôi' },
                    { key: 'petName', header: 'Thú cưng' },
                    { key: 'service', header: 'Dịch vụ', minWidth: '200px' },
                    { key: 'dateTime', header: 'Thời gian', width: '160px' },
                    { key: 'status', header: 'Trạng thái', width: '140px' },
                  ]}
                  data={selectedShiftBookings.map(b => ({
                    ...b,
                    code: `BK-${String(b.id).slice(0, 8).toUpperCase()}`,
                    status: b.status,
                  }))}
                  keyField="id"
                  striped
                  hoverable
                  className="table-wrapper"
                />
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
