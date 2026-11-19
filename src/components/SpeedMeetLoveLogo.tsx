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
    lg: 'w-8 h-8 min-[390px]:w-9 min-[390px]:h-9 sm:w-11 sm:h-11',
    xl: 'w-12 h-12 sm:w-14 sm:h-14',
  };

  const textSizes = {
    sm: 'text-[15px]',
    md: 'text-lg sm:text-xl',
    lg: 'text-[13.5px] min-[390px]:text-[15.5px] sm:text-2xl lg:text-[26px]',
    xl: 'text-2xl sm:text-3xl lg:text-4xl',
  };

  const loveSizes = {
    sm: 'text-[22px]',
    md: 'text-[26px] sm:text-[30px]',
    lg: 'text-[20px] min-[390px]:text-[23px] sm:text-[34px] lg:text-[38px]',
    xl: 'text-4xl sm:text-5xl lg:text-6xl',
  };

  return (
    <div
      className={`inline-flex items-center ${
        size === 'lg' ? 'gap-1.5 sm:gap-2.5' : 'gap-2.5'
      } select-none ${className}`}
    >
      {/* Gently Pulsing Brand Heart Logo */}
      <div
        className={`${iconSizes[size]} aspect-square rounded-2xl overflow-hidden flex items-center justify-center shrink-0 relative transition-transform duration-200 group-hover:scale-105 bg-[#FFF5F7] animate-brand-heart-pulse ${
          isOnRed
            ? 'shadow-black/25 ring-2 ring-white/85'
            : 'shadow-rose-500/25 ring-1 ring-rose-200/90'
        }`}
      >
        <img
          src="/assets/speed-meet-love-logo.png"
          alt="Speed Meet Love logo"
          className="w-full h-full object-contain block select-none"
          draggable={false}
        />
      </div>

      {/* Steady Brand Wordmark: Bold "SPEED MEET" + Elegant Script "Love" with Occasional Subtle Shimmer */}
      <div className="relative inline-flex items-baseline leading-none font-heading overflow-hidden rounded-lg px-0.5 py-0.5">
        <span
          className={`font-black uppercase tracking-[-0.02em] ${textSizes[size]} ${
            isOnRed
              ? 'text-white [text-shadow:0_1px_2px_rgba(127,29,29,0.38)]'
              : 'text-[#B91C1C]'
          }`}
        >
          SPEED
        </span>
        <span
          className={`font-extrabold uppercase tracking-[0.04em] ${
            size === 'lg' ? 'ml-1 sm:ml-1.5' : 'ml-1.5'
          } ${textSizes[size]} ${
            isOnRed
              ? 'text-rose-100 [text-shadow:0_1px_2px_rgba(127,29,29,0.34)]'
              : 'text-[#111827]'
          }`}
        >
          MEET
        </span>
        <span
          className={`font-brand-script font-bold tracking-normal ${
            size === 'lg' ? 'ml-1 sm:ml-1.5' : 'ml-1.5'
          } pr-1 leading-none ${loveSizes[size]} ${
            isOnRed
              ? 'text-[#FFF5F9] [text-shadow:0_1px_8px_rgba(255,192,224,0.5),0_1px_2px_rgba(127,29,29,0.4)]'
              : 'text-[#BE185D]'
          }`}
        >
          Love
        </span>

        {/* Subtle Occasional Light Shimmer Passing Across Wordmark */}
        <span
          aria-hidden="true"
          className={`pointer-events-none select-none absolute inset-y-0 -left-1/3 w-1/3 animate-brand-shimmer ${
            isOnRed
              ? 'bg-gradient-to-r from-transparent via-white/35 to-transparent'
              : 'bg-gradient-to-r from-transparent via-rose-200/45 to-transparent'
          }`}
        />
      </div>
    </div>
  );
};
