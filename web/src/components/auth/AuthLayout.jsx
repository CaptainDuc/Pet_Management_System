import React from 'react';
import MouseRippleEffect from './MouseRippleEffect';

/**
 * Split Responsive Auth Layout:
 * - Left Side: Husky background image ("ảnh background để bên trái")
 * - Right Side: Authentication form docked right ("phần login để sát phải")
 * - Interactive Mouse Water Ripple Effect (Luminous Cyan/Blue across viewport)
 */
export default function AuthLayout({ children, heading, subtitle }) {
  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-center items-center lg:items-end px-4 py-8 sm:px-8 lg:pr-14 xl:pr-24 font-sans overflow-x-hidden">
      {/* ─── Layer 1: Left-Anchored Husky Hero Background ─── */}
      <div className="fixed inset-0 z-0 bg-[#070B14]" aria-hidden="true">
        {/* Husky Hero Photo: Placed on the left 60% on desktop, full on mobile */}
        <div
          className="absolute inset-y-0 left-0 w-full lg:w-[62%] xl:w-[64%] bg-no-repeat bg-cover transition-all duration-500"
          style={{
            backgroundImage: "url('/husky-bg.png')",
            backgroundPosition: "center 28%",
          }}
        >
          {/* Seamless gradient blend between the Husky photo and the right dark area */}
          <div className="hidden lg:block absolute inset-y-0 right-0 w-44 bg-gradient-to-r from-transparent via-[#070B14]/70 to-[#070B14]" />
          {/* Subtle top/bottom vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070B14]/40 via-transparent to-[#070B14]/25 pointer-events-none" />
        </div>

        {/* Mobile translucent overlay for crystal-clear readability on phones */}
        <div className="lg:hidden absolute inset-0 bg-slate-950/45 backdrop-blur-[0.5px]" />
      </div>

      {/* ─── Layer 2: Interactive Mouse Ripple Effect ─── */}
      <MouseRippleEffect />

      {/* ─── Layer 3: Authentication Card (Docked Flush Right on Desktop) ─── */}
      <div className="w-full max-w-[395px] relative z-10 my-auto animate-form-entrance">
        {/* Brand / Logo Header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="group relative flex items-center justify-center px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg shadow-slate-950/25 ring-4 ring-white/30 mb-3 transition-transform duration-200 hover:scale-105 cursor-pointer">
            <img
              src="/logo.png"
              alt="PetCare Logo"
              className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          <span className="text-[11px] font-bold tracking-widest text-sky-400 uppercase drop-shadow-sm">
            PetCare Platform
          </span>
          <h1 className="mt-1 text-[27px] font-bold text-white tracking-tight drop-shadow-md">
            {heading}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-slate-300 max-w-xs drop-shadow leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Card: Frost Surface, Crisp Border & High Contrast */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/85 rounded-2xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(2,6,23,0.5)] hover:border-blue-300/60 transition-colors duration-200">
          <div className="animate-page-slide">
            {children}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-400 drop-shadow">
          <span>Hệ thống Quản lý Phòng khám Thú cưng © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
