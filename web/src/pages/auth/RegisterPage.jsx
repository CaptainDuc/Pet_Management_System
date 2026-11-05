import React, { useState, useRef, useEffect } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthForm from '../../components/auth/AuthForm';
import FormInput from '../../components/auth/FormInput';
import PasswordInput from '../../components/auth/PasswordInput';
import SubmitButton from '../../components/auth/SubmitButton';
import FormError from '../../components/auth/FormError';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage({ onNavigate, onSuccess }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validate = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Định dạng email không hợp lệ';
    }

    if (!formData.password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (formData.phone && !/^[0-9+]{9,15}$/.test(formData.phone.trim())) {
      errors.phone = 'Số điện thoại không đúng định dạng';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err.status === 422 || err.message?.includes('already')) {
        setGeneralError('Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.');
        setFieldErrors((prev) => ({ ...prev, email: 'Email đã tồn tại trong hệ thống' }));
      } else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setGeneralError(err.message || 'Đăng ký không thành công. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Tạo tài khoản"
      subtitle="Đăng ký tài khoản để đặt lịch và quản lý hồ sơ thú cưng"
    >
      <FormError message={generalError} />

      <AuthForm onSubmit={handleSubmit}>
        <FormInput
          ref={nameRef}
          id="register-fullname"
          name="fullName"
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          value={formData.fullName}
          onChange={handleChange}
          error={fieldErrors.fullName}
          disabled={loading}
          required
        />

        <FormInput
          id="register-email"
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

        <FormInput
          id="register-phone"
          name="phone"
          type="tel"
          label="Số điện thoại"
          placeholder="0912 345 678 (tùy chọn)"
          autoComplete="tel"
          value={formData.phone}
          onChange={handleChange}
          error={fieldErrors.phone}
          disabled={loading}
        />

        <PasswordInput
          id="register-password"
          name="password"
          label="Mật khẩu"
          placeholder="Tối thiểu 6 ký tự"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password}
          disabled={loading}
          required
        />

        <PasswordInput
          id="register-confirmpassword"
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword}
          disabled={loading}
          required
        />

        <div className="pt-2">
          <SubmitButton loading={loading} disabled={loading}>
            Đăng ký tài khoản
          </SubmitButton>
        </div>

        <div className="text-center pt-3 border-t border-[#E2E8F0] mt-6">
          <p className="text-sm text-[#64748B]">
            Đã có tài khoản?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors focus:outline-none focus:underline"
            >
              Đăng nhập
            </button>
          </p>
        </div>
      </AuthForm>
    </AuthLayout>
  );
}
