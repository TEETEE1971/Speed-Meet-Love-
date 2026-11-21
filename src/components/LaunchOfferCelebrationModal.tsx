import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FloatingHearts } from './FloatingHearts';
import { Heart, Sparkles, MessageCircle, Calendar, X, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

export const LaunchOfferCelebrationModal: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    speedDatingLaunched,
    markLaunchOfferCelebrated,
    markLaunchOfferActivationSeen,
    setCurrentView,
  } = useApp();
  const [isClosing, setIsClosing] = useState(false);

  const hasValidGrant = Boolean(
    isAuthenticated &&
      currentUser &&
      currentUser.EmailVerified === true &&
      currentUser.LaunchOfferGranted === true &&
      typeof currentUser.LaunchOfferGrantNumber === 'number' &&
      currentUser.LaunchOfferGrantNumber >= 1 &&
      currentUser.LaunchOfferGrantNumber <= 50
  );

  const isCelebrationPending = Boolean(hasValidGrant && currentUser?.LaunchOfferCelebrationPending === true);
  const isActivationNoticePending = Boolean(
    hasValidGrant &&
      speedDatingLaunched &&
      currentUser?.LaunchOfferActive === true &&
      currentUser?.LaunchOfferActivationPending === true
  );

  const shouldShow = isCelebrationPending || isActivationNoticePending;

  // Determine which hearts celebration view to render:
  // - If speed dating has officially launched and reward is active (either activation notice or first visit post-launch),
  //   show the official activation in-app notification.
  // - Otherwise (pre-launch reservation), show the exact First-50 reservation hearts celebration.
  const isLaunchActivationMode = Boolean(
    (isActivationNoticePending && !isCelebrationPending) ||
      (speedDatingLaunched && currentUser?.LaunchOfferActive === true)
  );

  useEffect(() => {
    if (!shouldShow) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    try {
      confetti({
        particleCount: 75,
        spread: 85,
        origin: { y: 0.55 },
        colors: ['#FF2E93', '#14B8A6', '#DC2626', '#EAB308', '#F43F5E'],
      });
    } catch {
      // Ignore confetti errors in headless browsers without canvas support
    }
  }, [shouldShow, isLaunchActivationMode]);

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

  const handleClose = async (navigateTo?: 'browse' | 'friday' | 'pricing') => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      if (isCelebrationPending) {
        await markLaunchOfferCelebrated();
      }
      if (isActivationNoticePending) {
        await markLaunchOfferActivationSeen();
      }
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
        <div className="relative bg-gradient-to-br from-[#FF2E93] via-rose-500 to-red-600 px-6 pt-8 pb-7 text-white text-center overflow-hidden">
          <FloatingHearts count={14} colors={['turquoise', 'pink', 'red', 'yellow', 'white']} />

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
              <span>
                {isLaunchActivationMode
                  ? `Speed Dating Launched · Member #${grantNumber}`
                  : `First 50 Founding Member · #${grantNumber} of 50`}
              </span>
            </div>

            <h2
              id="launch-offer-celebration-title"
              className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight leading-tight drop-shadow-xs"
            >
              {isLaunchActivationMode
                ? `Your Free Month of Premium+ Has Begun!`
                : `Congratulations! Member #${grantNumber}`}
            </h2>
          </div>
        </div>

        {/* Details & Actions */}
        <div className="relative p-6 sm:p-7 space-y-5 bg-gradient-to-b from-[#FFF8FA] to-white text-center">
          <p className="text-sm sm:text-base font-bold text-[#111827] leading-relaxed">
            {isLaunchActivationMode ? (
              <>
                Speed dating on Speed Meet Love has officially launched! As member{' '}
                <span className="text-[#BE185D]">#{grantNumber}</span> of our first 50, your earned{' '}
                <span className="text-[#BE185D]">one free month of Premium+</span> is now active through{' '}
                <strong>{expiresLabel}</strong>.
              </>
            ) : (
              <>
                Congratulations! You’re member #{grantNumber} of our first 50! You’ve earned one free month of Premium+. Your month will begin when our speed-dating events officially launch.
              </>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs">
            <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200 flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#111827] block">
                  {isLaunchActivationMode ? '30-Day Premium+ Active Now' : 'Safely Reserved Until Launch'}
                </span>
                <span className="text-[#111827] font-medium">
                  {isLaunchActivationMode ? (
                    <>
                      Enjoy live speed-dating events, private mutual-match messaging, and VIP perks through <strong>{expiresLabel}</strong>.
                    </>
                  ) : (
                    <>
                      Your reward month does not start at signup and will not expire while we build our community.
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#111827] block">No Card · Never Auto-Charged</span>
                <span className="text-[#111827] font-medium">
                  No credit card required. You will never be automatically charged when your free month ends.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              disabled={isClosing}
              onClick={() => handleClose(isLaunchActivationMode ? 'friday' : 'browse')}
              className="flex-1 py-3 px-5 rounded-2xl btn-glossy-red-pink text-white font-extrabold text-sm shadow-lg cursor-pointer disabled:opacity-60 transition-all flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {isClosing
                  ? 'Saving...'
                  : isLaunchActivationMode
                  ? 'Explore Speed-Dating Events'
                  : 'Start Browsing & Matching'}
              </span>
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
