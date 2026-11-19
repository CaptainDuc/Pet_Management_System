import React from 'react';
import { Card } from '../../design-system/components';

/**
 * AuthLayout - Design System Compliant Authentication Layout
 * Uses: Card, design tokens for colors, spacing, typography, shadows
 * Replaces: Hardcoded Tailwind dark theme with brand-compliant light theme
 */
export default function AuthLayout({ children, heading, subtitle }) {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-center items-center px-4 py-8 lg:px-8 lg:pr-14 xl:pr-24 font-sans overflow-x-hidden">
      {/* Background using design tokens */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[var(--color-bg-primary)]" />
        {/* Subtle brand accent gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-primary)]/5 via-transparent to-[var(--color-brand-secondary)]/5 pointer-events-none" />
      </div>

      {/* Authentication Card - Docked Right on Desktop */}
      <div className="w-full max-w-[395px] relative z-10 my-auto">
        {/* Brand / Logo Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="group relative flex items-center justify-center px-4 py-2 rounded-[var(--radius-card-lg)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] shadow-[var(--shadow-card-lg)] ring-4 ring-[var(--color-brand-primary)]/20 mb-4 transition-all duration-200 hover:scale-105 cursor-pointer">
            <img
              src="/logo.png"
              alt="PetCare Logo"
              className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          <span className="text-[var(--font-size-2xs)] font-bold tracking-widest text-[var(--color-brand-primary)] uppercase">
            PetCare Platform
          </span>
          <h1 className="mt-1 text-[var(--font-size-2xl)] font-bold text-[var(--color-fg-primary)]">
            {heading}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[var(--font-size-sm)] text-[var(--color-fg-secondary)] max-w-xs leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Card: Using Design System Card Component */}
        <Card variant="elevated" padding="lg" className="border border-[var(--color-border-primary)] hover:border-[var(--color-brand-primary)]/40 transition-colors duration-200">
          {children}
        </Card>

        {/* Footer info */}
        <div className="mt-6 text-center text-[var(--font-size-2xs)] text-[var(--color-fg-tertiary)]">
          <span>Hệ thống Quản lý Phòng khám Thú cưng © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}