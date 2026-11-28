import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';
import { Modal } from '../design-system/components';
import AssignVisitDialog from './AssignVisitDialog';
import BookingWizard from './BookingWizard';
import MedicalExamDialog from './MedicalExamDialog';
import StaffAppointmentDetail from './StaffAppointmentDetail';

const zone = 'Asia/Ho_Chi_Minh';
const clinicDate = () => new Intl.DateTimeFormat('sv-SE', { timeZone: zone }).format(new Date());
const clinicDateOf = value => new Intl.DateTimeFormat('sv-SE', { timeZone: zone }).format(new Date(value));
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

export default function ClinicVisitQueue({ token, reception = false, onCashier }) {
  const [date, setDate] = useState(clinicDate);
  const mine = !reception;
  const pendingAssignments = false;
  const [assignment, setAssignment] = useState(null);
  const [examVisit, setExamVisit] = useState(null);
  const [visits, setVisits] = useState([]);
  const [futurePending, setFuturePending] = useState([]);
  const [search, setSearch] = useState('');
  const [detailBookingId, setDetailBookingId] = useState(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupText, setLookupText] = useState('');
  const [lookupRows, setLookupRows] = useState([]);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
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
        const [todayResult, futureResult] = await Promise.allSettled([
          clinicApi.visitQueue(date, mine, token),
          reception ? clinicApi.pendingAssignments(token) : Promise.resolve([]),
        ]);
        if (todayResult.status === 'rejected') throw todayResult.reason;
        if (active) {
          setVisits([...todayResult.value].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)));
          setFuturePending(futureResult.status === 'fulfilled' ? futureResult.value.filter(row => clinicDateOf(row.startTime) > date) : []);
          setError('');
        }
      } catch (err) {
        if (active) { setVisits([]); setFuturePending([]); setError(err.message); }
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
      return true;
    } catch (err) { setActionError(err.message); return false; }
    finally { setBusy(false); refresh(); }
  }

  async function findCustomer(event) {
    event.preventDefault();
    if (!lookupText.trim()) return;
    setLookupBusy(true); setLookupError('');
    try { setLookupRows(await clinicApi.clients(lookupText.trim(), token)); }
    catch (err) { setLookupError(err.message || 'Không tìm được khách hàng.'); }
    finally { setLookupBusy(false); }
  }

  if (reception) {
    const matching = visits.filter(row => `${row.customerName} ${row.petName} ${row.serviceName}`
      .toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
    const groups = [
      { title: 'Sắp đến', rows: matching.filter(row => !row.checkedInAt && !['IN_PROGRESS', 'COMPLETED'].includes(row.status)) },
      { title: 'Đã đến · Chờ tiếp nhận', rows: matching.filter(row => row.checkedInAt && !['IN_PROGRESS', 'COMPLETED'].includes(row.status)) },
      { title: 'Đang khám', rows: matching.filter(row => row.status === 'IN_PROGRESS') },
      { title: 'Hoàn tất', rows: matching.filter(row => row.status === 'COMPLETED') },
    ];
    const visitRow = row => <article key={row.itemId} className="rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
      <div><strong>{time.format(new Date(row.startTime))} · {row.customerName} · {row.petName}</strong>
        <p>{row.serviceName} · Bác sĩ: {row.staffName || 'Chờ phân công'}</p>
        {row.preferredStaffName && !row.staffName && <p className="pc-muted">Khách mong muốn: {row.preferredStaffName}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!row.staffName && !['IN_PROGRESS', 'COMPLETED'].includes(row.status) && <button className="pc-button pc-button--small" disabled={busy} onClick={() => setAssignment(row)}>Phân công</button>}
        {row.staffName && !row.checkedInAt && ['PENDING', 'CONFIRMED'].includes(row.status) && <button className="pc-button pc-button--small" disabled={busy || clinicDateOf(row.startTime) !== clinicDate()} onClick={() => act(row, 'check-in')}>Xác nhận đã đến</button>}
        <button className="pc-text-button" onClick={() => setDetailBookingId(row.bookingId)}>Chi tiết</button>
        <button className="pc-text-button" onClick={() => onCashier(row.bookingId)}>Thu ngân</button>
      </div>
    </article>;
    return <section className="pc-light pc-panel space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Bàn tiếp đón</h2><p className="pc-muted">Lịch trong ngày, sắp theo giờ hẹn.</p></div><div className="flex flex-wrap gap-2"><button className="pc-button pc-button--soft" onClick={() => setLookupOpen(true)}>Tra khách hàng</button><button className="pc-button" onClick={() => setWalkIn(true)}>Tiếp đón khách vãng lai</button></div></div>
      <div className="flex flex-wrap items-end gap-3"><label className="pc-field">Ngày hẹn<input type="date" required value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label><label className="pc-field">Tìm chủ nuôi, thú cưng hoặc dịch vụ<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nhập tên để lọc lịch" /></label><button className="pc-text-button" disabled={loading || busy} onClick={refresh}>Làm mới</button></div>
      {feedback && <p role="status">{feedback}</p>}
      {(error || actionError) && <p className="pc-notice" role="alert">{error || actionError}</p>}
      {loading && <p role="status">Đang tải lịch hẹn…</p>}
      {!loading && !error && groups.map(group => <section key={group.title} className="space-y-2"><h3 className="pc-section-title">{group.title} <span className="pc-count">({group.rows.length})</span></h3>{group.rows.length ? group.rows.map(visitRow) : <p className="pc-muted">Chưa có lịch trong nhóm này.</p>}</section>)}
      {!loading && !error && futurePending.length > 0 && <section className="space-y-2"><h3 className="pc-section-title">Sắp tới cần phân công <span className="pc-count">({futurePending.length})</span></h3>{futurePending.map(row => <article key={row.itemId} className="rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3"><div><strong>{new Date(row.startTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: zone })} · {row.customerName} · {row.petName}</strong><p>{row.serviceName} · Mong muốn: {row.preferredStaffName || 'Phòng khám sắp xếp'}</p></div><button className="pc-button pc-button--small" disabled={busy} onClick={() => setAssignment(row)}>Phân công</button></article>)}</section>}
      {assignment && <AssignVisitDialog visit={assignment} token={token} onClose={() => setAssignment(null)} onSaved={message => { setAssignment(null); setFeedback(message); refresh(); }} />}
      {walkIn && <WalkIn token={token} onClose={() => setWalkIn(false)} onSaved={() => { setWalkIn(false); setDate(clinicDate()); setFeedback('Đã tiếp đón khách tại quầy.'); refresh(); }} />}
      {detailBookingId && <StaffAppointmentDetail bookingId={detailBookingId} token={token} onClose={() => setDetailBookingId(null)} onCashier={id => { setDetailBookingId(null); onCashier(id); }} />}
      <Modal isOpen={lookupOpen} onClose={() => setLookupOpen(false)} title="Tra cứu khách hàng" size="lg" className="pc-light pc-dialog"><div className="pc-form"><form className="pc-form" onSubmit={findCustomer}><label className="pc-field">Tên chủ nuôi, số điện thoại hoặc tên thú cưng<input value={lookupText} onChange={event => setLookupText(event.target.value)} placeholder="Nhập thông tin cần tìm" required /></label><button className="pc-button" disabled={lookupBusy}>{lookupBusy ? 'Đang tìm…' : 'Tìm khách hàng'}</button></form>{lookupError && <p className="pc-notice" role="alert">{lookupError}</p>}{!lookupBusy && lookupText && !lookupError && !lookupRows.length && <p className="pc-muted">Chưa có kết quả. Nhập thông tin và nhấn tìm.</p>}{lookupRows.map(client => <article key={client.id} className="rounded-xl border border-slate-200 p-4"><strong>{client.fullName}</strong><p>{[client.phone, client.email].filter(Boolean).join(' · ')}</p><p className="pc-muted">Thú cưng: {client.pets || 'Chưa có hồ sơ'}</p></article>)}</div></Modal>
    </section>;
  }

  return <section className="pc-light pc-panel space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2>{reception ? 'Hàng đợi tiếp đón' : 'Lịch khám của tôi'}</h2>
      {reception && <button className="pc-button" onClick={() => setWalkIn(true)}>Tiếp đón khách vãng lai</button>}
    </div>
    <div className="flex flex-wrap items-end gap-3">
      {!pendingAssignments && <label className="pc-field">Ngày hẹn<input type="date" required value={date} disabled={busy}
        onChange={e => { if (e.target.value) { setDate(e.target.value); setFeedback(''); setActionError(''); } }} /></label>}
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

          {/* Tác vụ lâm sàng dành riêng cho Bác sĩ thú y */}
          {!reception && v.checkedInAt && !working && !done && (
            <button
              className="pc-button pc-button--small"
              disabled={busy || !due}
              onClick={async () => {
                if (await act(v, 'start')) setExamVisit({ ...v, status: 'IN_PROGRESS' });
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
              Vào khám & ghi bệnh án
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
      setWalkIn(false); setDate(clinicDate()); setFeedback('Đã tiếp đón khách tại quầy.'); setActionError(''); refresh();
    }} />}
    {!reception && examVisit && <MedicalExamDialog visit={examVisit} token={token} onClose={() => setExamVisit(null)}
      onSaved={message => { setExamVisit(null); setActionError(''); setFeedback(message); refresh(); }} />}
  </section>;
}
