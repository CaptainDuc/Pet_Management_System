import React, { useEffect, useState } from 'react';
import { CheckCircle2, LockKeyhole, Save } from 'lucide-react';
import { Avatar, Input } from '../../design-system/components';
import PasswordInput from '../../components/auth/PasswordInput';
import PhotoInput from '../../components/PhotoInput';
import { useAuth } from '../../context/AuthContext';

const profileOf = user => ({ fullName:user?.fullName || '', phone:user?.phone || '', avatarUrl:user?.avatarUrl || '' });
const emptyPassword = { currentPassword:'', newPassword:'', confirmPassword:'' };

export default function ProfileTab({ user }) {
  const { updateProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState(() => profileOf(user));
  const [password, setPassword] = useState(emptyPassword);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // A session rotation must not overwrite this account's unsaved profile edits.
  useEffect(() => { setProfile(profileOf(user)); }, [user?.id]);
  function editProfile(field, value) {
    setProfile(current => ({ ...current, [field]:value }));
    setProfileSaved(false); setProfileError(''); setFieldErrors(current => ({ ...current, [field]:undefined }));
  }
  function editPassword(event) {
    const {name,value}=event.target;
    setPassword(current => ({ ...current, [name]:value }));
    setPasswordSaved(false); setPasswordError(''); setPasswordErrors(current => ({ ...current, [name]:undefined }));
  }
  async function saveProfile(event) {
    event.preventDefault();
    if (saving || preparingPhoto) return;
    const fullName=profile.fullName.trim(), phone=profile.phone.replace(/[\s-]/g,'');
    const errors={};
    if (fullName.length<2) errors.fullName='Họ và tên phải có ít nhất 2 ký tự.';
    if (phone && !/^\+?[0-9]{9,15}$/.test(phone)) errors.phone='Nhập số điện thoại từ 9 đến 15 chữ số.';
    setFieldErrors(errors); setProfileSaved(false); setProfileError('');
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const saved=await updateProfile({ fullName, phone, avatarUrl:profile.avatarUrl.trim() });
      setProfile(profileOf(saved)); setProfileSaved(true);
    } catch (err) { setProfileError(err.message || 'Chưa lưu được hồ sơ. Vui lòng thử lại.'); setFieldErrors(err.fieldErrors || {}); }
    finally { setSaving(false); }
  }
  async function savePassword(event) {
    event.preventDefault();
    if (changing) return;
    const errors={};
    if (!password.currentPassword) errors.currentPassword='Nhập mật khẩu hiện tại của bạn.';
    if (password.newPassword.length<6) errors.newPassword='Mật khẩu mới phải có ít nhất 6 ký tự.';
    if (password.newPassword!==password.confirmPassword || !password.confirmPassword) errors.confirmPassword='Mật khẩu xác nhận phải trùng với mật khẩu mới.';
    setPasswordErrors(errors); setPasswordSaved(false); setPasswordError('');
    if (Object.keys(errors).length) return;
    setChanging(true);
    try { await changePassword(password); setPassword(emptyPassword); setPasswordSaved(true); }
    catch (err) { setPasswordError(err.message || 'Chưa đổi được mật khẩu. Vui lòng thử lại.'); setPasswordErrors(err.fieldErrors || {}); }
    finally { setChanging(false); }
  }

  return <div className="pc-profile">
    <section className="pc-panel" aria-labelledby="profile-details-heading">
      <div className="pc-profile-intro"><Avatar src={profile.avatarUrl} name={profile.fullName || user?.fullName} size="xl" aria-label="Ảnh đại diện xem trước" />
        <div><h2 id="profile-details-heading">Thông tin cá nhân</h2><p>Cập nhật tên, số điện thoại và ảnh đại diện của bạn.</p></div></div>
      {profileSaved && <p className="pc-profile-success" role="status"><CheckCircle2 size={18} aria-hidden="true" />Đã lưu thông tin hồ sơ.</p>}
      {profileError && <p className="pc-notice" role="alert">{profileError}</p>}
      <form id="profile-details-form" onSubmit={saveProfile} noValidate>
        <fieldset disabled={saving} className="pc-profile-fields">
          <PhotoInput name="avatar" label="Ảnh đại diện" emptyLabel="Kéo ảnh đại diện vào đây" maxDimension={256}
            value={profile.avatarUrl} onChange={value => editProfile('avatarUrl',value)} disabled={saving} onBusyChange={setPreparingPhoto} />
          {fieldErrors.avatarUrl && <p className="pc-notice" role="alert">{fieldErrors.avatarUrl}</p>}
          <Input id="profile-fullname" name="fullName" label="Họ và tên" autoComplete="name" required maxLength={255}
            value={profile.fullName} onChange={e => editProfile('fullName',e.target.value)} error={fieldErrors.fullName} fullWidth />
          <Input id="profile-email" name="email" type="email" label="Email đăng nhập" readOnly value={user?.email || ''}
            hint="Email đăng nhập được giữ cố định." fullWidth />
          <Input id="profile-phone" name="phone" type="tel" label="Số điện thoại" autoComplete="tel" maxLength={30}
            placeholder="0912 345 678" value={profile.phone} onChange={e => editProfile('phone',e.target.value)} error={fieldErrors.phone} fullWidth />
          <div className="pc-form-actions"><button className="pc-button" type="submit" disabled={saving || preparingPhoto}>
            <Save size={17} aria-hidden="true" />{saving ? 'Đang lưu...' : preparingPhoto ? 'Đang chuẩn bị ảnh...' : 'Lưu thông tin'}</button></div>
        </fieldset>
      </form>
    </section>
    <section className="pc-panel" aria-labelledby="profile-password-heading">
      <div className="pc-profile-section-heading"><LockKeyhole size={21} aria-hidden="true" /><h2 id="profile-password-heading">Đổi mật khẩu</h2></div>
      <p className="pc-muted">Nhập mật khẩu hiện tại và xác nhận mật khẩu mới để lưu thay đổi.</p>
      {passwordSaved && <p className="pc-profile-success" role="status"><CheckCircle2 size={18} aria-hidden="true" />Đã đổi mật khẩu thành công.</p>}
      {passwordError && <p className="pc-notice" role="alert">{passwordError}</p>}
      <form id="profile-password-form" onSubmit={savePassword} noValidate>
        <fieldset disabled={changing} className="pc-profile-fields">
          <PasswordInput id="profile-current-password" name="currentPassword" label="Mật khẩu hiện tại" autoComplete="current-password"
            maxLength={72} required value={password.currentPassword} onChange={editPassword} error={passwordErrors.currentPassword} />
          <PasswordInput id="profile-new-password" name="newPassword" label="Mật khẩu mới" autoComplete="new-password"
            maxLength={72} required value={password.newPassword} onChange={editPassword} error={passwordErrors.newPassword} hint="Ít nhất 6 ký tự." />
          <PasswordInput id="profile-confirm-password" name="confirmPassword" label="Xác nhận mật khẩu mới" autoComplete="new-password"
            maxLength={72} required value={password.confirmPassword} onChange={editPassword} error={passwordErrors.confirmPassword} />
          <div className="pc-form-actions"><button className="pc-button pc-button--line" type="submit" disabled={changing}>{changing ? 'Đang đổi...' : 'Đổi mật khẩu'}</button></div>
        </fieldset>
      </form>
    </section>
  </div>;
}
