import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';
import { localDate } from './BookingWizard';
import RescheduleDialog from './RescheduleDialog';

export default function ShiftManager({ token, rosterVersion }) {
  const [date, setDate] = useState(localDate());
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [expanded, setExpanded] = useState('');
  const [appointments, setAppointments] = useState(null);
  const [move, setMove] = useState(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setShifts([]);
    Promise.all([clinicApi.shiftStaff(token), clinicApi.shifts(date, token)])
      .then(([team, rows]) => { if (active) { setStaff(team); setShifts(rows); } })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, token, reload, rosterVersion]);

  useEffect(() => {
    let active = true;
    setAppointments(null);
    setDetailsError('');
    if (expanded) clinicApi.shiftBookings(expanded, token)
      .then(rows => { if (active) setAppointments(rows); })
      .catch(err => { if (active) setDetailsError(err.message); });
    return () => { active = false; };
  }, [expanded, token, reload]);

  async function create(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await clinicApi.createShift({ staffId: form.get('staff'), workDate: date, startTime: form.get('start'),
        endTime: form.get('end'), slotDurationMinutes: Number(form.get('duration')) }, token);
      setCreating(false); setNotice('Đã tạo ca làm việc.'); setReload(n => n + 1);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function toggle(shift) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await clinicApi.setShiftAvailability(shift.id, !shift.isAvailable, token);
      setExpanded(shift.id); setReload(n => n + 1);
      setNotice(shift.isAvailable ? 'Đã ngừng nhận lịch mới. Kiểm tra các lịch đã đặt trong ca bên dưới.' : 'Ca đã mở nhận lịch.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const freeStaff = staff.filter(person => person.active && !shifts.some(s => s.staffId === person.id));
  return <section className="pc-light pc-panel space-y-4">
    <h2 className="text-xl font-bold">Ca làm việc</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label className="pc-field">Ngày làm việc<input type="date" required value={date} disabled={busy}
        onChange={e => { if (e.target.value) { setDate(e.target.value); setExpanded(''); setCreating(false); setNotice(''); } }} /></label>
      <button type="button" className="pc-button pc-button--soft" disabled={busy || loading || date < localDate()}
        onClick={() => setCreating(!creating)}>{creating ? 'Đóng biểu mẫu' : 'Thêm ca làm'}</button>
    </div>
    {notice && <p role="status" className="pc-muted">{notice}</p>}
    {error && <div role="alert" className="pc-notice">{error} <button className="pc-text-button" onClick={() => setReload(n => n + 1)}>Tải lại</button></div>}
    {creating && (freeStaff.length ? <form className="pc-form" onSubmit={create}>
      <label className="pc-field">Nhân viên<select name="staff" required defaultValue="">
        <option disabled value="">Chọn nhân viên</option>
        {freeStaff.map(person => <option key={person.id} value={person.id}>{person.fullName}</option>)}
      </select></label>
      <div className="flex flex-wrap gap-3">
        <label className="pc-field">Bắt đầu<input type="time" name="start" required defaultValue="08:00" /></label>
        <label className="pc-field">Kết thúc<input type="time" name="end" required defaultValue="17:00" /></label>
        <label className="pc-field">Mỗi khung giờ (phút)<input type="number" name="duration" min="5" max="480" required defaultValue="30" /></label>
      </div>
      <button disabled={busy} className="pc-button">Lưu ca làm</button>
    </form> : <p>Không còn nhân viên có thể tạo ca trong ngày này.</p>)}
    {loading ? <p role="status">Đang tải ca làm…</p> : !shifts.length && !error && <p>Chưa có ca làm việc trong ngày đã chọn.</p>}
    {shifts.map(shift => <article key={shift.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div><strong>{staff.find(person => person.id === shift.staffId)?.fullName}</strong>
          <p>{shift.startTime.slice(0, 5)} – {shift.endTime.slice(0, 5)} · {shift.isAvailable ? 'Đang nhận lịch' : 'Đã ngừng nhận lịch'}</p></div>
        <div className="flex flex-wrap gap-3">
          <button className="pc-text-button" aria-expanded={expanded === shift.id} disabled={busy}
            onClick={() => setExpanded(expanded === shift.id ? '' : shift.id)}>Lịch đã đặt</button>
          {date >= localDate() && <button className="pc-button pc-button--line pc-button--small" disabled={busy}
            onClick={() => toggle(shift)}>{shift.isAvailable ? 'Ngừng nhận lịch' : 'Mở lại ca'}</button>}
        </div>
      </div>
      {expanded === shift.id && <div>
        {detailsError ? <p role="alert">{detailsError}</p> : !appointments ? <p role="status">Đang tải lịch hẹn…</p> :
          !appointments.length ? <p className="pc-muted">Ca này không có lịch đang chờ hoặc đã xác nhận.</p> :
          appointments.map(b => {
            const inShift = b.items.filter(i => i.scheduleId === shift.id);
            return <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-slate-100">
              <span>BK-{b.id.slice(0, 8).toUpperCase()} · {inShift.map(i => i.serviceName + ' ' + i.startTime.slice(11, 16)).join(', ')}</span>
              {inShift.some(i => new Date(i.startTime) > new Date()) && <button className="pc-text-button"
                onClick={() => setMove({ ...b, items: inShift })}>Đổi lịch hẹn</button>}
            </div>;
          })}
      </div>}
    </article>)}
    {move && <RescheduleDialog booking={move} token={token} onClose={() => setMove(null)}
      onSaved={() => { setMove(null); setNotice('Đã chuyển lịch hẹn.'); setReload(n => n + 1); }} />}
  </section>;
}
