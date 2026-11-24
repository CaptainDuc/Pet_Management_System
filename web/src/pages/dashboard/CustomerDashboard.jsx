import React, { useEffect, useState } from 'react';
import { PawPrint, Plus, CalendarDays, ArrowRight, ArrowUpRight, Clock3, Phone, AlertCircle, Check, Pencil, RefreshCw } from 'lucide-react';
import { clinicApi } from '../../api/clinic';
import { Modal } from '../../design-system/components';
import BookingWizard, { formatMoney, formatTime, localDate } from '../../components/BookingWizard';
import VietQrPaymentModal from '../../components/VietQrPaymentModal';
import RescheduleDialog from '../../components/RescheduleDialog';
import CustomerExtras from './CustomerExtras';
import PhotoInput from '../../components/PhotoInput';

const emptyPet = { name: '', species: 'Chó', gender: 'Đực', dateOfBirth: '', weight: '', photoUrl: '', notes: '' };
const statuses = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' };

function Status({ booking }) {
  return <span className={`pc-status ${['CONFIRMED', 'COMPLETED'].includes(booking.status) ? 'pc-status--ok' : booking.status === 'CANCELLED' ? 'pc-status--cancel' : ''}`}>{booking.status === 'CONFIRMED' && <Check size={13} />}{statuses[booking.status] || booking.status}</span>;
}

export default function CustomerDashboard({ user, token, activeTab, setActiveTab }) {
  const [pets, setPets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);
  const [petEditor, setPetEditor] = useState(null);
  const [petDraft, setPetDraft] = useState(emptyPet);
  const [savingPet, setSavingPet] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [petError, setPetError] = useState('');
  const [bookingPet, setBookingPet] = useState(null);
  const [bookingSuggestion, setBookingSuggestion] = useState(null);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [moveBooking, setMoveBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reportBooking, setReportBooking] = useState(null);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.allSettled([clinicApi.listPets(token), clinicApi.listBookings(token), clinicApi.listServices(token)])
      .then(results => {
        if (!alive) return;
        [setPets, setBookings, setServices].forEach((setter, index) => {
          if (results[index].status === 'fulfilled') setter(results[index].value?.content || []);
        });
        const failed = results.find(result => result.status === 'rejected');
        if (failed) setError(failed.reason.message || 'Chưa tải được dữ liệu. Bạn vui lòng thử lại.');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [token, reload]);

  useEffect(() => {
    if (activeTab !== 'bookings') return;
    let active = true;
    async function refreshBookings() {
      try {
        const result = await clinicApi.listBookings(token);
        if (active) setBookings(result.content);
      } catch (err) { if (active) setError(err.message); }
    }
    const timer = setInterval(refreshBookings, 10000);
    window.addEventListener('focus', refreshBookings);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refreshBookings); };
  }, [activeTab, token]);

  const upcoming = bookings.filter(booking => !['CANCELLED', 'COMPLETED'].includes(booking.status)
    && booking.items?.[0]?.startTime && new Date(booking.items[0].startTime) >= new Date())
    .sort((a, b) => new Date(a.items[0].startTime) - new Date(b.items[0].startTime));
  const next = upcoming[0];

  function editPet(pet) {
    setPetEditor(pet || {});
    setPetDraft(pet ? { ...emptyPet, ...pet, weight: pet.weight ?? '', dateOfBirth: pet.dateOfBirth || '', photoUrl: pet.photoUrl || '', notes: pet.notes || '' } : emptyPet);
    setPetError('');
  }

  function book(petId, suggestion = null) {
    setSuccess('');
    if (!pets.length) {
      setActiveTab('pets');
      setSuccess('Mình thêm hồ sơ thú cưng trước nhé. Sau đó bạn có thể đặt lịch cho bé.');
      return;
    }
    setBookingSuggestion(suggestion);
    setBookingPet(pets.some(pet => pet.id === petId) ? petId : pets[0].id);
  }

  async function confirmCancellation(event) {
    event.preventDefault();
    if (cancelling) return;
    setCancelling(true);
    setCancelError('');
    try {
      await clinicApi.cancelBooking(cancelBooking.id, cancelReason.trim(), token);
      setCancelBooking(null);
      setSuccess('Đã hủy lịch hẹn.');
      setReload(value => value + 1);
    } catch (err) { setCancelError(err.message); }
    finally { setCancelling(false); }
  }

  async function savePet(event) {
    event.preventDefault();
    if (savingPet || preparingPhoto || !petDraft.name.trim()) return;
    setSavingPet(true);
    setPetError('');
    const payload = {
      name: petDraft.name.trim(), species: petDraft.species, gender: petDraft.gender,
      dateOfBirth: petDraft.dateOfBirth || null, weight: petDraft.weight === '' ? null : Number(petDraft.weight),
      photoUrl: petDraft.photoUrl.trim() || null, notes: petDraft.notes.trim() || null,
      breedId: petEditor.breedId || null,
    };
    try {
      const saved = petEditor.id ? await clinicApi.updatePet(petEditor.id, payload, token) : await clinicApi.createPet(payload, token);
      setPets(current => petEditor.id ? current.map(item => item.id === saved.id ? saved : item) : [saved, ...current]);
      setPetEditor(null);
      setSuccess(`Đã lưu hồ sơ của ${saved.name}.`);
    } catch (err) { setPetError(err.message || 'Chưa thể lưu hồ sơ. Bạn thử lại nhé.'); }
    finally { setSavingPet(false); }
  }

  async function sendReport(event) {
    event.preventDefault();
    if (reporting || !reportText.trim()) return;
    setReporting(true);
    setReportError('');
    try {
      await clinicApi.reportBookingIssue(reportBooking.id, reportText.trim(), token);
      setReportBooking(null);
      setSuccess('Đã gửi nội dung đến phòng khám.');
    } catch (err) { setReportError(err.message); }
    finally { setReporting(false); }
  }

  function petCard(pet) {
    return <article className="pc-pet" key={pet.id}>
      <div className="pc-pet-visual">{pet.photoUrl ? <img key={pet.photoUrl} src={pet.photoUrl} alt={pet.name} onError={event => { event.currentTarget.style.display = 'none'; }} /> : <><PawPrint /><small>Thêm ảnh trong hồ sơ của bé</small></>}</div>
      <div className="pc-pet-body"><h3>{pet.name}</h3><p>{pet.species}{pet.gender ? ` · ${pet.gender}` : ''}</p>
        <div className="pc-pet-details"><span>{pet.dateOfBirth ? `Sinh ${new Date(pet.dateOfBirth + 'T00:00:00').toLocaleDateString('vi-VN')}` : 'Chưa có ngày sinh'}</span><span>{pet.weight ? `${Number(pet.weight)} kg` : 'Chưa có cân nặng'}</span></div>
        <div className="pc-pet-actions"><button className="pc-text-button" onClick={() => editPet(pet)}>Xem hồ sơ<ArrowUpRight size={15} /></button><button className="pc-button pc-button--soft pc-button--small" onClick={() => book(pet.id)}><CalendarDays />Đặt lịch</button></div>
      </div>
    </article>;
  }

  return <>
    {['loyalty', 'ai-chat'].includes(activeTab) ? <CustomerExtras user={user} token={token} activeTab={activeTab} onBookingSuggestion={suggestion => book(suggestion.petId, suggestion)} /> : <>
    <div className="pc-heading"><div><h1>{activeTab === 'overview' ? `Chào ${user?.fullName?.split(' ').slice(-1)[0] || 'bạn'}, hôm nay bé thế nào?` : activeTab === 'pets' ? 'Những người bạn nhỏ của bạn' : 'Lịch hẹn của bé'}</h1><p>{activeTab === 'overview' ? 'Một chút quan tâm mỗi ngày, thêm nhiều niềm vui bên nhau.' : activeTab === 'pets' ? 'Lưu giữ những điều nhỏ, để chăm sóc bé tốt hơn mỗi ngày.' : 'Những buổi hẹn chăm sóc, được sắp xếp thật nhẹ nhàng.'}</p></div><button className="pc-button" disabled={loading} onClick={() => activeTab === 'pets' ? editPet(null) : book()}>{activeTab === 'pets' ? <><Plus />Thêm thú cưng</> : <><CalendarDays />Đặt lịch cho bé</>}</button></div>
    {error && <div className="pc-notice" role="alert"><AlertCircle size={18} /><span>{error}</span><button className="pc-text-button" onClick={() => setReload(value => value + 1)}><RefreshCw size={16} />Thử lại</button></div>}
    {success && <div className="pc-notice pc-notice--success" role="status"><Check size={18} />{success}</div>}
    {loading ? <div className="pc-empty" role="status"><RefreshCw /><p>Đang chuẩn bị không gian của bạn...</p></div> : <>
      {['overview', 'pets'].includes(activeTab) && <div className={activeTab === 'overview' ? 'pc-workspace' : ''}>
        <section><div className="pc-section-title"><h2>Thú cưng của tôi <span className="pc-count">({pets.length})</span></h2>{activeTab === 'overview' && <button className="pc-text-button" onClick={() => setActiveTab('pets')}>Xem tất cả<ArrowRight size={15} /></button>}</div>
          {pets.length === 0 ? <div className="pc-empty"><PawPrint /><h3>Chào đón người bạn nhỏ đầu tiên</h3><p>Thêm hồ sơ để lưu thông tin và đặt những buổi hẹn chăm sóc cho bé.</p><button className="pc-button pc-button--soft" onClick={() => editPet(null)}><Plus />Thêm thú cưng</button></div> : <div className="pc-pet-grid">{(activeTab === 'overview' ? pets.slice(0, 4) : pets).map(petCard)}<button className="pc-add-pet" onClick={() => editPet(null)}><span><Plus size={23} /></span><strong>Thêm một người bạn nhỏ</strong><span className="!bg-transparent !w-auto !h-auto">Tạo hồ sơ mới cho bé</span></button></div>}
        </section>
        {activeTab === 'overview' && <aside className="pc-overview-aside" aria-label="Lịch hẹn sắp tới và hỗ trợ">
          <section className="pc-panel pc-next"><h2>Buổi hẹn sắp tới</h2>{next ? <><Status booking={next} /><div className="pc-date"><CalendarDays size={19} />{new Date(next.items[0].startTime).toLocaleDateString('vi-VN')} · {formatTime(next.items[0].startTime)}</div><h3>{pets.find(pet => pet.id === next.petId)?.name || 'Thú cưng của bạn'}</h3><p className="pc-muted">{next.items.map(item => item.serviceName).join(', ')}</p><button className="pc-text-button" onClick={() => setActiveTab('bookings')}>Chi tiết lịch hẹn<ArrowRight size={15} /></button></> : <><CalendarDays size={30} color="#6c9dc2" /><p className="pc-muted mt-4">{error ? 'Chưa tải được lịch hẹn. Vui lòng thử lại.' : 'Chưa có buổi hẹn nào sắp tới. Chọn một ngày phù hợp, phần còn lại để Pet Service chăm lo.'}</p><button className="pc-text-button" onClick={() => book()}>Tìm một buổi hẹn<ArrowRight size={15} /></button></>}</section>
          <section className="pc-panel pc-help"><h3>Luôn sẵn lòng giúp bạn.</h3><p>Bạn cần tư vấn dịch vụ hoặc chọn giờ hẹn? Gọi để phòng khám hỗ trợ nhé.</p><a href="tel:0898520760" className="pc-text-button"><Phone size={16} />0898 520 760<ArrowUpRight size={15} /></a></section>
        </aside>}
      </div>}
      {activeTab === 'bookings' && <div className="pc-booking-list">{bookings.length === 0 ? <div className="pc-empty"><CalendarDays /><h3>Buổi hẹn đầu tiên đang chờ bé</h3><p>Chọn dịch vụ và thời gian phù hợp. Phòng khám sẽ xác nhận lịch hẹn của bạn.</p><button className="pc-button pc-button--soft" onClick={() => book()}>Đặt lịch đầu tiên<ArrowRight /></button></div> : bookings.map(booking => {
        const first = booking.items?.[0];
        const start = first?.startTime ? new Date(first.startTime) : null;
        return <article className="pc-booking" key={booking.id}>
          <div className="pc-booking-date">{start ? start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'Chưa có ngày'}<strong>{start ? formatTime(start) : '—'}</strong></div>
          <div className="pc-booking-info"><h3>{pets.find(pet => pet.id === booking.petId)?.name || 'Thú cưng'} · {booking.items?.map(item => item.serviceName).join(', ')}</h3><p>Mã hẹn BK-{String(booking.id).slice(0, 8).toUpperCase()}</p>{booking.items?.length > 0 && <ul>{booking.items.map(item => <li key={item.id}>{item.serviceName} · {item.startTime ? new Date(item.startTime).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa có giờ'}{item.staffName ? ' · Phụ trách: ' + item.staffName :
            booking.status !== 'CANCELLED' && ' · Chờ phân công'}{item.preferredStaffName && ' · Mong muốn: ' + item.preferredStaffName}</li>)}</ul>}<Status booking={booking} />{booking.staffNote && <p className="mt-2">Phòng khám: {booking.staffNote}</p>}<button className="pc-text-button ml-3" onClick={() => { setReportBooking(booking); setReportText(''); setReportError(''); }}>Trao đổi về lịch hẹn</button></div>
          <div className="pc-booking-end"><strong>{formatMoney(booking.totalAmount)}</strong>{Number(booking.discountAmount) > 0 && <small className="pc-muted">Đã giảm {formatMoney(booking.discountAmount)}{booking.promotionCode ? ` · ${booking.promotionCode}` : ''}</small>}{booking.paymentStatus === 'PAID' ? <span className="pc-status pc-status--ok"><Check size={13} />Đã thanh toán</span> : booking.status !== 'CANCELLED' && <button className="pc-button pc-button--soft pc-button--small" onClick={() => setPaymentBooking({ ...booking, rawAmount: Number(booking.totalAmount), petName: pets.find(pet => pet.id === booking.petId)?.name, code: `BK-${String(booking.id).slice(0, 8).toUpperCase()}` })}>Thanh toán</button>}{['PENDING', 'CONFIRMED'].includes(booking.status) && booking.items?.some(i => new Date(i.startTime) > new Date()) && <button className="pc-text-button" onClick={() => setMoveBooking(booking)}>Đổi lịch hẹn</button>}{['PENDING', 'CONFIRMED'].includes(booking.status) && booking.paymentStatus !== 'PAID' && <button className="pc-text-button" onClick={() => { setCancelBooking(booking); setCancelReason(''); setCancelError(''); }}>Hủy lịch hẹn</button>}</div>
        </article>;
      })}</div>}
    </>}
    </>}

    <Modal isOpen={Boolean(petEditor)} onClose={savingPet || preparingPhoto ? undefined : () => setPetEditor(null)} title={petEditor?.id ? `Hồ sơ của ${petEditor.name}` : 'Thêm một người bạn nhỏ'} size="lg" className="pc-light pc-dialog">
      <form className="pc-form" onSubmit={savePet}>
        {petError && <div className="pc-notice" role="alert">{petError}</div>}
        <label className="pc-field">Tên của bé<input name="petName" required maxLength={100} value={petDraft.name} placeholder="Ví dụ: Bông, Milo..." onChange={event => setPetDraft({ ...petDraft, name: event.target.value })} /></label>
        <div className="pc-form-grid"><label className="pc-field">Loài<select name="petSpecies" value={petDraft.species} onChange={event => setPetDraft({ ...petDraft, species: event.target.value })}>{[...new Set(['Chó', 'Mèo', 'Chim', 'Thỏ / Hamster', petDraft.species])].map(value => <option key={value}>{value}</option>)}</select></label><label className="pc-field">Giới tính<select name="petGender" value={petDraft.gender || ''} onChange={event => setPetDraft({ ...petDraft, gender: event.target.value })}><option value="">Chưa cập nhật</option>{[...new Set(['Đực', 'Cái', petDraft.gender].filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label></div>
        <div className="pc-form-grid"><label className="pc-field">Ngày sinh<input name="petBirthday" type="date" max={localDate()} value={petDraft.dateOfBirth} onChange={event => setPetDraft({ ...petDraft, dateOfBirth: event.target.value })} /></label><label className="pc-field">Cân nặng (kg)<input name="petWeight" type="number" min="0.01" step="0.01" placeholder="Ví dụ: 4.5" value={petDraft.weight} onChange={event => setPetDraft({ ...petDraft, weight: event.target.value })} /></label></div>
        <PhotoInput label="Ảnh của bé" emptyLabel="Kéo ảnh của bé vào đây" name="petPhoto" value={petDraft.photoUrl} onChange={photoUrl => setPetDraft(current => ({ ...current, photoUrl }))} disabled={savingPet} onBusyChange={setPreparingPhoto} />
        <label className="pc-field">Giống, dị ứng và điều cần lưu ý<textarea name="petNotes" maxLength={2000} value={petDraft.notes} onChange={event => setPetDraft({ ...petDraft, notes: event.target.value })} placeholder="Giống Poodle, dị ứng hải sản, thói quen chăm sóc..." /></label>
        <div className="pc-form-actions"><button type="button" className="pc-button pc-button--line" disabled={savingPet || preparingPhoto} onClick={() => setPetEditor(null)}>Để sau</button><button type="submit" className="pc-button" disabled={savingPet || preparingPhoto}>{savingPet ? 'Đang lưu...' : preparingPhoto ? 'Đang chuẩn bị ảnh...' : <><Check />Lưu hồ sơ</>}</button></div>
      </form>
    </Modal>
    {bookingPet && <BookingWizard pets={pets} services={services} initialPetId={bookingPet} suggestion={bookingSuggestion} token={token} onClose={() => setBookingPet(null)} onBooked={() => { setBookingPet(null); setActiveTab('bookings'); setSuccess('Đã giữ giờ hẹn cho bé. Phòng khám sẽ thông báo khi có người phụ trách.'); setReload(value => value + 1); }} />}
    {moveBooking && <RescheduleDialog booking={moveBooking} token={token} onClose={() => setMoveBooking(null)} onSaved={() => {
      setMoveBooking(null); setSuccess('Đã cập nhật lịch hẹn.'); setReload(n => n + 1);
    }} />}
    <VietQrPaymentModal open={Boolean(paymentBooking)} booking={paymentBooking} onClose={() => setPaymentBooking(null)} onPaid={() => { setPaymentBooking(null); setReload(value => value + 1); }} />
    <Modal isOpen={Boolean(cancelBooking)} onClose={cancelling ? undefined : () => setCancelBooking(null)} title="Hủy lịch hẹn này?" className="pc-light pc-dialog"><form className="pc-form" onSubmit={confirmCancellation}><p className="pc-muted">Giờ hẹn sẽ được trả lại cho phòng khám. Bạn có thể đặt một buổi khác khi thuận tiện.</p>{cancelError && <p className="pc-notice" role="alert">{cancelError}</p>}<label className="pc-field">Lý do hủy<textarea maxLength={1000} value={cancelReason} onChange={event => setCancelReason(event.target.value)} placeholder="Bạn có thể cho phòng khám biết lý do..." /></label><div className="pc-form-actions"><button type="button" className="pc-button pc-button--line" disabled={cancelling} onClick={() => setCancelBooking(null)}>Giữ lịch hẹn</button><button className="pc-button" disabled={cancelling}>{cancelling ? 'Đang hủy...' : 'Xác nhận hủy lịch'}</button></div></form></Modal>
    <Modal isOpen={Boolean(reportBooking)} onClose={reporting ? undefined : () => setReportBooking(null)} title="Trao đổi với phòng khám" className="pc-light pc-dialog"><form className="pc-form" onSubmit={sendReport}>{reportError && <p className="pc-notice" role="alert">{reportError}</p>}<label className="pc-field">Nội dung cần hỗ trợ<textarea required maxLength={2000} value={reportText} onChange={event => setReportText(event.target.value)} /></label><div className="pc-form-actions"><button className="pc-button" disabled={reporting}>{reporting ? 'Đang gửi...' : 'Gửi nội dung'}</button></div></form></Modal>
  </>;
}
