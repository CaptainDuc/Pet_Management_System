import React, { forwardRef } from 'react';
import { Input } from '../../design-system/components';

/**
 * FormInput - Wrapper around Design System Input for auth forms
 * Maintains backward compatibility with existing API
 */
const FormInput = forwardRef(function FormInput(
  {
    id,
    label,
    type = 'text',
    error,
    helperText,
    required = false,
    disabled = false,
    className = '',
    rightElement = null,
    leftIcon,
    rightIcon,
    ...props
  },
  ref
) {
  return (
    <Input
      ref={ref}
      id={id}
      label={label}
      type={type}
      error={error}
      hint={helperText}
      required={required}
      disabled={disabled}
      className={className}
      leftIcon={leftIcon}
      rightIcon={rightElement || rightIcon}
      {...props}
    />
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
