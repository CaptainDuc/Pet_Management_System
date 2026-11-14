import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, CheckCircle2, Copy, Loader2, QrCode, RefreshCw, X } from 'lucide-react';
import { paymentApi } from '../api/payments';

const POLL_INTERVAL_MS = 3000;

function formatCurrency(value, currency = 'VND') {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('vi-VN')} ${currency}`;
}

export default function VietQrPaymentModal({ open, invoice, booking, onClose, onPaid }) {
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [attempt, setAttempt] = useState(0);
  const paidRef = useRef(false);

  const orderCode = payment?.orderCode;
  const isBooking = Boolean(booking);
  const reference = isBooking ? booking?.code : (invoice?.number || invoice?.id);
  const targetKey = isBooking ? `booking:${booking?.id}` : `invoice:${invoice?.id || invoice?.number || ''}`;

  useEffect(() => {
    if (!open || (!invoice && !booking)) return undefined;

    let cancelled = false;
    paidRef.current = false;
    setPayment(null);
    setStatus('PENDING');
    setError('');
    setCopied('');
    setLoading(true);

    paymentApi
      .createPayment({
        amount: Number(isBooking ? booking?.amount : invoice?.total || 0),
        bookingId: isBooking ? booking?.id : undefined,
        invoiceId: isBooking ? undefined : invoice?.id,
        invoiceCode: reference,
        description: isBooking
          ? `Thanh toan lich hen ${reference || ''}`.trim()
          : `Thanh toan hoa don ${reference || ''}`.trim(),
      })
      .then((data) => {
        if (!cancelled) setPayment(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không tạo được mã thanh toán.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, targetKey, attempt]);

  useEffect(() => {
    if (!open || !orderCode) return undefined;

    const timer = setInterval(async () => {
      if (paidRef.current) return;
      try {
        const data = await paymentApi.orderStatus(orderCode);
        if (data?.status) setStatus(data.status);
        if (data?.status === 'PAID') {
          paidRef.current = true;
          clearInterval(timer);
          if (onPaid) onPaid(data);
        }
      } catch {
        // Transient polling errors are ignored; the next tick retries.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [open, orderCode, onPaid]);

  const isPaid = status === 'PAID';
  const bankInfo = payment?.bankInfo;

  const copy = async (value, field) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(field);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('');
    }
  };

  const statusMeta = useMemo(() => {
    switch (status) {
      case 'PAID':
        return { label: 'Đã thanh toán', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'PARTIALLY_PAID':
        return { label: 'Thanh toán một phần', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'CANCELLED':
        return { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
      case 'EXPIRED':
        return { label: 'Hết hạn', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
      default:
        return { label: 'Chờ chuyển khoản', cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
  }, [status]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center space-x-2">
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Thanh toán VietQR</h3>
                <p className="text-[11px] text-slate-500">
                  {isBooking ? `Lịch hẹn ${reference || ''}` : 'Quét mã hoặc chuyển khoản đúng nội dung'}
                </p>
              </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-14 text-slate-500 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
              <p className="text-sm">Đang tạo mã thanh toán...</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
              <button
                onClick={() => {
                  setError('');
                  setPayment(null);
                  setStatus('PENDING');
                  paidRef.current = false;
                  setAttempt((value) => value + 1);
                }}
                className="ml-2 inline-flex items-center space-x-1 font-semibold underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {!loading && !error && payment && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Mã đơn</p>
                  <p className="font-mono font-bold text-slate-900">{payment.orderCode}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.cls}`}>
                  {statusMeta.label}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-center">
                <div className={`shrink-0 rounded-2xl border p-2 ${isPaid ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  {isPaid ? (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-14 h-14" />
                      <span className="mt-2 text-xs font-semibold">Đã nhận thanh toán</span>
                    </div>
                  ) : (
                    <img
                      src={payment.qrUrl}
                      alt={`VietQR ${payment.orderCode}`}
                      className="w-44 h-44 object-contain"
                    />
                  )}
                </div>

                <div className="flex-1 w-full space-y-2.5 text-xs">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số tiền</span>
                      <span className="font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ngân hàng</span>
                      <span className="font-semibold text-slate-800 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{bankInfo?.bankCode}</span>
                      </span>
                    </div>
                    <CopyRow
                      label="Số tài khoản"
                      value={bankInfo?.accountNumber}
                      copied={copied === 'account'}
                      onCopy={() => copy(bankInfo?.accountNumber, 'account')}
                      mono
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Chủ tài khoản</span>
                      <span className="font-semibold text-slate-800 text-right">{bankInfo?.accountName}</span>
                    </div>
                    <CopyRow
                      label="Nội dung CK"
                      value={payment.orderCode}
                      copied={copied === 'content'}
                      onCopy={() => copy(payment.orderCode, 'content')}
                      mono
                      highlight
                    />
                  </div>
                  <p className="text-[11px] text-amber-600">
                    Vui lòng chuyển đúng số tiền và nội dung để hệ thống tự xác nhận.
                  </p>
                  {isBooking && !isPaid && (
                    <p className="text-[11px] text-slate-500">
                      Nếu chưa chuyển khoản được, bạn có thể đóng cửa sổ này và thanh toán tại quầy lễ tân.
                    </p>
                  )}
                </div>
              </div>

              {!isPaid && (
                <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  <span>Đang chờ xác nhận từ SePay... (tự động kiểm tra mỗi 3 giây)</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyRow({ label, value, copied, onCopy, mono, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center space-x-1 font-semibold rounded-lg px-2 py-1 transition ${
          highlight ? 'bg-sky-50 text-sky-700 hover:bg-sky-100' : 'text-slate-800 hover:bg-slate-100'
        } ${mono ? 'font-mono' : ''}`}
      >
        <span>{value || '—'}</span>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
