import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CalendarDays, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../design-system/components';
import { clinicApi } from '../api/clinic';

export const formatMoney = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const formatTime = value => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function BookingWizard({ pets, services, initialPetId, token, onClose, onBooked }) {
  const [step, setStep] = useState(0);
  const [petId, setPetId] = useState(initialPetId || pets[0]?.id || '');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(localDate());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const service = services.find(item => item.id === serviceId);
  const pet = pets.find(item => item.id === petId);
  const discount = promotion?.checkedCode === code.trim() && promotion.checkedServiceId === serviceId && promotion.valid ? promotion : null;

  useEffect(() => {
    setSlot(null);
    setSlots([]);
    setError('');
    if (!serviceId || !date) return;
    let alive = true;
    setLoading(true);
    clinicApi.availableSlots({ date, serviceId }, token).then(data => {
      if (alive) setSlots((data?.staff || []).flatMap(group => (group.slots || [])
        .filter(item => item.available && new Date(item.startTime) > new Date())
        .map(item => ({ ...item, staffId: group.staffId }))));
    }).catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [date, serviceId, token, retry]);

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
      const booking = await clinicApi.createBooking({
        petId, notes: notes.trim() || null, promotionCode: code.trim() || null,
        items: [{ serviceId, timeSlotId: slot.slotId, staffId: slot.staffId }],
      }, token);
      onBooked(booking);
    } catch (err) { setError(err.message || 'Chưa thể đặt lịch. Vui lòng chọn lại giờ trống và thử lại.'); }
    finally { setSaving(false); }
  }

  return <Modal isOpen onClose={saving ? undefined : onClose} title="Đặt một buổi hẹn cho bé" size="lg" className="pc-light pc-dialog">
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
        <label className="pc-field">Ngày bạn muốn đến<input type="date" name="bookingDate" min={localDate()} required value={date} onChange={event => setDate(event.target.value)} /></label>
        <div><p className="pc-field mb-3">Chọn giờ phù hợp</p>{loading ? <p className="pc-muted" role="status">Đang tìm khung giờ trống...</p> : slots.length === 0 ? <div className="pc-empty"><CalendarDays /><h3>Ngày này chưa có giờ trống</h3><p>Bạn thử chọn một ngày khác hoặc gọi phòng khám nhé.</p><button type="button" className="pc-text-button" onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} />Tải lại khung giờ</button></div> : <div className="pc-slot-grid">{slots.map(item => <button type="button" key={item.slotId} className="pc-choice" aria-pressed={slot?.slotId === item.slotId} onClick={() => setSlot(item)}>{formatTime(item.startTime)} – {formatTime(item.endTime)}</button>)}</div>}</div>
      </>}
      {step === 2 && <>
        <dl className="pc-summary">
          <div><dt>Thú cưng</dt><dd>{pet?.name}</dd></div><div><dt>Dịch vụ</dt><dd>{service?.name}</dd></div>
          <div><dt>Buổi hẹn</dt><dd>{slot && new Date(slot.startTime).toLocaleDateString('vi-VN')} · {slot && formatTime(slot.startTime)}</dd></div>
          <div><dt>Thời lượng</dt><dd>{service?.durationMinutes} phút</dd></div><div><dt>Giá dịch vụ</dt><dd>{formatMoney(service?.basePrice)}</dd></div>
          {discount && <div><dt>Ưu đãi</dt><dd>−{formatMoney(discount.discountAmount)}</dd></div>}
          <div className="pc-summary-total"><dt>Tổng tạm tính</dt><dd>{formatMoney(discount ? discount.finalAmount : service?.basePrice)}</dd></div>
        </dl>
        <div className="pc-promo"><label className="pc-field">Mã ưu đãi (nếu có)<input name="promotionCode" placeholder="Nhập mã của bạn" value={code} onChange={event => { setCode(event.target.value); setPromotion(null); }} /></label><button type="button" className="pc-button pc-button--soft" disabled={checking || !code.trim()} onClick={applyPromotion}>{checking ? 'Đang kiểm tra...' : 'Áp dụng'}</button></div>
        {promotion?.checkedCode === code.trim() && promotion.checkedServiceId === serviceId && <p className="pc-muted" role="status">{promotion.valid ? 'Mã ưu đãi đã được áp dụng.' : promotion.message || promotion.reason || 'Mã ưu đãi không khả dụng.'}</p>}
        {code.trim() && !checking && !discount && <p className="pc-muted">Hãy áp dụng mã ưu đãi trước khi xác nhận, hoặc xóa mã để tiếp tục.</p>}
        <label className="pc-field">Điều gì bạn muốn phòng khám lưu ý?<textarea name="bookingNotes" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Thói quen, dị ứng hoặc yêu cầu chăm sóc của bé..." /></label>
        <p className="pc-muted">Lịch hẹn sẽ được gửi đến phòng khám để xác nhận. Bạn có thể theo dõi tại mục Lịch hẹn.</p>
      </>}
      <div className="pc-form-actions">
        <button type="button" className="pc-button pc-button--line" disabled={saving} onClick={step ? () => setStep(step - 1) : onClose}>{step ? <><ArrowLeft />Quay lại</> : 'Để sau'}</button>
        <button className="pc-button" type="submit" disabled={saving || checking || (step === 0 && (!pet || !service)) || (step === 1 && (!slot || loading)) || (step === 2 && Boolean(code.trim() && !discount))}>{saving ? 'Đang đặt lịch...' : step === 2 ? <><Check />Xác nhận đặt lịch</> : <>Tiếp tục<ArrowRight /></>}</button>
      </div>
    </form>
  </Modal>;
}
