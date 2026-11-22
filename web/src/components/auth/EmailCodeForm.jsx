import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import AuthForm from './AuthForm';
import FormInput from './FormInput';
import FormError from './FormError';
import SubmitButton from './SubmitButton';

export default function EmailCodeForm({ challenge, onVerify, onResend, onChangeEmail, submitLabel, children }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [sentAt, setSentAt] = useState(Date.now());
  const input = useRef(null);
  useEffect(() => {
    setCode(''); setError(''); setSentAt(Date.now()); setNow(Date.now());
    input.current?.focus();
  }, [challenge.challengeId]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const resendWait = Math.max(0, Math.ceil((sentAt + challenge.resendAfterSeconds * 1000 - now) / 1000));
  const expired = now >= sentAt + challenge.expiresInSeconds * 1000;
  async function verify() {
    if (!/^[0-9]{6}$/.test(code)) { setError('Vui lòng nhập đủ 6 chữ số trong email.'); input.current?.focus(); return; }
    if (busy || expired) return;
    setBusy('verify'); setError('');
    try { await onVerify(code); } catch (err) { setError(err.message || 'Chưa xác nhận được mã. Vui lòng thử lại.'); }
    finally { setBusy(''); }
  }
  async function resend() {
    if (busy || resendWait) return;
    setBusy('resend'); setError('');
    try { await onResend(); } catch (err) { setError(err.message || 'Chưa gửi lại được mã. Vui lòng thử lại.'); }
    finally { setBusy(''); }
  }
  return <div className="space-y-5">
    <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-[#171d3f]" role="status">
      <Mail size={20} className="mt-0.5 shrink-0 text-[#2563eb]" aria-hidden="true" />
      <div className="min-w-0"><p>{challenge.message}</p><strong className="mt-1 block break-all">{challenge.email}</strong></div>
    </div>
    <FormError message={error} />
    <AuthForm onSubmit={verify}>
      <FormInput ref={input} id="email-verification-code" name="code" label="Mã xác nhận"
        inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
        value={code} onChange={event => { setCode(event.target.value.replace(/[^0-9]/g, '')); setError(''); }}
        helperText={expired ? 'Mã đã hết hạn. Vui lòng gửi lại mã mới.' : `Nhập mã 6 số. Mã có hiệu lực ${Math.floor(challenge.expiresInSeconds / 60)} phút; dùng mã trong email mới nhất.`}
        disabled={Boolean(busy)} required />
      {children}
      <SubmitButton loading={busy === 'verify'} disabled={Boolean(busy) || expired}>{submitLabel}</SubmitButton>
    </AuthForm>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4 text-sm">
      <button type="button" disabled={Boolean(busy) || resendWait > 0} onClick={resend}
        className="min-h-11 font-semibold text-[#2563eb] disabled:text-[#64748b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563eb]">
        {busy === 'resend' ? 'Đang gửi mã...' : resendWait ? `Gửi lại sau ${resendWait}s` : 'Gửi lại mã'}
      </button>
      <button type="button" disabled={Boolean(busy)} onClick={onChangeEmail}
        className="inline-flex min-h-11 items-center gap-1 text-[#475569] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563eb]">
        <ArrowLeft size={16} aria-hidden="true" />Đổi email
      </button>
    </div>
  </div>;
}
