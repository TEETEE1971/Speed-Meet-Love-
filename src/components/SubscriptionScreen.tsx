import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { SubscriptionTier } from '../types';

export const SubscriptionScreen: React.FC = () => {
  const { currentUser, setSubscriptionTier, showNotification } = useApp();
  const [selectedPlanToCheckout, setSelectedPlanToCheckout] = useState<SubscriptionTier | null>(null);

  const currentTier = currentUser.SubscriptionTier;

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    if (tier === 'Free') {
      setSubscriptionTier('Free');
    } else {
      setSelectedPlanToCheckout(tier);
    }
  };

  const confirmSimulationCheckout = () => {
    if (selectedPlanToCheckout) {
      setSubscriptionTier(selectedPlanToCheckout);
      setSelectedPlanToCheckout(null);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Simulation Banner Notice */}
      <div className="p-4 rounded-2xl bg-[#FFF0F3] border border-pink-200 flex items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#FF2E93] shrink-0" />
          <span>
            <strong>Working Demonstration Sandbox:</strong> Real payment processing and WebRTC calling remain disabled until final production security audits. Membership upgrades are fully simulated in this applet.
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#FF2E93] bg-white px-2.5 py-0.5 rounded-full border border-pink-200 shrink-0">
          Simulation Demo
        </span>
      </div>

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
          Start for free to like and view mutual matches, upgrade to Premium for private messaging, or join Premium Plus for exclusive Friday-night speed dating.
        </p>
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
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                <span>Browse dating profiles</span>
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
                <span>No private messaging</span>
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
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
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
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-900">Everything in Free</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
                <span>
                  <strong>Private messaging only</strong> after two users mutually like each other and <strong>both</strong> have an eligible paid membership
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
                <span>No Friday-night speed dating</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectPlan('Premium')}
              className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${
                currentTier === 'Premium'
                  ? 'bg-pink-50 text-[#FF2E93] border border-pink-200 cursor-default'
                  : 'btn-pink-gradient'
              }`}
            >
              {currentTier === 'Premium' ? 'Current Plan' : 'Upgrade to Premium ($9.99/mo)'}
            </button>
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
            Fri, Sat & Sun at 7 PM
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
            </div>

            <div className="space-y-3 pt-4 border-t border-pink-100 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-900">Everything in Premium</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-900">
                  <strong>3 nights every week: Friday, Saturday & Sunday at 7:00 PM</strong> (Clear time zone display)
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
                <span><strong>Next Date button & Waiting Room:</strong> No calls auto-start without consent</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>VIP Gold badge, Round Skips & Replays</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleSelectPlan('Premium Plus')}
              className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                currentTier === 'Premium Plus'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default'
                  : 'bg-gradient-to-r from-amber-400 via-pink-500 to-[#FF2E93] text-white hover:brightness-105'
              }`}
            >
              {currentTier === 'Premium Plus' ? (
                'Current Plan'
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 fill-white" />
                  Upgrade to Premium Plus ($14.99/mo)
                </>
              )}
            </button>
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
                <th className="py-3 px-4">Feature & Privilege</th>
                <th className="py-3 px-4 text-center">Free ($0/mo)</th>
                <th className="py-3 px-4 text-center text-[#FF2E93]">Premium ($9.99/mo)</th>
                <th className="py-3 px-4 text-center text-amber-600">Premium Plus ($14.99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-medium">Create Profile & Browse Members</td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">Yes</td>
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
                <td className="py-3 px-4 font-medium">Private Messaging</td>
                <td className="py-3 px-4 text-center text-slate-400">Locked</td>
                <td className="py-3 px-4 text-center text-[#FF2E93] font-bold">Yes (if both paid)</td>
                <td className="py-3 px-4 text-center text-[#FF2E93] font-bold">Yes (if both paid)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Speed Dating Schedule (3 Nights Weekly)</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Fri, Sat & Sun at 7:00 PM EST</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Choose Nights & Multi-Night Registration</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Included (Attend 1, 2, or all 3)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">5-Minute Video Rounds & Up to 2-Min Break</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Active</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Consent-Based Next Date & Waiting Room</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Included (No auto-start)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Round Skip & Replay Perks</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-slate-400">No</td>
                <td className="py-3 px-4 text-center text-amber-600 font-bold">Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated Checkout Modal */}
      {selectedPlanToCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Confirm Simulated Plan Upgrade
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlanToCheckout(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
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
                  ? 'Unlocks exclusive Friday-night speed dating (5-minute video rounds) and private messaging.'
                  : 'Unlocks private messaging after mutual likes with other paid members.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-pink-50 border border-pink-100 text-[11px] text-slate-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF2E93] shrink-0 mt-0.5" />
              <span>
                Demonstration Simulation: No payment gateway or credit card required. Confirming updates your membership status immediately.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSelectedPlanToCheckout(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSimulationCheckout}
                className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs shadow-md"
              >
                Activate {selectedPlanToCheckout}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
