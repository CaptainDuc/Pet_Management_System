import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthForm from '../../components/auth/AuthForm';
import FormInput from '../../components/auth/FormInput';
import PasswordInput from '../../components/auth/PasswordInput';
import SubmitButton from '../../components/auth/SubmitButton';
import FormError from '../../components/auth/FormError';
import EmailCodeForm from '../../components/auth/EmailCodeForm';
import { authApi } from '../../api/auth';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const input = useRef(null);
  useEffect(() => { if (!challenge && !done) input.current?.focus(); }, [challenge, done]);
  async function requestCode() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Vui lòng nhập địa chỉ email hợp lệ.'); return; }
    if (loading) return;
    setLoading(true); setError('');
    try { setChallenge(await authApi.requestPasswordReset(email)); }
    catch (err) { setError(err.message || 'Chưa gửi được mã. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  async function reset(code) {
    if (password.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (password !== confirmation) throw new Error('Mật khẩu xác nhận chưa khớp. Vui lòng nhập lại.');
    await authApi.resetPassword({ email: challenge.email, challengeId: challenge.challengeId, code, newPassword: password });
    setPassword(''); setConfirmation(''); setDone(true);
  }
  const back = <button type="button" onClick={() => onNavigate('login')}
    className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#2563eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563eb]">
    <ArrowLeft size={16} aria-hidden="true" />Quay lại đăng nhập
  </button>;
  return <AuthLayout heading={done ? 'Mật khẩu đã được cập nhật' : challenge ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}
    subtitle={done ? 'Bạn có thể đăng nhập bằng mật khẩu mới.' : challenge ? 'Nhập mã trong email và chọn mật khẩu mới cho tài khoản.' : 'Nhập email tài khoản để nhận mã xác nhận.'}>
    {done ? <div className="space-y-5"><div role="status" className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-[#171d3f]">
      <CheckCircle2 size={22} className="shrink-0 text-[#2563eb]" aria-hidden="true" /><p>Đã đặt lại mật khẩu thành công. Vui lòng đăng nhập lại để tiếp tục.</p>
    </div>{back}</div> : challenge ? <EmailCodeForm challenge={challenge} submitLabel="Xác nhận và đổi mật khẩu" onVerify={reset}
      onResend={async () => setChallenge(await authApi.requestPasswordReset(challenge.email))}
      onChangeEmail={() => { setChallenge(null); setPassword(''); setConfirmation(''); setError(''); }}>
      <PasswordInput id="reset-password" name="newPassword" label="Mật khẩu mới" autoComplete="new-password" maxLength={72} required
        value={password} onChange={e => setPassword(e.target.value)} />
      <PasswordInput id="reset-confirm-password" name="confirmPassword" label="Xác nhận mật khẩu mới" autoComplete="new-password" maxLength={72} required
        value={confirmation} onChange={e => setConfirmation(e.target.value)} />
    </EmailCodeForm> : <>
      <FormError message={error} />
      <AuthForm onSubmit={requestCode}>
        <FormInput ref={input} id="forgot-email" name="email" type="email" label="Email tài khoản" placeholder="name@example.com"
          autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} disabled={loading} required />
        <SubmitButton loading={loading} disabled={loading}>Gửi mã xác nhận</SubmitButton>
      </AuthForm><div className="mt-6 border-t border-[#e2e8f0] pt-4">{back}</div>
    </>}
  </AuthLayout>;
}
