import React from 'react';

/**
 * Semantic form container with consistent vertical spacing
 */
export default function AuthForm({ children, onSubmit, className = '' }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`space-y-4 ${className}`}
    >
      {children}
    </form>
  );
}
