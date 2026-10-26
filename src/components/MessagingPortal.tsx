import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Message, Match, User } from '../types';
import {
  Send,
  Heart,
  Lock,
  Sparkles,
  Crown,
  CheckCheck,
  Flame,
  ArrowRight,
  ShieldAlert,
  Ban,
  ArrowLeft
} from 'lucide-react';
import { Avatar } from './Avatar';

export const MessagingPortal: React.FC = () => {
  const {
    matches,
    messages,
    users,
    currentUser,
    selectedMatchId,
    setSelectedMatchId,
    sendMessage,
    setCurrentView,
    setSubscriptionTier,
    canAccessMessaging,
    upgradeOtherUser,
    blockUser,
    setReportModalTarget,
  } = useApp();

  const userMatches = matches.filter(
    m => m.UserA === currentUser.UserID || m.UserB === currentUser.UserID
  );

  const activeMatch =
    userMatches.find(m => m.MatchID === selectedMatchId) || userMatches[0] || null;

  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const partner: User | null = activeMatch
    ? users.find(
        u => u.UserID === (activeMatch.UserA === currentUser.UserID ? activeMatch.UserB : activeMatch.UserA)
      ) || null
    : null;

  const activeMessages = activeMatch
    ? messages.filter(m => m.MatchID === activeMatch.MatchID)
    : [];

  const messagingAccess = activeMatch ? canAccessMessaging(activeMatch) : { allowed: false };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || !activeMatch) return;
    sendMessage(activeMatch.MatchID, inputVal);
    setInputVal('');
  };

  const handleQuickIcebreaker = (promptText: string) => {
    if (!activeMatch) return;
    sendMessage(activeMatch.MatchID, promptText);
  };

  if (userMatches.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-12 rounded-3xl bg-white border border-pink-100 shadow-sm text-center space-y-4 my-8">
        <div className="w-16 h-16 rounded-full bg-pink-50 mx-auto flex items-center justify-center text-[#FF2E93]">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 font-heading">No Mutual Matches Yet</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Private messaging unlocks once you and another member mutually like each other and both hold an eligible paid membership (Premium or Premium Plus).
        </p>
        <button
          onClick={() => setCurrentView('browse')}
          className="px-6 py-3 rounded-2xl btn-pink-gradient font-bold text-xs"
        >
          Browse Singles Now
        </button>
      </div>
    );
  }

  const isUserPaid = currentUser.SubscriptionTier === 'Premium' || currentUser.SubscriptionTier === 'Premium Plus';
  const isPartnerPaid = partner ? (partner.SubscriptionTier === 'Premium' || partner.SubscriptionTier === 'Premium Plus') : false;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('matches')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#FF2E93] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Mutual Matches
        </button>

        <span className="text-[11px] text-slate-500 font-mono">
          Tier: <strong className="text-slate-800">{currentUser.SubscriptionTier}</strong>
        </span>
      </div>

      <div className="rounded-3xl bg-white border border-pink-100 shadow-md overflow-hidden h-[680px] flex flex-col md:flex-row">
        
        {/* Left Sidebar: Mutual Matches */}
        <div className="w-full md:w-80 bg-[#FFF8FA] border-r border-pink-100 flex flex-col">
          <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-white">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#FF2E93] fill-[#FF2E93]" />
                Mutual Matches
              </h2>
              <p className="text-[11px] text-slate-500">
                {userMatches.length} mutual connections
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#FF2E93] px-2 py-0.5 rounded-full bg-pink-50 border border-pink-100 font-bold">
              Chat
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-pink-50">
            {userMatches.map(m => {
              const mPartnerId = m.UserA === currentUser.UserID ? m.UserB : m.UserA;
              const mPartner = users.find(u => u.UserID === mPartnerId);
              if (!mPartner) return null;

              const isSelected = activeMatch?.MatchID === m.MatchID;
              const mCheck = canAccessMessaging(m);
              const matchMsgs = messages.filter(msg => msg.MatchID === m.MatchID);
              const lastMsg = matchMsgs[matchMsgs.length - 1];

              return (
                <button
                  key={m.MatchID}
                  onClick={() => setSelectedMatchId(m.MatchID)}
                  className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? 'bg-white border-l-4 border-l-[#FF2E93] shadow-xs'
                      : 'hover:bg-pink-50/60'
                  }`}
                >
                  <Avatar user={mPartner} size="md" showBadge />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {mPartner.LastName ? `${mPartner.FirstName} ${mPartner.LastName}` : mPartner.FirstName}
                      </span>
                      <span className="text-[10px] text-[#FF2E93] font-mono font-bold">
                        {m.ChemistryScore}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
                        {mCheck.allowed
                          ? lastMsg ? lastMsg.MessageText : 'Ready to message'
                          : '🔒 Messaging locked'}
                      </p>
                      <span className="text-[9px] font-mono text-slate-400 uppercase">
                        {mPartner.SubscriptionTier}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-pink-100 bg-white text-[11px] text-slate-500 flex items-center justify-between">
            <span>Eligible Paid Membership Rule</span>
            <button
              onClick={() => setCurrentView('pricing')}
              className="text-[#FF2E93] hover:underline font-semibold"
            >
              Pricing
            </button>
          </div>
        </div>

        {/* Right Chat Pane */}
        {partner && activeMatch ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 bg-white border-b border-pink-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar user={partner} size="md" showBadge />
                <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 font-heading">
                        {partner.LastName ? `${partner.FirstName} ${partner.LastName}` : partner.FirstName}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-[#FF2E93] border border-pink-100 font-mono font-bold">
                        {activeMatch.ChemistryScore}% Match
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                        Tier: {partner.SubscriptionTier}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {partner.Occupation || 'Occupation not set'}{partner.Location ? ` · ${partner.Location}` : ''}
                    </div>
                </div>
              </div>

              {/* Safety & Demo Actions */}
              <div className="flex items-center gap-2">
                {!isPartnerPaid && (
                  <button
                    onClick={() => upgradeOtherUser(partner.UserID, 'Premium')}
                    className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200 text-[10px] text-[#FF2E93] font-semibold"
                    title="Simulate partner buying Premium"
                  >
                    + Simulate {partner.FirstName} Paid
                  </button>
                )}
                <button
                  onClick={() => blockUser(partner.UserID)}
                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Block member"
                >
                  <Ban className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setReportModalTarget(partner)}
                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Report member"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Access Rule Enforcement Gate */}
            {!messagingAccess.allowed ? (
              <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-[#FFF8FA]">
                <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white border border-pink-100 shadow-md text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 mx-auto flex items-center justify-center text-[#FF2E93]">
                    <Lock className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-heading">
                      {!isUserPaid
                        ? 'Upgrade to Unlock Private Messaging'
                        : 'Waiting on Eligible Paid Membership'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {!isUserPaid
                        ? 'Free tier members can view mutual matches, but private messaging requires an eligible paid membership (Premium $9.99/mo or Premium Plus $14.99/mo).'
                        : `${partner.FirstName} currently holds a Free membership. Private messaging unlocks only when both users hold an eligible paid membership.`}
                    </p>
                  </div>

                  {!isUserPaid ? (
                    <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={() => setSubscriptionTier('Premium')}
                        className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs"
                      >
                        Upgrade to Premium ($9.99/mo)
                      </button>
                      <button
                        onClick={() => setCurrentView('pricing')}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                      >
                        Compare Tiers
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <button
                        onClick={() => upgradeOtherUser(partner.UserID, 'Premium')}
                        className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs"
                      >
                        Simulate {partner.FirstName} Upgrading to Premium ($9.99/mo)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Messages Feed */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#FFF8FA]">
                  <div className="p-3.5 rounded-2xl bg-white border border-pink-100 text-center max-w-md mx-auto space-y-1 shadow-xs">
                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#FF2E93]">
                      <Heart className="w-3.5 h-3.5 fill-[#FF2E93]" />
                      <span>Eligible Paid Membership Verified</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Both you and {partner.FirstName} hold active paid memberships. Private conversation is unlocked.
                    </p>
                  </div>

                  {activeMessages.map(msg => {
                    const isMe = msg.SenderID === currentUser.UserID;
                    const formattedTime = new Date(msg.Timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={msg.MessageID}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                            isMe
                              ? 'btn-pink-gradient text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                          }`}
                        >
                          {msg.MessageText}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                          <span>{formattedTime}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-[#FF2E93]" />}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Icebreaker suggestions */}
                <div className="px-4 py-2 border-t border-pink-100 bg-[#FFF5F7] flex items-center gap-2 overflow-x-auto text-[11px]">
                  <span className="text-[#FF2E93] shrink-0 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Starters:
                  </span>
                  {[
                    `Loved your profile! Are you free for coffee this weekend?`,
                    `What was your highlight from the week?`,
                    `Quick question: rooftop drinks or cozy dinner spot?`,
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickIcebreaker(prompt)}
                      className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-white hover:bg-pink-50 text-slate-700 border border-pink-100 transition-colors shadow-xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Send Input */}
                <form
                  onSubmit={handleSend}
                  className="p-3 sm:p-4 bg-white border-t border-pink-100 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={`Message ${partner.FirstName}...`}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF2E93]"
                  />
                  <button
                    type="submit"
                    disabled={!inputVal.trim()}
                    className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-40 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
            Select a match from the left sidebar to start chatting.
          </div>
        )}
      </div>
    </div>
  );
};
