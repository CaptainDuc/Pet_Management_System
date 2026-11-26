import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';
import { Modal } from '../design-system/components';
import AssignVisitDialog from './AssignVisitDialog';
import BookingWizard from './BookingWizard';
import MedicalExamDialog from './MedicalExamDialog';

const zone = 'Asia/Ho_Chi_Minh';
const clinicDate = () => new Intl.DateTimeFormat('sv-SE', { timeZone: zone }).format(new Date());
const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: zone });

function WalkIn({ token, onClose, onSaved }) {
  const [contact, setContact] = useState('');
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function find(event) {
    event.preventDefault();
    setError(''); setBusy(true);
    try {
      const [matches, catalog] = await Promise.all([
        clinicApi.findClientPets(contact.trim(), token), clinicApi.listServices(token),
      ]);
      if (!matches.length) { setError('Chưa tìm thấy thú cưng. Kiểm tra thông tin hoặc đề nghị khách đăng ký và thêm hồ sơ thú cưng.'); return; }
      setServices(catalog.content);
      setPets(matches);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  if (pets.length) return <BookingWizard pets={pets} initialPetId={pets[0].id} services={services} token={token}
    walkInCustomerId={pets[0].customerId} visitDate={clinicDate()} onClose={onClose} onBooked={onSaved} />;
  return <Modal isOpen onClose={busy ? undefined : onClose} title="Tiếp đón khách vãng lai" className="pc-light pc-dialog">
    <form className="pc-form" onSubmit={find}>
      <label className="pc-field">Email hoặc số điện thoại đã đăng ký<input required value={contact}
        onChange={e => setContact(e.target.value)} /></label>
      {error && <p className="pc-notice" role="alert">{error}</p>}
      <button className="pc-button" disabled={busy || !contact.trim()}>{busy ? 'Đang tìm…' : 'Tìm hồ sơ thú cưng'}</button>
    </form>
  </Modal>;
}

export default function ClinicVisitQueue({ token, reception = false }) {
  const [date, setDate] = useState(clinicDate);
  const [view, setView] = useState(reception ? 'all' : 'mine');
  const mine = !reception;
  const pendingAssignments = reception && view === 'pending';
  const [assignment, setAssignment] = useState(null);
  const [examVisit, setExamVisit] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(n => n + 1);

  useEffect(() => {
    let active = true;
    let pending = false;
    setVisits([]); setError(''); setLoading(true);
    async function load() {
      if (pending) return;
      pending = true;
      try {
        const rows = pendingAssignments ? await clinicApi.pendingAssignments(token) : await clinicApi.visitQueue(date, mine, token);
        if (active) { setVisits(rows); setError(''); }
      } catch (err) {
        if (active) { setVisits([]); setError(err.message); }
      } finally { pending = false; if (active) setLoading(false); }
    }
    load();
    const timer = setInterval(load, 10000);
    window.addEventListener('focus', load);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, [date, mine, pendingAssignments, token, revision]);

  async function act(visit, action) {
    setBusy(true); setActionError(''); setFeedback('');
    try {
      if (action === 'no-show') await clinicApi.markNoShow(visit.bookingId, token);
      else await clinicApi.visitAction(visit, action, token);
      setFeedback(action === 'no-show' ? `Đã ghi nhận ${visit.petName} vắng mặt.`
        : ({ 'check-in': 'Đã tiếp đón', start: 'Đã bắt đầu dịch vụ cho', complete: 'Đã hoàn tất dịch vụ cho' })[action] + ' ' + visit.petName + '.');
    } catch (err) { setActionError(err.message); }
    finally { setBusy(false); refresh(); }
  }

  return <section className="pc-light pc-panel space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2>{reception ? 'Hàng đợi tiếp đón' : 'Lịch khám của tôi'}</h2>
      {reception && <button className="pc-button" onClick={() => setWalkIn(true)}>Tiếp đón khách vãng lai</button>}
    </div>
    <div className="flex flex-wrap items-end gap-3">
      {!pendingAssignments && <label className="pc-field">Ngày hẹn<input type="date" required value={date} disabled={busy}
        onChange={e => { if (e.target.value) { setDate(e.target.value); setFeedback(''); setActionError(''); } }} /></label>}
      {reception && <label className="pc-field">Danh sách<select value={view} disabled={busy}
        onChange={e => { setView(e.target.value); setFeedback(''); setActionError(''); }}>
        <option value="all">Tất cả lượt tiếp đón</option><option value="pending">Chờ phân công · Từ hôm nay</option>
      </select></label>}
      <button className="pc-text-button" disabled={busy || loading} onClick={refresh}>Làm mới</button>
    </div>
    {feedback && <p role="status">{feedback}</p>}
    {(error || actionError) && <p className="pc-notice" role="alert">{error || actionError}</p>}
    {loading ? <p role="status">Đang tải lịch hẹn…</p> : !error && !visits.length &&
      <p className="pc-muted">{mine ? 'Bạn chưa được phân công dịch vụ nào trong ngày này.' : pendingAssignments ? 'Không có dịch vụ nào đang chờ phân công.' : 'Chưa có lịch hẹn trong ngày này.'}</p>}
    {visits.map(v => {
      const working = v.status === 'IN_PROGRESS';
      const done = v.status === 'COMPLETED';
      const status = done ? 'Đã hoàn tất' : working ? 'Đang thực hiện' : v.checkedInAt ? 'Đã đến · Chờ phục vụ' : v.staffName ? 'Chưa tiếp đón' : 'Chờ phân công';
      const due = Date.parse(v.startTime) <= Date.now();
      return <article key={v.itemId} className="rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div><strong>{pendingAssignments && new Date(v.startTime).toLocaleDateString('vi-VN', { timeZone: zone }) + ' · '}{time.format(new Date(v.startTime))} · {v.petName}</strong><p>{v.serviceName} · {v.customerName}</p>
          <p className="pc-muted">{v.staffName || ('Mong muốn: ' + (v.preferredStaffName || 'Để phòng khám sắp xếp'))} · BK-{v.bookingId.slice(0, 8).toUpperCase()}</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="pc-status">{status}</span>
          {/* Tác vụ của Lễ tân tiếp đón */}
          {reception && !v.staffName && !working && !done && (
            <button className="pc-button pc-button--small" disabled={busy} onClick={() => setAssignment(v)}>
              Phân công
            </button>
          )}
          {reception && v.staffName && !v.checkedInAt && !working && !done && date === clinicDate() && (
            <button className="pc-button pc-button--small" disabled={busy} onClick={() => act(v, 'check-in')}>
              Xác nhận khách đã đến
            </button>
          )}
          {reception && v.status === 'CONFIRMED' && !v.checkedInAt && due && date === clinicDate() && (
            <button className="pc-button pc-button--small pc-button--line" disabled={busy}
              onClick={() => window.confirm(`Ghi nhận ${v.petName} không đến lịch hẹn? Thao tác này áp dụng cho toàn bộ lịch hẹn.`) && act(v, 'no-show')}>
              Đánh dấu vắng mặt
            </button>
          )}

          {/* Tác vụ lâm sàng dành riêng cho Bác sĩ thú y */}
          {!reception && v.checkedInAt && !working && !done && (
            <button
              className="pc-button pc-button--small"
              disabled={busy || !due}
              onClick={() => {
                act(v, 'start').then(() => setExamVisit({ ...v, status: 'IN_PROGRESS' }));
              }}
            >
              {due ? 'Bắt đầu khám' : 'Chưa đến giờ hẹn'}
            </button>
          )}
          {!reception && working && (
            <button
              className="pc-button pc-button--small !bg-sky-600 hover:!bg-sky-700 !text-white flex items-center gap-1"
              disabled={busy}
              onClick={() => setExamVisit(v)}
            >
              🩺 Vào khám & Kê đơn
            </button>
          )}
          {!reception && done && (
            <button
              className="pc-button pc-button--small !bg-slate-100 hover:!bg-slate-200 !text-slate-700 flex items-center gap-1"
              disabled={busy}
              onClick={() => setExamVisit(v)}
            >
              🩺 Xem bệnh án
            </button>
          )}
          {!reception && working && (
            <button className="pc-button pc-button--small" disabled={busy} onClick={() => act(v, 'complete')}>
              Hoàn tất dịch vụ
            </button>
          )}
        </div>
      </article>;
    })}
    {assignment && <AssignVisitDialog visit={assignment} token={token} onClose={() => setAssignment(null)}
      onSaved={message => { setAssignment(null); setActionError(''); setFeedback(message); refresh(); }} />}
    {walkIn && <WalkIn token={token} onClose={() => setWalkIn(false)} onSaved={() => {
      setWalkIn(false); setDate(clinicDate()); setView('all'); setFeedback('Đã tiếp đón khách tại quầy.'); setActionError(''); refresh();
    }} />}
    {!reception && examVisit && <MedicalExamDialog visit={examVisit} token={token} onClose={() => setExamVisit(null)}
      onSaved={message => { setExamVisit(null); setActionError(''); setFeedback(message); refresh(); }} />}
  </section>;
}
