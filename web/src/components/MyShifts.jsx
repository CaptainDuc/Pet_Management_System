import React, { useEffect, useState } from 'react';
import { clinicApi } from '../api/clinic';

export default function MyShifts({ user, token }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const lastDay = new Date(Date.parse(`${today}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
    setLoading(true); setError('');
    Promise.all([clinicApi.staffProfiles(token), clinicApi.shifts(today, lastDay, token)])
      .then(([profiles, rows]) => {
        if (!active) return;
        const mine = new Set(profiles.filter(profile => profile.userId === user.id).map(profile => profile.id));
        setShifts(rows.filter(row => mine.has(row.staffId)).sort((a, b) => `${a.workDate}${a.startTime}`.localeCompare(`${b.workDate}${b.startTime}`)));
      }).catch(err => { if (active) setError(err.message || 'Không tải được ca làm.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, token, retry]);

  return <section className="pc-light pc-panel space-y-4"><div className="flex items-center justify-between gap-3"><div><h2>Ca làm của tôi</h2><p className="pc-muted">Hôm nay và sáu ngày tiếp theo.</p></div><button className="pc-text-button" onClick={() => setRetry(value => value + 1)}>Làm mới</button></div>
    {loading && <p role="status">Đang tải ca làm…</p>}
    {error && <p className="pc-notice" role="alert">{error}</p>}
    {!loading && !error && !shifts.length && <p className="pc-muted">Bạn chưa có ca làm được phân công trong bảy ngày tới.</p>}
    {!loading && !error && shifts.map(shift => <article key={shift.id} className="rounded-xl border border-slate-200 p-4 flex flex-wrap justify-between gap-2"><strong>{new Date(`${shift.workDate}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</strong><span>{shift.startTime?.slice(0, 5)} – {shift.endTime?.slice(0, 5)} · {shift.isAvailable ? 'Có lịch trực' : 'Tạm ngừng nhận lịch'}</span></article>)}
  </section>;
}
