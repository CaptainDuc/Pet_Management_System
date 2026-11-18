import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Loader2, Tag, X } from 'lucide-react';
import { clinicApi } from '../api/clinic';

function toLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tomorrowISO() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalISO(date);
}

export default function AiBookingForm({ form, pets, services, token, onBooked }) {
  const [petId, setPetId] = useState(form?.petId || pets[0]?.id || '');
  const [serviceId, setServiceId] = useState(form?.serviceId || services[0]?.id || '');
  const [date, setDate] = useState(form?.date || tomorrowISO());
  const [note, setNote] = useState(form?.note || '');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Promotion coupon state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!date || !serviceId || !token) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);
    setError('');
    clinicApi.availableSlots({ date, serviceId, includeBooked: false }, token)
      .then(data => {
        if (cancelled) return;
        const available = (data?.staff || []).flatMap(group =>
          (group.slots || [])
            .filter(slot => slot.available)
            .map(slot => ({ ...slot, staffId: group.staffId }))
        );
        setSlots(available);
        setSelectedSlot(available[0] ? `${available[0].slotId}:${available[0].staffId}` : '');
      })
      .catch(err => {
        if (cancelled) return;
        setSlots([]);
        setSelectedSlot('');
        setError(err.message || 'Không tải được khung giờ trống.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, serviceId, token]);

  if (!form) return null;

  const handleApplyPromo = async () => {
    const raw = promoCodeInput.trim().toUpperCase();
    if (!raw || !token) return;
    setValidatingPromo(true);
    setPromoMessage({ type: '', text: '' });
    try {
      const selectedService = services.find(s => s.id === serviceId);
      const subtotal = form?.estimatedPrice || selectedService?.price || 150000;
      const res = await clinicApi.validatePromotion(raw, subtotal, token);
      if (res && res.valid) {
        setAppliedPromo(res);
        setPromoMessage({ type: 'success', text: `Áp dụng mã ${res.code} thành công (-${Number(res.discountAmount).toLocaleString('vi-VN')} đ)` });
      } else {
        setAppliedPromo(null);
        setPromoMessage({ type: 'error', text: res?.message || 'Mã giảm giá không hợp lệ hoặc đã hết lượt' });
      }
    } catch (err) {
      setAppliedPromo(null);
      setPromoMessage({ type: 'error', text: err.message || 'Mã giảm giá không hợp lệ' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoMessage({ type: '', text: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!confirmed || !selectedSlot || submitting) return;

    const [timeSlotId, staffId] = selectedSlot.split(':');
    setSubmitting(true);
    setError('');
    try {
      const booking = await clinicApi.createBooking({
        petId,
        promotionCode: appliedPromo ? appliedPromo.code : null,
        notes: note.trim() || null,
        items: [{ serviceId, timeSlotId, staffId: staffId || null }],
      }, token);
      setSuccess(booking);
      if (onBooked) onBooked(booking);
    } catch (err) {
      setError(err.message || 'Không đặt được lịch hẹn.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
        <div className="flex items-center space-x-2 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã đặt lịch thành công</span>
        </div>
        <p className="mt-1">
          Mã lịch hẹn: BK-{String(success.id || '').slice(0, 8).toUpperCase()}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-slate-700"
    >
      <div className="flex items-center space-x-2 font-semibold text-blue-700">
        <Calendar className="w-4 h-4" />
        <span>Phiếu đặt lịch do AI tạo - vui lòng kiểm tra và xác nhận</span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label className="block">
          <span className="text-[11px] font-medium text-slate-500">Thú cưng</span>
          <select
            value={petId}
            onChange={event => setPetId(event.target.value)}
            className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 bg-white"
          >
            {pets.map(pet => (
              <option key={pet.id} value={pet.id}>{pet.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-medium text-slate-500">Dịch vụ</span>
          <select
            value={serviceId}
            onChange={event => setServiceId(event.target.value)}
            className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 bg-white"
          >
            {services.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-medium text-slate-500">Ngày</span>
          <input
            type="date"
            value={date}
            min={toLocalISO(new Date())}
            onChange={event => setDate(event.target.value)}
            className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 bg-white"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-medium text-slate-500">Khung giờ</span>
          <select
            value={selectedSlot}
            onChange={event => setSelectedSlot(event.target.value)}
            disabled={loadingSlots || slots.length === 0}
            className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 bg-white disabled:bg-slate-100"
          >
            {loadingSlots && <option value="">Đang tải khung giờ...</option>}
            {!loadingSlots && slots.length === 0 && <option value="">Không còn khung giờ trống</option>}
            {slots.map(slot => (
              <option key={`${slot.slotId}:${slot.staffId}`} value={`${slot.slotId}:${slot.staffId}`}>
                {new Date(slot.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(slot.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block mt-2.5">
        <span className="text-[11px] font-medium text-slate-500">Ghi chú</span>
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          rows={2}
          className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white resize-none"
        />
      </label>

      {/* Coupon / Voucher Code Input */}
      <div className="mt-3 pt-3 border-t border-blue-200/60">
        <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center space-x-1">
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          <span>Mã giảm giá / Voucher (nếu có)</span>
        </label>
        <div className="flex items-center space-x-1.5">
          <input
            type="text"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
            placeholder="Nhập mã (VD: WELCOME10, OWNER50)"
            disabled={!!appliedPromo || validatingPromo}
            className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white font-mono uppercase text-xs focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
          />
          {appliedPromo ? (
            <button
              type="button"
              onClick={handleRemovePromo}
              className="h-8 px-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Hủy</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={!promoCodeInput.trim() || validatingPromo}
              className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold flex items-center space-x-1 transition"
            >
              {validatingPromo && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Áp dụng</span>
            </button>
          )}
        </div>

        {promoMessage.text && (
          <p className={`mt-1 text-[11px] font-medium ${promoMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {promoMessage.text}
          </p>
        )}
      </div>

      <div className="mt-2.5 p-2 rounded-lg bg-blue-100/50 border border-blue-200/50 space-y-1 text-[11px]">
        <div className="flex items-center justify-between text-slate-600">
          <span>Dịch vụ ({form.serviceName}):</span>
          <span className="font-semibold text-slate-800">
            {Number(appliedPromo?.bookingTotal || form.estimatedPrice || (services.find(s => s.id === serviceId)?.price || 0)).toLocaleString('vi-VN')} đ
          </span>
        </div>
        {appliedPromo && (
          <div className="flex items-center justify-between text-emerald-700 font-medium">
            <span>Chiết khấu Voucher ({appliedPromo.code}):</span>
            <span>-{Number(appliedPromo.discountAmount).toLocaleString('vi-VN')} đ</span>
          </div>
        )}
        <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-blue-200/40 text-xs">
          <span>Tổng thanh toán dự kiến:</span>
          <span className="text-blue-700">
            {Number(appliedPromo?.finalAmount || form.estimatedPrice || (services.find(s => s.id === serviceId)?.price || 0)).toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      <label className="mt-3 flex items-start space-x-2 text-[11px] text-slate-600">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={event => setConfirmed(event.target.checked)}
          className="mt-0.5"
        />
        <span>Tôi đã kiểm tra thông tin do AI tạo và xác nhận đặt lịch.</span>
      </label>

      {error && (
        <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!confirmed || !selectedSlot || submitting}
        className="mt-3 w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center space-x-1.5"
      >
        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span>{submitting ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}</span>
      </button>
    </form>
  );
}
