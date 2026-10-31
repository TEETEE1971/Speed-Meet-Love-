import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Sparkles,
  User as UserIcon,
  Crown,
  Compass,
  Home,
  MessageCircle,
  Calendar,
  CreditCard,
  Radio,
  ChevronDown,
  Menu,
  X,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';
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
    setSelectedEventId,
    registerForEvent,
    clearLiveSession,
    pendingSecondDateCount,
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);

  // Count mutual matches for current user
  const mutualMatchCount = matches.filter(
    m => m.UserA === currentUser.UserID || m.UserB === currentUser.UserID
  ).length;

  const getTierBadge = (tier: SubscriptionTier) => {
    if (tier === 'Premium Plus') {
      return {
        label: 'Plus ($14.99)',
        style: 'bg-amber-400 text-slate-950 font-black shadow-sm border border-amber-300',
      };
    }
    if (tier === 'Premium') {
      return {
        label: 'Premium ($9.99)',
        style: 'bg-white text-red-600 font-black shadow-sm',
      };
    }
    return {
      label: 'Free ($0)',
      style: 'bg-red-800/80 text-white border border-red-400/50 font-bold',
    };
  };

  const badge = getTierBadge(currentUser.SubscriptionTier);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-xl border-b-2 border-red-700">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Upper-Left Corner: Three-Line Menu Button + SPEED MEET Love Brand Logo (FIX 2 Requirement) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setMenuDrawerOpen(true)}
            className="p-2 sm:p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 text-white transition-all cursor-pointer border border-white/35 shadow-xs flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Open main navigation menu"
            title="Open navigation menu"
          >
            <Menu className="w-6 h-6 text-white stroke-[2.75]" />
          </button>

          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center text-left whitespace-nowrap group focus:outline-none cursor-pointer"
            title="Speed Meet Love - Home"
          >
            <SpeedMeetLoveLogo variant="on-red" size="lg" />
          </button>
        </div>

        {/* Desktop Navigation Bar with LARGE WHITE ICONS (Requirement: 1. Home 2. Browse 3. Matches 4. Messages 5. Events 6. Profile) */}
        <nav className="hidden lg:flex items-center gap-2 font-black text-sm">
          {/* Home */}
          <button
            onClick={() => setCurrentView('home')}
            className={`px-3.5 py-2 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'home'
                ? 'bg-white text-red-700 shadow-md font-extrabold'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <Home className={`w-5 h-5 shrink-0 ${currentView === 'home' ? 'text-red-600' : 'text-white'}`} />
            <span>Home</span>
          </button>

          {/* Browse */}
          <button
            onClick={() => setCurrentView('browse')}
            className={`px-3.5 py-2 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'browse'
                ? 'bg-white text-red-700 shadow-md font-extrabold'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <Compass className={`w-5 h-5 shrink-0 ${currentView === 'browse' ? 'text-red-600' : 'text-white'}`} />
            <span>Browse</span>
          </button>

          {/* Matches */}
          <button
            onClick={() => setCurrentView('matches')}
            className={`px-3.5 py-2 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'matches' || currentView === 'results'
                ? 'bg-white text-red-700 shadow-md font-extrabold'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <Heart className={`w-5 h-5 shrink-0 ${currentView === 'matches' || currentView === 'results' ? 'text-red-600 fill-red-600' : 'text-white fill-white'}`} />
            <span>Matches</span>
            {pendingSecondDateCount > 0 ? (
              <span
                title={`${pendingSecondDateCount} Second-Chance Date Invitation${pendingSecondDateCount > 1 ? 's' : ''}`}
                className="ml-1 px-2 py-0.5 rounded-full text-xs font-mono font-black bg-amber-400 text-slate-950 animate-pulse flex items-center gap-1 shadow-sm"
              >
                <Sparkles className="w-3 h-3 text-amber-900 fill-amber-900" />
                <span>{pendingSecondDateCount}</span>
              </span>
            ) : mutualMatchCount > 0 ? (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                currentView === 'matches' ? 'bg-red-600 text-white' : 'bg-white text-red-600'
              }`}>
                {mutualMatchCount}
              </span>
            ) : null}
          </button>

          {/* Messages */}
          <button
            onClick={() => setCurrentView('messages')}
            className={`px-3.5 py-2 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'messages'
                ? 'bg-white text-red-700 shadow-md font-extrabold'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <MessageCircle className={`w-5 h-5 shrink-0 ${currentView === 'messages' ? 'text-red-600' : 'text-white'}`} />
            <span>Messages</span>
          </button>

          {/* Events */}
          <button
            onClick={() => setCurrentView('friday')}
            className={`px-3.5 py-2 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'friday' || currentView === 'lobby' || currentView === 'live'
                ? 'bg-white text-red-700 shadow-md font-extrabold'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <Calendar className={`w-5 h-5 shrink-0 ${currentView === 'friday' || currentView === 'lobby' || currentView === 'live' ? 'text-red-600' : 'text-white'}`} />
            <span>Events</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => setCurrentView('profile')}
            className={`px-3.5 py-2 rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${
              currentView === 'profile'
                ? 'bg-white text-red-700 shadow-md font-extrabold'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <UserIcon className={`w-5 h-5 shrink-0 ${currentView === 'profile' ? 'text-red-600' : 'text-white'}`} />
            <span>Profile</span>
          </button>
        </nav>

        {/* Right Zone: Controls, Tiers, and User Avatar */}
        <div className="relative flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mode Switcher */}
          <button
            onClick={() => setAppMode(appMode === 'demonstration' ? 'production' : 'demonstration')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all bg-black/25 hover:bg-black/40 text-white border border-white/30 shadow-xs cursor-pointer"
            title="Click to toggle between Demonstration Mode (Sandbox Testing) and Production Mode"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${appMode === 'demonstration' ? 'bg-amber-300 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="hidden sm:inline">{appMode === 'demonstration' ? 'Demo Sandbox' : 'Production'}</span>
          </button>

          {/* Tier Badge */}
          <button
            onClick={() => setCurrentView('pricing')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${badge.style}`}
          >
            {currentUser.SubscriptionTier === 'Premium Plus' ? (
              <Crown className="w-3.5 h-3.5" />
            ) : currentUser.SubscriptionTier === 'Premium' ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : null}
            <span>{badge.label}</span>
          </button>

          {/* User Profile Avatar Button */}
          <button
            onClick={() => setProfileDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 p-1 pl-2 sm:pl-3 rounded-full bg-white/15 hover:bg-white/25 border-2 border-white/40 transition-colors cursor-pointer"
            aria-expanded={profileDropdownOpen}
            aria-label="User profile and settings"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-black text-white leading-tight">
                {currentUser.FirstName}
              </div>
              <div className="text-[10px] text-rose-100 font-bold leading-tight">
                {currentUser.SubscriptionTier}
              </div>
            </div>
            <Avatar user={currentUser} size="sm" showBadge />
            <ChevronDown className="w-3.5 h-3.5 text-white/80 hidden sm:block" />
          </button>

          {/* Profile & Demo Dropdown */}
          {profileDropdownOpen && (
            <div
              className="absolute right-0 top-14 w-80 rounded-3xl bg-white border-2 border-rose-200 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-slate-800"
              onMouseLeave={() => setProfileDropdownOpen(false)}
            >
              <div className="pb-3 border-b border-rose-100 flex items-center gap-3">
                <Avatar user={currentUser} size="md" showBadge />
                <div>
                  <p className="font-black text-slate-900 font-heading text-sm">
                    {currentUser.LastName ? `${currentUser.FirstName} ${currentUser.LastName}` : currentUser.FirstName}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium">{currentUser.Email}</p>
                  <span className="inline-block mt-1 text-[11px] font-black text-red-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Tier: {currentUser.SubscriptionTier}
                  </span>
                </div>
              </div>

              {/* Instant Tier Switcher */}
              <div className="py-3 border-b border-rose-100 space-y-1.5">
                <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Switch Active Tier (Demo Mode)
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    onClick={() => setSubscriptionTier('Free')}
                    className={`py-1.5 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                      currentUser.SubscriptionTier === 'Free'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    Free ($0)
                  </button>
                  <button
                    onClick={() => setSubscriptionTier('Premium')}
                    className={`py-1.5 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                      currentUser.SubscriptionTier === 'Premium'
                        ? 'btn-glossy-red-pink text-white shadow-xs'
                        : 'bg-rose-50 text-red-700 hover:bg-rose-100'
                    }`}
                  >
                    Prem ($9.99)
                  </button>
                  <button
                    onClick={() => setSubscriptionTier('Premium Plus')}
                    className={`py-1.5 px-2 rounded-xl font-black transition-all cursor-pointer ${
                      currentUser.SubscriptionTier === 'Premium Plus'
                        ? 'bg-gradient-to-r from-amber-400 to-red-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    Plus ($14.99)
                  </button>
                </div>
              </div>

              {/* Demo Profile Switcher */}
              <div className="py-2.5 border-b border-rose-100 space-y-1">
                <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Test As Different Member
                </div>
                {users.map(u => (
                  <button
                    key={u.UserID}
                    onClick={() => {
                      switchUser(u.UserID);
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                      u.UserID === currentUser.UserID
                        ? 'bg-rose-50 text-red-600 font-black'
                        : 'text-slate-700 hover:bg-rose-50/50'
                    }`}
                  >
                    <span className="font-semibold">{u.FirstName} ({u.Gender}{u.Age && u.Age > 0 ? `, ${u.Age}` : ''})</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      {u.SubscriptionTier}
                    </span>
                  </button>
                ))}
              </div>

              {/* Dropdown Links */}
              <div className="pt-2.5 space-y-1">
                <button
                  onClick={() => {
                    setCurrentView('profile');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-800 hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-red-600" />
                  <span>View & Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('pricing');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-slate-800 hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-red-600" />
                  <span>Membership Pricing & Perks</span>
                </button>
                {['usr_kristy', 'usr_me', 'usr_01', 'usr_02', 'usr_03'].includes(currentUser.UserID) && (
                  <button
                    onClick={() => {
                      if (appMode !== 'production') {
                        setAppMode('production');
                      }
                      clearLiveSession();
                      registerForEvent('evt_staging_dev');
                      setSelectedEventId('evt_staging_dev');
                      setCurrentView('lobby');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl bg-slate-900 text-rose-300 hover:bg-slate-800 flex items-center gap-2 font-black text-xs shadow-xs cursor-pointer"
                  >
                    <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>Launch 2-Person Staging Test</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar with 6 Items (1. Home 2. Browse 3. Matches 4. Messages 5. Events 6. Profile) */}
      <div className="lg:hidden grid grid-cols-6 items-center bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 border-t-2 border-red-700 px-1 py-1.5 text-white shadow-md">
        {/* 1. Home */}
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl cursor-pointer transition-all ${
            currentView === 'home'
              ? 'bg-white text-red-700 font-black shadow-md'
              : 'text-white/95 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 leading-none">Home</span>
        </button>

        {/* 2. Browse */}
        <button
          onClick={() => setCurrentView('browse')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl cursor-pointer transition-all ${
            currentView === 'browse'
              ? 'bg-white text-red-700 font-black shadow-md'
              : 'text-white/95 hover:text-white'
          }`}
        >
          <Compass className="w-5 h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 leading-none">Browse</span>
        </button>

        {/* 3. Matches */}
        <button
          onClick={() => setCurrentView('matches')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl cursor-pointer transition-all relative ${
            currentView === 'matches' || currentView === 'results'
              ? 'bg-white text-red-700 font-black shadow-md'
              : 'text-white/95 hover:text-white'
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 shrink-0 ${currentView === 'matches' || currentView === 'results' ? 'fill-red-600' : 'fill-current'}`} />
            {pendingSecondDateCount > 0 ? (
              <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black leading-tight border border-amber-300 animate-pulse flex items-center">
                !
              </span>
            ) : mutualMatchCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black leading-tight border border-amber-300">
                {mutualMatchCount}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 leading-none">Matches</span>
        </button>

        {/* 4. Messages */}
        <button
          onClick={() => setCurrentView('messages')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl cursor-pointer transition-all ${
            currentView === 'messages'
              ? 'bg-white text-red-700 font-black shadow-md'
              : 'text-white/95 hover:text-white'
          }`}
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 leading-none">Messages</span>
        </button>

        {/* 5. Events */}
        <button
          onClick={() => setCurrentView('friday')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl cursor-pointer transition-all ${
            currentView === 'friday' || currentView === 'lobby' || currentView === 'live'
              ? 'bg-white text-red-700 font-black shadow-md'
              : 'text-white/95 hover:text-white'
          }`}
        >
          <Calendar className="w-5 h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 leading-none">Events</span>
        </button>

        {/* 6. Profile */}
        <button
          onClick={() => setCurrentView('profile')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl cursor-pointer transition-all ${
            currentView === 'profile'
              ? 'bg-white text-red-700 font-black shadow-md'
              : 'text-white/95 hover:text-white'
          }`}
        >
          <UserIcon className="w-5 h-5 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 leading-none">Profile</span>
        </button>
      </div>

      {/* Sliding Navigation Drawer (FIX 2 Requirement: Three-Line Menu Navigation) */}
      {menuDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMenuDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            className="relative w-80 sm:w-96 max-w-[85vw] bg-white text-slate-800 h-full shadow-2xl flex flex-col z-10 border-r-2 border-red-200 animate-in slide-in-from-left duration-250 overflow-hidden"
            role="dialog"
            aria-label="Main Navigation Menu"
          >
            {/* Drawer Header with SPEED MEET Love logo and Close Button */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-red-700 shadow-md">
              <button
                onClick={() => {
                  setCurrentView('home');
                  setMenuDrawerOpen(false);
                }}
                className="cursor-pointer text-left"
                title="Speed Meet Love - Home"
              >
                <SpeedMeetLoveLogo variant="on-red" size="sm" />
              </button>

              <button
                onClick={() => setMenuDrawerOpen(false)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer active:scale-95 border border-white/30"
                aria-label="Close menu"
                title="Close menu"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Current User Snapshot */}
            <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 border-b border-rose-100 flex items-center gap-3">
              <Avatar user={currentUser} size="md" showBadge />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-slate-900 text-sm truncate font-heading">
                  {currentUser.LastName ? `${currentUser.FirstName} ${currentUser.LastName}` : currentUser.FirstName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.Email}</p>
                <span className="inline-block mt-0.5 text-[10px] font-black text-red-600 bg-white px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                  {currentUser.SubscriptionTier}
                </span>
              </div>
            </div>

            {/* The 8 Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm font-bold">
              {/* 1. Home */}
              <button
                onClick={() => {
                  setCurrentView('home');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'home'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className={`w-5 h-5 shrink-0 ${currentView === 'home' ? 'text-white' : 'text-red-600'}`} />
                  <span className="text-base font-extrabold">Home</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'home' ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* 2. Browse Singles */}
              <button
                onClick={() => {
                  setCurrentView('browse');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'browse'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Compass className={`w-5 h-5 shrink-0 ${currentView === 'browse' ? 'text-white' : 'text-red-600'}`} />
                  <span className="text-base font-extrabold">Browse Singles</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'browse' ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* 3. My Matches */}
              <button
                onClick={() => {
                  setCurrentView('matches');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'matches' || currentView === 'results'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className={`w-5 h-5 shrink-0 ${currentView === 'matches' || currentView === 'results' ? 'text-white fill-white' : 'text-red-600 fill-red-600'}`} />
                  <span className="text-base font-extrabold">My Matches</span>
                </div>
                <div className="flex items-center gap-2">
                  {mutualMatchCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                      currentView === 'matches' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                    }`}>
                      {mutualMatchCount}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 ${currentView === 'matches' ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>

              {/* 4. Messages */}
              <button
                onClick={() => {
                  setCurrentView('messages');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'messages'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className={`w-5 h-5 shrink-0 ${currentView === 'messages' ? 'text-white' : 'text-red-600'}`} />
                  <span className="text-base font-extrabold">Messages</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'messages' ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* 5. Speed Dating Events */}
              <button
                onClick={() => {
                  setCurrentView('friday');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'friday' || currentView === 'lobby' || currentView === 'live'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 shrink-0 ${currentView === 'friday' || currentView === 'lobby' || currentView === 'live' ? 'text-white' : 'text-red-600'}`} />
                  <span className="text-base font-extrabold">Speed Dating Events</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'friday' ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* 6. My Profile */}
              <button
                onClick={() => {
                  setCurrentView('profile');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'profile'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserIcon className={`w-5 h-5 shrink-0 ${currentView === 'profile' ? 'text-white' : 'text-red-600'}`} />
                  <span className="text-base font-extrabold">My Profile</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'profile' ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* 7. Membership */}
              <button
                onClick={() => {
                  setCurrentView('pricing');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'pricing'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className={`w-5 h-5 shrink-0 ${currentView === 'pricing' ? 'text-white' : 'text-red-600'}`} />
                  <span className="text-base font-extrabold">Membership</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-red-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    $14.99/mo
                  </span>
                  <ChevronRight className={`w-4 h-4 ${currentView === 'pricing' ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </button>

              {/* 8. Settings */}
              <button
                onClick={() => {
                  setCurrentView('tables');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'tables'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className={`w-5 h-5 shrink-0 ${currentView === 'tables' ? 'text-white' : 'text-red-600'}`} />
                  <span className="text-base font-extrabold">Settings</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'tables' ? 'text-white' : 'text-slate-400'}`} />
              </button>
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-rose-100 text-xs space-y-2 text-slate-500">
              <p className="font-extrabold text-slate-800 text-center italic">
                “Real People. Real Connections. In Minutes.”
              </p>
              <div className="flex items-center justify-between pt-1">
                <span>Mode:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${appMode === 'demonstration' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
                  {appMode === 'demonstration' ? 'Demo Sandbox' : 'Production Live'}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};
