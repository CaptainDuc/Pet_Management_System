import React, { forwardRef } from 'react';

/**
 * Standard Form Input matching Minimalist SaaS style
 * Features: Default, Hover, Focus, Error, and Disabled states.
 * Consistent 8px spacing, semantic HTML and accessible labeling.
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
    ...props
  },
  ref
) {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[#0F172A]"
          >
            {label}
            {required && <span className="text-[#DC2626] ml-1">*</span>}
          </label>
        </div>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helperId}
          className={`w-full h-10 px-3.5 py-2 text-sm text-[#0F172A] bg-white/90 rounded-xl border transition-all duration-200 placeholder:text-[#94A3B8] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 focus:outline-none'
              : 'border-[#CBD5E1] hover:border-blue-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none'
          } ${rightElement ? 'pr-10' : ''} ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>

      {/* Error or Helper text without sudden layout shifts */}
      <div className="min-h-[18px] mt-1">
        {error ? (
          <p id={errorId} className="text-xs text-[#DC2626] leading-tight animate-error-slide font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-[#64748B] leading-tight animate-page-slide">
            {helperText}
          </p>
        ) : null}
      </div>
    </div>
  );
});

export default FormInput;
