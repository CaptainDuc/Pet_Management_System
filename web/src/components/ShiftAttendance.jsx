import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';
import { Modal, Button } from '../design-system/components';
import { AlertTriangle, Clock, X } from 'lucide-react';

const time = value => new Date(value).toLocaleTimeString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit',
});

export default function ShiftAttendance({ token }) {
  const [shift, setShift] = useState(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [countdown, setCountdown] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'checkin' | 'checkout'

  useEffect(() => {
    if (busy) return;
    let active = true;
    async function refresh() {
      try {
        const data = await clinicApi.myAttendance(token);
        if (active) { setShift(data || null); setNow(Date.now()); }
      } catch (err) { if (active) setError(err.message); }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [token, busy]);

  useEffect(() => {
    if (!shift) return;
    const next = [Date.parse(shift.start), Date.parse(shift.end)].find(t => t > now);
    if (!next) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, next - Date.now()));
    return () => clearTimeout(timer);
  }, [shift, now]);

  // Countdown timer for shift end
  useEffect(() => {
    if (!shift || !shift.clockIn || shift.clockOut) {
      setCountdown(null);
      return;
    }
    const endTime = Date.parse(shift.end);
    const updateCountdown = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        setCountdown('Đã kết thúc');
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setCountdown(`${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [shift, now]);

  const ended = shift && now >= Date.parse(shift.end);
  const working = Boolean(shift?.clockIn && !shift.clockOut && !ended);
  const canCheckIn = shift && !ended && !shift.clockOut && (!working && shift.open && now >= Date.parse(shift.start));
  const canCheckOut = working;

  const handleToggleClick = () => {
    const early = working && Date.now() < Date.parse(shift.end);
    if (early) {
      setPendingAction('checkout_early');
      setShowConfirmModal(true);
    } else {
      executeToggle(early);
    }
  };

  const executeToggle = async (early) => {
    setBusy(true); setError('');
    try {
      setShift(await clinicApi.clockShift(token, { shiftId: shift.shiftId, working: !working, confirmEarly: early }));
      setNow(Date.now());
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const handleConfirmModalClose = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const handleConfirmModalAction = () => {
    const early = pendingAction === 'checkout_early';
    handleConfirmModalClose();
    executeToggle(early);
  };

  if (!shift) {
    return <section className="pc-panel" aria-label="Chấm công">
      <div>
        <h2 className="font-bold">Chấm công hôm nay</h2>
        <p className="text-slate-500">Hôm nay bạn chưa có ca làm việc.</p>
      </div>
    </section>;
  }

  return <>
    <section className="pc-panel flex flex-wrap items-center justify-between gap-3" aria-label="Chấm công">
      <div>
        <h2 className="font-bold">Chấm công hôm nay</h2>
        <p className="text-sm">Ca {time(shift.start)} – {time(shift.end)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          {shift.clockIn && (
            <>
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Vào làm {time(shift.clockIn)}
              </span>
            </>
          )}
          {shift.clockOut && (
            <span className="flex items-center gap-1 text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Tan ca {time(shift.clockOut)}
            </span>
          )}
          {working && countdown && (
            <span className="flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" /> Còn {countdown} để kết thúc ca
            </span>
          )}
          {ended && !shift.clockOut && !shift.clockIn && (
            <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Ca đã kết thúc (chưa chấm công)</span>
          )}
          {shift.clockIn && shift.clockOut && (
            <span className="text-slate-500">Đã hoàn tất ca làm việc</span>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={working ? "Tan ca" : "Vào làm việc"}
        aria-checked={working}
        disabled={busy || ended || Boolean(shift.clockOut) || (!working && (!shift.open || now < Date.parse(shift.start)))}
        onClick={handleToggleClick}
        className="inline-flex items-center gap-2 disabled:opacity-60 transition-colors"
      >
        <span aria-hidden="true" className={'flex w-12 rounded-full p-1.5 ' + (working ? 'bg-sky-600 justify-end' : 'bg-slate-300 justify-start')}>
          <span className="h-5 w-5 rounded-full bg-white shadow-md" />
        </span>
        <span className="font-medium text-sm">
          {working ? 'Tan ca' : ended || shift.clockOut ? 'Đã kết thúc' : canCheckIn ? 'Vào làm' : 'Chưa đến giờ'}
        </span>
      </button>
      {error && <p role="alert" className="text-rose-600 text-sm">{error}</p>}
    </section>

    {/* Confirm Early Checkout Modal */}
    <Modal
      isOpen={showConfirmModal}
      onClose={handleConfirmModalClose}
      title="Xác nhận tan ca sớm"
      size="sm"
      className="pc-light pc-dialog"
    >
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={32} className="text-amber-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">Tan ca trước giờ?</h3>
          <p className="text-slate-600">
            Ca làm việc của bạn kết thúc lúc <strong>{time(shift.end)}</strong>.
            Nếu tan ca ngay bây giờ, ca sẽ được kết thúc sớm hơn dự kiến.
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            <Clock size={14} className="inline-block mr-1" /> Hành động này không thể hoàn tác.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleConfirmModalClose}
            leftIcon={<X size={16} />}
            disabled={busy}
          >
            Hủy
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleConfirmModalAction}
            disabled={busy}
          >
            {busy ? 'Đang xử lý...' : 'Xác nhận tan ca sớm'}
          </Button>
        </div>
      </div>
    </Modal>
  </>;
}
