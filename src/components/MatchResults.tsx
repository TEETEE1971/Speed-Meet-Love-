import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  MessageCircle,
  Sparkles,
  Flame,
  Lock,
  Unlock,
  ShieldAlert,
  Ban,
  Compass,
  ArrowRight
} from 'lucide-react';
import { Avatar } from './Avatar';
import { PushNotificationOptIn } from './PushNotificationOptIn';
import confetti from 'canvas-confetti';

export const MatchResults: React.FC = () => {
  const {
    matches,
    currentUser,
    users,
    setCurrentView,
    setSelectedMatchId,
    canAccessMessaging,
    blockUser,
    setReportModalTarget,
  } = useApp();

  const userMatches = matches.filter(
    m => m.UserA === currentUser.UserID || m.UserB === currentUser.UserID
  );

  const isUserPaid = currentUser.SubscriptionTier === 'Premium' || currentUser.SubscriptionTier === 'Premium Plus';

  useEffect(() => {
    if (userMatches.length > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#FF2E93', '#FF147E', '#E11D48'],
        });
      } catch (e) {}
    }
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <div className="w-16 h-16 rounded-full btn-pink-gradient mx-auto flex items-center justify-center text-white shadow-md shadow-pink-500/20">
          <Heart className="w-8 h-8 fill-white" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF2E93] font-heading">
            Mutual Attraction
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
            Your Mutual Matches
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            These singles liked you back! Free members can see all their mutual matches; paid members (Premium & Premium Plus) can exchange private messages.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="px-4 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-xs font-bold text-[#FF2E93]">
            {userMatches.length} Mutual Matches
          </div>
          <button
            onClick={() => setCurrentView('results')}
            className="px-4 py-1.5 rounded-full btn-glossy-red-pink text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            <span>The Match Reveal 💘</span>
          </button>
          <button
            onClick={() => setCurrentView('browse')}
            className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#FF2E93]" />
            <span>Browse More Singles</span>
          </button>
        </div>
      </div>

      {/* Push Notification Opt-In for Instant 10-Minute Second-Chance Date Alerts */}
      <PushNotificationOptIn />

      {/* Mutual Matches Gallery */}
      <div className="space-y-4">
        {userMatches.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-pink-100 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-pink-50 mx-auto flex items-center justify-center text-slate-400">
              <Heart className="w-8 h-8 text-pink-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">No Mutual Matches Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Browse dating profiles or participate in Friday-night speed dating to spark mutual connections.
            </p>
            <button
              onClick={() => setCurrentView('browse')}
              className="px-6 py-3 rounded-2xl btn-pink-gradient font-bold text-xs"
            >
              Browse Profiles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userMatches.map(match => {
              const partnerId = match.UserA === currentUser.UserID ? match.UserB : match.UserA;
              const partner = users.find(u => u.UserID === partnerId);
              if (!partner) return null;

              const check = canAccessMessaging(match);

              return (
                <div
                  key={match.MatchID}
                  className="rounded-3xl bg-white border border-pink-100 hover:border-pink-300 p-6 space-y-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top Row: Partner Header & Chemistry Score */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <Avatar user={partner} size="xl" showBadge />
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-1.5">
                            <span>{partner.LastName ? `${partner.FirstName} ${partner.LastName}` : partner.FirstName}</span>
                            <span className="text-xs text-pink-500">❤️</span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            {partner.Occupation || 'Occupation not set'}{partner.Age && partner.Age > 0 ? ` · ${partner.Age} years old` : ''}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {partner.Location || 'Location not set'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#FF2E93] text-xs font-bold tabular-nums flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 fill-[#FF2E93] text-[#FF2E93]" />
                          <span>{match.ChemistryScore}% Match</span>
                        </div>

                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => blockUser(partner.UserID)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Block member"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setReportModalTarget(partner)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Report member"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bio & Spark Note */}
                    <div className="p-3.5 rounded-2xl bg-[#FFF8FA] border border-pink-100 text-xs space-y-1">
                      <div className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Spark Note:</span>
                      </div>
                      <p className="text-slate-700 italic">
                        "{match.SparkNote || partner.Bio}"
                      </p>
                    </div>

                    {/* Shared Interests */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Shared Chemistry
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {match.MutualInterests.map(interest => (
                          <span
                            key={interest}
                            className="px-2.5 py-1 rounded-xl bg-pink-50 border border-pink-100 text-xs text-pink-700 font-medium"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      {check.allowed ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Unlock className="w-3.5 h-3.5" />
                          Chat Ready
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-[#FF2E93]" />
                          Paid Tier Required
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedMatchId(match.MatchID);
                        setCurrentView('messages');
                      }}
                      className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white" />
                      <span>{check.allowed ? 'Open Chat' : 'Chat Status'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
