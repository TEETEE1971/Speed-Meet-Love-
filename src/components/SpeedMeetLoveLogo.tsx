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
    lg: 'w-8 h-8 sm:w-11 sm:h-11',
    xl: 'w-12 h-12 sm:w-14 sm:h-14',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-[15px] sm:text-2xl lg:text-3xl',
    xl: 'text-2xl sm:text-3xl lg:text-4xl',
  };

  const loveSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-xl sm:text-3xl lg:text-4xl',
    xl: 'text-3xl sm:text-4xl lg:text-5xl',
  };

  return (
    <div className={`inline-flex items-center ${size === 'lg' ? 'gap-1.5 sm:gap-2.5' : 'gap-2.5'} select-none ${className}`}>
      {/* Brand Emblem: Pink and Red Hearts with White Clock */}
      <div
        className={`${iconSizes[size]} aspect-square rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-md relative transition-transform duration-200 group-hover:scale-105 bg-[#FFF5F7] ${
          isOnRed
            ? 'shadow-black/20 ring-2 ring-white/80'
            : 'shadow-rose-500/25 ring-1 ring-rose-200/80'
        }`}
      >
        <img
          src="/assets/speed-meet-love-logo.png"
          alt="Speed Meet Love logo"
          className="w-full h-full object-contain block select-none"
          draggable={false}
        />
      </div>

      {/* Styled Brand Wordmark: SPEED (bold block) MEET (clean caps) Love (decorative script) */}
      <div className="flex items-baseline leading-none font-heading tracking-tight">
        <span
          className={`font-black uppercase tracking-tighter ${textSizes[size]} ${
            isOnRed ? 'text-white' : 'text-[#B91C1C]'
          }`}
        >
          SPEED
        </span>
        <span
          className={`font-extrabold uppercase tracking-wide ${size === 'lg' ? 'ml-1 sm:ml-1.5' : 'ml-1.5'} ${textSizes[size]} ${
            isOnRed ? 'text-rose-100' : 'text-[#111827]'
          }`}
        >
          MEET
        </span>
        <span
          className={`font-serif italic font-black ml-1.5 drop-shadow-xs transition-colors ${loveSizes[size]} ${
            isOnRed ? 'text-white' : 'text-[#BE185D]'
          }`}
          style={{ fontFamily: "'Caveat', 'Playfair Display', Georgia, cursive, serif" }}
        >
          Love
        </span>
      </div>
    </div>
  );
};
