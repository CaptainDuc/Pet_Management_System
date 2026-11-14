import React, { useEffect, useState } from 'react';
import {
  Bell, CreditCard, Users, Plus, Search, CheckCircle2,
  Clock, DollarSign, Printer, ArrowRight, X, Phone,
  FileText, Check, AlertCircle, Sparkles, QrCode
} from 'lucide-react';
import { clinicApi, invoiceApi } from '../../api/clinic';
import VietQrPaymentModal from '../../components/VietQrPaymentModal';

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
  // Reception state
  const [receptionQueue, setReceptionQueue] = useState([
    {
      id: 'REC-101',
      time: '08:30',
      ownerName: 'Nguyễn Minh Anh',
      phone: '0901234567',
      petName: 'Lu Lu (Chó Husky)',
      service: 'Khám tổng quát & Tiêm dại',
      doctor: 'BS. Lê Minh Hoàng',
      status: 'WAITING_VET', // WAITING_CHECKIN | WAITING_VET | IN_EXAM | COMPLETED
      room: 'Phòng 1'
    },
    {
      id: 'REC-102',
      time: '09:00',
      ownerName: 'Trần Thu Hà',
      phone: '0988765432',
      petName: 'Miu Miu (Mèo Anh)',
      service: 'Tắm Spa & Vệ sinh tai',
      doctor: 'KTV. Thảo Vy',
      status: 'WAITING_CHECKIN',
      room: 'Phòng Spa 2'
    },
    {
      id: 'REC-103',
      time: '09:30',
      ownerName: 'Phạm Đức Duy',
      phone: '0912998877',
      petName: 'Cún Bông (Poodle)',
      service: 'Cạo vôi răng & Cắt tỉa lông',
      doctor: 'KTV. Tuấn Anh',
      status: 'IN_EXAM',
      room: 'Phòng Spa 1'
    }
  ]);

  const [showAddWalkinModal, setShowAddWalkinModal] = useState(false);
  const [newWalkin, setNewWalkin] = useState({
    ownerName: '',
    phone: '',
    petName: '',
    service: 'Khám tổng quát',
    doctor: 'BS. Lê Minh Hoàng'
  });

  // Billing / Invoices state
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');
  const [completedBookings, setCompletedBookings] = useState([]);

  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ bookingId: '' });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);

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

  const handleCheckIn = (id) => {
    setReceptionQueue(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'WAITING_VET' } : item)
    );
  };

  const handleSendToDoctor = (id) => {
    setReceptionQueue(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'IN_EXAM' } : item)
    );
  };

  const handleAddWalkin = (e) => {
    e.preventDefault();
    if (!newWalkin.ownerName.trim() || !newWalkin.petName.trim()) return;
    const item = {
      id: `REC-${Math.floor(100 + Math.random() * 900)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ownerName: newWalkin.ownerName,
      phone: newWalkin.phone || '0900000000',
      petName: newWalkin.petName,
      service: newWalkin.service,
      doctor: newWalkin.doctor,
      status: 'WAITING_VET',
      room: 'Phòng 1'
    };
    setReceptionQueue([item, ...receptionQueue]);
    setShowAddWalkinModal(false);
    setNewWalkin({ ownerName: '', phone: '', petName: '', service: 'Khám tổng quát', doctor: 'BS. Lê Minh Hoàng' });
  };

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
      {/* TAB 1: BÀN TIẾP ĐÓN & CHECK-IN */}
      {activeTab === 'reception' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  🛎️
                </span>
                <h2 className="text-lg font-bold text-slate-900">Bàn tiếp đón & Check-in sảnh chờ</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý luồng khách đến phòng khám, xác nhận check-in và điều phối thú cưng vào các phòng khám
              </p>
            </div>
            <button
              onClick={() => setShowAddWalkinModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tiếp đón khách vãng lai</span>
            </button>
          </div>

          <div className="space-y-3">
            {receptionQueue.map(item => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-14 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center">
                    <Clock className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                    <span className="font-mono text-[11px] font-bold text-slate-700">{item.time}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900">{item.ownerName}</h4>
                      <span className="text-xs text-slate-500">({item.phone})</span>
                      <span className="font-semibold text-xs text-blue-600">• {item.petName}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.service} — Phụ trách: <strong className="text-slate-800">{item.doctor}</strong> ({item.room})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {item.status === 'WAITING_CHECKIN' ? (
                    <button
                      onClick={() => handleCheckIn(item.id)}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      ✓ Xác nhận khách đã đến
                    </button>
                  ) : item.status === 'WAITING_VET' ? (
                    <button
                      onClick={() => handleSendToDoctor(item.id)}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      Mời vào phòng khám →
                    </button>
                  ) : item.status === 'IN_EXAM' ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đang khám trong {item.room}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500">
                      Đã hoàn tất
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Modal Tiếp đón khách vãng lai */}
          {showAddWalkinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Tiếp nhận khách vãng lai tại quầy</h3>
                  <button onClick={() => setShowAddWalkinModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddWalkin} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Họ tên chủ nuôi *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={newWalkin.ownerName}
                      onChange={e => setNewWalkin({ ...newWalkin, ownerName: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *</label>
                    <input
                      type="text"
                      required
                      placeholder="0912 345 678"
                      value={newWalkin.phone}
                      onChange={e => setNewWalkin({ ...newWalkin, phone: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tên thú cưng (Giống loài) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Cún Lu (Poodle nâu 2kg)"
                      value={newWalkin.petName}
                      onChange={e => setNewWalkin({ ...newWalkin, petName: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Dịch vụ yêu cầu</label>
                    <select
                      value={newWalkin.service}
                      onChange={e => setNewWalkin({ ...newWalkin, service: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    >
                      <option value="Khám bệnh tổng quát">Khám bệnh tổng quát</option>
                      <option value="Cấp cứu khẩn cấp">Cấp cứu khẩn cấp</option>
                      <option value="Tiêm phòng vaccine định kỳ">Tiêm phòng vaccine định kỳ</option>
                      <option value="Tắm spa & Cắt tỉa lông">Tắm spa & Cắt tỉa lông</option>
                    </select>
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWalkinModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs"
                    >
                      Xác nhận tiếp đón
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: LỊCH HẸN */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  📅
                </span>
                <h2 className="text-lg font-bold text-slate-900">Quản lý lịch hẹn</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi lịch hẹn, thu tiền mặt tại quầy và báo trùng lịch / sự cố cho khách hàng
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={bookingStatusFilter}
                onChange={e => setBookingStatusFilter(e.target.value)}
                className="h-9 px-3 border border-slate-200 rounded-xl text-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="COMPLETED">Đã hoàn tất</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
              <button
                onClick={fetchBookings}
                className="inline-flex items-center space-x-1.5 px-3 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Mã</th>
                    <th className="py-3 px-4 font-semibold">Thú cưng</th>
                    <th className="py-3 px-4 font-semibold">Dịch vụ</th>
                    <th className="py-3 px-4 font-semibold">Thời gian</th>
                    <th className="py-3 px-4 font-semibold">Số tiền</th>
                    <th className="py-3 px-4 font-semibold">Thanh toán</th>
                    <th className="py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="py-3 px-4 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookingsLoading && (
                    <tr>
                      <td colSpan={8} className="py-8 px-4 text-center text-slate-500">Đang tải lịch hẹn...</td>
                    </tr>
                  )}
                  {!bookingsLoading && bookingsError && (
                    <tr>
                      <td colSpan={8} className="py-8 px-4 text-center text-rose-600">{bookingsError}</td>
                    </tr>
                  )}
                  {!bookingsLoading && !bookingsError && bookings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 px-4 text-center text-slate-500">Không có lịch hẹn nào.</td>
                    </tr>
                  )}
                  {!bookingsLoading && !bookingsError && bookings.map(b => {
                    const statusMeta = BOOKING_STATUS[b.status] || { label: b.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                    const payMeta = BOOKING_PAYMENT[b.paymentStatus] || BOOKING_PAYMENT.UNPAID;
                    const isPaid = b.paymentStatus === 'PAID';
                    const isCancelled = b.status === 'CANCELLED';
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors align-top">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{b.code}</td>
                        <td className="py-3.5 px-4 text-slate-700">{b.petName}</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-[220px]">
                          {b.service}
                          {b.promotionCode && (
                            <span className="block mt-1 text-[10px] font-semibold text-emerald-700">
                              Mã: {b.promotionCode}
                            </span>
                          )}
                          {b.staffNote && (
                            <span className="block mt-1 text-[10px] text-amber-700">Ghi chú: {b.staffNote}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{b.dateTime}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{b.amount.toLocaleString('vi-VN')} đ</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${payMeta.cls}`}>
                            {payMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.cls}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1.5">
                            {!isPaid && !isCancelled && (
                              <button
                                onClick={() => handleCounterPay(b)}
                                disabled={bookingActionId === b.id}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold shadow-xs"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>{bookingActionId === b.id ? 'Đang lưu...' : 'Thu tiền tại quầy'}</span>
                              </button>
                            )}
                            {!isCancelled && (
                              <button
                                onClick={() => { setReportingBooking(b); setReportMessage(''); }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-semibold"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Báo trùng / sự cố</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {reportingBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Báo trùng lịch / sự cố</h3>
                  <button onClick={() => setReportingBooking(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Lịch hẹn <span className="font-semibold text-slate-800">{reportingBooking.code}</span> — khách hàng sẽ nhận được thông báo kèm nội dung bên dưới.
                </p>
                <form onSubmit={handleReportIssue} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nội dung thông báo *</label>
                    <textarea
                      rows={3}
                      required
                      value={reportMessage}
                      onChange={e => setReportMessage(e.target.value)}
                      placeholder="VD: Khung giờ này đã có bác sĩ bận, vui lòng chọn giờ khác..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setReportingBooking(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={bookingActionId === reportingBooking.id || !reportMessage.trim()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-xs"
                    >
                      {bookingActionId === reportingBooking.id ? 'Đang gửi...' : 'Gửi báo cáo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HÓA ĐƠN & THU NGÂN */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  🧾
                </span>
                <h2 className="text-lg font-bold text-slate-900">Quầy Thu ngân & Hóa đơn viện phí</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tạo hóa đơn dịch vụ, thanh toán VNPay QR, Tiền mặt, Thẻ và áp dụng giảm giá điểm thưởng
              </p>
            </div>
            <button
              onClick={() => setShowAddInvoiceModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo hóa đơn mới</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Số HĐ</th>
                    <th className="py-3 px-4 font-semibold">Lịch hẹn</th>
                    <th className="py-3 px-4 font-semibold">Chi tiết dịch vụ & Thuốc</th>
                    <th className="py-3 px-4 font-semibold">Số tiền</th>
                    <th className="py-3 px-4 font-semibold">Ngày phát hành</th>
                    <th className="py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="py-3 px-4 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesLoading && (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-slate-500">Đang tải hóa đơn...</td>
                    </tr>
                  )}
                  {!invoicesLoading && invoicesError && (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-rose-600">{invoicesError}</td>
                    </tr>
                  )}
                  {!invoicesLoading && !invoicesError && invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-slate-500">Chưa có hóa đơn nào.</td>
                    </tr>
                  )}
                  {!invoicesLoading && !invoicesError && invoices.map(inv => {
                    const statusMeta = INVOICE_STATUS[inv.status] || { label: inv.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.number}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">#{String(inv.bookingId).slice(0, 8)}</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs">{inv.items}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {inv.total.toLocaleString('vi-VN')} {inv.currency}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDateTime(inv.issuedAt)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.cls}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'REFUNDED' && (
                              <button
                                onClick={() => setPayingInvoice(inv)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-semibold shadow-xs"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>VietQR</span>
                              </button>
                            )}
                            <button
                              onClick={() => alert(`Đang in hóa đơn điện tử ${inv.number}...`)}
                              className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>In phiếu</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <VietQrPaymentModal
            open={Boolean(payingInvoice)}
            invoice={payingInvoice}
            onClose={() => setPayingInvoice(null)}
            onPaid={() => fetchInvoices()}
          />

          {/* Modal Tạo hóa đơn */}
          {showAddInvoiceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Phát hành hóa đơn từ lịch hẹn</h3>
                  <button onClick={() => setShowAddInvoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Lịch hẹn đã hoàn thành *</label>
                    <select
                      required
                      value={newInvoice.bookingId}
                      onChange={e => setNewInvoice({ bookingId: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Chọn lịch hẹn --</option>
                      {completedBookings.map(b => (
                        <option key={b.id} value={b.id}>
                          #{b.id.slice(0, 8)} • {(b.items || []).map(i => i.serviceName).join(', ') || 'Dịch vụ'} • {(Number(b.totalAmount) || 0).toLocaleString('vi-VN')} đ
                        </option>
                      ))}
                    </select>
                    {completedBookings.length === 0 && (
                      <p className="text-[11px] text-amber-600 mt-1">Chưa có lịch hẹn nào ở trạng thái COMPLETED.</p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hóa đơn được tạo tự động từ các dịch vụ của lịch hẹn. Số tiền do hệ thống tính toán.
                  </p>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddInvoiceModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={invoiceSubmitting || !newInvoice.bookingId}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-xs"
                    >
                      {invoiceSubmitting ? 'Đang phát hành...' : 'Phát hành hóa đơn'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRA CỨU KHÁCH HÀNG & THÚ CƯNG */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  👥
                </span>
                <h2 className="text-lg font-bold text-slate-900">Danh bạ Khách hàng & Hồ sơ chủ nuôi</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tra cứu nhanh thông tin liên lạc, hạng thẻ tích điểm và các thú cưng đang sở hữu
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredClients.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.fullName}</h4>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {c.tier}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-500">Thú cưng đã đăng ký:</div>
                  {c.pets.map((p, idx) => (
                    <div key={idx} className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      🐾 {p}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tổng chi tiêu:</span>
                  <span className="font-bold text-slate-900">{c.totalSpent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
