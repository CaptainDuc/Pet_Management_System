import React from 'react';

/**
 * Clean, full-width SaaS submit button with spinner loading state
 */
export default function SubmitButton({
  children,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`w-full h-11 px-4 text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#0284C7] hover:from-[#1D4ED8] hover:to-[#0369A1] active:scale-[0.98] active:translate-y-0 hover:-translate-y-0.5 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0 disabled:scale-100 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
}
