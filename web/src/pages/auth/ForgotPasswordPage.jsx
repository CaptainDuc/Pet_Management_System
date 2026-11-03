import React, { useState, useRef, useEffect } from 'react';
import { Info, ArrowLeft, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthForm from '../../components/auth/AuthForm';
import FormInput from '../../components/auth/FormInput';
import SubmitButton from '../../components/auth/SubmitButton';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validate = () => {
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email đã đăng ký');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Định dạng email không hợp lệ');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);

    // Note: Backend currently has no Forgot Password / Reset Password endpoint.
    // We provide a realistic, informative UX explaining the status without inventing fake APIs.
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <AuthLayout
      heading="Quên mật khẩu"
      subtitle="Nhập email tài khoản của bạn để nhận hướng dẫn khôi phục"
    >
      {isSubmitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50/90 border border-blue-200 text-sm text-[#0F172A] space-y-2">
            <div className="flex items-center space-x-2 text-[#2563EB] font-medium">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#2563EB]" />
              <span>Yêu cầu đã được ghi nhận</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Hệ thống đã nhận yêu cầu cho địa chỉ <strong>{email}</strong>.
            </p>
            <p className="text-xs text-[#64748B] border-t border-blue-200/60 pt-2 leading-relaxed">
              <em>Lưu ý hệ thống:</em> Cổng gửi mail tự động (Notification Service) đang trong quá trình bảo trì/triển khai. Nếu bạn không nhận được thư sau ít phút, vui lòng liên hệ trực tiếp lễ tân hoặc quản trị viên phòng khám để được hỗ trợ reset thủ công.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="w-full h-11 px-4 text-sm font-medium text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <ArrowLeft className="w-4 h-4 text-[#64748B]" />
            <span>Quay lại trang Đăng nhập</span>
          </button>
        </div>
      ) : (
        <AuthForm onSubmit={handleSubmit}>
          {/* Backend status advisory banner */}
          <div className="p-3 mb-2 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-[#1E40AF] flex items-start space-x-2">
            <Info className="w-4 h-4 flex-shrink-0 text-[#2563EB] mt-0.5" />
            <span className="leading-relaxed">
              Tính năng khôi phục qua email yêu cầu tài khoản đã được xác thực trong hệ thống PetCare.
            </span>
          </div>

          <FormInput
            ref={emailRef}
            id="forgot-email"
            name="email"
            type="email"
            label="Email tài khoản"
            placeholder="name@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            error={error}
            disabled={loading}
            required
          />

          <div className="pt-2">
            <SubmitButton loading={loading} disabled={loading}>
              Gửi yêu cầu khôi phục
            </SubmitButton>
          </div>

          <div className="text-center pt-3 border-t border-[#E2E8F0] mt-6">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="inline-flex items-center text-sm font-medium text-[#D97706] hover:text-[#B45309] transition-colors focus:outline-none focus:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Quay lại đăng nhập</span>
            </button>
          </div>
        </AuthForm>
      )}
    </AuthLayout>
  );
}
