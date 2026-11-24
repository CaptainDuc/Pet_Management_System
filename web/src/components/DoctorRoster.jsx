import React, { useEffect, useState } from 'react';
import { Modal } from '../design-system/components';
import { clinicApi } from '../api/clinic';

function AddDoctor({ candidates, token, onCreated, onClose }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    clinicApi.staffBranches(token)
      .then(rows => { if (active) setBranches(rows.filter(b => b.active)); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try {
      const profile = await clinicApi.createStaffProfile({
        userId: form.get('userId'), position: form.get('position').trim() || 'Bác sĩ thú y',
        branchId: form.get('branchId') || null,
      }, token);
      onCreated(profile);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return <Modal isOpen onClose={saving ? undefined : onClose} title="Thêm hồ sơ bác sĩ" className="pc-light pc-dialog">
    {candidates.length ? <form onSubmit={submit} className="pc-form">
      <label className="pc-field">Tài khoản bác sĩ<select name="userId" defaultValue="" required>
        <option value="" disabled>Chọn tài khoản</option>
        {candidates.map(d => <option key={d.userId} value={d.userId}>{d.fullName} · {d.email}</option>)}
      </select></label>
      <label className="pc-field">Chức danh<input name="position" maxLength={100} defaultValue="Bác sĩ thú y" /></label>
      <label className="pc-field">Chi nhánh<select name="branchId" defaultValue="" disabled={loading}>
        <option value="">{loading ? 'Đang tải chi nhánh…' : 'Chưa gán chi nhánh'}</option>
        {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select></label>
      {error && <p role="alert" className="pc-notice">{error}</p>}
      <div className="pc-form-actions">
        <button type="button" className="pc-button pc-button--line" disabled={saving} onClick={onClose}>Đóng</button>
        <button className="pc-button" disabled={saving || loading}>{saving ? 'Đang lưu…' : 'Tạo hồ sơ'}</button>
      </div>
    </form> : <p>Chưa có tài khoản bác sĩ nào chờ tạo hồ sơ. Với bác sĩ mới, hãy đăng ký và xác minh email, sau đó nhờ quản trị viên gán vai trò Bác sĩ.</p>}
  </Modal>;
}

export default function DoctorRoster({ token, onProfileCreated }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    clinicApi.doctorRoster(token)
      .then(rows => { if (active) setTeam(rows); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, reload]);

  const profiles = team.filter(d => d.staffId);
  const candidates = team.filter(d => !d.staffId && d.accountStatus === 'ACTIVE');
  return <section className="pc-light pc-panel space-y-3" aria-label="Đội ngũ bác sĩ">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2>Đội ngũ bác sĩ</h2><button className="pc-button" disabled={loading || Boolean(error)} onClick={() => setAdding(true)}>Thêm hồ sơ bác sĩ</button>
    </div>
    <p className="pc-muted">Bác sĩ có thể nhận mọi dịch vụ chăm sóc trong ca làm của mình.</p>
    {notice && <p role="status" className="pc-muted">{notice}</p>}
    {error ? <p role="alert" className="pc-notice">{error} <button className="pc-text-button" onClick={() => setReload(n => n + 1)}>Tải lại</button></p>
      : loading ? <p role="status">Đang tải đội ngũ…</p> : !profiles.length ? <p>Chưa có hồ sơ bác sĩ.</p> :
        <ul className="divide-y divide-slate-100">{profiles.map(d => <li key={d.staffId} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0"><strong>{d.fullName}</strong><p className="pc-muted break-all">{d.email}</p>
            <p className="text-sm">{[d.position, d.branchName].filter(Boolean).join(' · ')}</p></div>
          {(!d.staffActive || d.accountStatus !== 'ACTIVE') && <span className="pc-muted">Ngừng hoạt động</span>}
        </li>)}</ul>}
    {adding && <AddDoctor candidates={candidates} token={token} onClose={() => setAdding(false)}
      onCreated={profile => {
        const doctor = candidates.find(d => d.userId === profile.userId);
        setAdding(false); setNotice('Đã tạo hồ sơ cho ' + doctor.fullName + '.');
        setReload(n => n + 1); onProfileCreated();
      }} />}
  </section>;
}
