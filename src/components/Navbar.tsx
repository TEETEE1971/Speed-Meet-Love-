import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Zap,
  Heart,
  Sparkles,
  User as UserIcon,
  Crown,
  Compass,
  MessageCircle,
  Calendar,
  CreditCard,
  Check
} from 'lucide-react';
import { Avatar } from './Avatar';
import { SubscriptionTier, AppView } from '../types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    currentView,
    setCurrentView,
    users,
    switchUser,
    setSubscriptionTier,
    matches,
    appMode,
    setAppMode,
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Count mutual matches for current user
  const mutualMatchCount = matches.filter(
    m => m.UserA === currentUser.UserID || m.UserB === currentUser.UserID
  ).length;

  const getTierBadge = (tier: SubscriptionTier) => {
    if (tier === 'Premium Plus') {
      return {
        label: 'Plus ($14.99)',
        style: 'bg-gradient-to-r from-amber-400 to-[#FF2E93] text-white font-bold',
      };
    }
    if (tier === 'Premium') {
      return {
        label: 'Premium ($9.99)',
        style: 'bg-pink-50 text-[#FF2E93] border border-pink-200 font-bold',
      };
    }
    return {
      label: 'Free ($0)',
      style: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
  };

  const badge = getTierBadge(currentUser.SubscriptionTier);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: Single Brand element */}
        <button
          onClick={() => setCurrentView('browse')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-2xl btn-pink-gradient flex items-center justify-center shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
            <div className="relative flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 absolute -top-1 -right-1" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 font-heading">
              Speed Meet <span className="text-[#FF2E93]">Love</span>
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation links */}
        <nav className="hidden lg:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-600">
          <button
            onClick={() => setCurrentView('browse')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              currentView === 'browse'
                ? 'bg-pink-50 text-[#FF2E93] font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Browse</span>
          </button>

          <button
            onClick={() => setCurrentView('matches')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              currentView === 'matches' || currentView === 'results'
                ? 'bg-pink-50 text-[#FF2E93] font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Matches</span>
            {mutualMatchCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#FF2E93] text-white text-[10px] font-mono">
                {mutualMatchCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('messages')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              currentView === 'messages'
                ? 'bg-pink-50 text-[#FF2E93] font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
          </button>

          <button
            onClick={() => setCurrentView('friday')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              currentView === 'friday' || currentView === 'lobby' || currentView === 'live'
                ? 'bg-pink-50 text-[#FF2E93] font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4 text-rose-500" />
            <span>Speed Dating (Fri-Sun)</span>
          </button>

          <button
            onClick={() => setCurrentView('pricing')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              currentView === 'pricing'
                ? 'bg-pink-50 text-[#FF2E93] font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Pricing</span>
          </button>

          <button
            onClick={() => setCurrentView('profile')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              currentView === 'profile'
                ? 'bg-pink-50 text-[#FF2E93] font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </nav>

        {/* Zone 3: Active Profile, Mode Switcher and Tier */}
        <div className="relative flex items-center gap-2.5 shrink-0">
          {/* Mode Switcher Badge */}
          <button
            onClick={() => setAppMode(appMode === 'demonstration' ? 'production' : 'demonstration')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border shadow-xs cursor-pointer ${
              appMode === 'demonstration'
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Click to toggle between Demonstration Mode (Sandbox Testing) and Production Mode (Live Consenting Members)"
          >
            <span className={`w-2 h-2 rounded-full ${appMode === 'demonstration' ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{appMode === 'demonstration' ? 'Demo Sandbox' : 'Production Mode'}</span>
          </button>

          <button
            onClick={() => setCurrentView('pricing')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all shadow-xs ${badge.style}`}
          >
            {currentUser.SubscriptionTier === 'Premium Plus' ? (
              <Crown className="w-3.5 h-3.5" />
            ) : currentUser.SubscriptionTier === 'Premium' ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : null}
            <span>{badge.label}</span>
          </button>

          <button
            onClick={() => setProfileDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-slate-50 border border-slate-200 hover:border-pink-300 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.FirstName}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                {currentUser.SubscriptionTier}
              </div>
            </div>
            <Avatar user={currentUser} size="sm" showBadge />
          </button>

          {/* Profile & Demo Dropdown */}
          {profileDropdownOpen && (
            <div
              className="absolute right-0 top-14 w-80 rounded-3xl bg-white border border-pink-100 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs"
              onMouseLeave={() => setProfileDropdownOpen(false)}
            >
              <div className="pb-3 border-b border-slate-100 flex items-center gap-3">
                <Avatar user={currentUser} size="md" showBadge />
                <div>
                  <p className="font-bold text-slate-900 font-heading">
                    {currentUser.LastName ? `${currentUser.FirstName} ${currentUser.LastName}` : currentUser.FirstName}
                  </p>
                  <p className="text-[11px] text-slate-500">{currentUser.Email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                    Tier: {currentUser.SubscriptionTier}
                  </span>
                </div>
              </div>

              {/* Instant Tier Switcher */}
              <div className="py-3 border-b border-slate-100 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Switch Active Tier (Demo Mode)
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    onClick={() => setSubscriptionTier('Free')}
                    className={`py-1.5 px-2 rounded-xl font-bold transition-all ${
                      currentUser.SubscriptionTier === 'Free'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Free ($0)
                  </button>
                  <button
                    onClick={() => setSubscriptionTier('Premium')}
                    className={`py-1.5 px-2 rounded-xl font-bold transition-all ${
                      currentUser.SubscriptionTier === 'Premium'
                        ? 'btn-pink-gradient shadow-xs'
                        : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                    }`}
                  >
                    Prem ($9.99)
                  </button>
                  <button
                    onClick={() => setSubscriptionTier('Premium Plus')}
                    className={`py-1.5 px-2 rounded-xl font-bold transition-all ${
                      currentUser.SubscriptionTier === 'Premium Plus'
                        ? 'bg-gradient-to-r from-amber-400 to-[#FF2E93] text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    Plus ($14.99)
                  </button>
                </div>
              </div>

              {/* Demo profile switcher */}
              <div className="py-2.5 border-b border-slate-100 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Test As Different Member
                </div>
                {users.map(u => (
                  <button
                    key={u.UserID}
                    onClick={() => {
                      switchUser(u.UserID);
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                      u.UserID === currentUser.UserID
                        ? 'bg-pink-50 text-[#FF2E93] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{u.FirstName} ({u.Gender}{u.Age && u.Age > 0 ? `, ${u.Age}` : ''})</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {u.SubscriptionTier}
                    </span>
                  </button>
                ))}
              </div>

              {/* Navigation links in dropdown */}
              <div className="pt-2.5 space-y-1">
                <button
                  onClick={() => {
                    setCurrentView('profile');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#FF2E93]" />
                  <span>View & Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('pricing');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#FF2E93]" />
                  <span>Membership Pricing & Perks</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Mobile navigation bottom/sub strip */}
      <div className="lg:hidden flex items-center justify-around border-t border-pink-100 bg-white px-2 py-2 text-xs">
        <button
          onClick={() => setCurrentView('browse')}
          className={`px-2 py-1 flex flex-col items-center ${currentView === 'browse' ? 'text-[#FF2E93] font-bold' : 'text-slate-500'}`}
        >
          <Compass className="w-4 h-4" />
          <span>Browse</span>
        </button>
        <button
          onClick={() => setCurrentView('matches')}
          className={`px-2 py-1 flex flex-col items-center ${currentView === 'matches' ? 'text-[#FF2E93] font-bold' : 'text-slate-500'}`}
        >
          <Heart className="w-4 h-4" />
          <span>Matches</span>
        </button>
        <button
          onClick={() => setCurrentView('messages')}
          className={`px-2 py-1 flex flex-col items-center ${currentView === 'messages' ? 'text-[#FF2E93] font-bold' : 'text-slate-500'}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setCurrentView('friday')}
          className={`px-2 py-1 flex flex-col items-center ${currentView === 'friday' ? 'text-[#FF2E93] font-bold' : 'text-slate-500'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Dating</span>
        </button>
        <button
          onClick={() => setCurrentView('profile')}
          className={`px-2 py-1 flex flex-col items-center ${currentView === 'profile' ? 'text-[#FF2E93] font-bold' : 'text-slate-500'}`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Profile</span>
        </button>
      </div>
    </header>
  );
};
