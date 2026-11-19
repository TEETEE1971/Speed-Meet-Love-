import React, { useMemo } from 'react';

interface HeroGoldAnalogClockProps {
  className?: string;
}

const TICK_MARKS = Array.from({ length: 60 }, (_, index) => {
  const angleDeg = index * 6;
  const isCardinal = index % 15 === 0;
  const isHour = index % 5 === 0;
  return {
    index,
    angleDeg,
    isCardinal,
    isHour,
  };
});

export const HeroGoldAnalogClock: React.FC<HeroGoldAnalogClockProps> = ({
  className = '',
}) => {
  // Compute exact starting angles once so CSS transforms sweep smoothly from current local time
  const initialAngles = useMemo(() => {
    const now = new Date();
    const ms = now.getMilliseconds();
    const seconds = now.getSeconds() + ms / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    return {
      second: Number((seconds * 6).toFixed(2)),
      minute: Number((minutes * 6).toFixed(2)),
      hour: Number((hours * 30).toFixed(2)),
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none aspect-square w-[min(74vw,270px)] h-[min(74vw,270px)] sm:w-[340px] sm:h-[340px] md:w-[390px] md:h-[390px] lg:w-[430px] lg:h-[430px] opacity-[0.27] sm:opacity-[0.29] ${className}`}
    >
      {/* Static Transparent Dial & Refined Gold Bezel */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
      >
        <defs>
          <linearGradient id="heroClockGoldRing" x1="36" y1="36" x2="364" y2="364" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#B8860B" />
            <stop offset="32%" stopColor="#E5C158" />
            <stop offset="65%" stopColor="#C99A2E" />
            <stop offset="100%" stopColor="#A67608" />
          </linearGradient>
          <linearGradient id="heroClockGoldSubtle" x1="60" y1="40" x2="340" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#B8860B" />
            <stop offset="100%" stopColor="#E5C158" />
          </linearGradient>
        </defs>

        {/* Outer Gold Rim (Transparent Clock Face) */}
        <circle
          cx="200"
          cy="200"
          r="188"
          stroke="url(#heroClockGoldRing)"
          strokeWidth="2.4"
          strokeOpacity="0.95"
        />

        {/* Delicate Double Bezel Hairline */}
        <circle
          cx="200"
          cy="200"
          r="181"
          stroke="url(#heroClockGoldSubtle)"
          strokeWidth="0.85"
          strokeOpacity="0.65"
        />

        {/* Subtle Inner Chapter Ring */}
        <circle
          cx="200"
          cy="200"
          r="152"
          stroke="url(#heroClockGoldSubtle)"
          strokeWidth="0.65"
          strokeOpacity="0.4"
          strokeDasharray="2 4"
        />

        {/* 60 Minute & 12 Hour Markers */}
        {TICK_MARKS.map(({ index, angleDeg, isCardinal, isHour }) => (
          <g key={index} transform={`rotate(${angleDeg} 200 200)`}>
            {isCardinal ? (
              <>
                <line
                  x1="198.2"
                  y1="25"
                  x2="198.2"
                  y2="46"
                  stroke="url(#heroClockGoldRing)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeOpacity="0.95"
                />
                <line
                  x1="201.8"
                  y1="25"
                  x2="201.8"
                  y2="46"
                  stroke="url(#heroClockGoldRing)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeOpacity="0.95"
                />
              </>
            ) : isHour ? (
              <line
                x1="200"
                y1="26"
                x2="200"
                y2="43"
                stroke="url(#heroClockGoldRing)"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeOpacity="0.88"
              />
            ) : (
              <line
                x1="200"
                y1="27"
                x2="200"
                y2="34"
                stroke="url(#heroClockGoldSubtle)"
                strokeWidth="1.05"
                strokeLinecap="round"
                strokeOpacity="0.52"
              />
            )}
          </g>
        ))}
      </svg>

      {/* Hour Hand Layer (GPU-Composited Rotation) */}
      <div className="absolute inset-0 hero-clock-spin-hour">
        <svg
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full block"
        >
          <g transform={`rotate(${initialAngles.hour} 200 200)`}>
            <polygon
              points="200,114 203.8,196 202.2,222 197.8,222 196.2,196"
              fill="#B8860B"
              fillOpacity="0.88"
            />
          </g>
        </svg>
      </div>

      {/* Minute Hand Layer (GPU-Composited Rotation) */}
      <div className="absolute inset-0 hero-clock-spin-minute">
        <svg
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full block"
        >
          <g transform={`rotate(${initialAngles.minute} 200 200)`}>
            <polygon
              points="200,70 202.8,196 201.6,228 198.4,228 197.2,196"
              fill="#C99A2E"
              fillOpacity="0.92"
            />
          </g>
        </svg>
      </div>

      {/* Smoothly Sweeping Second Hand Layer (GPU-Composited Rotation) */}
      <div className="absolute inset-0 hero-clock-spin-second">
        <svg
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full block"
        >
          <g transform={`rotate(${initialAngles.second} 200 200)`}>
            <line
              x1="200"
              y1="234"
              x2="200"
              y2="52"
              stroke="#B8860B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.95"
            />
            <circle
              cx="200"
              cy="226"
              r="3.2"
              stroke="#B8860B"
              strokeWidth="1.3"
              fill="none"
              strokeOpacity="0.85"
            />
          </g>
        </svg>
      </div>

      {/* Center Pinion Hub */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full block"
      >
        <circle
          cx="200"
          cy="200"
          r="6.2"
          stroke="#B8860B"
          strokeWidth="1.8"
          fill="#FFF5F7"
          fillOpacity="0.55"
        />
        <circle cx="200" cy="200" r="2.4" fill="#B8860B" />
      </svg>
    </div>
  );
};
