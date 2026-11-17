import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Heart,
  Calendar,
  MessageCircle,
  Video,
  AlertCircle,
  ExternalLink,
  CreditCard,
  RefreshCw,
  Smartphone,
  Globe,
} from 'lucide-react';
import { SubscriptionTier } from '../types';

interface StripeConfigResponse {
  success: boolean;
  isConfigured: boolean;
  mode?: 'live' | 'sandbox' | 'unconfigured';
  isLiveMode?: boolean;
  sandboxMode?: boolean;
  premiumPlusPaused?: boolean;
  premiumPlusPauseMessage?: string;
  publishableKey: string | null;
  appUrl?: string;
  webhookRoute?: string;
  prices?: {
    premium: {
      id: string;
      tier: string;
      name: string;
      amount: number;
      interval: string;
      currency: string;
    };
    premiumPlus: {
      id: string;
      tier: string;
      name: string;
      amount: number;
      interval: string;
      currency: string;
    };
  };
}

export const SubscriptionScreen: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    setSubscriptionTier,
    showNotification,
    appMode,
    openAuthModal,
    setIsEmailVerificationModalOpen,
    authToken,
    syncAuthSession,
    waitlistJoined,
    waitlistLoading,
    joinWaitlist,
    leaveWaitlist,
    setCurrentView,
    confirmedLaunchEvents,
  } = useApp();

  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState<boolean>(false);
  const [selectedPlanToCheckout, setSelectedPlanToCheckout] = useState<SubscriptionTier | null>(null);
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfigResponse | null>(null);
  const isWaitlistModeActive = confirmedLaunchEvents.length === 0;

  const currentTier = currentUser?.SubscriptionTier || 'Free';
  const isTester = Boolean(currentUser?.IsTester || currentUser?.UserID === 'usr_kristy');
  const hasActiveLaunchGrant = Boolean(
    isAuthenticated &&
      currentUser?.EmailVerified &&
      currentUser?.LaunchOfferGranted &&
      currentUser?.LaunchOfferActive &&
      currentUser?.LaunchOfferGrantNumber
  );
  const launchGrantExpiresLabel = currentUser?.LaunchOfferExpiresAt
    ? new Date(currentUser.LaunchOfferExpiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Load public Stripe configuration & authoritative price IDs from backend config endpoint
  const fetchStripeConfig = async (): Promise<StripeConfigResponse | null> => {
    try {
      const res = await fetch('/api/stripe/config');
      const data = await res.json();
      if (data?.success) {
        setStripeConfig(data);
        return data;
      }
    } catch {
      // Ignore network errors on passive load; handled on action
    }
    return null;
  };

  useEffect(() => {
    fetchStripeConfig();
  }, []);

  const frontendPublishableKey =
    (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
    (import.meta as any).env?.STRIPE_PUBLISHABLE_KEY ||
    stripeConfig?.publishableKey ||
    null;

  // Detect whether the user is viewing inside the Google Play Android app (WebView/TWA)
  const isGooglePlayAndroidApp = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua = (window.navigator?.userAgent || '').toLowerCase();
    const isAndroidWebView =
      ua.includes('wv') ||
      (ua.includes('android') && (ua.includes('version/') || ua.includes('build/')));
    const hasAndroidParam = new URLSearchParams(window.location.search).get('platform') === 'android';
    const isAppFlag = (window as any).isGooglePlayApp === true;
    return isAndroidWebView || hasAndroidParam || isAppFlag;
  };

  const isAndroid = isGooglePlayAndroidApp();

  // Listen for Stripe redirect parameters (?status=success or ?canceled=true)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success' || params.get('session_id')) {
      showNotification('✓ Subscription confirmed! Your Speed Meet Love plan is now active.', 'success');
      if (currentUser && syncAuthSession) {
        syncAuthSession(currentUser);
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('session_id');
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    } else if (params.get('canceled') === 'true') {
      showNotification('Checkout was canceled. No charges were made.', 'pink');
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
    }
  }, [showNotification, syncAuthSession]);

  const serverMode: 'live' | 'sandbox' | 'unconfigured' = stripeConfig?.mode
    ? stripeConfig.mode
    : stripeConfig?.isConfigured
    ? stripeConfig.isLiveMode
      ? 'live'
      : 'sandbox'
    : 'unconfigured';

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (!currentUser) {
      openAuthModal('signin');
      return;
    }

    if (tier === currentTier) return;

    if (tier === 'Free') {
      // Free downgrades / browsing
      setSubscriptionTier('Free');
      showNotification('Plan switched to Free ($0/mo). Browsing and mutual match viewing active.', 'pink');
      return;
    }

    // Pause new paid Premium Plus purchases during launch waiting list
    if (tier === 'Premium Plus') {
      showNotification('Event membership coming soon.', 'pink');
      return;
    }

    // Google Play app separation: Keep Stripe checkout out of Google Play Android app
    if (isAndroid) {
      showNotification(
        'Stripe web checkout is reserved for the web browser. Subscriptions in Google Play will use Google Play In-App Billing.',
        'pink'
      );
      return;
    }

    // Resolve authoritative Price ID from /api/stripe/config
    setLoadingTier(tier);
    setStripeConfigError(null);

    try {
      const latestConfig = (await fetchStripeConfig()) || stripeConfig;
      const priceId =
        tier === 'Premium'
          ? latestConfig?.prices?.premium?.id
          : latestConfig?.prices?.premiumPlus?.id;

      if (!priceId) {
        const msg = 'Unable to load Stripe pricing configuration from server.';
        setStripeConfigError(msg);
        setSelectedPlanToCheckout(tier);
        return;
      }

      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ priceId, tier }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        // Redirect to authenticated Stripe Checkout session
        window.location.href = data.url;
      } else {
        // If Stripe secret key is pending in environment, show setup diagnostic
        const msg = data.error || 'Unable to connect to Stripe Checkout.';
        setStripeConfigError(msg);
        setSelectedPlanToCheckout(tier);
      }
    } catch (err: any) {
      setStripeConfigError(err.message || 'Network error reaching Stripe checkout endpoint.');
      setSelectedPlanToCheckout(tier);
    } finally {
      setLoadingTier(null);
    }
  };

  const handleOpenCustomerPortal = async () => {
    if (!currentUser) {
      openAuthModal('signin');
      return;
    }
    setLoadingPortal(true);
    try {
      const token = authToken || localStorage.getItem('sml_brand_v6_authToken');
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        showNotification(
          data.error || 'No active Stripe customer found. Subscribe via Stripe first.',
          'pink'
        );
      }
    } catch (err: any) {
      showNotification(err.message || 'Error opening Stripe customer portal.', 'pink');
    } finally {
      setLoadingPortal(false);
    }
  };

  const confirmSimulationCheckout = () => {
    if (selectedPlanToCheckout) {
      setSubscriptionTier(selectedPlanToCheckout);
      setSelectedPlanToCheckout(null);
      setStripeConfigError(null);
      showNotification(`Activated ${selectedPlanToCheckout} in sandbox demo mode!`, 'success');
    }
  };

  const comparisonRows: Array<{
    feature: string;
    free: { text: string; tone: 'emerald' | 'neutral' };
    premium: { text: string; tone: 'emerald' | 'pink' | 'neutral' };
    premiumPlus: { text: string; tone: 'emerald' | 'pink' | 'amber' | 'neutral' };
  }> = [
    {
      feature: 'Create Profile & Browse Members',
      free: { text: 'Yes (Browsing only)', tone: 'emerald' },
      premium: { text: 'Yes', tone: 'emerald' },
      premiumPlus: { text: 'Yes', tone: 'emerald' },
    },
    {
      feature: 'Like or Pass Other Members',
      free: { text: 'Yes', tone: 'emerald' },
      premium: { text: 'Yes', tone: 'emerald' },
      premiumPlus: { text: 'Yes', tone: 'emerald' },
    },
    {
      feature: 'See Mutual Matches',
      free: { text: 'Yes', tone: 'emerald' },
      premium: { text: 'Yes', tone: 'emerald' },
      premiumPlus: { text: 'Yes', tone: 'emerald' },
    },
    {
      feature: 'Private Messaging After Mutual Match',
      free: { text: 'Locked (Browsing only)', tone: 'neutral' },
      premium: { text: 'Unlocked (with paid matches)', tone: 'pink' },
      premiumPlus: { text: 'Unlocked (with paid matches)', tone: 'pink' },
    },
    {
      feature: isWaitlistModeActive
        ? 'Live Speed Dating Schedule'
        : 'Speed Dating Schedule (3 Nights Weekly)',
      free: { text: 'No', tone: 'neutral' },
      premium: { text: 'No', tone: 'neutral' },
      premiumPlus: isWaitlistModeActive
        ? { text: 'First event date coming soon', tone: 'amber' }
        : { text: 'Fri, Sat & Sun at 7:00 PM EST', tone: 'amber' },
    },
    {
      feature: isWaitlistModeActive
        ? 'Event Registration & Night Selection'
        : 'Choose Nights & Multi-Night Registration',
      free: { text: 'No', tone: 'neutral' },
      premium: { text: 'No', tone: 'neutral' },
      premiumPlus: isWaitlistModeActive
        ? { text: 'First event date coming soon', tone: 'amber' }
        : { text: 'Included (Attend 1, 2, or all 3)', tone: 'amber' },
    },
    {
      feature: '5-Minute Video Rounds & Up to 2-Min Break',
      free: { text: 'No', tone: 'neutral' },
      premium: { text: 'No', tone: 'neutral' },
      premiumPlus: isWaitlistModeActive
        ? { text: 'First event date coming soon', tone: 'amber' }
        : { text: 'Active', tone: 'amber' },
    },
    {
      feature: 'Consent-Based Next Date & Waiting Room',
      free: { text: 'No', tone: 'neutral' },
      premium: { text: 'No', tone: 'neutral' },
      premiumPlus: isWaitlistModeActive
        ? { text: 'First event date coming soon', tone: 'amber' }
        : { text: 'Included (No auto-start)', tone: 'amber' },
    },
    {
      feature: 'Round Skip & Replay Perks',
      free: { text: 'No', tone: 'neutral' },
      premium: { text: 'No', tone: 'neutral' },
      premiumPlus: isWaitlistModeActive
        ? { text: 'First event date coming soon', tone: 'amber' }
        : { text: 'Included', tone: 'amber' },
    },
  ];

  const getToneClass = (tone: 'emerald' | 'pink' | 'amber' | 'neutral') => {
    switch (tone) {
      case 'emerald':
        return 'text-[#047857] font-bold';
      case 'pink':
        return 'text-[#BE185D] font-bold';
      case 'amber':
        return 'text-[#B45309] font-bold';
      case 'neutral':
      default:
        return 'text-[#111827] font-semibold';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Free Tester Isolation Advisory (shown only for testers, no Stripe diagnostic banner) */}
      {isTester && (
        <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 border border-pink-200 shadow-xs text-[11px] text-[#111827] font-medium flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
            <span>
              <strong>Tester Privilege Notice:</strong> Your free tester access grants all platform features and remains separate from your paid subscription status in Firestore.
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#065F46] bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
            Free Tester Access Active
          </span>
        </div>
      )}

      {/* Google Play App Mode Advisory */}
      {isAndroid && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-xs text-[#111827] shadow-xs">
          <Smartphone className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold font-heading text-[#78350F] text-sm block">
              Google Play In-App Billing Mode
            </span>
            <p className="text-[#111827] font-medium leading-relaxed text-[11px]">
              You are currently viewing Speed Meet Love within an Android app container. In compliance with Google Play Store policies, web Stripe checkout is disabled here. Subscriptions on Android will be processed via Google Play In-App Billing upon official release. To subscribe using Stripe web checkout, open <strong>speedmeetlove.com</strong> in your browser.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 border border-pink-300 text-xs font-bold text-[#BE185D] uppercase tracking-widest font-heading">
          <Crown className="w-3.5 h-3.5 text-[#B45309]" />
          <span>Speed Meet Love Membership</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-[#111827] tracking-tight font-heading">
          Transparent Pricing for{' '}
          <span className="bg-gradient-to-r from-[#BE185D] via-[#E11D48] to-[#B91C1C] bg-clip-text text-transparent">
            Real Chemistry
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[#111827] font-medium max-w-2xl mx-auto">
          Free allows browsing and joining the free event waiting list. Upgrade to Premium ($9.99/mo) for private messaging after mutual matches. New Premium Plus event memberships are paused while we welcome our first members.
        </p>

        {(!isAuthenticated || !currentUser?.EmailVerified) && (
          <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-teal-50 border-2 border-pink-300 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm font-bold text-[#111827]">
              <Heart className="w-4 h-4 text-[#BE185D] fill-[#BE185D] shrink-0 mt-0.5" />
              <span>
                Our first 50 eligible members receive one month of Premium FREE! Sign up and verify your email to discover if you’ve claimed a spot.
              </span>
            </div>
            <button
              type="button"
              onClick={() => (isAuthenticated ? setIsEmailVerificationModalOpen(true) : openAuthModal('signup'))}
              className="px-4 py-2 rounded-full bg-[#BE185D] hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              {isAuthenticated ? 'Verify Email' : 'Sign Up Now'}
            </button>
          </div>
        )}

        {hasActiveLaunchGrant && currentUser?.LaunchOfferGrantNumber && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-white to-teal-50 border-2 border-teal-300 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#111827]">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 text-[#BE185D] shrink-0" />
              <span>
                Launch Offer Active: Recipient <strong>#{currentUser.LaunchOfferGrantNumber}</strong> — 30 Days of Premium FREE!
              </span>
            </div>
            {launchGrantExpiresLabel && (
              <span className="px-2.5 py-1 rounded-full bg-teal-100 text-[#0F766E] border border-teal-300 font-bold text-[11px] shrink-0">
                Active through {launchGrantExpiresLabel}
              </span>
            )}
          </div>
        )}

        {/* Customer Billing Portal Shortcut if already subscribed via Stripe */}
        {(currentTier === 'Premium' || currentTier === 'Premium Plus') && !isAndroid && Boolean(currentUser?.StripeCustomerId || currentUser?.SubscriptionStatus === 'active') && (
          <div className="pt-2">
            <button
              type="button"
              disabled={loadingPortal}
              onClick={handleOpenCustomerPortal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-pink-300 text-xs font-bold text-[#111827] hover:bg-rose-50 hover:border-[#BE185D] transition-all shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-[#BE185D]" />
              <span>{loadingPortal ? 'Opening Portal...' : 'Manage Subscription & Invoices (Stripe Portal)'}</span>
              <ExternalLink className="w-3 h-3 text-[#111827]" />
            </button>
          </div>
        )}
      </div>

      {/* 3 Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Tier 1: FREE — $0/month */}
        <div
          className={`rounded-3xl p-6 sm:p-7 bg-white border flex flex-col justify-between transition-all ${
            currentTier === 'Free'
              ? 'border-slate-500 shadow-md ring-1 ring-slate-400'
              : 'border-pink-200 hover:border-pink-300 shadow-sm'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#111827] uppercase tracking-wider font-heading">
                  Tier 1
                </span>
                <h3 className="text-2xl font-bold text-[#111827] font-heading mt-0.5">FREE</h3>
              </div>
              {currentTier === 'Free' && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-[#111827] border border-slate-300 font-bold">
                  Active
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#111827] font-heading">$0</span>
                <span className="text-xs text-[#111827] font-medium">/ month</span>
              </div>
              <p className="text-xs text-[#111827] font-medium mt-1">Browse members and uncover mutual sparks</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200 text-xs text-[#111827] font-medium">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                <span>Create and edit your dating profile</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                <span><strong>Browse dating profiles</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                <span>Like or pass other members</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                <span><strong>See mutual matches</strong> when feelings align</span>
              </div>
              <div className="flex items-start gap-2.5 text-[#111827] font-medium pt-1">
                <X className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
                <span>No private messaging (Browsing only)</span>
              </div>
              <div className="flex items-start gap-2.5 text-[#111827] font-medium">
                <X className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
                <span>No live video speed dating</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              disabled={currentTier === 'Free'}
              onClick={() => handleSelectPlan('Free')}
              className={`w-full py-3 rounded-2xl font-bold text-xs transition-colors ${
                currentTier === 'Free'
                  ? 'bg-slate-100 text-[#111827] border border-slate-300 cursor-default'
                  : 'bg-slate-100 hover:bg-slate-200 text-[#111827] border border-slate-300 cursor-pointer'
              }`}
            >
              {currentTier === 'Free' ? 'Current Plan' : 'Select Free ($0)'}
            </button>
          </div>
        </div>

        {/* Tier 2: PREMIUM — $9.99/month */}
        <div
          className={`rounded-3xl p-6 sm:p-7 bg-white border flex flex-col justify-between transition-all ${
            currentTier === 'Premium'
              ? 'border-[#BE185D] shadow-lg ring-2 ring-[#BE185D]/20'
              : 'border-pink-200 hover:border-[#BE185D]/50 shadow-sm'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#BE185D] uppercase tracking-wider flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-3.5 h-3.5" />
                  Tier 2
                </span>
                <h3 className="text-2xl font-bold text-[#111827] font-heading mt-0.5">PREMIUM</h3>
              </div>
              {currentTier === 'Premium' && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-pink-50 text-[#BE185D] border border-pink-300 font-bold">
                  {hasActiveLaunchGrant ? `Active · #${currentUser?.LaunchOfferGrantNumber}` : 'Active'}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#111827] font-heading">$9.99</span>
                <span className="text-xs text-[#111827] font-medium">/ month</span>
              </div>
              <p className="text-xs text-[#111827] font-medium mt-1">
                {hasActiveLaunchGrant && launchGrantExpiresLabel
                  ? `Free 30-day Launch Member grant active through ${launchGrantExpiresLabel}`
                  : 'Private messaging unlocked with mutual matches'}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200 text-xs text-[#111827] font-medium">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
                <span className="font-semibold text-[#111827]">Everything in Free</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
                <span>
                  <strong>Private messaging unlocked</strong> after a mutual match with eligible paid members
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
                <span>Icebreaker prompt conversation starters</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
                <span>Premium Member profile badge</span>
              </div>
              <div className="flex items-start gap-2.5 text-[#111827] font-medium pt-1">
                <X className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
                <span>No live video speed dating</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {isAndroid ? (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-300 text-center text-[11px] text-[#111827] font-medium">
                <span>{hasActiveLaunchGrant ? `Free Month Active (#${currentUser?.LaunchOfferGrantNumber})` : 'Google Play Billing coming soon'}</span>
              </div>
            ) : (
              <button
                disabled={currentTier === 'Premium' || loadingTier === 'Premium'}
                onClick={() => handleSelectPlan('Premium')}
                className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentTier === 'Premium'
                    ? 'bg-pink-50 text-[#BE185D] border border-pink-300 cursor-default'
                    : 'btn-pink-gradient'
                }`}
              >
                {loadingTier === 'Premium' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting Stripe...</span>
                  </>
                ) : currentTier === 'Premium' ? (
                  hasActiveLaunchGrant ? `Free Month Active (#${currentUser?.LaunchOfferGrantNumber})` : 'Current Plan'
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Subscribe with Stripe ($9.99/mo)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tier 3: PREMIUM PLUS — $14.99/month */}
        <div
          className={`relative rounded-3xl p-6 sm:p-7 bg-[#FFF8FA] border flex flex-col justify-between transition-all ${
            currentTier === 'Premium Plus'
              ? 'border-amber-500 shadow-xl ring-2 ring-amber-500/40'
              : 'border-pink-300 hover:border-amber-500 shadow-md'
          }`}
        >
          {/* Ribbon */}
          <div className="absolute -top-3 right-6 bg-gradient-to-r from-[#B45309] to-[#BE185D] text-white font-bold text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {currentTier === 'Premium Plus' ? 'Active Plan' : 'Event membership coming soon.'}
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#B45309] uppercase tracking-wider flex items-center gap-1.5 font-heading">
                  <Crown className="w-3.5 h-3.5" />
                  Tier 3 · Events
                </span>
                <h3 className="text-2xl font-bold text-[#111827] font-heading mt-0.5">PREMIUM PLUS</h3>
              </div>
              {currentTier === 'Premium Plus' && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-[#92400E] border border-amber-300 font-bold">
                  Active
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#111827] font-heading">$14.99</span>
                <span className="text-xs text-[#111827] font-medium">/ month</span>
              </div>
              <p className="text-xs text-[#111827] font-medium mt-1">
                {currentTier === 'Premium Plus'
                  ? 'Your existing subscriber access remains fully active.'
                  : 'Event membership coming soon. Join our free launch waiting list in the meantime!'}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-pink-200 text-xs text-[#111827] font-medium">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <span className="font-semibold text-[#111827]">Everything in Premium</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#BE123C] shrink-0 mt-0.5" />
                <span className="font-semibold text-[#111827]">
                  <strong>Scheduled Live Speed Dating Mixers</strong>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Video className="w-4 h-4 text-[#BE185D] shrink-0 mt-0.5" />
                <span>
                  <strong>Five-minute one-on-one video rounds</strong>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart className="w-4 h-4 text-[#BE123C] shrink-0 mt-0.5" />
                <span><strong>Privately choose Like or Pass</strong> after each round + up to 2-minute break</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <span><strong>Next Date button &amp; Waiting Room:</strong> No calls auto-start without consent</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <span>VIP Gold badge, Round Skips &amp; Replays</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-2.5">
            {currentTier === 'Premium Plus' ? (
              <button
                disabled
                className="w-full py-3.5 rounded-2xl font-bold text-xs shadow-sm bg-amber-100 text-[#78350F] border border-amber-300 cursor-default flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 text-[#B45309]" />
                <span>Current Plan</span>
              </button>
            ) : (
              <>
                <div className="w-full py-3 px-4 rounded-2xl bg-amber-50 border border-amber-300 text-[#78350F] font-bold text-xs text-center">
                  Event membership coming soon.
                </div>
                <button
                  type="button"
                  disabled={waitlistLoading}
                  onClick={() => {
                    if (waitlistJoined) {
                      setCurrentView('friday');
                    } else {
                      joinWaitlist();
                    }
                  }}
                  className="w-full py-3 rounded-2xl btn-pink-gradient font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>
                    {waitlistLoading
                      ? 'Saving...'
                      : waitlistJoined
                      ? 'On Event Waiting List · View Events'
                      : 'Join the Event Waiting List (Free)'}
                  </span>
                </button>
                {waitlistJoined && (
                  <button
                    type="button"
                    disabled={waitlistLoading}
                    onClick={() => leaveWaitlist()}
                    className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#BE123C] border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    Leave Waiting List
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Matrix */}
      <div className="rounded-3xl bg-white border border-pink-200 p-5 sm:p-8 space-y-5 shadow-xs">
        <h3 className="text-lg sm:text-xl font-bold text-[#111827] font-heading text-center">
          Compare Membership Access Rules
        </h3>

        {/* Mobile / Android Stacked Plan Cards (prevents cut-off table columns on narrow screens) */}
        <div className="space-y-4 md:hidden">
          {[
            {
              key: 'free' as const,
              title: 'Free',
              price: '$0/mo',
              subtitle: 'Browsing & mutual match viewing only',
              borderClass: 'border-slate-300 bg-white',
              headerBg: 'bg-slate-50 border-slate-200',
              titleClass: 'text-[#111827]',
              badgeClass: 'bg-white text-[#111827] border-slate-300',
            },
            {
              key: 'premium' as const,
              title: 'Premium',
              price: '$9.99/mo',
              subtitle: 'Includes private messaging after mutual matches',
              borderClass: 'border-pink-300 bg-white',
              headerBg: 'bg-pink-50/70 border-pink-200',
              titleClass: 'text-[#BE185D]',
              badgeClass: 'bg-white text-[#BE185D] border-pink-300',
            },
            {
              key: 'premiumPlus' as const,
              title: 'Premium Plus',
              price: currentTier === 'Premium Plus' ? '$14.99/mo' : 'Coming Soon',
              subtitle:
                currentTier === 'Premium Plus'
                  ? 'Active subscriber access preserved'
                  : 'Event membership coming soon.',
              borderClass: 'border-amber-300 bg-[#FFF8FA]',
              headerBg: 'bg-amber-50/80 border-amber-200',
              titleClass: 'text-[#B45309]',
              badgeClass: 'bg-white text-[#B45309] border-amber-300',
            },
          ].map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl border ${plan.borderClass} overflow-hidden shadow-xs`}
            >
              <div className={`px-4 py-3 border-b ${plan.headerBg} flex items-center justify-between gap-2`}>
                <div>
                  <h4 className={`text-base font-bold font-heading ${plan.titleClass}`}>
                    {plan.title}
                  </h4>
                  <p className="text-xs text-[#111827] font-medium">{plan.subtitle}</p>
                </div>
                <span className={`px-3 py-1 rounded-full border text-xs font-bold shrink-0 ${plan.badgeClass}`}>
                  {plan.price}
                </span>
              </div>

              <div className="divide-y divide-slate-200 px-4">
                {comparisonRows.map((row) => {
                  const cell = row[plan.key];
                  return (
                    <div key={row.feature} className="py-3 flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#111827] leading-snug">
                        {row.feature}
                      </span>
                      <span className={`text-xs ${getToneClass(cell.tone)} leading-snug`}>
                        {cell.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop / Tablet Comparison Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-pink-200 text-[#111827] font-bold uppercase tracking-wider font-heading">
                <th className="py-3 px-4 text-[#111827]">Feature &amp; Privilege</th>
                <th className="py-3 px-4 text-center text-[#111827]">Free ($0/mo)</th>
                <th className="py-3 px-4 text-center text-[#BE185D]">Premium ($9.99/mo)</th>
                <th className="py-3 px-4 text-center text-[#B45309]">Premium Plus ($14.99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[#111827]">
              {comparisonRows.map((row) => (
                <tr key={row.feature}>
                  <td className="py-3 px-4 font-medium text-[#111827]">{row.feature}</td>
                  <td className={`py-3 px-4 text-center ${getToneClass(row.free.tone)}`}>
                    {row.free.text}
                  </td>
                  <td className={`py-3 px-4 text-center ${getToneClass(row.premium.tone)}`}>
                    {row.premium.text}
                  </td>
                  <td className={`py-3 px-4 text-center ${getToneClass(row.premiumPlus.tone)}`}>
                    {row.premiumPlus.text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fallback Simulation Modal for Development without STRIPE_SECRET_KEY */}
      {selectedPlanToCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-pink-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#B45309]" />
                <h3 className="text-base font-bold text-[#111827] font-heading">
                  Stripe Checkout Setup Diagnostic
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanToCheckout(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-[#111827] hover:bg-slate-200 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#111827] font-bold text-sm font-heading">
                <span>{selectedPlanToCheckout} Membership</span>
                <span className="font-mono text-[#BE185D]">
                  {selectedPlanToCheckout === 'Premium Plus' ? '$14.99 / month' : '$9.99 / month'}
                </span>
              </div>
              <p className="text-[#111827] font-medium">
                {selectedPlanToCheckout === 'Premium Plus'
                  ? isWaitlistModeActive
                    ? 'First event date coming soon. Includes live 5-minute video rounds and private messaging once events begin.'
                    : 'Unlocks scheduled live speed dating (5-minute video rounds) and private messaging.'
                  : 'Unlocks private messaging after mutual likes with other paid members.'}
              </p>
            </div>

            {stripeConfigError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-[#111827] font-medium space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-[#78350F]">
                  <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0" />
                  Stripe Checkout Configuration Notice
                </span>
                <p>
                  {stripeConfigError}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanToCheckout(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-[#111827] text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
              {serverMode !== 'live' && (
                <button
                  type="button"
                  onClick={confirmSimulationCheckout}
                  className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs shadow-md cursor-pointer"
                >
                  Simulate Sandbox Upgrade (Test Mode)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
