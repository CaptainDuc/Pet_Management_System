import React, { useState, useRef, useEffect } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthForm from '../../components/auth/AuthForm';
import FormInput from '../../components/auth/FormInput';
import PasswordInput from '../../components/auth/PasswordInput';
import SubmitButton from '../../components/auth/SubmitButton';
import FormError from '../../components/auth/FormError';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage({ onNavigate, onSuccess }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRef = useRef(null);

  // Autofocus on first input
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Định dạng email không hợp lệ';
    }

    if (!formData.password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setGeneralError('');

    try {
      await login(formData);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err.status === 401) {
        setGeneralError('Email hoặc mật khẩu không chính xác');
      } else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setGeneralError(err.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Đăng nhập"
      subtitle="Nhập thông tin tài khoản để truy cập hệ thống PetCare"
    >
      <FormError message={generalError} />

      <AuthForm onSubmit={handleSubmit}>
        <FormInput
          ref={emailRef}
          id="login-email"
          name="email"
          type="email"
          label="Email"
          placeholder="name@example.com"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          disabled={loading}
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-[#0F172A]"
            >
              Mật khẩu <span className="text-[#DC2626]">*</span>
            </label>
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors focus:outline-none focus:underline"
            >
              Quên mật khẩu?
            </button>
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            label="" // label already rendered above with forgot link
            placeholder="••••••••"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            disabled={loading}
            required
          />
        </div>

        <div className="pt-2">
          <SubmitButton loading={loading} disabled={loading}>
            Đăng nhập
          </SubmitButton>
        </div>

        <div className="text-center pt-3 border-t border-[#E2E8F0] mt-6">
          <p className="text-sm text-[#64748B]">
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors focus:outline-none focus:underline"
            >
              Đăng ký ngay
            </button>
          </p>
        </div>
      </AuthForm>
    </AuthLayout>
  );
}
