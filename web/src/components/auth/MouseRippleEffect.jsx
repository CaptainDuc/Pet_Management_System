import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Interactive Mouse Ripple Effect
 * 
 * Features:
 * - Fluid, luminous water ripples following mouse movement
 * - High contrast against the static Husky background
 * - Responsive spawn threshold (14px distance & 40ms interval)
 * - Safe on all devices & completely stationary when mouse stops
 * - Pointer-events: none (zero interference with buttons or inputs)
 */
export default function MouseRippleEffect() {
  const [ripples, setRipples] = useState([]);
  const lastSpawnRef = useRef({ x: 0, y: 0, time: 0 });
  const idCounterRef = useRef(0);

  useEffect(() => {
    // Check if user explicitly set reduced motion in OS settings
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handlePointerMove = (e) => {
      // Ignore if coordinates are missing (e.g. synthetic touch clicks without coords)
      if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;

      const now = performance.now();
      const last = lastSpawnRef.current;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const distance = Math.hypot(dx, dy);

      // Trigger ripple when mouse has moved at least 14px and at least 40ms elapsed
      if (distance >= 14 && now - last.time >= 40) {
        lastSpawnRef.current = { x: e.clientX, y: e.clientY, time: now };
        idCounterRef.current = (idCounterRef.current + 1) % 10000;

        const newRipple = {
          id: idCounterRef.current,
          x: e.clientX,
          y: e.clientY,
        };

        setRipples((prev) => {
          // Keep up to 14 active ripples for a rich water trail
          const next = prev.length >= 14 ? prev.slice(prev.length - 13) : prev;
          return [...next, newRipple];
        });
      }
    };

    // Attach to window so ripples spawn across the entire viewport
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, []);

  const handleAnimationEnd = useCallback((id) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-[4]"
      aria-hidden="true"
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          onAnimationEnd={() => handleAnimationEnd(ripple.id)}
          className="water-ripple"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
          }}
        />
      ))}
    </div>
  );
}
