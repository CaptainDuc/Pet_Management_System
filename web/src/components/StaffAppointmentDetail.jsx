import React, { useEffect, useState } from 'react';
import { clinicApi, invoiceApi } from '../api/clinic';
import { Modal } from '../design-system/components';
import { formatMoney } from './BookingWizard';

const dateTime = value => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa xác định';
const hour = value => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
const statusText = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', IN_PROGRESS: 'Đang khám', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến' };
const paymentText = { PAID: 'Đã thanh toán', UNPAID: 'Chưa thanh toán', PARTIALLY_PAID: 'Thanh toán một phần', REFUNDED: 'Đã hoàn tiền' };
const invoiceText = { PAID: 'Đã thanh toán', ISSUED: 'Chờ thanh toán', PENDING_PAYMENT: 'Chờ thanh toán', PARTIALLY_PAID: 'Thanh toán một phần', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền' };

export default function StaffAppointmentDetail({ bookingId, token, onClose, onCashier }) {
  const [booking, setBooking] = useState(null);
  const [client, setClient] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactError, setContactError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setBooking(null); setClient(null); setInvoice(null); setError(''); setContactError(''); setLoading(true);
    clinicApi.getBooking(bookingId, token).then(async result => {
      if (!active) return;
      setBooking(result);
      const [contact, bill] = await Promise.allSettled([
        clinicApi.clients(result.customerName || '', token),
        invoiceApi.getByBooking(bookingId, token),
      ]);
      if (!active) return;
      if (contact.status === 'fulfilled') setClient(contact.value.find(row => row.id === result.customerId) || null);
      else setContactError('Không tải được thông tin liên hệ.');
      if (bill.status === 'fulfilled') setInvoice(bill.value);
      else if (bill.reason?.status !== 404) setContactError('Không tải được thông tin hóa đơn.');
    }).catch(err => { if (active) setError(err.message || 'Không tải được lịch hẹn.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId, token, revision]);

  return <Modal isOpen onClose={onClose} title="Chi tiết lịch hẹn" size="lg" className="pc-light pc-dialog">
    {loading && <p role="status">Đang tải thông tin lịch hẹn…</p>}
    {error && <div className="pc-notice" role="alert">{error}<button className="pc-text-button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
    {booking && <div className="pc-form">
      <dl className="pc-summary">
        <div><dt>Chủ nuôi</dt><dd>{booking.customerName || 'Khách hàng'}</dd></div>
        <div><dt>Liên hệ</dt><dd>{client ? [client.phone, client.email].filter(Boolean).join(' · ') : contactError || 'Chưa có thông tin'}</dd></div>
        <div><dt>Thú cưng</dt><dd>{booking.petName || 'Thú cưng'}</dd></div>
        <div><dt>Trạng thái lịch</dt><dd>{statusText[booking.status] || booking.status}</dd></div>
        {(booking.items || []).map(item => <React.Fragment key={item.id}>
          <div><dt>Dịch vụ</dt><dd>{item.serviceName}</dd></div>
          <div><dt>Giờ hẹn</dt><dd>{dateTime(item.startTime)}{item.endTime && ` – ${hour(item.endTime)}`}</dd></div>
          <div><dt>Bác sĩ</dt><dd>{item.staffName || 'Chờ phân công'}{item.preferredStaffName && ` · Khách mong muốn: ${item.preferredStaffName}`}</dd></div>
        </React.Fragment>)}
        {booking.notes && <div><dt>Ghi chú của khách</dt><dd>{booking.notes}</dd></div>}
        {booking.staffNote && <div><dt>Ghi chú phòng khám</dt><dd>{booking.staffNote}</dd></div>}
        <div className="pc-summary-total"><dt>Số tiền lịch hẹn</dt><dd>{formatMoney(booking.totalAmount)}</dd></div>
        <div><dt>Thanh toán</dt><dd>{paymentText[booking.paymentStatus] || booking.paymentStatus}{booking.paymentMethod && ` · ${booking.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}`}</dd></div>
        <div><dt>Hóa đơn</dt><dd>{invoice ? `${invoice.invoiceNumber} · ${invoiceText[invoice.status] || invoice.status}` : 'Chưa phát hành'}</dd></div>
      </dl>
      <div className="pc-form-actions"><button className="pc-button pc-button--line" onClick={onClose}>Đóng</button><button className="pc-button" onClick={() => onCashier(booking.id)}>Đến thu ngân</button></div>
    </div>}
  </Modal>;
}
