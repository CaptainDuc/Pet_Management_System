import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import './Input.css';

/**
 * PetCare Design System — Input Component
 * Unified input replacing:
 * - Auth form inputs
 * - Dashboard form fields
 * - AdminConsole form inputs
 * - Search inputs
 * - Filter inputs
 */

const Input = forwardRef(function Input(
  {
    id: providedId,
    label,
    hint,
    error,
    success,
    leftIcon,
    rightIcon,
    className = '',
    fullWidth = false,
    disabled = false,
    readOnly = false,
    required = false,
    type = 'text',
    size = 'md',
    ...props
  },
  ref
) {
  const generatedId = React.useId();
  const inputId = providedId || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const successId = success ? `${inputId}-success` : undefined;
  const describedBy = [hintId, errorId, successId].filter(Boolean).join(' ') || undefined;

  const sizeClasses = {
    sm: 'input--sm',
    md: 'input--md',
    lg: 'input--lg',
  };

  const classNames = [
    'input-wrapper',
    sizeClasses[size],
    fullWidth ? 'input-wrapper--full-width' : '',
    error ? 'input-wrapper--error' : '',
    success ? 'input-wrapper--success' : '',
    disabled ? 'input-wrapper--disabled' : '',
    readOnly ? 'input-wrapper--readonly' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label}
          {required && <span className="input__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="input__field-wrapper">
        {leftIcon && (
          <span className="input__icon input__icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className="input"
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          aria-required={required}
          {...props}
        />
        {rightIcon && (
          <span className="input__icon input__icon--right">
            {rightIcon}
          </span>
        )}
        {error && (
          <span className="input__icon input__icon--error" aria-hidden="true">
            <AlertCircle size={18} strokeWidth={2} />
          </span>
        )}
        {success && !error && (
          <span className="input__icon input__icon--success" aria-hidden="true">
            <CheckCircle size={18} strokeWidth={2} />
          </span>
        )}
        {props.loading && (
          <span className="input__icon input__icon--loading" aria-hidden="true">
            <Loader2 size={18} strokeWidth={2} className="input__spinner" />
          </span>
        )}
      </div>
      {(hint || error || success) && (
        <div className="input__messages" role="alert" aria-live="polite">
          {error && <span id={errorId} className="input__message input__message--error">{error}</span>}
          {success && !error && <span id={successId} className="input__message input__message--success">{success}</span>}
          {hint && !error && <span id={hintId} className="input__message input__message--hint">{hint}</span>}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

// Re-export types for consumers
export const INPUT_SIZES = ['sm', 'md', 'lg'];
