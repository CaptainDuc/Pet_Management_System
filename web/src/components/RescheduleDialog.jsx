import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';
import { Modal } from '../design-system/components';
import { localDate } from './BookingWizard';

const time = stamp => new Date(stamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
const when = stamp => new Date(stamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

export default function RescheduleDialog({ booking, token, onClose, onSaved }) {
  const items = booking.items.filter(item => item.timeSlotId && item.startTime);
  const [itemId, setItemId] = useState(items[0]?.id);
  const item = items.find(i => i.id === itemId);
  const [date, setDate] = useState(item?.startTime.slice(0, 10) || localDate());
  const [groups, setGroups] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setSlotId('');
    setGroups([]);
    setError('');
    if (!date || !itemId) { setLoading(false); return; }
    setLoading(true);
    clinicApi.moveOptions(booking.id, itemId, date, token)
      .then(data => { if (active) setGroups(data.staff); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [booking.id, itemId, date, token, reload]);

  async function save(event) {
    event.preventDefault();
    if (!slotId || saving) return;
    setSaving(true);
    try {
      await clinicApi.reschedule(booking.id, item.id, item.timeSlotId, slotId, token);
      onSaved();
    } catch (err) {
      setSubmitError(err.message);
      setReload(n => n + 1);
    } finally { setSaving(false); }
  }

  return <Modal isOpen onClose={saving ? undefined : onClose} title="Đổi lịch hẹn" className="pc-light pc-dialog">
    <form className="pc-form" onSubmit={save}>
      {items.length > 1 && <label className="pc-field">Dịch vụ cần đổi
        <select value={itemId} disabled={saving} onChange={e => {
          setItemId(e.target.value); setSlotId(''); setSubmitError('');
          setDate(items.find(i => i.id === e.target.value).startTime.slice(0, 10));
        }}>{items.map(i => <option key={i.id} value={i.id}>{i.serviceName} · {when(i.startTime)}</option>)}</select>
      </label>}
      {item && <p className="pc-muted">{item.serviceName} · Giờ hẹn hiện tại {when(item.startTime)}</p>}
      <label className="pc-field">Ngày hẹn mới
        <input type="date" required min={localDate()} value={date} disabled={saving}
          onChange={e => { setDate(e.target.value); setSlotId(''); setSubmitError(''); }} />
      </label>
      {loading && <p role="status">Đang tìm giờ trống…</p>}
      {error && <p role="alert" className="pc-notice">{error}</p>}
      {!loading && !error && date && (groups.length ? <label className="pc-field">Nhân viên và giờ hẹn
        <select required value={slotId} disabled={saving} onChange={e => { setSlotId(e.target.value); setSubmitError(''); }}>
          <option value="">Chọn khung giờ</option>
          {groups.map(group => <optgroup key={group.scheduleId} label={group.staffName}>
            {group.slots.map(slot => <option key={slot.slotId} value={slot.slotId}>
              {time(slot.startTime)} – {time(slot.endTime)} · {group.staffName}
            </option>)}
          </optgroup>)}
        </select></label> : <p className="pc-muted">Ngày này chưa có giờ phù hợp. Bạn có thể chọn ngày khác.</p>)}
      {submitError && <p role="alert" className="pc-notice">{submitError}</p>}
      <div className="pc-form-actions">
        <button type="button" className="pc-button pc-button--line" onClick={onClose} disabled={saving}>Giữ lịch hiện tại</button>
        <button className="pc-button" disabled={!slotId || loading || saving}>{saving ? 'Đang lưu…' : 'Xác nhận đổi lịch'}</button>
      </div>
    </form>
  </Modal>;
}
