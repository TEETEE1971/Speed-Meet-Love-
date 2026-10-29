import React from 'react';

interface FloatingHeartsProps {
  count?: number;
  className?: string;
  colors?: ('pink' | 'red' | 'rose' | 'white')[];
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({
  count = 8,
  className = '',
  colors = ['pink', 'red', 'rose'],
}) => {
  // Deterministic heart configurations so there is no layout thrashing or hydration mismatch
  const heartsData = [
    { left: '8%', size: 16, delay: '0s', duration: '5.2s', color: '#FF2E93', opacity: 0.75, rotate: -12 },
    { left: '22%', size: 22, delay: '1.4s', duration: '6.4s', color: '#E11D48', opacity: 0.85, rotate: 8 },
    { left: '38%', size: 14, delay: '0.6s', duration: '4.8s', color: '#F43F5E', opacity: 0.7, rotate: -6 },
    { left: '55%', size: 26, delay: '2.1s', duration: '7.1s', color: '#FF2E93', opacity: 0.9, rotate: 15 },
    { left: '72%', size: 18, delay: '1.0s', duration: '5.6s', color: '#DC2626', opacity: 0.8, rotate: -10 },
    { left: '88%', size: 20, delay: '2.8s', duration: '6.8s', color: '#F43F5E', opacity: 0.75, rotate: 12 },
    { left: '46%', size: 12, delay: '3.4s', duration: '4.5s', color: '#FF2E93', opacity: 0.6, rotate: -14 },
    { left: '80%', size: 24, delay: '0.3s', duration: '6.0s', color: '#E11D48', opacity: 0.85, rotate: 6 },
    { left: '15%', size: 14, delay: '3.8s', duration: '5.1s', color: '#FF4B8B', opacity: 0.7, rotate: 10 },
    { left: '64%', size: 20, delay: '1.9s', duration: '6.2s', color: '#DC2626', opacity: 0.8, rotate: -8 },
  ].slice(0, count);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {heartsData.map((h, i) => (
        <span
          key={i}
          className="absolute block animate-float-heart-drift"
          style={{
            left: h.left,
            bottom: '-20px',
            fontSize: `${h.size}px`,
            color: colors.includes('white') && i % 2 === 0 ? '#FFFFFF' : h.color,
            opacity: h.opacity,
            animationDelay: h.delay,
            animationDuration: h.duration,
            transform: `rotate(${h.rotate}deg)`,
          }}
        >
          ❤
        </span>
      ))}
    </div>
  );
};
