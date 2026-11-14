import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  ShieldCheck,
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
    setSubscriptionTier,
    showNotification,
    appMode,
    openAuthModal,
    authToken,
    syncAuthSession,
  } = useApp();

  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState<boolean>(false);
  const [selectedPlanToCheckout, setSelectedPlanToCheckout] = useState<SubscriptionTier | null>(null);
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);

  const currentTier = currentUser?.SubscriptionTier || 'Free';
  const isTester = Boolean(currentUser?.IsTester || currentUser?.UserID === 'usr_kristy');

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
    } finally {
      setLoadingConfig(false);
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

  const premiumPriceId = stripeConfig?.prices?.premium?.id || null;
  const premiumPlusPriceId = stripeConfig?.prices?.premiumPlus?.id || null;
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
      const latestConfig = stripeConfig?.prices ? stripeConfig : await fetchStripeConfig();
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
        body: JSON.stringify({ priceId }),
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Stripe Configuration & Google Play Notice Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 border border-pink-200 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#FF2E93] shrink-0" />
            <div>
              <span className="font-extrabold text-slate-900 block font-heading text-sm">
                {loadingConfig
                  ? 'Checking Stripe Billing Configuration...'
                  : serverMode === 'live'
                  ? 'Stripe Live Subscriptions Active'
                  : serverMode === 'sandbox'
                  ? 'Stripe Sandbox Subscriptions Ready'
                  : 'Stripe Checkout Configuration Pending'}
              </span>
              <span className="text-slate-600">
                Plans: <strong>Premium $9.99 USD/mo</strong>
                {premiumPriceId && (
                  <>
                    {' '}
                    (<code className="bg-pink-100 text-pink-900 px-1 py-0.5 rounded font-mono text-[10px]">{premiumPriceId}</code>)
                  </>
                )}{' '}
                &amp; <strong>Premium Plus $14.99 USD/mo</strong>
                {premiumPlusPriceId && (
                  <>
                    {' '}
                    (<code className="bg-pink-100 text-pink-900 px-1 py-0.5 rounded font-mono text-[10px]">{premiumPlusPriceId}</code>)
                  </>
                )}
                .
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isTester && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                Free Tester Access Active
              </span>
            )}
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                loadingConfig
                  ? 'text-slate-600 bg-white border-slate-200'
                  : serverMode === 'live'
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                  : serverMode === 'sandbox'
                  ? 'text-[#FF2E93] bg-white border-pink-200'
                  : 'text-amber-800 bg-amber-50 border-amber-300'
              }`}
            >
              {loadingConfig
                ? 'Checking...'
                : serverMode === 'live'
                ? 'Stripe Live'
                : serverMode === 'sandbox'
                ? 'Stripe Sandbox'
                : 'Stripe Unconfigured'}
            </span>
          </div>
        </div>

        {/* Free Tester Isolation Advisory */}
        {isTester && (
          <div className="pt-2 border-t border-pink-200/60 text-[11px] text-slate-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              <strong>Tester Privilege Notice:</strong> Your free tester access grants all platform features and remains separate from your paid subscription status in Firestore.
            </span>
          </div>
        )}
      </div>

      {/* Google Play App Mode Advisory */}
      {isAndroid && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950 shadow-xs">
          <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black font-heading text-amber-900 text-sm block">
              Google Play In-App Billing Mode
            </span>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              You are currently viewing Speed Meet Love within an Android app container. In compliance with Google Play Store policies, web Stripe checkout is disabled here. Subscriptions on Android will be processed via Google Play In-App Billing upon official release. To subscribe using Stripe web checkout, open <strong>speedmeetlove.com</strong> in your browser.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-bold text-[#FF2E93] uppercase tracking-widest font-heading">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Speed Meet Love Membership</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-heading">
          Transparent Pricing for{' '}
          <span className="bg-gradient-to-r from-[#FF2E93] via-[#FF147E] to-[#E11D48] bg-clip-text text-transparent">
            Real Chemistry
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Free allows browsing only. Upgrade to Premium for private messaging after mutual matches, or join Premium Plus for live Friday, Saturday &amp; Sunday speed dating.
        </p>

        {/* Customer Billing Portal Shortcut if already subscribed */}
        {(currentTier === 'Premium' || currentTier === 'Premium Plus') && !isAndroid && (
          <div className="pt-2">
            <button
              type="button"
              disabled={loadingPortal}
              onClick={handleOpenCustomerPortal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-pink-200 text-xs font-bold text-slate-800 hover:bg-rose-50 hover:border-[#FF2E93] transition-all shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-[#FF2E93]" />
              <span>{loadingPortal ? 'Opening Portal...' : 'Manage Subscription & Invoices (Stripe Portal)'}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
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
              ? 'border-slate-400 shadow-md ring-1 ring-slate-300'
              : 'border-pink-100 hover:border-pink-200 shadow-sm'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                  Tier 1
                </span>
                <h3 className="text-2xl font-black text-slate-900 font-heading mt-0.5">FREE</h3>
              </div>
              {currentTier === 'Free' && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                  Active
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 font-heading">$0</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Browse members and uncover mutual sparks</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Create and edit your dating profile</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Browse dating profiles</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Like or pass other members</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>See mutual matches</strong> when feelings align</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-400 pt-1">
                <X className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>No private messaging (Browsing only)</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-400">
                <X className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
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
                  ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer'
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
              ? 'border-[#FF2E93] shadow-lg ring-2 ring-[#FF2E93]/20'
              : 'border-pink-200 hover:border-[#FF2E93]/50 shadow-sm'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#FF2E93] uppercase tracking-wider flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-3.5 h-3.5" />
                  Tier 2
                </span>
                <h3 className="text-2xl font-black text-slate-900 font-heading mt-0.5">PREMIUM</h3>
              </div>
              {currentTier === 'Premium' && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-pink-50 text-[#FF2E93] border border-pink-200 font-bold">
                  Active
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 font-heading">$9.99</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Private messaging unlocked with mutual matches</p>
              {premiumPriceId && (
                <span className="text-[10px] font-mono text-slate-400 mt-0.5 block truncate">
                  {premiumPriceId}
                </span>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-900">Everything in Free</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
                <span>
                  <strong>Private messaging unlocked</strong> after a mutual match with eligible paid members
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
                <span>Icebreaker prompt conversation starters</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
                <span>Premium Member profile badge</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-400 pt-1">
                <X className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>No live video speed dating</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {isAndroid ? (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-600">
                <span>Google Play Billing coming soon</span>
              </div>
            ) : (
              <button
                disabled={currentTier === 'Premium' || loadingTier === 'Premium'}
                onClick={() => handleSelectPlan('Premium')}
                className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentTier === 'Premium'
                    ? 'bg-pink-50 text-[#FF2E93] border border-pink-200 cursor-default'
                    : 'btn-pink-gradient'
                }`}
              >
                {loadingTier === 'Premium' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting Stripe...</span>
                  </>
                ) : currentTier === 'Premium' ? (
                  'Current Plan'
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
              ? 'border-amber-400 shadow-xl ring-2 ring-amber-400/40'
              : 'border-pink-300 hover:border-amber-400 shadow-md'
          }`}
        >
          {/* Ribbon */}
          <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-400 to-[#FF2E93] text-white font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            Fri, Sat &amp; Sun at 7 PM EST
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                  <Crown className="w-3.5 h-3.5" />
                  Tier 3 · Ultimate
                </span>
                <h3 className="text-2xl font-black text-slate-900 font-heading mt-0.5">PREMIUM PLUS</h3>
              </div>
              {currentTier === 'Premium Plus' && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                  Active
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 font-heading">$14.99</span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Live speed dating 3 nights/week (Fri, Sat, Sun at 7:00 PM EST)</p>
              {premiumPlusPriceId && (
                <span className="text-[10px] font-mono text-slate-400 mt-0.5 block truncate">
                  {premiumPlusPriceId}
                </span>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-pink-100 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-900">Everything in Premium</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-900">
                  <strong>3 nights weekly: Friday, Saturday &amp; Sunday at 7:00 PM EST</strong>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Choose which nights to attend</strong> and register for multiple nights
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Video className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
                <span>
                  <strong>Five-minute one-on-one video rounds</strong>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Privately choose Like or Pass</strong> after each round + up to 2-minute break</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Next Date button &amp; Waiting Room:</strong> No calls auto-start without consent</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>VIP Gold badge, Round Skips &amp; Replays</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {isAndroid ? (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-600">
                <span>Google Play Billing coming soon</span>
              </div>
            ) : (
              <button
                disabled={currentTier === 'Premium Plus' || loadingTier === 'Premium Plus'}
                onClick={() => handleSelectPlan('Premium Plus')}
                className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentTier === 'Premium Plus'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default'
                    : 'bg-gradient-to-r from-amber-400 via-pink-500 to-[#FF2E93] text-white hover:brightness-105'
                }`}
              >
                {loadingTier === 'Premium Plus' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting Stripe...</span>
                  </>
                ) : currentTier === 'Premium Plus' ? (
                  'Current Plan'
                ) : (
                  <>
                    <Crown className="w-3.5 h-3.5 fill-white" />
                    <span>Upgrade to Premium Plus ($14.99/mo)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Matrix */}
      <div className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 space-y-5 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 font-heading text-center">
          Compare Membership Access Rules
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-pink-100 text-slate-600 font-semibold uppercase tracking-wider font-heading">
                <th className="py-3 px-4">Feature &amp; Privilege</th>
                <th className="py-3 px-4 text-center">Free ($0/mo)</th>
                <th className="py-3 px-4 text-center text-[#FF2E93]">Premium ($9.99/mo)</th>
                <th className="py-3 px-4 text-center text-amber-600">Premium Plus ($14.99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-medium">Create Profile &amp; Browse Members</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes (Browsing only)</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Like or Pass Other Members</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">See Mutual Matches</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Private Messaging After Mutual Match</td>
                <td className="py-3 px-4 text-center text-slate-400">Locked (Browsing only)</td>
                <td className="py-3 px-4 text-center text-[#FF2E93] font-bold">Unlocked (with paid matches)</td>
                <td className="py-3 px-4 text-center text-[#FF2E93] font-bold">Unlocked (with paid matches)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Speed Dating Schedule (3 Nights Weekly)</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Fri, Sat &amp; Sun at 7:00 PM EST</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Choose Nights &amp; Multi-Night Registration</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Included (Attend 1, 2, or all 3)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">5-Minute Video Rounds &amp; Up to 2-Min Break</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Active</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Consent-Based Next Date &amp; Waiting Room</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Included (No auto-start)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Round Skip &amp; Replay Perks</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Fallback Simulation Modal for Development without STRIPE_SECRET_KEY */}
      {selectedPlanToCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Stripe Checkout Setup Diagnostic
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanToCheckout(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-900 font-bold text-sm font-heading">
                <span>{selectedPlanToCheckout} Membership</span>
                <span className="font-mono text-[#FF2E93]">
                  {selectedPlanToCheckout === 'Premium Plus' ? '$14.99 / month' : '$9.99 / month'}
                </span>
              </div>
              <p className="text-slate-600">
                {selectedPlanToCheckout === 'Premium Plus'
                  ? 'Unlocks Friday, Saturday & Sunday live speed dating (5-minute video rounds) and private messaging.'
                  : 'Unlocks private messaging after mutual likes with other paid members.'}
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1">
                Stripe Price ID:{' '}
                {(selectedPlanToCheckout === 'Premium Plus' ? premiumPlusPriceId : premiumPriceId) || 'Configured on server'}
              </div>
            </div>

            {stripeConfigError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
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
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
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
