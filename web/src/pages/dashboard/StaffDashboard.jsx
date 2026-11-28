import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, FileText, QrCode, CalendarDays, PawPrint } from 'lucide-react';
import { clinicApi, invoiceApi } from '../../api/clinic';
import ClinicVisitQueue from '../../components/ClinicVisitQueue';
import RescheduleDialog from '../../components/RescheduleDialog';
import VietQrPaymentModal from '../../components/VietQrPaymentModal';
import StaffAppointmentDetail from '../../components/StaffAppointmentDetail';
import MyShifts from '../../components/MyShifts';
import { Card, Button, Badge, Table, Input, Select, Modal } from '../../design-system/components';

const INVOICE_STATUS = {
  ISSUED: { label: 'Chờ thanh toán', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
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
  const [completedError, setCompletedError] = useState('');

  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ bookingId: '' });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [cashierBookingId, setCashierBookingId] = useState('');
  const [detailBookingId, setDetailBookingId] = useState(null);

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
      const first = await invoiceApi.listInvoices(token);
      const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, page) =>
        invoiceApi.listInvoices(token, { page: page + 1, size: 50 })));
      setInvoices([first, ...rest].flatMap(page => page.content || []).map(mapInvoice));
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
    if (!window.confirm(`Xác nhận đã thu tiền mặt cho lịch hẹn ${booking.code}?\nSố tiền: ${booking.amount.toLocaleString('vi-VN')} đ\nPhương thức: Tiền mặt\n\nHãy kiểm tra khách chưa chuyển khoản cho lịch này trước khi xác nhận.`)) return;
    setBookingActionId(booking.id);
    try {
      await clinicApi.markBookingPaid(booking.id, token);
      await fetchBookings();
      if (activeTab === 'invoices') await fetchInvoices();
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
    setCompletedError('');
    try {
      const first = await clinicApi.listBookings(token, { status: 'COMPLETED' });
      const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, page) =>
        clinicApi.listBookings(token, { status: 'COMPLETED', page: page + 1, size: 50 })));
      setCompletedBookings([first, ...rest].flatMap(page => page.content || []));
    } catch (err) {
      setCompletedBookings([]);
      setCompletedError(err.message || 'Không tải được lịch hoàn tất.');
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
      fetchCompletedBookings();
      fetchBookings();
    }
    if (activeTab === 'bookings') {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

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
  const focusedBooking = bookings.find(booking => booking.id === cashierBookingId);
  const focusedInvoice = invoices.find(invoice => invoice.bookingId === cashierBookingId);
  const missingInvoices = invoicesError || invoicesLoading || completedError ? [] : completedBookings.filter(booking => !invoices.some(invoice => invoice.bookingId === booking.id));
  const cashierInvoices = cashierBookingId ? invoices.filter(invoice => invoice.bookingId === cashierBookingId) : invoices;
  const goCashier = bookingId => { setCashierBookingId(bookingId); setActiveTab('invoices'); };

  return (
    <div className="space-y-6">
      {activeTab === 'reception' && <ClinicVisitQueue token={token} reception onCashier={goCashier} />}
      {activeTab === 'my-shifts' && <MyShifts user={user} token={token} />}

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
                <Button size="xs" variant="outline" onClick={() => setDetailBookingId(b.id)}>Chi tiết</Button>
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
          {invoicesError && <p className="pc-notice" role="alert">{invoicesError}<button className="pc-text-button" onClick={fetchInvoices}>Thử lại</button></p>}
          {completedError && <p className="pc-notice" role="alert">{completedError}<button className="pc-text-button" onClick={fetchCompletedBookings}>Thử lại</button></p>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Tình trạng thu ngân">
            <div className="pc-light pc-panel"><strong>{missingInvoices.length}</strong><p>Đã khám · Chưa có hóa đơn</p></div>
            <div className="pc-light pc-panel"><strong>{invoices.filter(invoice => !['PAID', 'CANCELLED', 'REFUNDED'].includes(invoice.status)).length}</strong><p>Hóa đơn chờ thanh toán</p></div>
            <div className="pc-light pc-panel"><strong>{invoices.filter(invoice => invoice.status === 'PAID').length}</strong><p>Hóa đơn đã thanh toán</p></div>
          </div>
          {cashierBookingId && <div className="pc-light pc-panel space-y-2">
            <div className="flex flex-wrap justify-between gap-2"><strong>Đang xử lý: {focusedBooking ? `${focusedBooking.customerName} · ${focusedBooking.petName}` : `Lịch ${cashierBookingId.slice(0, 8)}`}</strong><button className="pc-text-button" onClick={() => setCashierBookingId('')}>Xem tất cả</button></div>
            {focusedBooking && <p>Giá lịch: {focusedBooking.amount.toLocaleString('vi-VN')} đ · {focusedBooking.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'} · {BOOKING_STATUS[focusedBooking.status]?.label || focusedBooking.status}</p>}
            {focusedInvoice ? <p>Hóa đơn {focusedInvoice.number}: {INVOICE_STATUS[focusedInvoice.status]?.label || focusedInvoice.status}.</p>
              : focusedBooking?.status === 'COMPLETED' ? <button className="pc-button pc-button--small" onClick={() => { setNewInvoice({ bookingId: cashierBookingId }); setShowAddInvoiceModal(true); }}>Phát hành hóa đơn</button>
                : <p className="pc-muted">Hóa đơn được phát hành sau khi bác sĩ hoàn tất dịch vụ.</p>}
            {focusedBooking && focusedBooking.paymentStatus !== 'PAID' && focusedBooking.status !== 'CANCELLED' && <button className="pc-button pc-button--soft pc-button--small" disabled={bookingActionId === focusedBooking.id} onClick={() => handleCounterPay(focusedBooking)}>Xác nhận thu tiền mặt · {focusedBooking.amount.toLocaleString('vi-VN')} đ</button>}
          </div>}
          {!cashierBookingId && missingInvoices.length > 0 && <section className="pc-light pc-panel space-y-3"><h3 className="pc-section-title">Cần phát hành hóa đơn</h3>{missingInvoices.map(booking => <div key={booking.id} className="flex flex-wrap justify-between items-center gap-2 border-t border-slate-200 pt-2"><span>{booking.customerName} · {booking.petName} · {Number(booking.totalAmount).toLocaleString('vi-VN')} đ</span><button className="pc-button pc-button--small" onClick={() => { setNewInvoice({ bookingId: booking.id }); setShowAddInvoiceModal(true); }}>Tạo hóa đơn</button></div>)}</section>}

          <Table
            columns={[
              { key: 'number', header: 'Số HĐ', width: '140px' },
              { key: 'bookingId', header: 'Lịch hẹn', width: '120px' },
              { key: 'items', header: 'Chi tiết dịch vụ & Thuốc', minWidth: '280px' },
              { key: 'total', header: 'Số tiền', width: '160px' },
              { key: 'issuedAt', header: 'Ngày phát hành', width: '160px' },
              { key: 'status', header: 'Trạng thái', width: '140px' },
            ]}
            data={cashierInvoices.map(inv => ({
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
                ISSUED: { label: 'Chờ thanh toán', variant: 'info' },
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
            onPaid={() => { fetchInvoices(); fetchBookings(); setTimeout(fetchInvoices, 2500); }}
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

      {detailBookingId && <StaffAppointmentDetail bookingId={detailBookingId} token={token} onClose={() => setDetailBookingId(null)} onCashier={id => { setDetailBookingId(null); goCashier(id); }} />}
    </div>
  );
}
