import React, { useEffect, useRef } from 'react';

/**
 * Lightweight, high-performance festive ambient snowfall canvas overlay.
 * Uses requestAnimationFrame with sine-wave horizontal drift.
 * Completely click-through (pointer-events: none) and honors prefers-reduced-motion.
 */
export default function SnowEffect({ zIndex = 3, opacity = 0.65 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId = null;
    let flakes = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Gentle snowflake density based on viewport width
    const count = Math.min(48, Math.max(20, Math.floor(width / 26)));
    for (let i = 0; i < count; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.2 + 0.8,
        s: Math.random() * 0.6 + 0.25,
        d: Math.random() * Math.PI * 2
      });
    }

    const draw = () => {
      if (document.visibilityState === 'visible') {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        for (let i = 0; i < flakes.length; i++) {
          const f = flakes[i];
          ctx.moveTo(f.x, f.y);
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          f.y += f.s;
          f.d += 0.012;
          f.x += Math.sin(f.d) * 0.35;
          if (f.y > height + 5) {
            f.y = -5;
            f.x = Math.random() * width;
          }
          if (f.x > width + 5) {
            f.x = -5;
          } else if (f.x < -5) {
            f.x = width + 5;
          }
        }
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
        opacity
      }}
    />
  );
}
