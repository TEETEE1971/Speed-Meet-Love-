import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, CheckCircle2, AlertTriangle, RefreshCw, X, Sparkles, ExternalLink } from 'lucide-react';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';

export const EmailVerificationModal: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    isOwner,
    isEmailVerificationModalOpen,
    setIsEmailVerificationModalOpen,
    emailVerificationSent,
    refreshCurrentUser,
    resendVerificationEmail,
  } = useApp();

  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (
    !isEmailVerificationModalOpen ||
    !isAuthenticated ||
    !currentUser ||
    currentUser.EmailVerified === true ||
    isOwner ||
    currentUser.IsTester
  ) {
    return null;
  }

  const handleCheckStatus = async () => {
    setError(null);
    setStatusMessage(null);
    setIsChecking(true);
    try {
      const updated = await refreshCurrentUser();
      if (updated?.EmailVerified) {
        setIsEmailVerificationModalOpen(false);
      } else {
        setStatusMessage('Not verified yet. Open the verification email we sent you and click the link, then return here.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setStatusMessage(null);
    setIsResending(true);
    try {
      const res = await resendVerificationEmail(currentUser.Email);
      if (res.success && res.emailSent) {
        setStatusMessage(`A new verification link has been sent to ${currentUser.Email}. Check your inbox and spam folder.`);
      } else {
        setError(res.error || 'Unable to send verification email right now. Please try again shortly.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-2 border-pink-300 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        <div className="bg-gradient-to-r from-[#FF2E93] via-rose-600 to-red-600 p-5 text-white relative">
          <button
            type="button"
            onClick={() => setIsEmailVerificationModalOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Close email verification modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-2">
            <SpeedMeetLoveLogo variant="on-red" size="sm" />
          </div>
          <h2 className="text-xl font-black font-heading tracking-tight flex items-center gap-2">
            <Mail className="w-5 h-5 shrink-0" />
            <span>Verify Your Email Address</span>
          </h2>
          <p className="text-xs text-rose-100 font-medium mt-1">
            {emailVerificationSent === false
              ? <>Your verification link for <strong className="text-white">{currentUser.Email}</strong> has not been confirmed delivered yet. Tap “Resend verification email” below.</>
              : <>We sent a verification link to <strong className="text-white">{currentUser.Email}</strong>. Open your inbox (or spam folder) and click the link in that email to verify your account.</>}
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-teal-50 border border-pink-200 text-xs text-[#111827] font-semibold leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
            <span>
              Our first 50 eligible members receive one month of Premium FREE! Sign up and verify your email to discover if you’ve claimed a spot.
            </span>
          </div>

          {emailVerificationSent === false && !error && !statusMessage && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-[#92400E] text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
              <span>We could not confirm outbound delivery for your verification link yet. Tap “Resend verification email” below or try again shortly.</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-[#881337] text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#BE123C] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-[#065F46] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#111827] font-medium leading-relaxed flex items-start gap-2.5">
            <ExternalLink className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
            <span>
              After you follow the link in your email, return to this screen — your verification status refreshes automatically.
            </span>
          </div>

          <button
            type="button"
            disabled={isChecking}
            onClick={handleCheckStatus}
            className="w-full py-3 rounded-2xl btn-glossy-red-pink text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer disabled:opacity-60 transition-all"
          >
            {isChecking ? 'Checking Verification Status...' : 'I Clicked the Email Link · Refresh Status'}
          </button>

          <div className="flex items-center justify-center pt-2 border-t border-slate-200 text-xs">
            <button
              type="button"
              disabled={isResending}
              onClick={handleResend}
              className="inline-flex items-center gap-1.5 font-bold text-[#BE185D] hover:underline cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              <span>{isResending ? 'Sending...' : 'Resend verification email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
