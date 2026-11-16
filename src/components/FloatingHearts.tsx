import React from 'react';

export type FloatingHeartColor = 'turquoise' | 'pink' | 'red' | 'yellow' | 'rose' | 'white';

const HEART_COLOR_HEX: Record<FloatingHeartColor, string> = {
  turquoise: '#14B8A6',
  pink: '#FF2E93',
  red: '#DC2626',
  yellow: '#EAB308',
  rose: '#F43F5E',
  white: '#FFFFFF',
};

interface FloatingHeartsProps {
  count?: number;
  className?: string;
  colors?: FloatingHeartColor[];
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({
  count = 8,
  className = '',
  colors = ['turquoise', 'pink', 'red', 'yellow'],
}) => {
  const palette: FloatingHeartColor[] =
    colors.length > 0 ? colors : ['turquoise', 'pink', 'red', 'yellow'];

  // Deterministic heart configurations so there is no layout thrashing or hydration mismatch
  const heartsData = [
    { left: '8%', size: 16, delay: '0s', duration: '5.2s', opacity: 0.75, rotate: -12 },
    { left: '22%', size: 22, delay: '1.4s', duration: '6.4s', opacity: 0.85, rotate: 8 },
    { left: '38%', size: 14, delay: '0.6s', duration: '4.8s', opacity: 0.7, rotate: -6 },
    { left: '55%', size: 26, delay: '2.1s', duration: '7.1s', opacity: 0.9, rotate: 15 },
    { left: '72%', size: 18, delay: '1.0s', duration: '5.6s', opacity: 0.8, rotate: -10 },
    { left: '88%', size: 20, delay: '2.8s', duration: '6.8s', opacity: 0.75, rotate: 12 },
    { left: '46%', size: 12, delay: '3.4s', duration: '4.5s', opacity: 0.6, rotate: -14 },
    { left: '80%', size: 24, delay: '0.3s', duration: '6.0s', opacity: 0.85, rotate: 6 },
    { left: '15%', size: 14, delay: '3.8s', duration: '5.1s', opacity: 0.7, rotate: 10 },
    { left: '64%', size: 20, delay: '1.9s', duration: '6.2s', opacity: 0.8, rotate: -8 },
  ].slice(0, count);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {heartsData.map((h, i) => {
        const colorKey = palette[i % palette.length];
        const heartColor = HEART_COLOR_HEX[colorKey] ?? HEART_COLOR_HEX.pink;
        return (
          <span
            key={i}
            className="absolute block animate-float-heart-drift"
            style={{
              left: h.left,
              bottom: '-20px',
              fontSize: `${h.size}px`,
              color: heartColor,
              opacity: h.opacity,
              animationDelay: h.delay,
              animationDuration: h.duration,
              transform: `rotate(${h.rotate}deg)`,
            }}
          >
            ❤
          </span>
        );
      })}
    </div>
  );
};
