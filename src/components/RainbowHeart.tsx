import React from 'react';

interface RainbowHeartProps {
  className?: string;
  size?: number;
}

export const RainbowHeart: React.FC<RainbowHeartProps> = ({
  className = 'w-5 h-5',
  size = 24,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Rainbow Heart for LGBTQ+"
    >
      <defs>
        <linearGradient id="prideRainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="20%" stopColor="#F59E0B" />
          <stop offset="40%" stopColor="#10B981" />
          <stop offset="65%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <filter id="prideGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#8B5CF6" floodOpacity="0.3" />
        </filter>
      </defs>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="url(#prideRainbowGradient)"
        filter="url(#prideGlow)"
      />
      {/* Specular curved gloss sheen */}
      <path
        d="M7.5 5C5.5 5 4 6.5 4 8.5c0 1.5 1 3.2 2.6 4.8.4-.8 1.4-1.8 2.4-2.3 0-1.5-.5-3.5-1.5-6z"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />
    </svg>
  );
};
