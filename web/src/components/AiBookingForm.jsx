import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!confirmed || !selectedSlot || submitting) return;

    const [timeSlotId, staffId] = selectedSlot.split(':');
    setSubmitting(true);
    setError('');
    try {
      const booking = await clinicApi.createBooking({
        petId,
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

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>Dịch vụ: {form.serviceName}</span>
        {form.estimatedPrice != null && (
          <span className="font-semibold text-slate-700">
            {Number(form.estimatedPrice).toLocaleString('vi-VN')} đ
          </span>
        )}
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
