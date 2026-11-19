import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../../design-system/components';

/**
 * PasswordInput component with accessible toggle show/hide visibility
 * Uses Design System Input component
 */
const PasswordInput = forwardRef(function PasswordInput(
  { id = 'password', label = 'Mật khẩu', ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      ref={ref}
      id={id}
      label={label}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((prev) => !prev)}
          className="text-[#64748B] hover:text-[#0F172A] focus:outline-none focus:text-[#0F172A] transition-colors p-1"
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      }
      {...props}
    />
  );
});

export default PasswordInput;
