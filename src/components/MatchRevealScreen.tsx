import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Sparkles,
  Flame,
  MessageCircle,
  Video,
  Clock,
  CheckCircle,
  X,
  Compass,
  Home,
  ShieldCheck,
  Crown,
  ChevronRight,
  ArrowRight,
  Coffee,
  Calendar,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { FloatingHearts } from './FloatingHearts';
import { PushNotificationOptIn } from './PushNotificationOptIn';
import confetti from 'canvas-confetti';
import { SecondDateSession } from '../types';

export const MatchRevealScreen: React.FC = () => {
  const {
    currentUser,
    users,
    rounds,
    matches,
    events,
    selectedEventId,
    setCurrentView,
    setSelectedMatchId,
    requestSecondDate,
    respondToSecondDate,
    startSecondDate,
    secondDateSessions,
    refreshSecondDateSessions,
    appMode,
    canAccessMessaging,
    showNotification,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'reveal' | 'all'>('reveal');
  const [requestingPartnerId, setRequestingPartnerId] = useState<string | null>(null);

  const currentEvent = events.find(e => e.EventID === selectedEventId) || events[0];

  // 1. Identify MUTUAL LIKES from rounds of this event (Never reveal passes or rejections!)
  const eventRounds = rounds.filter(
    r =>
      r.EventID === selectedEventId &&
      (r.UserA === currentUser.UserID || r.UserB === currentUser.UserID)
  );

  const mutualRoundPartners = new Set<string>();
  eventRounds.forEach(r => {
    if (r.UserA_Like === true && r.UserB_Like === true) {
      const partnerId = r.UserA === currentUser.UserID ? r.UserB : r.UserA;
      mutualRoundPartners.add(partnerId);
    }
  });

  // Also include any matches already registered for this event
  matches.forEach(m => {
    if (m.EventID === selectedEventId) {
      const partnerId = m.UserA === currentUser.UserID ? m.UserB : m.UserA;
      mutualRoundPartners.add(partnerId);
    }
  });

  const mutualPartnerUsers = users.filter(u => mutualRoundPartners.has(u.UserID));
  const hasMutualMatches = mutualPartnerUsers.length > 0;

  // Romantic celebration confetti on mount if mutual matches exist
  useEffect(() => {
    if (hasMutualMatches) {
      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.4 },
          colors: ['#FF2E93', '#FF147E', '#E11D48', '#FF69B4', '#FFE600'],
        });
      } catch (e) {}
    }
    refreshSecondDateSessions();
  }, [hasMutualMatches, refreshSecondDateSessions]);

  // Check if current user is in an active 10-minute second-chance video date
  const activeSession = secondDateSessions.find(
    s =>
      s.status === 'active' &&
      s.expiresAt &&
      s.expiresAt > Date.now() &&
      (s.userA === currentUser.UserID || s.userB === currentUser.UserID)
  );

  const handleRequestSecondDate = async (partnerId: string, simulateConsent = false) => {
    if (activeSession && activeSession.userA !== partnerId && activeSession.userB !== partnerId) {
      showNotification('You have an active 10-minute date in progress. Please complete that date first.', 'info');
      return;
    }

    setRequestingPartnerId(partnerId);
    const existingMatch = matches.find(
      m =>
        (m.UserA === currentUser.UserID && m.UserB === partnerId) ||
        (m.UserA === partnerId && m.UserB === currentUser.UserID)
    );

    await requestSecondDate(partnerId, existingMatch?.MatchID, simulateConsent);
    setRequestingPartnerId(null);
  };

  const handleStartSecondDate = async (sessionId: string) => {
    await startSecondDate(sessionId);
  };

  return (
    <div className="relative space-y-8 max-w-5xl mx-auto py-2">
      {/* Floating Hearts Romantic Ambience Overlay */}
      <FloatingHearts count={10} className="z-0 pointer-events-none" />

      {/* Hero Celebration Banner */}
      <div className="relative z-10 rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white p-6 sm:p-10 shadow-2xl border-2 border-red-500 overflow-hidden text-center space-y-4">
        {/* Glow Accent */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-pink-400/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-rose-400/30 blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-black tracking-wide uppercase shadow-xs">
          <Heart className="w-4 h-4 fill-white" />
          <span>Speed Meet Love · The Match Reveal</span>
        </div>

        {hasMutualMatches ? (
          <div className="space-y-2 max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
            <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tight drop-shadow-md">
              It’s a Match! You both felt the spark! 💘
            </h1>
            <p className="text-sm sm:text-base text-rose-100 font-medium">
              Congratulations! The singles below selected <strong>Like</strong> for you too.
              Choose to request a private <strong>10-Minute Second Chance Date</strong>, or save your match to continue chatting anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
            <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight drop-shadow-md">
              The Match Reveal
            </h1>
            <p className="text-sm sm:text-base text-rose-100 font-medium">
              Thank you for participating in <strong>{currentEvent.EventName}</strong>! All voting remains 100% confidential.
            </p>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setCurrentView('matches')}
            className="px-5 py-2.5 rounded-2xl bg-white text-red-700 hover:bg-rose-50 text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Heart className="w-4 h-4 fill-red-600 text-red-600" />
            <span>View All Saved Matches</span>
          </button>
          <button
            onClick={() => setCurrentView('browse')}
            className="px-5 py-2.5 rounded-2xl bg-black/25 hover:bg-black/35 text-white border border-white/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            <span>Browse More Singles</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 space-y-6">
        {/* Push Notification Opt-In Banner */}
        <PushNotificationOptIn />

        {/* If NO Mutual Matches Found for this event */}
        {!hasMutualMatches ? (
          <div className="rounded-3xl bg-white border border-rose-200 p-8 sm:p-12 text-center space-y-6 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-200 mx-auto flex items-center justify-center text-rose-500 shadow-inner">
              <Sparkles className="w-10 h-10 text-[#FF2E93]" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-black text-slate-900 font-heading">
                No Mutual Matches This Round, But Your Spark Is Out There!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chemistry is all about timing and authentic connection. Keep your heart open! Real sparks happen when you least expect them.
              </p>
              <div className="pt-2 p-3 bg-pink-50/60 rounded-2xl border border-pink-100 text-xs text-rose-700 font-medium">
                🔒 Remember: Speed Meet Love voting is <strong>100% confidential</strong>. We never reveal who selected Pass.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setCurrentView('home')}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
              <button
                onClick={() => setCurrentView('browse')}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl btn-glossy-red-pink text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-[1.02]"
              >
                <Compass className="w-4 h-4" />
                <span>Browse Singles Near You</span>
              </button>
            </div>
          </div>
        ) : (
          /* MUTUAL MATCHES GALLERY */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-heading flex items-center gap-2">
                  <span>Your Mutual Matches ({mutualPartnerUsers.length})</span>
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-rose-100 text-red-700 font-bold border border-rose-200">
                    {currentEvent.EventName}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request a private 10-minute video date or save to chat at your own pace. Both options are completely valid!
                </p>
              </div>

              {currentUser.SubscriptionTier !== 'Premium Plus' && (
                <button
                  onClick={() => setCurrentView('pricing')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>Second Chance Dates require Plus ($14.99/mo)</span>
                </button>
              )}
            </div>

            {/* Match Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mutualPartnerUsers.map(partner => {
                const sortedPair = [currentUser.UserID, partner.UserID].sort().join('_');
                const sessionKey = `sec_${selectedEventId}_${sortedPair}`;
                const session = secondDateSessions.find(s => s.sessionId === sessionKey);

                const existingMatch = matches.find(
                  m =>
                    (m.UserA === currentUser.UserID && m.UserB === partner.UserID) ||
                    (m.UserA === partner.UserID && m.UserB === currentUser.UserID)
                );

                const messagingAccess = existingMatch ? canAccessMessaging(existingMatch) : { allowed: false };

                // Consent states
                const userConsented = session
                  ? session.userA === currentUser.UserID
                    ? session.userAConsent
                    : session.userBConsent
                  : false;

                const partnerConsented = session
                  ? session.userA === currentUser.UserID
                    ? session.userBConsent
                    : session.userAConsent
                  : false;

                const isReadyToStart = session?.status === 'ready_to_start' || (userConsented && partnerConsented && session?.status !== 'completed' && session?.status !== 'declined');
                const isActive = session?.status === 'active' && session?.expiresAt && session.expiresAt > Date.now();
                const isDeclined = session?.status === 'declined';
                const isCompleted = session?.status === 'completed' || (session?.expiresAt && Date.now() >= session.expiresAt);

                return (
                  <div
                    key={partner.UserID}
                    className="rounded-3xl bg-white border-2 border-rose-200 hover:border-rose-400 p-6 space-y-5 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Header: Partner Avatar, Names, Chemistry Score */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <Avatar user={partner} size="xl" showBadge />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-xl font-black text-slate-900 font-heading">
                                {partner.FirstName} {partner.LastName}
                              </h3>
                              <span className="text-base text-[#FF2E93]">❤️</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500">
                              {partner.Age} years old · {partner.Occupation || 'Professional'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {partner.Location}
                            </p>
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-black shadow-xs flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 fill-white" />
                          <span>{existingMatch?.ChemistryScore || 94}% Spark</span>
                        </div>
                      </div>

                      {/* Bio & Spark Note */}
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs space-y-1">
                        <div className="text-red-700 font-bold flex items-center gap-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-[#FF2E93]" />
                          <span>Mutual Connection Note:</span>
                        </div>
                        <p className="text-slate-700 italic">
                          "{partner.Bio || 'Connected through Speed Meet Love 5-minute video rounds.'}"
                        </p>
                      </div>

                      {/* Shared Interests */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-heading">
                          Shared Chemistry & Interests
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {partner.Interests.map(interest => {
                            const isShared = currentUser.Interests.includes(interest);
                            return (
                              <span
                                key={interest}
                                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                                  isShared
                                    ? 'bg-rose-100 text-red-700 border border-rose-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {interest} {isShared && '✨'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Second Chance Date Status & Actions */}
                    <div className="pt-4 border-t-2 border-rose-100 space-y-3">
                      {/* Active video date indicator */}
                      {isActive && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                          <div className="flex items-center justify-between font-black">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              10-Minute Second Chance Date Active!
                            </span>
                            <span className="font-mono text-emerald-700">In Progress</span>
                          </div>
                          <button
                            onClick={() => {
                              if (session) {
                                setCurrentView('second_date');
                              }
                            }}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Video className="w-4 h-4 fill-white" />
                            <span>Re-Enter 10-Minute Date</span>
                          </button>
                        </div>
                      )}

                      {/* Both Agreed & Ready to Start (Explicit Opt-In) */}
                      {!isActive && isReadyToStart && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-rose-300 text-slate-900 text-xs space-y-2.5">
                          <div className="flex items-center gap-2 text-red-700 font-black">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Both of you agreed to Another Date! ❤️</span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            We never automatically launch your camera or mic. Tap below when you are ready to enter your private 10-minute video room.
                          </p>
                          <button
                            onClick={() => session && handleStartSecondDate(session.sessionId)}
                            className="w-full py-3 rounded-xl btn-glossy-red-pink text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer hover:scale-[1.01] transition-transform"
                          >
                            <Video className="w-4 h-4 fill-white" />
                            <span>Enter 10-Minute Date Now</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Waiting for partner confirmation */}
                      {!isActive && !isReadyToStart && userConsented && !partnerConsented && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              Waiting for {partner.FirstName} to agree...
                            </span>
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/80">
                            You agreed to Another Date! When {partner.FirstName} agrees too, both of you can enter the private 10-minute call.
                          </p>

                          {/* Demonstration Mode Helper: Simulate Partner Agreeing */}
                          {appMode === 'demonstration' && (
                            <button
                              onClick={() => handleRequestSecondDate(partner.UserID, true)}
                              className="w-full py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-[10px] cursor-pointer transition-colors"
                              title="Demonstration Mode: Simulate partner providing mutual consent"
                            >
                              ⚡ Demo Sandbox: Simulate {partner.FirstName} Agreeing
                            </button>
                          )}
                        </div>
                      )}

                      {/* Partner requested Another Date with user */}
                      {!isActive && !isReadyToStart && !userConsented && partnerConsented && (
                        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-slate-900 text-xs space-y-2.5">
                          <div className="flex items-center gap-1.5 text-red-700 font-black">
                            <Heart className="w-4 h-4 fill-red-600 text-red-600 shrink-0" />
                            <span>{partner.FirstName} requested Another Date with you!</span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Would you like to connect for a private 10-minute video date right now?
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => session && respondToSecondDate(session.sessionId, 'accept')}
                              className="py-2.5 rounded-xl btn-glossy-red-pink text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5 fill-white" />
                              <span>Accept Date ❤️</span>
                            </button>
                            <button
                              onClick={() => session && respondToSecondDate(session.sessionId, 'save_and_chat')}
                              className="py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>Save & Chat Later</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Partner or user declined / chose Save & Chat */}
                      {isDeclined && (
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
                          <span className="text-[11px] font-medium">
                            Saved for chat. No second video date scheduled.
                          </span>
                          <button
                            onClick={() => {
                              if (existingMatch) {
                                setSelectedMatchId(existingMatch.MatchID);
                                setCurrentView('messages');
                              }
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open Chat</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Completed 10-minute date */}
                      {isCompleted && (
                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                          <span className="text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            10-Minute Second Chance Date Completed!
                          </span>
                          <button
                            onClick={() => {
                              if (existingMatch) {
                                setSelectedMatchId(existingMatch.MatchID);
                                setCurrentView('messages');
                              }
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Chat</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Initial Choices (Feature 2: Offer "Another Date ❤️" and "Save Match & Chat Later") */}
                      {!session && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {/* Choice 1: Another Date ❤️ */}
                          <button
                            onClick={() => handleRequestSecondDate(partner.UserID, false)}
                            disabled={requestingPartnerId === partner.UserID}
                            className="py-3 px-3 rounded-2xl btn-glossy-red-pink text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <Heart className="w-3.5 h-3.5 fill-white" />
                            <span>Another Date ❤️</span>
                          </button>

                          {/* Choice 2: Save Match & Chat Later */}
                          <button
                            onClick={() => {
                              if (existingMatch) {
                                setSelectedMatchId(existingMatch.MatchID);
                                setCurrentView('messages');
                              } else {
                                setCurrentView('matches');
                              }
                              showNotification(`Match saved with ${partner.FirstName}! Ready for private messaging.`, 'pink');
                            }}
                            className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-800 hover:text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>Save Match & Chat Later</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Speed Meet Love Privacy & Membership Notice */}
      <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Confidential Voting Protected:</strong> Single-sided Likes or Passes are never exposed. Mutual matches remain permanently saved to your account.
          </span>
        </div>
        <div className="text-[11px] font-bold text-slate-500 shrink-0">
          Tier: <span className="text-red-600 font-black">{currentUser.SubscriptionTier}</span>
        </div>
      </div>
    </div>
  );
};
