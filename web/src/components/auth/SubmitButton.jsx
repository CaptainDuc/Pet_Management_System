import React from 'react';
import { Button } from '../../design-system/components';

/**
 * SubmitButton - Wrapper around Design System Button for auth forms
 * Maintains backward compatibility with existing API
 */
export default function SubmitButton({
  children,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      fullWidth
      loading={loading}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
