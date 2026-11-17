import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FloatingHearts } from './FloatingHearts';
import { Heart, Sparkles, MessageCircle, Calendar, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export const LaunchOfferCelebrationModal: React.FC = () => {
  const { currentUser, isAuthenticated, markLaunchOfferCelebrated, setCurrentView } = useApp();
  const [isClosing, setIsClosing] = useState(false);

  const shouldShow = Boolean(
    isAuthenticated &&
      currentUser &&
      currentUser.EmailVerified === true &&
      currentUser.LaunchOfferGranted === true &&
      typeof currentUser.LaunchOfferGrantNumber === 'number' &&
      currentUser.LaunchOfferGrantNumber >= 1 &&
      currentUser.LaunchOfferGrantNumber <= 50 &&
      currentUser.LaunchOfferCelebrationPending === true
  );

  useEffect(() => {
    if (!shouldShow) return;
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#FF2E93', '#14B8A6', '#DC2626', '#EAB308', '#F43F5E'],
      });
    } catch {
      // Ignore confetti errors in headless browsers without canvas support
    }
  }, [shouldShow]);

  if (!shouldShow || !currentUser || !currentUser.LaunchOfferGrantNumber) {
    return null;
  }

  const grantNumber = currentUser.LaunchOfferGrantNumber;
  const expiresLabel = currentUser.LaunchOfferExpiresAt
    ? new Date(currentUser.LaunchOfferExpiresAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '30 days from today';

  const handleClose = async (navigateTo?: 'browse' | 'pricing') => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await markLaunchOfferCelebrated();
      if (navigateTo) {
        setCurrentView(navigateTo);
      }
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-offer-celebration-title"
    >
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-pink-300 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Animated Colorful Hearts Backdrop */}
        <div className="relative bg-gradient-to-br from-[#FF2E93] via-rose-500 to-teal-500 px-6 pt-8 pb-7 text-white text-center overflow-hidden">
          <FloatingHearts count={10} colors={['turquoise', 'pink', 'red', 'yellow', 'white']} />

          <button
            type="button"
            disabled={isClosing}
            onClick={() => handleClose()}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/25 hover:bg-white/35 text-white transition-colors cursor-pointer"
            aria-label="Close celebration popup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 flex flex-col items-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 fill-[#14B8A6] text-white animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs border-2 border-white/70 flex items-center justify-center shadow-lg">
                <Heart className="w-9 h-9 fill-white text-white animate-pulse" />
              </div>
              <Heart className="w-6 h-6 fill-[#EAB308] text-white animate-bounce" style={{ animationDelay: '0.25s' }} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/40 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Founding Launch Member Reward</span>
            </div>

            <h2
              id="launch-offer-celebration-title"
              className="text-2xl sm:text-3xl font-black font-heading tracking-tight leading-tight drop-shadow-xs"
            >
              Congratulations! You’re #{grantNumber}
            </h2>
          </div>
        </div>

        {/* Details & Actions */}
        <div className="relative p-6 sm:p-7 space-y-5 bg-gradient-to-b from-[#FFF8FA] to-white text-center">
          <p className="text-sm sm:text-base font-bold text-[#111827] leading-relaxed">
            You’re officially one of our first 50 eligible members and have unlocked{' '}
            <span className="text-[#BE185D]">30 days of Premium FREE</span>!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs">
            <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200 flex items-start gap-2.5">
              <MessageCircle className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#111827] block">Premium Messaging Active</span>
                <span className="text-[#111827] font-medium">
                  Exchange private messages after mutual matches at $0 during your free month.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#111827] block">30-Day Access Window</span>
                <span className="text-[#111827] font-medium">
                  Active now through <strong>{expiresLabel}</strong>. No card required.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              disabled={isClosing}
              onClick={() => handleClose('browse')}
              className="flex-1 py-3 px-5 rounded-2xl btn-glossy-red-pink text-white font-extrabold text-sm shadow-lg cursor-pointer disabled:opacity-60 transition-all"
            >
              {isClosing ? 'Activating...' : 'Start Browsing & Matching'}
            </button>
            <button
              type="button"
              disabled={isClosing}
              onClick={() => handleClose()}
              className="py-3 px-5 rounded-2xl bg-white hover:bg-rose-50 text-[#111827] border border-rose-200 font-bold text-sm cursor-pointer disabled:opacity-60 transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
