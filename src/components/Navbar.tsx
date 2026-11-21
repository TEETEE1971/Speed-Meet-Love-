import React, { useEffect, useRef, useState } from 'react';
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
  ShieldCheck,
  ShieldAlert,
  Trash2,
  LogIn,
  LogOut,
  UserPlus,
  Users,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';
import { SubscriptionTier, AppView } from '../types';

interface NavRoundedButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  variant: 'desktop' | 'mobile';
}

const TAP_HEART_PARTICLES = [
  { id: 'p1', className: 'nav-heart-p1 text-[#FF2E93] text-[10px]' },
  { id: 'p2', className: 'nav-heart-p2 text-[#FFF1F5] text-[9px]' },
  { id: 'p3', className: 'nav-heart-p3 text-[#FDA4AF] text-[11px]' },
  { id: 'p4', className: 'nav-heart-p4 text-[#F43F5E] text-[8.5px]' },
  { id: 'p5', className: 'nav-heart-p5 text-white text-[8px]' },
];

const NavRoundedButton: React.FC<NavRoundedButtonProps> = ({
  label,
  active,
  onClick,
  icon,
  variant,
}) => {
  const [tapBurstId, setTapBurstId] = useState<number>(0);
  const [isBouncing, setIsBouncing] = useState<boolean>(false);
  const bounceTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (bounceTimerRef.current !== null) window.clearTimeout(bounceTimerRef.current);
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  const handleTap = () => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      setIsBouncing(false);
      window.requestAnimationFrame(() => {
        setIsBouncing(true);
      });
      setTapBurstId(Date.now());

      if (bounceTimerRef.current !== null) window.clearTimeout(bounceTimerRef.current);
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);

      bounceTimerRef.current = window.setTimeout(() => {
        setIsBouncing(false);
      }, 380);
      burstTimerRef.current = window.setTimeout(() => {
        setTapBurstId(0);
      }, 820);
    }

    onClick();
  };

  const sizeClass =
    variant === 'desktop'
      ? 'min-w-[62px] xl:min-w-[74px] h-[50px] xl:h-[52px] px-2 xl:px-3 rounded-2xl'
      : 'w-full min-w-0 min-h-[48px] sm:min-h-[52px] px-0.5 sm:px-1.5 py-1.5 rounded-2xl';

  const labelSizeClass =
    variant === 'desktop'
      ? 'text-[10.5px] xl:text-[11px] tracking-[-0.01em]'
      : 'text-[9.5px] min-[380px]:text-[10.5px] sm:text-xs tracking-[-0.02em]';

  const stateClass = active
    ? 'bg-gradient-to-b from-white via-[#FFF5F8] to-[#FFE4EE] text-[#BE123C] border border-white ring-2 ring-pink-200/90 shadow-[0_0_16px_rgba(255,192,224,0.9),0_0_26px_rgba(255,46,147,0.42),0_4px_12px_rgba(127,29,29,0.24)]'
    : 'bg-white/15 hover:bg-white/24 text-white border border-white/28 shadow-[0_3px_10px_rgba(127,29,29,0.22)]';

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={`relative overflow-visible flex flex-col items-center justify-center gap-0.5 sm:gap-1 shrink-0 cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/95 ${sizeClass} ${stateClass} ${
        isBouncing ? 'animate-nav-tap-bounce' : active ? '-translate-y-[1px]' : 'hover:-translate-y-[1px]'
      }`}
    >
      {/* Floating Tiny Hearts Released on Tap */}
      {tapBurstId > 0 && (
        <span
          key={tapBurstId}
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 overflow-visible z-30"
        >
          {TAP_HEART_PARTICLES.map(particle => (
            <span
              key={particle.id}
              className={`nav-heart-particle drop-shadow-[0_1px_3px_rgba(136,19,55,0.45)] ${particle.className}`}
            >
              ♥
            </span>
          ))}
        </span>
      )}

      {/* Icon with Cohesive Pink/Red Accent */}
      <span
        className={`relative z-10 flex items-center justify-center transition-colors ${
          active ? 'text-[#E11D48]' : 'text-pink-100'
        }`}
      >
        {icon}
      </span>

      {/* Crisp Bold Single-Line Label */}
      <span
        className={`relative z-10 font-extrabold leading-none whitespace-nowrap select-none ${labelSizeClass} ${
          active ? 'text-[#9F1239]' : 'text-white [text-shadow:0_1px_2px_rgba(127,29,29,0.3)]'
        }`}
      >
        {label}
      </span>

      {/* Subtle Glowing Pink-Red Accent Bar on Active Tab */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full bg-gradient-to-r from-[#DC2626] via-[#E11D48] to-[#FF2E93] shadow-[0_0_6px_rgba(255,46,147,0.75)]"
        />
      )}
    </button>
  );
};

export const Navbar: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    openAuthModal,
    signOut,
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
    isOwner,
    isFreeDuringLaunch,
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);

  // Count mutual matches for current user
  const mutualMatchCount = currentUser
    ? matches.filter(m => m.UserA === currentUser.UserID || m.UserB === currentUser.UserID).length
    : 0;

  const getTierBadge = (tier: SubscriptionTier) => {
    if (isFreeDuringLaunch) {
      if (currentUser?.LaunchOfferGranted && currentUser?.LaunchOfferGrantNumber) {
        return {
          label: `Founding #${currentUser.LaunchOfferGrantNumber} · Free Launch`,
          style: 'bg-amber-300 text-slate-950 font-black shadow-sm border border-amber-200',
        };
      }
      return {
        label: 'Free During Launch',
        style: 'bg-white text-[#BE123C] font-black shadow-sm border border-rose-100',
      };
    }
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

  const badge = currentUser ? getTierBadge(currentUser.SubscriptionTier) : null;

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-xl border-b-2 border-red-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-[72px] sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Upper-Left Corner: Three-Line Menu Button + SPEED MEET Love Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setMenuDrawerOpen(true)}
            className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 text-white transition-all cursor-pointer border border-white/35 shadow-xs flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Open main navigation menu"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.75]" />
          </button>

          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center text-left whitespace-nowrap group focus:outline-none cursor-pointer"
            title="Speed Meet Love - Home"
          >
            <SpeedMeetLoveLogo variant="on-red" size="lg" />
          </button>
        </div>

        {/* Desktop Navigation Bar: 6 Elegant Rounded Buttons with Pink/Red Accents & Glowing Active State */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2" aria-label="Primary navigation">
          {/* 1. Home */}
          <NavRoundedButton
            variant="desktop"
            label="Home"
            active={currentView === 'home'}
            onClick={() => setCurrentView('home')}
            icon={<Home className="w-4 h-4 shrink-0 stroke-[2.35]" />}
          />

          {/* 2. Browse */}
          <NavRoundedButton
            variant="desktop"
            label="Browse"
            active={currentView === 'browse'}
            onClick={() => setCurrentView('browse')}
            icon={<Compass className="w-4 h-4 shrink-0 stroke-[2.35]" />}
          />

          {/* 3. Matches */}
          <NavRoundedButton
            variant="desktop"
            label="Matches"
            active={currentView === 'matches' || currentView === 'results'}
            onClick={() => setCurrentView('matches')}
            icon={
              <div className="relative">
                <Heart
                  className={`w-4 h-4 shrink-0 stroke-[2.35] ${
                    currentView === 'matches' || currentView === 'results'
                      ? 'fill-[#E11D48] text-[#E11D48]'
                      : 'fill-pink-200/80 text-pink-100'
                  }`}
                />
                {pendingSecondDateCount > 0 ? (
                  <span
                    title={`${pendingSecondDateCount} Second-Chance Date Invitation${pendingSecondDateCount > 1 ? 's' : ''}`}
                    className="absolute -top-1.5 -right-2.5 px-1 py-0.2 rounded-full text-[8px] font-mono font-black bg-amber-400 text-slate-950 animate-pulse flex items-center gap-0.5 shadow-xs border border-amber-300 leading-none"
                  >
                    <Sparkles className="w-2 h-2 text-amber-900 fill-amber-900" />
                    <span>{pendingSecondDateCount}</span>
                  </span>
                ) : mutualMatchCount > 0 ? (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[8px] font-mono font-black bg-[#FF2E93] text-white border border-white/80 shadow-xs leading-none">
                    {mutualMatchCount}
                  </span>
                ) : null}
              </div>
            }
          />

          {/* 4. Messages */}
          <NavRoundedButton
            variant="desktop"
            label="Messages"
            active={currentView === 'messages'}
            onClick={() => setCurrentView('messages')}
            icon={<MessageCircle className="w-4 h-4 shrink-0 stroke-[2.35]" />}
          />

          {/* 5. Events */}
          <NavRoundedButton
            variant="desktop"
            label="Events"
            active={currentView === 'friday' || currentView === 'lobby' || currentView === 'live'}
            onClick={() => setCurrentView('friday')}
            icon={<Calendar className="w-4 h-4 shrink-0 stroke-[2.35]" />}
          />

          {/* 6. Profile */}
          <NavRoundedButton
            variant="desktop"
            label="Profile"
            active={currentView === 'profile'}
            onClick={() => setCurrentView('profile')}
            icon={<UserIcon className="w-4 h-4 shrink-0 stroke-[2.35]" />}
          />
        </nav>

        {/* Right Zone: Controls, Tiers, and User Avatar */}
        <div className="relative flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Mode Switcher (Signed-in Owner only) */}
          {isOwner && (
            <button
              onClick={() => setAppMode(appMode === 'demonstration' ? 'production' : 'demonstration')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all bg-black/25 hover:bg-black/40 text-white border border-white/30 shadow-xs cursor-pointer"
              title="Click to toggle between Demonstration Mode (Sandbox Testing) and Production Mode"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${appMode === 'demonstration' ? 'bg-amber-300 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="hidden sm:inline">{appMode === 'demonstration' ? 'Demo Sandbox' : 'Production'}</span>
            </button>
          )}

          {/* Authenticated Member Actions OR Guest Sign In Buttons */}
          {currentUser && isAuthenticated ? (
            <>
              {/* Tier Badge */}
              {badge && (
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
              )}

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
                    {isFreeDuringLaunch ? 'Free Launch Access' : currentUser.SubscriptionTier}
                  </div>
                </div>
                <Avatar user={currentUser} size="sm" showBadge />
                <ChevronDown className="w-3.5 h-3.5 text-white/80 hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 top-14 w-80 rounded-3xl bg-white border-2 border-rose-200 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs text-[#111827]"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <div className="pb-3 border-b border-rose-100 flex items-center gap-3">
                    <Avatar user={currentUser} size="md" showBadge />
                    <div>
                      <p className="font-bold text-[#111827] font-heading text-sm">
                        {currentUser.LastName ? `${currentUser.FirstName} ${currentUser.LastName}` : currentUser.FirstName}
                      </p>
                      <p className="text-[11px] text-[#111827] font-medium">{currentUser.Email}</p>
                      <span className="inline-block mt-1 text-[11px] font-bold text-[#B91C1C] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {isFreeDuringLaunch
                          ? currentUser.LaunchOfferGranted && currentUser.LaunchOfferGrantNumber
                            ? `Founding #${currentUser.LaunchOfferGrantNumber} · Free Launch`
                            : 'Free During Launch'
                          : `Tier: ${currentUser.SubscriptionTier}`}
                      </span>
                    </div>
                  </div>

                  {/* Demonstration Sandbox Controls (Owner in Demo Mode only, NEVER in Production) */}
                  {isOwner && appMode === 'demonstration' && (
                    <>
                      {/* Instant Tier Switcher */}
                      <div className="py-3 border-b border-rose-100 space-y-1.5">
                        <div className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">
                          Switch Active Tier (Demo Mode)
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                          <button
                            onClick={() => setSubscriptionTier('Free')}
                            className={`py-1.5 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                              currentUser.SubscriptionTier === 'Free'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-[#111827] hover:bg-slate-200'
                            }`}
                          >
                            Free ($0)
                          </button>
                          <button
                            onClick={() => setSubscriptionTier('Premium')}
                            className={`py-1.5 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                              currentUser.SubscriptionTier === 'Premium'
                                ? 'btn-glossy-red-pink text-white shadow-xs'
                                : 'bg-rose-50 text-[#991B1B] hover:bg-rose-100'
                            }`}
                          >
                            Prem ($9.99)
                          </button>
                          <button
                            onClick={() => setSubscriptionTier('Premium Plus')}
                            className={`py-1.5 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                              currentUser.SubscriptionTier === 'Premium Plus'
                                ? 'bg-gradient-to-r from-amber-400 to-red-600 text-white shadow-xs'
                                : 'bg-amber-50 text-[#78350F] hover:bg-amber-100'
                            }`}
                          >
                            Plus ($14.99)
                          </button>
                        </div>
                      </div>

                      {/* Demo Profile Switcher */}
                      <div className="py-2.5 border-b border-rose-100 space-y-1">
                        <div className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">
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
                                ? 'bg-rose-50 text-[#B91C1C] font-bold'
                                : 'text-[#111827] font-medium hover:bg-rose-50/50'
                            }`}
                          >
                            <span className="font-semibold">{u.FirstName} ({u.Gender}{u.Age && u.Age > 0 ? `, ${u.Age}` : ''})</span>
                            <span className="text-[10px] text-[#111827] font-mono font-bold">
                              {u.SubscriptionTier}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Dropdown Links */}
                  <div className="pt-2.5 space-y-1">
                    <button
                      onClick={() => {
                        setCurrentView('profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-[#111827] hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-[#B91C1C]" />
                      <span>View & Edit Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('pricing');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-[#111827] hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-[#B91C1C]" />
                      <span>Membership Pricing & Perks</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('privacy');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-[#111827] hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#B91C1C]" />
                      <span>Privacy Policy</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('child_safety');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-[#111827] hover:bg-rose-50 flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
                      <span>Child Safety Standards</span>
                    </button>
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setCurrentView('owner_reports');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#78350F] flex items-center gap-2 font-bold text-xs border border-amber-200 cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4 text-[#B45309]" />
                          <span>Owner Safety &amp; Reports</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView('owner_users');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#831843] flex items-center gap-2 font-bold text-xs border border-pink-200 cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-[#BE185D]" />
                          <span>Registered Users (Live)</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView('owner_waitlist');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#9D174D] flex items-center gap-2 font-bold text-xs border border-rose-200 cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-[#BE185D] fill-[#BE185D]" />
                          <span>Private Event Waitlist</span>
                        </button>
                      </>
                    )}
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
                    <button
                      onClick={() => {
                        signOut();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-[#B91C1C] hover:bg-red-50 flex items-center gap-2 font-bold cursor-pointer border-t border-rose-100 mt-1 pt-2"
                    >
                      <LogOut className="w-4 h-4 text-[#B91C1C]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Guest Visitors: Pink Heart Sign In & Create Account */
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                aria-label="Sign In"
                className="relative group w-[56px] h-[50px] sm:w-[64px] sm:h-[56px] shrink-0 mx-0.5 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90 rounded-2xl transition-transform active:scale-95"
              >
                <span className="relative w-full h-full flex items-center justify-center animate-heart-signin group-hover:brightness-105">
                  <svg
                    viewBox="0 0 64 56"
                    className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="headerSignInHeartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF77BC" />
                        <stop offset="45%" stopColor="#EB2A88" />
                        <stop offset="100%" stopColor="#BE185D" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M32 52.5 C32 52.5 4 36 4 18.5 C4 9.5 11.2 3 19.5 3 C24.8 3 29.5 5.9 32 10.2 C34.5 5.9 39.2 3 44.5 3 C52.8 3 60 9.5 60 18.5 C60 36 32 52.5 32 52.5 Z"
                      fill="url(#headerSignInHeartGrad)"
                      stroke="rgba(255, 241, 247, 0.9)"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="relative z-10 pb-1.5 text-white font-extrabold text-[10.5px] sm:text-[11.5px] leading-none tracking-tight whitespace-nowrap select-none [text-shadow:0_1px_2px_rgba(131,24,67,0.8)]">
                    Sign In
                  </span>
                </span>
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-white hover:bg-rose-50 text-[#B91C1C] font-extrabold text-[11px] sm:text-xs shadow-md transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 hidden min-[400px]:inline shrink-0" />
                <span>{isFreeDuringLaunch ? 'Join Free' : 'Create Account'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile / Android Navigation Bar: 6 Elegant Rounded Buttons Built to Fit Without Squeezing */}
      <nav
        aria-label="Mobile primary navigation"
        className="lg:hidden grid grid-cols-6 gap-1 min-[390px]:gap-1.5 sm:gap-2 items-center bg-gradient-to-r from-[#B91C1C] via-[#BE123C] to-[#DB2777] border-t border-white/20 px-1.5 min-[390px]:px-2 sm:px-3 py-1.5 sm:py-2 shadow-md"
      >
        {/* 1. Home */}
        <NavRoundedButton
          variant="mobile"
          label="Home"
          active={currentView === 'home'}
          onClick={() => setCurrentView('home')}
          icon={<Home className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 stroke-[2.35]" />}
        />

        {/* 2. Browse */}
        <NavRoundedButton
          variant="mobile"
          label="Browse"
          active={currentView === 'browse'}
          onClick={() => setCurrentView('browse')}
          icon={<Compass className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 stroke-[2.35]" />}
        />

        {/* 3. Matches */}
        <NavRoundedButton
          variant="mobile"
          label="Matches"
          active={currentView === 'matches' || currentView === 'results'}
          onClick={() => setCurrentView('matches')}
          icon={
            <div className="relative">
              <Heart
                className={`w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 stroke-[2.35] ${
                  currentView === 'matches' || currentView === 'results'
                    ? 'fill-[#E11D48] text-[#E11D48]'
                    : 'fill-pink-200/80 text-pink-100'
                }`}
              />
              {pendingSecondDateCount > 0 ? (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black leading-none border border-amber-300 animate-pulse flex items-center">
                  !
                </span>
              ) : mutualMatchCount > 0 ? (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-[#FF2E93] text-white border border-white/80 text-[8px] font-black leading-none">
                  {mutualMatchCount}
                </span>
              ) : null}
            </div>
          }
        />

        {/* 4. Messages */}
        <NavRoundedButton
          variant="mobile"
          label="Messages"
          active={currentView === 'messages'}
          onClick={() => setCurrentView('messages')}
          icon={<MessageCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 stroke-[2.35]" />}
        />

        {/* 5. Events */}
        <NavRoundedButton
          variant="mobile"
          label="Events"
          active={currentView === 'friday' || currentView === 'lobby' || currentView === 'live'}
          onClick={() => setCurrentView('friday')}
          icon={<Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 stroke-[2.35]" />}
        />

        {/* 6. Profile */}
        <NavRoundedButton
          variant="mobile"
          label="Profile"
          active={currentView === 'profile'}
          onClick={() => setCurrentView('profile')}
          icon={<UserIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 stroke-[2.35]" />}
        />
      </nav>

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
            className="relative w-80 sm:w-96 max-w-[85vw] bg-white text-[#111827] h-full shadow-2xl flex flex-col z-10 border-r-2 border-red-200 animate-in slide-in-from-left duration-250 overflow-hidden"
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

            {/* Current User Snapshot or Guest Sign In */}
            {currentUser && isAuthenticated ? (
              <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 border-b border-rose-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar user={currentUser} size="md" showBadge />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#111827] text-sm truncate font-heading">
                      {currentUser.LastName ? `${currentUser.FirstName} ${currentUser.LastName}` : currentUser.FirstName}
                    </p>
                    <p className="text-[11px] text-[#111827] font-medium truncate">{currentUser.Email}</p>
                    <span className="inline-block mt-0.5 text-[10px] font-bold text-[#B91C1C] bg-white px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                      {isFreeDuringLaunch
                        ? currentUser.LaunchOfferGranted && currentUser.LaunchOfferGrantNumber
                          ? `Founding #${currentUser.LaunchOfferGrantNumber} · Free Launch`
                          : 'Free During Launch'
                        : currentUser.SubscriptionTier}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMenuDrawerOpen(false);
                  }}
                  className="p-2 rounded-xl text-[#B91C1C] hover:bg-rose-100/60 active:scale-95 transition-all cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 border-b border-rose-100 space-y-2">
                <p className="font-bold text-[#111827] text-sm font-heading">
                  Welcome to Speed Meet Love
                </p>
                <p className="text-xs text-[#111827] font-medium">
                  Sign in or create an account (18+) to access weekend speed dating and mutual matches.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      openAuthModal('signin');
                      setMenuDrawerOpen(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl btn-glossy-red-pink text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup');
                      setMenuDrawerOpen(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-[#B91C1C] font-extrabold text-xs border border-rose-200 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </div>
            )}

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
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className={`w-5 h-5 shrink-0 ${currentView === 'home' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Home</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'home' ? 'text-white' : 'text-[#111827]'}`} />
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
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Compass className={`w-5 h-5 shrink-0 ${currentView === 'browse' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Browse Singles</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'browse' ? 'text-white' : 'text-[#111827]'}`} />
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
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className={`w-5 h-5 shrink-0 ${currentView === 'matches' || currentView === 'results' ? 'text-white fill-white' : 'text-[#B91C1C] fill-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">My Matches</span>
                </div>
                <div className="flex items-center gap-2">
                  {mutualMatchCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                      currentView === 'matches' ? 'bg-white text-[#B91C1C]' : 'bg-red-600 text-white'
                    }`}>
                      {mutualMatchCount}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 ${currentView === 'matches' ? 'text-white' : 'text-[#111827]'}`} />
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
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className={`w-5 h-5 shrink-0 ${currentView === 'messages' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Messages</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'messages' ? 'text-white' : 'text-[#111827]'}`} />
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
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 shrink-0 ${currentView === 'friday' || currentView === 'lobby' || currentView === 'live' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Speed Dating Events</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'friday' ? 'text-white' : 'text-[#111827]'}`} />
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
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserIcon className={`w-5 h-5 shrink-0 ${currentView === 'profile' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">My Profile</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'profile' ? 'text-white' : 'text-[#111827]'}`} />
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
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className={`w-5 h-5 shrink-0 ${currentView === 'pricing' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Membership</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#B91C1C] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Plans
                  </span>
                  <ChevronRight className={`w-4 h-4 ${currentView === 'pricing' ? 'text-white' : 'text-[#111827]'}`} />
                </div>
              </button>

              {/* 8. Settings / Table Inspector (Signed-in Owner only) */}
              {isOwner && (
                <button
                  onClick={() => {
                    setCurrentView('tables');
                    setMenuDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                    currentView === 'tables'
                      ? 'btn-glossy-red-pink text-white shadow-md'
                      : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className={`w-5 h-5 shrink-0 ${currentView === 'tables' ? 'text-white' : 'text-[#B91C1C]'}`} />
                    <span className="text-base font-extrabold">Settings</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${currentView === 'tables' ? 'text-white' : 'text-[#111827]'}`} />
                </button>
              )}

              {/* 9. Privacy Policy */}
              <button
                onClick={() => {
                  setCurrentView('privacy');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'privacy'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-5 h-5 shrink-0 ${currentView === 'privacy' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Privacy Policy</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'privacy' ? 'text-white' : 'text-[#111827]'}`} />
              </button>

              {/* 10. Child Safety Standards */}
              <button
                onClick={() => {
                  setCurrentView('child_safety');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'child_safety'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-[#111827] hover:bg-rose-50 hover:text-[#B91C1C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className={`w-5 h-5 shrink-0 ${currentView === 'child_safety' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Child Safety Standards</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'child_safety' ? 'text-white' : 'text-[#111827]'}`} />
              </button>

              {/* Owner Safety & Reports (Owner-Only) */}
              {isOwner && (
                <>
                  <button
                    onClick={() => {
                      setCurrentView('owner_reports');
                      setMenuDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                      currentView === 'owner_reports'
                        ? 'btn-glossy-red-pink text-white shadow-md'
                        : 'bg-amber-50/70 border border-amber-200 text-[#78350F] hover:bg-amber-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldAlert className={`w-5 h-5 shrink-0 ${currentView === 'owner_reports' ? 'text-white' : 'text-[#B45309]'}`} />
                      <span className="text-base font-bold">Owner Safety Reports</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${currentView === 'owner_reports' ? 'text-white' : 'text-[#B45309]'}`} />
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('owner_users');
                      setMenuDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                      currentView === 'owner_users'
                        ? 'btn-glossy-red-pink text-white shadow-md'
                        : 'bg-pink-50/70 border border-pink-200 text-[#831843] hover:bg-pink-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className={`w-5 h-5 shrink-0 ${currentView === 'owner_users' ? 'text-white' : 'text-[#BE185D]'}`} />
                      <span className="text-base font-bold">Registered Users (Live)</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${currentView === 'owner_users' ? 'text-white' : 'text-[#BE185D]'}`} />
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('owner_waitlist');
                      setMenuDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                      currentView === 'owner_waitlist'
                        ? 'btn-glossy-red-pink text-white shadow-md'
                        : 'bg-rose-50/70 border border-rose-200 text-[#9D174D] hover:bg-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Heart className={`w-5 h-5 shrink-0 ${currentView === 'owner_waitlist' ? 'text-white fill-white' : 'text-[#BE185D] fill-[#BE185D]'}`} />
                      <span className="text-base font-bold">Private Event Waitlist</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${currentView === 'owner_waitlist' ? 'text-white' : 'text-[#BE185D]'}`} />
                  </button>
                </>
              )}

              {/* 11. Delete Account */}
              <button
                onClick={() => {
                  setCurrentView('delete_account');
                  setMenuDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                  currentView === 'delete_account'
                    ? 'btn-glossy-red-pink text-white shadow-md'
                    : 'text-[#B91C1C] hover:bg-red-50 hover:text-[#991B1B]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Trash2 className={`w-5 h-5 shrink-0 ${currentView === 'delete_account' ? 'text-white' : 'text-[#B91C1C]'}`} />
                  <span className="text-base font-extrabold">Delete Account</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'delete_account' ? 'text-white' : 'text-[#111827]'}`} />
              </button>
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-rose-100 text-xs space-y-2 text-[#111827] font-medium">
              <p className="font-bold text-[#111827] text-center italic">
                “Real People. Real Connections. In Minutes.”
              </p>
              {isOwner && (
                <div className="flex items-center justify-between pt-1">
                  <span>Mode:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${appMode === 'demonstration' ? 'bg-amber-100 text-[#78350F] border border-amber-300' : 'bg-emerald-100 text-[#064E3B] border border-emerald-300'}`}>
                    {appMode === 'demonstration' ? 'Demo Sandbox' : 'Production Live'}
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
};
