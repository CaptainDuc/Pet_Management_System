import React, { useEffect, useState } from 'react';
import { UserCheck, AlertTriangle, Clock, Calendar, CheckCircle } from 'lucide-react';
import { clinicApi } from '../api/clinic';
import { Modal, Button, Badge } from '../design-system/components';
import RescheduleDialog from './RescheduleDialog';

export default function AssignVisitDialog({ visit, token, onClose, onSaved }) {
  const [options, setOptions] = useState([]);
  const [slot, setSlot] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [move, setMove] = useState(null);

  const selected = options.find(o => o.slotId === slot);
  const hasPreference = Boolean(visit.preferredStaffId);
  const preferredMatch = options.find(o => o.staffId === visit.preferredStaffId);
  const isPreferredAvailable = Boolean(preferredMatch);
  const different = selected && isPreferredAvailable && visit.preferredStaffId !== selected.staffId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOptions([]);
    setSlot('');
    setAgreed(false);

    clinicApi.assignmentOptions(visit, token).then(rows => {
      if (!active) return;
      setOptions(rows);
      // Auto-select preferred doctor if available in the slot options
      const match = rows.find(o => o.staffId === visit.preferredStaffId);
      if (match) {
        setSlot(match.slotId);
      } else if (rows.length === 1) {
        setSlot(rows[0].slotId);
      }
    }).catch(err => {
      if (active) setError(err.message);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [visit, token, reload]);

  async function save(e) {
    e.preventDefault();
    if (!slot) return;
    setBusy(true);
    setError('');
    try {
      await clinicApi.assignVisit(visit, slot, Boolean(different && agreed), token);
      onSaved(`Đã phân công ${selected?.name || 'Bác sĩ'}. Khách sẽ nhận được thông báo.`);
    } catch (err) {
      setError(err.message);
      setReload(n => n + 1);
    } finally {
      setBusy(false);
    }
  }

  async function changeTime() {
    setBusy(true);
    setError('');
    try {
      const booking = await clinicApi.getBooking(visit.bookingId, token);
      setMove({ ...booking, items: booking.items.filter(i => i.id === visit.itemId) });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (move) {
    return (
      <RescheduleDialog
        booking={move}
        token={token}
        onClose={() => setMove(null)}
        onSaved={() => onSaved('Đã đổi giờ hẹn. Vui lòng phân công bác sĩ cho giờ mới.')}
      />
    );
  }

  return (
    <Modal
      isOpen
      onClose={busy ? undefined : onClose}
      title="Phân công Bác sĩ phụ trách"
      size="md"
      className="pc-light pc-dialog"
    >
      <form className="space-y-4 text-xs" onSubmit={save}>
        {/* Thông tin ca hẹn */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex justify-between items-start">
            <div>
              <strong className="text-sm text-slate-900">{visit.petName}</strong>
              <div className="text-slate-600 font-medium">{visit.serviceName}</div>
            </div>
            <Badge variant="primary" size="xs">
              BK-{visit.bookingId.slice(0, 8).toUpperCase()}
            </Badge>
          </div>
          <div className="text-slate-500 flex items-center gap-1.5 text-[11px]">
            <Clock size={13} className="text-slate-400" />
            <span>
              {new Date(visit.startTime).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
            <span>· Khách: <strong className="text-slate-700">{visit.customerName}</strong></span>
          </div>
        </div>

        {/* Khối hiển thị Nguyện vọng Bác sĩ của Khách hàng */}
        {!loading && !error && (hasPreference ? (
          isPreferredAvailable ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle size={15} className="text-emerald-600" />
                <span>Nguyện vọng của khách: {visit.preferredStaffName}</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Bác sĩ khách yêu cầu <strong>đang có lịch trực và sẵn sàng</strong> trong khung giờ này. Hệ thống đã chọn sẵn bên dưới.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={15} className="text-amber-600" />
                <span>Nguyện vọng của khách: {visit.preferredStaffName}</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Bác sĩ khách yêu cầu <strong>không có ca trực hoặc đã kín lịch</strong> vào giờ này. Lễ tân có thể chọn một trong các Bác sĩ thú y khác đang khả dụng bên dưới, hoặc đổi giờ hẹn theo yêu cầu khách.
              </p>
            </div>
          )
        ) : (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px]">
            <span>Nguyện vọng của khách: <strong>Để phòng khám sắp xếp</strong> (Khách không chỉ định bác sĩ cụ thể).</span>
          </div>
        ))}

        {/* Chọn bác sĩ phụ trách */}
        {loading ? (
          <p className="text-slate-500 py-3 text-center" role="status">
            Đang kiểm tra danh sách bác sĩ thú y khả dụng…
          </p>
        ) : options.length > 0 ? (
          <div className="space-y-2">
            <label htmlFor="assigned-doctor" className="block font-semibold text-slate-700">
              Chọn Bác sĩ thú y thực hiện ca khám <span className="text-rose-500">*</span>
            </label>
            <select
              id="assigned-doctor"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              value={slot}
              disabled={busy}
              onChange={e => {
                setSlot(e.target.value);
                setAgreed(false);
              }}
            >
              <option value="">-- Chọn bác sĩ thú y khả dụng --</option>
              {options.map(o => {
                const isPreferred = o.staffId === visit.preferredStaffId;
                return (
                  <option key={o.slotId} value={o.slotId}>
                    {o.name} {isPreferred ? '⭐ (Nguyện vọng của khách · Sẵn sàng)' : '· Đang khả dụng'}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
            <strong>Không có bác sĩ thú y nào còn trống trong khung giờ này.</strong>
            <p className="text-[11px]">Vui lòng bấm nút "Đổi giờ hẹn" bên dưới để chuyển ca khám sang khung giờ bác sĩ còn trống.</p>
          </div>
        )}

        {/* Trường hợp đổi bác sĩ khác nguyện vọng của khách */}
        {different && (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
            <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                required
                className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span>
                Tôi xác nhận <strong>khách đã đồng ý</strong> đổi bác sĩ phụ trách sang <strong>{selected?.name}</strong> (giữ nguyên giờ hẹn).
              </span>
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
            {error}
          </p>
        )}

        {/* Nút hành động */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={changeTime}
            leftIcon={<Calendar size={14} />}
          >
            Đổi giờ hẹn
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={busy || loading || !selected || (different && !agreed)}
              leftIcon={<UserCheck size={15} />}
            >
              {busy ? 'Đang phân công…' : 'Xác nhận phân công'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
