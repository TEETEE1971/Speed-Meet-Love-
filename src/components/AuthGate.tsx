import React from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Heart, ShieldCheck, ArrowRight, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';

interface AuthGateProps {
  featureName?: string;
  description?: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  featureName = 'Private Member Features',
  description = 'Weekend Speed Dating, mutual matches, profile browsing, and private messaging strictly require an authenticated adult account.',
}) => {
  const { openAuthModal, setCurrentView } = useApp();

  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 text-center animate-in fade-in duration-200 space-y-6">
      
      {/* Icon Badge */}
      <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-red-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-pink-500/25">
        <Lock className="w-8 h-8 stroke-[2.25]" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-[#991B1B] text-xs font-bold border border-rose-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Members Only · 18+ Verified</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] font-heading">
          Sign In to Access {featureName}
        </h2>
        <p className="text-xs sm:text-sm text-[#111827] font-medium max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="p-6 rounded-3xl bg-white border-2 border-rose-200 shadow-lg space-y-3">
        <button
          onClick={() => openAuthModal('signin')}
          className="w-full py-3.5 rounded-2xl btn-glossy-red-pink text-white font-bold text-sm shadow-md shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In to Your Account</span>
        </button>

        <button
          onClick={() => openAuthModal('signup')}
          className="w-full py-3.5 rounded-2xl bg-white hover:bg-rose-50 active:scale-95 text-[#991B1B] font-bold text-sm border-2 border-rose-300 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New Account (18+)</span>
        </button>

        <div className="pt-2 text-xs text-[#111827] font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#047857]" />
          <span>Identity &amp; adult age verified securely on server</span>
        </div>
      </div>

      {/* Return to Home Link */}
      <div>
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111827] hover:text-[#B91C1C] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Speed Meet Love Home</span>
        </button>
      </div>

    </div>
  );
};
