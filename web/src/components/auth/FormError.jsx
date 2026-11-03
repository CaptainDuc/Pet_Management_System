import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Minimalist, non-intrusive alert box for form-level errors
 */
export default function FormError({ message }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="p-3 mb-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start space-x-2 text-xs text-[#DC2626] animate-error-slide shadow-xs"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#DC2626]" aria-hidden="true" />
      <span className="leading-relaxed font-medium">{message}</span>
    </div>
  );
}
