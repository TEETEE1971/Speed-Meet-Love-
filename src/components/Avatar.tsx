import React from 'react';
import { User } from '../types';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showBadge?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  showBadge = false,
  className = '',
}) => {
  const initials = `${user.FirstName[0] || ''}${user.LastName ? user.LastName[0] : ''}`.toUpperCase();
  const fullName = user.LastName ? `${user.FirstName} ${user.LastName}` : user.FirstName;

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden font-bold flex items-center justify-center text-white shadow-md border-2 border-white transition-transform ${className}`}
        style={{
          background: `linear-gradient(135deg, ${user.AvatarColor || '#FF2E93'}, #E11D48)`,
        }}
        title={fullName}
      >
        {user.ProfilePhoto ? (
          <img
            src={user.ProfilePhoto}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showBadge && user.SubscriptionTier === 'Premium Plus' && (
        <span
          className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-[#FF2E93] text-white font-black text-[8px] px-1.5 py-0.5 rounded-full border border-white shadow-xs"
          title="Premium Plus Member"
        >
          PLUS
        </span>
      )}

      {showBadge && user.SubscriptionTier === 'Premium' && (
        <span
          className="absolute -top-1 -right-1 bg-[#FF2E93] text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full border border-white shadow-xs"
          title="Premium Member"
        >
          PRO
        </span>
      )}
    </div>
  );
};
