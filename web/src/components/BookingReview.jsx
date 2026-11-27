import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';
import { Modal } from '../design-system/components';

export default function BookingReview({ booking, token }) {
  const [saved, setSaved] = useState();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    clinicApi.myReview(booking.id, token).then(row => {
      if (live) { setSaved(row || null); setError(''); }
    }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [booking.id, token, retry]);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      setSaved(await clinicApi.submitReview(booking.id, token, {
        rating: Number(form.get('rating')), comment: form.get('comment'), published: form.has('published'),
      }));
      setOpen(false);
    } catch (e) { setError(e.message); if (e.status === 409) { setOpen(false); setRetry(r => r + 1); } }
    finally { setBusy(false); }
  }
  if (saved === undefined) return error ? <button className="pc-text-button" onClick={() => setRetry(r => r + 1)}>Tải lại đánh giá</button> : null;
  return <><button className="pc-text-button" onClick={() => setOpen(true)}>
    {saved ? 'Đánh giá của bạn · ' + saved.rating + '/5' : 'Đánh giá buổi hẹn'}
  </button><Modal isOpen={open} onClose={busy ? undefined : () => setOpen(false)} title="Đánh giá buổi hẹn" className="pc-light pc-dialog">
    <p>{booking.items.map(i => i.serviceName).join(', ')} · BK-{booking.id.slice(0,8).toUpperCase()}</p>
    {saved ? <div><strong>{saved.rating}/5 sao</strong><p>{saved.comment}</p><small>{saved.published ? 'Đã chia sẻ ẩn danh trên trang chủ' : 'Chỉ gửi cho phòng khám'}</small></div> :
      <form className="pc-form" onSubmit={submit}>
        <label className="pc-field">Trải nghiệm của bạn<select name="rating" defaultValue="" required>
          <option value="" disabled>Chọn số sao</option>{[5,4,3,2,1].map(n => <option value={n} key={n}>{n} sao</option>)}
        </select></label>
        <label className="pc-field">Nhận xét (không bắt buộc)<textarea name="comment" maxLength={1000} /></label>
        <label><input type="checkbox" name="published" /> Chia sẻ số sao và nhận xét ẩn danh trên trang chủ</label>
        {error && <p role="alert">{error}</p>}
        <button className="pc-button" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
      </form>}
  </Modal></>;
}
