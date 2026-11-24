import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';
import { Modal } from '../design-system/components';
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
  const different = selected && visit.preferredStaffId && visit.preferredStaffId !== selected.staffId;
  useEffect(() => {
    let active = true;
    setLoading(true); setOptions([]); setSlot(''); setAgreed(false);
    clinicApi.assignmentOptions(visit, token).then(rows => {
      if (!active) return;
      setOptions(rows);
      setSlot(rows.find(o => o.staffId === visit.preferredStaffId)?.slotId || '');
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [visit, token, reload]);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await clinicApi.assignVisit(visit, slot, Boolean(different && agreed), token);
      onSaved('Đã phân công ' + selected.name + '. Khách sẽ nhận được thông báo.');
    } catch (err) { setError(err.message); setReload(n => n + 1); }
    finally { setBusy(false); }
  }

  async function changeTime() {
    setBusy(true); setError('');
    try {
      const booking = await clinicApi.getBooking(visit.bookingId, token);
      setMove({ ...booking, items: booking.items.filter(i => i.id === visit.itemId) });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (move) return <RescheduleDialog booking={move} token={token} onClose={() => setMove(null)}
    onSaved={() => onSaved('Đã đổi giờ hẹn. Chọn người phụ trách cho giờ mới.')} />;
  return <Modal isOpen onClose={busy ? undefined : onClose} title="Phân công người phụ trách" className="pc-light pc-dialog">
    <form className="pc-form" onSubmit={save}>
      <p><strong>{visit.petName} · {visit.serviceName}</strong><br/>{new Date(visit.startTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</p>
      <p className="pc-muted">Nguyện vọng của khách: {visit.preferredStaffName || 'Để phòng khám sắp xếp'}</p>
      {loading ? <p role="status">Đang kiểm tra ca làm…</p> : options.length ? <label className="pc-field">Người phụ trách
        <select required value={slot} disabled={busy} onChange={e => { setSlot(e.target.value); setAgreed(false); }}>
          <option value="">Chọn người còn trống</option>
          {options.map(o => <option key={o.slotId} value={o.slotId}>{o.name}{o.staffId === visit.preferredStaffId ? ' · Khách yêu cầu' : ''}</option>)}
        </select></label> : <p>Không còn người phù hợp trong khung giờ này. Hãy trao đổi với khách để đổi giờ.</p>}
      {different && <label><input type="checkbox" required checked={agreed} onChange={e => setAgreed(e.target.checked)} /> Khách đã đồng ý giữ giờ và đổi người phụ trách.</label>}
      {error && <p role="alert" className="pc-notice">{error}</p>}
      <div className="pc-form-actions">
        <button type="button" className="pc-button pc-button--line" disabled={busy} onClick={changeTime}>Đổi giờ theo yêu cầu khách</button>
        <button className="pc-button" disabled={busy || loading || !selected || (different && !agreed)}>Xác nhận phân công</button>
      </div>
    </form>
  </Modal>;
}
