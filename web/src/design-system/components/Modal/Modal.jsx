import React, { forwardRef, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import './Modal.css';

/**
 * PetCare Design System — Modal Component
 * Unified modal replacing:
 * - Auth modals (login, register, forgot password)
 * - Confirmation dialogs
 * - Form modals (create/edit)
 * - Detail view modals
 * - AdminConsole action modals
 */

const Modal = forwardRef(function Modal(
  {
    open,
    isOpen = open ?? false,
    onClose,
    title,
    description,
    children,
    size = 'md',
    variant = 'default',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    footer,
    loading = false,
    className = '',
    'aria-label': ariaLabel,
    ...props
  },
  ref
) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const focusableElementsRef = useRef([]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-modal-open', 'true');

      // Focus trap setup
      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const updateFocusableElements = () => {
        focusableElementsRef.current = Array.from(
          modalRef.current?.querySelectorAll(focusableSelectors) || []
        ).filter(el => el.offsetParent !== null);
      };

      updateFocusableElements();
      setTimeout(() => {
        updateFocusableElements();
        focusableElementsRef.current[0]?.focus();
      }, 0);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onCloseRef.current?.();
          return;
        }

        if (e.key === 'Tab' && focusableElementsRef.current.length > 0) {
          const firstElement = focusableElementsRef.current[0];
          const lastElement = focusableElementsRef.current[focusableElementsRef.current.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        document.body.removeAttribute('data-modal-open');
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, closeOnEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    xs: 'modal--xs',
    sm: 'modal--sm',
    md: 'modal--md',
    lg: 'modal--lg',
    xl: 'modal--xl',
    full: 'modal--full',
  };

  const variantClasses = {
    default: 'modal--default',
    confirmation: 'modal--confirmation',
    form: 'modal--form',
    alert: 'modal--alert',
  };

  const classNames = [
    'modal__overlay',
    variantClasses[variant],
    loading ? 'modal__overlay--loading' : '',
  ].filter(Boolean).join(' ');

  const contentClassNames = [
    'modal__content',
    sizeClasses[size],
    className,
  ].filter(Boolean).join(' ');

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const modalContent = (
    <div
      className={classNames}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={contentClassNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        {...props}
      >
        {(title || showCloseButton) && (
          <header className="modal__header">
            {title && (
              <h2 id="modal-title" className="modal__title">
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="modal__description">
                {description}
              </p>
            )}
            {showCloseButton && (
              <button
                type="button"
                className="modal__close"
                onClick={onClose}
                aria-label="Close modal"
                disabled={loading}
              >
                <X size={20} strokeWidth={2} />
              </button>
            )}
          </header>
        )}

        <div className="modal__body">
          {loading && (
            <div className="modal__loading" aria-live="polite" aria-busy="true">
              <Loader2 className="modal__spinner" size={24} strokeWidth={2.5} />
              <span>Loading...</span>
            </div>
          )}
          {!loading && children}
        </div>

        {footer && (
          <footer className="modal__footer">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
});

Modal.displayName = 'Modal';

// Convenience sub-components
const ModalHeader = ({ title, description, children, className = '' }) => (
  <header className={`modal__header ${className}`}>
    {title && <h2 className="modal__title">{title}</h2>}
    {description && <p className="modal__description">{description}</p>}
    {children}
  </header>
);

const ModalBody = ({ children, className = '' }) => (
  <div className={`modal__body ${className}`}>{children}</div>
);

const ModalFooter = ({ children, className = '', justify = 'end' }) => (
  <footer className={`modal__footer modal__footer--${justify} ${className}`}>
    {children}
  </footer>
);

const ModalClose = ({ onClick, className = '', 'aria-label': ariaLabel = 'Close', ...props }) => (
  <button
    type="button"
    className={`modal__close ${className}`}
    onClick={onClick}
    aria-label={ariaLabel}
    {...props}
  >
    <X size={20} strokeWidth={2} />
  </button>
);

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.Close = ModalClose;

export default Modal;

export const MODAL_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'full'];
export const MODAL_VARIANTS = ['default', 'confirmation', 'form', 'alert'];
