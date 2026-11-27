import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CalendarDays, AlertCircle, RefreshCw, UserCheck, Stethoscope } from 'lucide-react';
import { Modal } from '../design-system/components';
import { clinicApi } from '../api/clinic';

export const formatMoney = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const formatTime = value => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function BookingWizard({ pets, services, initialPetId, suggestion, token, onClose, onBooked, walkInCustomerId, visitDate }) {
  const [step, setStep] = useState(0);
  const [petId, setPetId] = useState(initialPetId || pets[0]?.id || '');
  const [serviceId, setServiceId] = useState(services.some(item => item.id === suggestion?.serviceId) ? suggestion.serviceId : '');
  const [date, setDate] = useState(visitDate || (/^\d{4}-\d{2}-\d{2}$/.test(suggestion?.date || '') && suggestion.date >= localDate() ? suggestion.date : localDate()));
  const [slots, setSlots] = useState([]);
  const [preference, setPreference] = useState('');
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(suggestion?.note || '');
  const [code, setCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const service = services.find(item => item.id === serviceId);
  const sameTime = (a, b) => a && b && a.startTime === b.startTime && a.branchId === b.branchId;
  const doctors = slot ? slots.filter(s => sameTime(s, slot)) : [];
  const times = walkInCustomerId ? slots : [...new Map(slots.map(s => [`${s.branchId || ''}/${s.startTime}`, s])).values()]
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const pet = pets.find(item => item.id === petId);
  const discount = promotion?.checkedCode === code.trim() && promotion.checkedServiceId === serviceId && promotion.valid ? promotion : null;

  // Load available time slots when date/service changes
  useEffect(() => {
    setSlot(null);
    setPreference('');
    setAvailableDoctors([]);
    if (!serviceId || !date) return;
    let alive = true;
    setLoading(true);
    clinicApi.availableSlots({ date, serviceId }, token).then(data => {
      if (alive) setSlots((data?.staff || []).flatMap(group => (group.slots || [])
        .filter(item => item.available && new Date(item.startTime) > new Date())
        .map(item => ({ ...item, staffId: group.staffId, staffName: group.staffName, branchId: group.branchId, branchName: group.branchName }))));
    }).catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [date, serviceId, token, retry]);

  // Load available doctors when slot is selected
  useEffect(() => {
    setAvailableDoctors([]);
    setPreference('');
    if (!slot || !serviceId) return;
    let alive = true;
    setDoctorsLoading(true);
    const slotStart = new Date(slot.startTime).toISOString();
    const slotEnd = new Date(slot.endTime).toISOString();
    clinicApi.availableDoctors({ date, slotStart, slotEnd, serviceId, branchId: slot.branchId }, token).then(data => {
      if (alive) setAvailableDoctors(data || []);
    }).catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setDoctorsLoading(false); });
    return () => { alive = false; };
  }, [slot?.startTime, slot?.endTime, slot?.branchId, serviceId, date, token]);

  async function applyPromotion() {
    if (!code.trim() || checking) return;
    const checkedCode = code.trim();
    setChecking(true);
    setError('');
    try {
      const result = await clinicApi.validatePromotion(checkedCode, Number(service.basePrice), token);
      setPromotion({ ...result, checkedCode, checkedServiceId: serviceId });
    } catch (err) { setError(err.message); }
    finally { setChecking(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (saving || checking) return;
    if (step < 2) { setError(''); setStep(step + 1); return; }
    if (!pet || !service || !slot || (code.trim() && !discount)) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        petId, branchId: slot.branchId || null, notes: notes.trim() || null, promotionCode: code.trim() || null,
        items: [{ serviceId, timeSlotId: slot.slotId, ...(walkInCustomerId
          ? { staffId: slot.staffId } : { preferredStaffId: preference || null }) }],
      };
      const booking = walkInCustomerId ? await clinicApi.walkIn(walkInCustomerId, payload, token)
        : await clinicApi.createBooking(payload, token);
      onBooked(booking);
    } catch (err) {
      if (err.status === 409) { setStep(1); setSlot(null); setRetry(n => n + 1); }
      setError(err.status === 409 ? 'Khung giờ vừa được đặt. Vui lòng chọn lại người và giờ còn trống.' : err.message || 'Chưa thể đặt lịch. Vui lòng thử lại.');
    }
    finally { setSaving(false); }
  }

  return <Modal isOpen onClose={saving ? undefined : onClose} title={walkInCustomerId ? "Tiếp nhận khách tại quầy" : "Đặt một buổi hẹn cho bé"} size="lg" className="pc-light pc-dialog">
    <div className="pc-steps" aria-label={`Bước ${step + 1} trên 3`}>
      {['Bé & dịch vụ', 'Ngày & giờ', 'Xác nhận'].map((label, index) => <div className="pc-step" key={label} aria-current={step === index ? 'step' : undefined}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</div>)}
    </div>
    {error && <div className="pc-notice" role="alert"><AlertCircle size={18} />{error}</div>}
    <form onSubmit={submit} className="pc-form">
      {step === 0 && <>
        <label className="pc-field">Bạn muốn đặt lịch cho bé nào?<select name="bookingPet" value={petId} onChange={event => setPetId(event.target.value)} required><option value="">Chọn thú cưng</option>{pets.map(item => <option key={item.id} value={item.id}>{item.name} · {item.species}</option>)}</select></label>
        <div><p className="pc-field mb-3">Chọn dịch vụ</p>{services.length === 0 ? <div className="pc-empty"><CalendarDays /><h3>Chưa có dịch vụ khả dụng</h3><p>Vui lòng thử lại sau hoặc gọi phòng khám để được hỗ trợ.</p></div> : <div className="pc-choice-grid">{services.map(item => <button type="button" className="pc-choice" aria-pressed={serviceId === item.id} key={item.id} onClick={() => { setServiceId(item.id); setPromotion(null); }}><strong>{item.name}</strong><small>{item.durationMinutes} phút · {formatMoney(item.basePrice)}</small></button>)}</div>}</div>
      </>}
      {step === 1 && <>
        <p className="pc-muted">{pet?.name} · {service?.name} · {service?.durationMinutes} phút</p>
        <label className="pc-field">Ngày bạn muốn đến<input type="date" name="bookingDate" disabled={Boolean(walkInCustomerId)} min={localDate()} required value={date} onChange={event => { setError(''); setDate(event.target.value); }} /></label>
        <div><p className="pc-field mb-3">Chọn giờ phù hợp</p>{loading ? <p className="pc-muted" role="status">Đang tìm khung giờ trống...</p> : times.length === 0 ? <div className="pc-empty"><CalendarDays /><h3>Ngày này chưa có giờ trống</h3><p>Bạn thử chọn một ngày khác hoặc gọi phòng khám nhé.</p><button type="button" className="pc-text-button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} />Tải lại khung giờ</button></div> : <div className="pc-slot-grid">{times.map(item => <button type="button" key={item.slotId} className="pc-choice" aria-pressed={walkInCustomerId ? slot?.slotId === item.slotId : Boolean(sameTime(slot, item))} onClick={() => { setPreference(''); setSlot(item); }}>{formatTime(item.startTime)} – {formatTime(item.endTime)}{item.branchName && <small>{item.branchName}</small>}{walkInCustomerId && item.staffName && <small>{item.staffName}</small>}</button>)}</div>}</div>

        {!walkInCustomerId && slot && (
          <div className="mt-4">
            <p className="pc-field mb-3 flex items-center gap-2">
              <Stethoscope size={18} className="text-sky-600" />
              <strong>Chọn bác sĩ khám (cập nhật theo giờ đã chọn)</strong>
            </p>
            {doctorsLoading ? (
              <p className="pc-muted" role="status">Đang tìm bác sĩ khả dụng...</p>
            ) : availableDoctors.length === 0 ? (
              <div className="pc-empty pc-empty--small">
                <UserCheck size={24} className="text-slate-300" />
                <h3 className="text-sm">Không có bác sĩ nào trống vào giờ này</h3>
                <p className="text-xs text-slate-500">Vui lòng chọn khung giờ khác hoặc để phòng khám sắp xếp.</p>
              </div>
            ) : (
              <div className="pc-choice-grid">
                <button
                  type="button"
                  className={`pc-choice ${!preference ? 'ring-2 ring-sky-500' : ''}`}
                  aria-pressed={!preference}
                  onClick={() => setPreference('')}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-bold">🏥</span>
                    <div>
                      <strong>Để phòng khám sắp xếp</strong>
                      <div className="text-xs text-slate-500">Phân công tự động bác sĩ còn trống</div>
                    </div>
                  </div>
                </button>
                {availableDoctors.filter(doc => doctors.some(item => item.staffId === doc.staffId && item.endTime === slot.endTime)).map(doc => (
                  <button
                    key={doc.staffId}
                    type="button"
                    className={`pc-choice ${preference === doc.staffId ? 'ring-2 ring-sky-500' : ''}`}
                    aria-pressed={preference === doc.staffId}
                    onClick={() => {
                      const doctorSlot = doctors.find(item => item.staffId === doc.staffId && item.endTime === slot.endTime);
                      if (doctorSlot) { setSlot(doctorSlot); setPreference(doc.staffId); }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                        <UserCheck size={14} />
                      </span>
                      <div>
                        <strong>{doc.staffName}</strong>
                        {doc.branchName && <div className="text-xs text-slate-500">{doc.branchName}</div>}
                        <div className="text-xs text-slate-400">Ca: {formatTime(`${date}T${doc.shiftStart}:00`)} – {formatTime(`${date}T${doc.shiftEnd}:00`)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </>}
      {step === 2 && <>
        <dl className="pc-summary">
          <div><dt>Thú cưng</dt><dd>{pet?.name}</dd></div><div><dt>Dịch vụ</dt><dd>{service?.name}</dd></div>
          <div><dt>Buổi hẹn</dt><dd>{slot && new Date(slot.startTime).toLocaleDateString('vi-VN')} · {slot && formatTime(slot.startTime)}</dd></div>
          {slot?.branchName && <div><dt>Chi nhánh</dt><dd>{slot.branchName}</dd></div>}
          {!walkInCustomerId && <div><dt>Bác sĩ mong muốn</dt><dd>{preference ? slot?.staffName : 'Để phòng khám sắp xếp'}</dd></div>}
          <div><dt>Thời lượng</dt><dd>{service?.durationMinutes} phút</dd></div><div><dt>Giá dịch vụ</dt><dd>{formatMoney(service?.basePrice)}</dd></div>
          {discount && <div><dt>Ưu đãi</dt><dd>−{formatMoney(discount.discountAmount)}</dd></div>}
          <div className="pc-summary-total"><dt>Tổng tạm tính</dt><dd>{formatMoney(discount ? discount.finalAmount : service?.basePrice)}</dd></div>
        </dl>
        <div className="pc-promo"><label className="pc-field">Mã ưu đãi (nếu có)<input name="promotionCode" placeholder="Nhập mã của bạn" value={code} onChange={event => { setCode(event.target.value); setPromotion(null); }} /></label><button type="button" className="pc-button pc-button--soft" disabled={checking || !code.trim()} onClick={applyPromotion}>{checking ? 'Đang kiểm tra...' : 'Áp dụng'}</button></div>
        {promotion?.checkedCode === code.trim() && promotion.checkedServiceId === serviceId && <p className="pc-muted" role="status">{promotion.valid ? 'Mã ưu đãi đã được áp dụng.' : promotion.message || promotion.reason || 'Mã ưu đãi không khả dụng.'}</p>}
        {code.trim() && !checking && !discount && <p className="pc-muted">Hãy áp dụng mã ưu đãi trước khi xác nhận, hoặc xóa mã để tiếp tục.</p>}
        <label className="pc-field">Điều gì bạn muốn phòng khám lưu ý?<textarea name="bookingNotes" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Thói quen, dị ứng hoặc yêu cầu chăm sóc của bé..." /></label>
        <p className="pc-muted">{walkInCustomerId ? 'Khách sẽ được ghi nhận đã đến và xuất hiện trong lịch của nhân viên phụ trách.' : preference ? 'Lễ tân sẽ ưu tiên bác sĩ bạn chọn. Nếu bác sĩ bận, lễ tân sẽ chọn bác sĩ khác cùng giờ và thông báo cho bạn.' : 'Lễ tân sẽ chọn bác sĩ còn trống và thông báo cho bạn sau khi phân công.'}</p>
      </>}
      <div className="pc-form-actions">
        <button type="button" className="pc-button pc-button--line" disabled={saving} onClick={step ? () => setStep(step - 1) : onClose}>{step ? <><ArrowLeft />Quay lại</> : 'Để sau'}</button>
        <button className="pc-button" type="submit" disabled={saving || checking || (step === 0 && (!pet || !service)) || (step === 1 && (!slot || loading)) || (step === 2 && Boolean(code.trim() && !discount))}>{saving ? 'Đang đặt lịch...' : step === 2 ? <><Check />Xác nhận đặt lịch</> : <>Tiếp tục<ArrowRight /></>}</button>
      </div>
    </form>
  </Modal>;
}
