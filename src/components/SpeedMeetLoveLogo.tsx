import React from 'react';

interface LogoProps {
  variant?: 'on-red' | 'on-light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const SpeedMeetLoveLogo: React.FC<LogoProps> = ({
  variant = 'on-red',
  size = 'md',
  className = '',
}) => {
  const isOnRed = variant === 'on-red';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-12 h-12 sm:w-14 sm:h-14',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-2xl sm:text-3xl lg:text-4xl',
  };

  const loveSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-3xl sm:text-4xl lg:text-5xl',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Decorative Brand Emblem: Double Heart with Glossy Sheen & Lightning Spark */}
      <div
        className={`${iconSizes[size]} rounded-2xl flex items-center justify-center shrink-0 shadow-md relative transition-transform duration-200 group-hover:scale-105 ${
          isOnRed
            ? 'bg-white text-red-600 shadow-black/20 ring-2 ring-white/60'
            : 'bg-gradient-to-br from-red-600 via-rose-500 to-pink-500 text-white shadow-rose-500/30'
        }`}
      >
        {/* Decorative Heart SVG with Specular Gloss */}
        <svg
          viewBox="0 0 32 32"
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isOnRed ? '#DC2626' : '#FFFFFF'} />
              <stop offset="50%" stopColor={isOnRed ? '#E11D48' : '#FFE4E8'} />
              <stop offset="100%" stopColor={isOnRed ? '#FF2E93' : '#FFD1DC'} />
            </linearGradient>
            <linearGradient id="heartGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Main Heart */}
          <path
            d="M16 28s-11-6.8-11-15.2C5 8.1 8.7 5 12.8 5c2.3 0 4.4 1 5.7 2.6C19.8 6 21.9 5 24.2 5 28.3 5 32 8.1 32 12.8 32 21.2 21 28 16 28z"
            fill="url(#heartGradient)"
          />
          {/* Top gloss highlight arc */}
          <ellipse cx="11" cy="9" rx="3.5" ry="1.8" fill="url(#heartGlow)" />
          {/* Tiny spark dot */}
          <circle cx="23" cy="9" r="1.2" fill="#FFE600" />
        </svg>
      </div>

      {/* Styled Brand Wordmark: SPEED (bold block) MEET (clean caps) Love (decorative script) */}
      <div className="flex items-baseline leading-none font-heading tracking-tight">
        <span
          className={`font-black uppercase tracking-tighter ${textSizes[size]} ${
            isOnRed ? 'text-white' : 'text-red-600'
          }`}
        >
          SPEED
        </span>
        <span
          className={`font-extrabold uppercase tracking-wide ml-1.5 ${textSizes[size]} ${
            isOnRed ? 'text-rose-100' : 'text-slate-900'
          }`}
        >
          MEET
        </span>
        <span
          className={`font-serif italic font-black ml-1.5 drop-shadow-xs transition-colors ${loveSizes[size]} ${
            isOnRed ? 'text-white' : 'text-[#FF2E93]'
          }`}
          style={{ fontFamily: "'Caveat', 'Playfair Display', Georgia, cursive, serif" }}
        >
          Love
        </span>
      </div>
    </div>
  );
};
