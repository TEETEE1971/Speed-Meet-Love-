import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SpeedEvent, User } from '../types';
import {
  Calendar,
  Clock,
  Users,
  Sparkles,
  Heart,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Video,
  Lock,
  ChevronRight,
  Flame,
  Compass,
  MessageCircle,
} from 'lucide-react';
import { FloatingHearts } from './FloatingHearts';
import { HeroGoldAnalogClock } from './HeroGoldAnalogClock';
import { RainbowHeart } from './RainbowHeart';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';
import confetti from 'canvas-confetti';

interface HomeScreenProps {
  onSelectView?: (view: 'card' | 'grid') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectView }) => {
  const {
    currentUser,
    isAuthenticated,
    isOwner,
    openAuthModal,
    setCurrentView,
    setSelectedEventId,
    registerForEvent,
    canAccessLiveSpeedDating,
    showNotification,
    isEventLive,
    waitlistJoined,
    waitlistLoading,
    joinWaitlist,
    leaveWaitlist,
    confirmedLaunchEvents,
  } = useApp();

  const isEligible = currentUser ? canAccessLiveSpeedDating(currentUser) : false;
  const hasExistingPremiumPlus = currentUser?.SubscriptionTier === 'Premium Plus';

  const launchEvents = confirmedLaunchEvents;

  const handleRSVP = (evt: SpeedEvent) => {
    if (!currentUser || !isAuthenticated) {
      openAuthModal('signin');
      return;
    }
    if (!isEligible) {
      showNotification('Event membership coming soon.', 'pink');
      setCurrentView('pricing');
      return;
    }
    const res = registerForEvent(evt.EventID);
    if (res.success) {
      showNotification(`You're confirmed for ${evt.EventName}!`, 'success');
      try {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.7 },
          colors: ['#DC2626', '#FF2E93', '#F43F5E', '#FFFFFF'],
        });
      } catch (e) {}
    }
  };

  const handleEnterEventLobby = (evt: SpeedEvent) => {
    if (!currentUser || !isAuthenticated) {
      openAuthModal('signin');
      return;
    }
    setSelectedEventId(evt.EventID);
    setCurrentView('lobby');
  };

  const handleJoinAnEventClick = () => {
    if (!currentUser || !isAuthenticated) {
      openAuthModal('signin');
      return;
    }
    const liveOrFirst = launchEvents.find(e => isEventLive(e) || e.EventStatus === 'Live') || launchEvents[0];
    if (liveOrFirst) {
      setSelectedEventId(liveOrFirst.EventID);
      setCurrentView('lobby');
    } else {
      setCurrentView('friday');
    }
  };

  const handleWaitlistAction = async () => {
    if (!currentUser || !isAuthenticated) {
      openAuthModal('signin');
      return;
    }
    if (waitlistJoined) {
      await leaveWaitlist();
    } else {
      await joinWaitlist();
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-14">
      {/* =========================================================================
          HERO SECTION
          Large Logo, Bold Headline, Overlapping Rectangular Profile Photos with Central Kristy Photo,
          Floating Hearts, and Large "Join an Event" Button
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-[#FFF5F7] to-[#FFE8EC] border-2 border-rose-200 p-6 sm:p-12 lg:p-16 shadow-2xl">
        {/* Animated Floating Hearts */}
        <FloatingHearts count={12} colors={['turquoise', 'pink', 'red', 'yellow']} />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
          
          {/* Recreated Large SPEED MEET Love Logo (Requirement) */}
          <div className="flex justify-center pt-2">
            <SpeedMeetLoveLogo variant="on-light" size="xl" className="transform scale-105 sm:scale-115" />
          </div>

          {/* Schedule Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-rose-300 shadow-xs">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#B91C1C] animate-pulse" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#B91C1C] font-heading">
              {launchEvents.length > 0
                ? `${launchEvents[0].DayOfWeek}, ${launchEvents[0].EventDate} · 7:00 PM EST`
                : 'First event date coming soon.'}
            </span>
            <Sparkles className="w-4 h-4 text-[#B45309] fill-amber-400" />
          </div>

          {/* Bold Descriptive H1 Headline with Centered Animated Gold Analog Clock Behind */}
          <div className="relative">
            <HeroGoldAnalogClock className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10" />
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#111827] font-heading tracking-tight leading-tight">
              Meet Singles on Speed Meet Love{' '}
              <span className="block mt-2 text-2xl sm:text-4xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-[#B91C1C] via-[#BE123C] to-[#BE185D]">
                Real People. Real Connections. In Minutes.
              </span>
            </h1>
          </div>

          {/* Launch Waiting List Announcement */}
          <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-white/95 border-2 border-pink-300 shadow-md space-y-2.5">
            <p className="text-sm sm:text-lg font-bold text-[#111827] leading-relaxed">
              We’re welcoming our first members! Our first speed-dating event will be announced once enough compatible singles have joined.
            </p>
            <p className="text-xs sm:text-sm font-medium text-[#111827] leading-relaxed">
              Curated 5-minute live video dates with comfortable 2-minute breaks and confidential mutual matching.
            </p>
            {(!isAuthenticated || (currentUser?.EmailVerified !== true && !isOwner && !currentUser?.IsTester)) && (
              <div className="mt-2 p-3 rounded-xl bg-gradient-to-r from-pink-50 via-rose-50 to-teal-50 border border-pink-200 text-xs sm:text-sm font-bold text-[#111827] flex items-center justify-center gap-2">
                <Heart className="w-4 h-4 text-[#BE185D] fill-[#BE185D] shrink-0" />
                <span>
                  Our first 50 eligible members receive one month of Premium FREE! Sign up and verify your email to discover if you’ve claimed a spot.
                </span>
              </div>
            )}
          </div>

          {/* OVERLAPPING RECTANGULAR PROFILE PHOTOGRAPHS WITH CENTRAL KRISTY PHOTO */}
          <div className="pt-6 sm:pt-10 pb-10 sm:pb-14 flex flex-col items-center justify-center relative">
            <div className="flex items-center justify-center relative max-w-full px-2 sm:px-4">
              
              {/* 1. Outer Left Rectangular Photo: Adult Man (Alex, 29) */}
              <div className="hidden md:block relative w-32 h-46 lg:w-40 lg:h-58 rounded-2xl lg:rounded-3xl shadow-xl border-3 border-white overflow-hidden -mr-8 lg:-mr-10 transform -rotate-12 z-0 hover:rotate-0 hover:z-25 transition-all group">
                <img
                  src="/assets/man_alex.jpg"
                  alt="Alex, 29"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 text-white text-left">
                  <span className="text-[10px] sm:text-xs font-black font-heading block leading-tight">Alex, 29</span>
                  <span className="text-[9px] text-rose-200 font-medium">Brooklyn, NY</span>
                </div>
              </div>

              {/* 2. Inner Left Overlapping Rectangular Photo: Adult Woman (Sarah, 28) */}
              <div className="relative w-32 h-48 sm:w-44 sm:h-62 md:w-50 md:h-72 rounded-2xl sm:rounded-3xl shadow-2xl border-3 sm:border-4 border-white overflow-hidden -mr-6 sm:-mr-8 md:-mr-10 transform -rotate-6 z-10 hover:rotate-0 hover:z-25 transition-all group">
                <img
                  src="/assets/woman_sarah.jpg"
                  alt="Sarah, 28"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 text-white text-left">
                  <span className="text-xs sm:text-sm font-black font-heading block leading-tight">Sarah, 28</span>
                  <span className="text-[10px] text-rose-200 font-medium">Manhattan, NY</span>
                </div>
              </div>

              {/* 3. PROMINENT CENTRAL KRISTY PHOTOGRAPH (Exact Uploaded Photo, Largest in Center) */}
              <div
                className="relative z-30 group cursor-pointer"
                onClick={() => (onSelectView ? onSelectView('card') : setCurrentView('browse'))}
                title="Kristy - Founder of Speed Meet Love"
              >
                <div className="w-48 h-66 sm:w-60 sm:h-84 md:w-72 md:h-100 rounded-3xl overflow-hidden shadow-2xl border-4 sm:border-6 border-white ring-4 ring-rose-500/40 relative group-hover:scale-105 transition-all bg-slate-900">
                  <img
                    src="/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png"
                    alt="Kristy - Founder of Speed Meet Love"
                    className="w-full h-full object-cover object-[center_30%]"
                  />
                  {/* Subtle Bottom Vignette Gradient */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 sm:p-4 pb-6 sm:pb-7 text-white text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm sm:text-base font-heading">Kristy</span>
                      <Heart className="w-4 h-4 fill-[#FF2E93] text-[#FF2E93]" />
                    </div>
                    <p className="text-[11px] sm:text-xs text-rose-200 font-bold">
                      Founder · Speed Meet Love
                    </p>
                  </div>
                </div>

                {/* ELEGANT PINK HEART BADGE (Exact User Requirement: "Kristy ❤️ Founder of Speed Meet Love") */}
                <div className="absolute -bottom-4 sm:-bottom-5 inset-x-0 mx-auto w-max max-w-[95%] z-40 text-center">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#FF2E93] via-rose-500 to-red-600 text-white shadow-2xl border-2 sm:border-3 border-white font-black text-xs sm:text-sm tracking-tight whitespace-nowrap">
                    <span>Kristy</span>
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white shrink-0 animate-pulse" />
                    <span>Founder of Speed Meet Love</span>
                  </div>
                </div>

                {/* Decorative Floating Hearts Around Central Photo */}
                <div className="absolute -top-3.5 -right-2 bg-gradient-to-r from-red-600 to-[#FF2E93] text-white p-2 rounded-full shadow-xl border-2 border-white animate-bounce">
                  <Heart className="w-4 h-4 fill-white text-white" />
                </div>
                <div className="absolute -top-2.5 -left-2 bg-white text-red-600 p-1.5 rounded-full shadow-lg border border-rose-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                </div>
              </div>

              {/* 4. Inner Right Overlapping Rectangular Photo: Adult Woman (Elena, 27) */}
              <div className="relative w-32 h-48 sm:w-44 sm:h-62 md:w-50 md:h-72 rounded-2xl sm:rounded-3xl shadow-2xl border-3 sm:border-4 border-white overflow-hidden -ml-6 sm:-ml-8 md:-ml-10 transform rotate-6 z-10 hover:rotate-0 hover:z-25 transition-all group">
                <img
                  src="/assets/woman_elena.jpg"
                  alt="Elena, 27"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 text-white text-left">
                  <span className="text-xs sm:text-sm font-black font-heading block leading-tight">Elena, 27</span>
                  <span className="text-[10px] text-rose-200 font-medium">Williamsburg, NY</span>
                </div>
              </div>

              {/* 5. Outer Right Rectangular Photo: Adult Man (Marcus, 31) */}
              <div className="hidden md:block relative w-32 h-46 lg:w-40 lg:h-58 rounded-2xl lg:rounded-3xl shadow-xl border-3 border-white overflow-hidden -ml-8 lg:-ml-10 transform rotate-12 z-0 hover:rotate-0 hover:z-25 transition-all group">
                <img
                  src="/assets/man_marcus.jpg"
                  alt="Marcus, 31"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 text-white text-left">
                  <span className="text-[10px] sm:text-xs font-black font-heading block leading-tight">Marcus, 31</span>
                  <span className="text-[9px] text-rose-200 font-medium">SoHo, New York</span>
                </div>
              </div>

            </div>
          </div>

          {/* PRIMARY CTAs: Free Join the Event Waiting List + Browse Singles / Join Confirmed Event */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            {isAuthenticated && waitlistJoined ? (
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <div className="py-3.5 px-6 rounded-full bg-emerald-50 border-2 border-emerald-400 text-[#065F46] font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md w-full sm:w-auto">
                  <CheckCircle className="w-5 h-5 text-[#047857] shrink-0" />
                  <span>You’re on the Event Waiting List</span>
                </div>
                <button
                  type="button"
                  disabled={waitlistLoading}
                  onClick={handleWaitlistAction}
                  className="py-3.5 px-6 rounded-full bg-white hover:bg-rose-50 text-[#BE123C] font-bold text-sm border-2 border-rose-300 shadow-sm transition-all cursor-pointer disabled:opacity-60 w-full sm:w-auto"
                >
                  {waitlistLoading ? 'Updating...' : 'Leave Waiting List'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={waitlistLoading}
                onClick={handleWaitlistAction}
                className="btn-glossy-red-pink py-4 sm:py-5 px-9 text-base sm:text-lg font-black w-full sm:w-auto shadow-2xl cursor-pointer ring-2 ring-white/60 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Sparkles className="w-5 h-5" />
                <span>{waitlistLoading ? 'Saving...' : 'Join the Event Waiting List'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {launchEvents.length > 0 && (
              <button
                onClick={handleJoinAnEventClick}
                className="w-full sm:w-auto py-4 sm:py-5 px-8 rounded-full bg-white hover:bg-rose-50 text-[#B91C1C] font-extrabold text-base border-2 border-rose-300 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5 text-[#B91C1C]" />
                <span>Join Launch Event</span>
              </button>
            )}

            <button
              onClick={() => (onSelectView ? onSelectView('grid') : setCurrentView('browse'))}
              className="w-full sm:w-auto py-4 sm:py-5 px-8 rounded-full bg-white hover:bg-rose-50 text-[#111827] hover:text-[#B91C1C] font-extrabold text-base border-2 border-rose-200 hover:border-red-500 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Compass className="w-5 h-5 text-[#B91C1C]" />
              <span>Browse Singles</span>
            </button>
          </div>

          {/* Three Core Speed-Dating Rules */}
          <div className="relative z-20 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B91C1C] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] font-heading">5-Minute Video Rounds</p>
                <p className="text-[11px] text-[#111827] font-medium">Server-controlled countdown</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#BE185D] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] font-heading">2-Minute Breaks</p>
                <p className="text-[11px] text-[#111827] font-medium">Mutual readiness consent</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#BE123C] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] font-heading">Confidential Voting</p>
                <p className="text-[11px] text-[#111827] font-medium">Mutual-like reveals only</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          LAUNCH SPEED DATING STATUS / CONFIRMED LAUNCH EVENTS
          ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B91C1C] font-heading">
              <Heart className="w-4 h-4 text-[#B91C1C] fill-[#B91C1C]" />
              <span>Launch Event Schedule</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] font-heading tracking-tight mt-0.5">
              {launchEvents.length > 0 ? 'Confirmed Launch Event' : 'Upcoming Live Video Speed-Dating Schedule'}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#111827] mt-0.5">
              We’re welcoming our first members! The first event date will be announced once enough compatible singles join.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('friday')}
            className="self-start sm:self-auto text-xs font-bold text-[#B91C1C] hover:text-red-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>View Events &amp; Waiting List</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {launchEvents.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-rose-200 p-7 sm:p-10 shadow-lg text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#BE185D]">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-[#111827] font-heading">
                First event date coming soon.
              </h3>
              <p className="text-sm font-medium text-[#111827] leading-relaxed">
                We’re welcoming our first members! Our first speed-dating event will be announced once enough compatible singles have joined.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              {isAuthenticated && waitlistJoined ? (
                <>
                  <span className="px-5 py-3 rounded-full bg-emerald-50 border border-emerald-300 text-[#065F46] font-bold text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#047857]" />
                    On the Event Waiting List (Free)
                  </span>
                  <button
                    type="button"
                    disabled={waitlistLoading}
                    onClick={handleWaitlistAction}
                    className="px-5 py-3 rounded-full bg-white hover:bg-rose-50 text-[#BE123C] border border-rose-300 font-bold text-xs sm:text-sm cursor-pointer disabled:opacity-60"
                  >
                    Leave Waiting List
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={waitlistLoading}
                  onClick={handleWaitlistAction}
                  className="btn-glossy-red-pink py-3.5 px-8 text-sm font-black cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                >
                  <Heart className="w-4 h-4 fill-white text-white" />
                  <span>Join the Event Waiting List</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {launchEvents.map(evt => {
              const isUserRegistered = currentUser ? evt.ParticipantsList.includes(currentUser.UserID) : false;
              const isLGBTQ = evt.EventType === 'LGBTQ+';
              const isLive = isEventLive(evt) || evt.EventStatus === 'Live';

              return (
                <div
                  key={evt.EventID}
                  className={`rounded-3xl bg-white border-2 p-6 sm:p-7 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden ${
                    isLGBTQ
                      ? 'border-purple-200 hover:border-purple-400'
                      : 'border-rose-100 hover:border-red-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {isLGBTQ ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-red-500/10 via-emerald-500/10 to-purple-500/10 text-purple-900 border border-purple-200">
                            <RainbowHeart size={16} />
                            <span>LGBTQ+</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-[#B91C1C] border border-rose-200">
                            <Heart className="w-3.5 h-3.5 text-[#B91C1C] fill-[#B91C1C]" />
                            <span>{evt.EventType}</span>
                          </span>
                        )}

                        {isLive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                            ● LIVE NOW
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold font-mono text-[#111827] bg-slate-100 px-2.5 py-1 rounded-xl">
                        {evt.DayOfWeek} 7:00 PM EST
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-[#111827] font-heading leading-snug">
                      {evt.EventName}
                    </h3>

                    <p className="text-xs sm:text-sm font-medium text-[#111827] mt-2 line-clamp-2 leading-relaxed">
                      {evt.Description}
                    </p>

                    <div className="mt-4 space-y-2 text-xs font-semibold text-[#111827] bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#B91C1C]" />
                          <span>{evt.EventDate}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#B91C1C]" />
                          <span>{evt.TimeZone}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-rose-200">
                        <span className="flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-[#B91C1C]" />
                          <span>5-Min Rounds · 2-Min Breaks</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#B91C1C]" />
                          <span>{evt.ParticipantsList.length} / {evt.MaxParticipants} Registered</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-rose-100">
                    {isUserRegistered ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEnterEventLobby(evt)}
                          className="btn-glossy-red-pink py-3 px-4 text-xs sm:text-sm font-black flex-1 cursor-pointer"
                        >
                          <Video className="w-4 h-4 mr-1.5" />
                          <span>Enter Dating Lobby</span>
                        </button>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-2.5 rounded-2xl border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> RSVP Confirmed
                        </span>
                      </div>
                    ) : !isEligible ? (
                      <button
                        type="button"
                        onClick={handleWaitlistAction}
                        className="w-full py-3.5 px-6 rounded-full bg-amber-50 border-2 border-amber-300 text-[#78350F] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-[#B45309]" />
                        <span>Event membership coming soon. · Join the Event Waiting List</span>
                      </button>
                    ) : isLGBTQ ? (
                      <button
                        onClick={() => handleRSVP(evt)}
                        className="btn-glossy-rainbow py-3.5 px-6 text-sm font-black w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        <RainbowHeart size={18} />
                        <span>RSVP for LGBTQ+ Mixer</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRSVP(evt)}
                        className="btn-glossy-red-pink py-3.5 px-6 text-sm font-black w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Heart className="w-4 h-4 fill-white text-white" />
                        <span>RSVP for Launch Event</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          PUBLIC PLATFORM GUIDE: BROWSING, MUTUAL MATCHES, PREMIUM MESSAGING & WAITING LIST
          ========================================================================= */}
      <section aria-labelledby="how-speed-meet-love-works" className="space-y-6">
        <div className="rounded-3xl bg-white border-2 border-rose-200 p-6 sm:p-10 shadow-lg space-y-6">
          <div className="max-w-3xl space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B91C1C] font-heading">
              <Sparkles className="w-4 h-4 text-[#B45309] fill-amber-400" />
              <span>How It Works</span>
            </div>
            <h2
              id="how-speed-meet-love-works"
              className="text-2xl sm:text-3xl font-bold text-[#111827] font-heading tracking-tight"
            >
              How Speed Meet Love Connects Singles: Profiles, Mutual Matches, Messaging &amp; Live Events
            </h2>
            <p className="text-sm sm:text-base text-[#111827] font-medium leading-relaxed">
              Speed Meet Love is an adults-only (18+) dating community built for singles who prefer real face-to-face chemistry over endless swiping. Join for free to browse profiles, discover mutual interest privately, message confirmed matches with Premium, and reserve your spot on the waiting list for upcoming live video speed-dating events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <article className="rounded-2xl bg-[#FFF8FA] border border-rose-200 p-5 sm:p-6 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 text-[#BE185D] flex items-center justify-center shrink-0 shadow-2xs">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] font-heading">
                  Browse Verified Singles Profiles for Free
                </h3>
              </div>
              <p className="text-sm text-[#111827] font-medium leading-relaxed">
                Every new account starts with free profile browsing across flexible grid and detailed card layouts. Explore genuine member bios, hobbies, city locations, dating preferences, and photos at your own pace before joining a live room. You can update your profile anytime and send likes to members who catch your attention, keeping discovery relaxed, authentic, and completely transparent from day one.
              </p>
            </article>

            <article className="rounded-2xl bg-[#FFF8FA] border border-rose-200 p-5 sm:p-6 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 text-[#B91C1C] flex items-center justify-center shrink-0 shadow-2xs">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] font-heading">
                  Find Genuine Mutual Matches Confidentially
                </h3>
              </div>
              <p className="text-sm text-[#111827] font-medium leading-relaxed">
                Speed Meet Love protects your comfort through strict mutual matching. Whether you like someone while browsing profiles or cast a confidential post-date vote during live video rounds, your selection stays private unless the other person chooses you back. When interest is shared on both sides, a mutual match appears immediately—eliminating awkward guesswork, public rejection, and unwanted inbox noise.
              </p>
            </article>

            <article className="rounded-2xl bg-[#FFF8FA] border border-rose-200 p-5 sm:p-6 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 text-[#0F766E] flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] font-heading">
                  Keep Sparking Conversations with Premium Messaging
                </h3>
              </div>
              <p className="text-sm text-[#111827] font-medium leading-relaxed">
                Once two members confirm a mutual match, upgrading to our Premium membership ($9.99/month) unlocks direct one-on-one messaging in your private portal. Continue getting to know your matches between events, share stories, and plan a relaxed follow-up date at your own pace. Free members can always browse singles and track mutual matches, while Premium opens unlimited private chat whenever you want to connect deeper.
              </p>
            </article>

            <article className="rounded-2xl bg-[#FFF8FA] border border-rose-200 p-5 sm:p-6 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 text-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#111827] font-heading">
                  Join the Free Live Video Speed-Dating Waiting List
                </h3>
              </div>
              <p className="text-sm text-[#111827] font-medium leading-relaxed">
                Upcoming live events feature structured 5-minute face-to-face video rounds with calm 2-minute breaks and mutual consent before every date begins. The first event date will be announced once enough compatible singles join, so every room launches with balanced, engaging conversations across your preferences. Joining the waiting list is completely free and puts you first in line for our opening night invitation.
              </p>
            </article>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-white border border-rose-200 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <h3 className="text-base sm:text-lg font-bold text-[#111827] font-heading flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#B91C1C] shrink-0" />
                <span>Adults-Only (18+) Safety, Privacy &amp; Real Chemistry</span>
              </h3>
              <p className="text-sm text-[#111827] font-medium leading-relaxed">
                Every member confirms adult 18+ eligibility, verifies their email address, and participates under clear community safety rules and consent-first video controls. Create your free profile today, explore singles, and add your name to the event waiting list so you hear the moment our inaugural event date is set.
              </p>
            </div>
            <button
              type="button"
              onClick={handleWaitlistAction}
              disabled={waitlistLoading}
              className="shrink-0 py-3 px-6 rounded-full bg-[#B91C1C] hover:bg-red-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {isAuthenticated && waitlistJoined ? 'On the Event Waiting List' : 'Join Free Waiting List'}
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PUBLIC FOUNDER SECTION: MEET KRISTY — FOUNDER OF SPEED MEET LOVE
          ========================================================================= */}
      <section
        aria-labelledby="meet-kristy-founder"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF1F5] via-[#FFE4EE] to-[#FDF2F8] border border-rose-200 p-6 sm:p-10 lg:p-12 shadow-lg"
      >
        {/* Subtle Hearts Accent Layer (soft, non-intrusive background texture) */}
        <FloatingHearts count={6} colors={['pink', 'rose']} className="opacity-25" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-5 right-6 text-rose-300/45 select-none hidden sm:block"
        >
          <Heart className="w-8 h-8 fill-rose-200/60" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 right-10 text-pink-300/45 select-none"
        >
          <Heart className="w-6 h-6 fill-pink-200/60" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6 sm:gap-8 lg:gap-12">
          {/* Founder Portrait (clean frame, no overlaid bio text) */}
          <div className="w-56 sm:w-64 md:w-72 lg:w-80 shrink-0">
            <div className="aspect-[4/5] w-full rounded-3xl overflow-hidden bg-white border-4 border-white shadow-xl ring-1 ring-rose-200">
              <img
                src="/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png"
                alt="Kristy, Founder of Speed Meet Love"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-[center_25%]"
              />
            </div>
          </div>

          {/* Readable Founder Story Beside (Desktop) / Beneath (Mobile) */}
          <div className="flex-1 space-y-4 text-left">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9D174D] font-heading flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#BE185D] fill-[#BE185D] shrink-0" aria-hidden="true" />
                <span>Founder Story</span>
              </p>
              <h2
                id="meet-kristy-founder"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#111827] font-heading tracking-tight leading-snug"
              >
                Meet Kristy — Founder of Speed Meet Love
              </h2>
            </div>

            <div className="space-y-3.5 text-base sm:text-[17px] leading-relaxed text-[#111827] font-medium">
              <p>
                Kristy knows that one conversation can change your life. She met her husband through speed dating, and that experience stayed with her.
              </p>
              <p>
                After COVID, she imagined bringing that same spark online: a way for people to meet face to face, share a laugh, and discover a connection from wherever they are.
              </p>
              <p>
                That idea became Speed Meet Love, created to give others a chance to start a love story of their own.
              </p>
            </div>

            <p className="pt-1 text-base sm:text-lg font-bold text-[#9D174D] font-heading flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#BE185D] fill-[#BE185D] shrink-0" aria-hidden="true" />
              <span>Your next connection starts here.</span>
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          RED-AND-PINK "JOIN THE FUN!" PROMOTIONAL BANNER
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-500 to-[#FF2E93] text-white p-6 sm:p-10 lg:p-12 shadow-2xl border-2 border-rose-300">
        {/* Floating Hearts in Banner */}
        <FloatingHearts count={10} colors={['turquoise', 'pink', 'red', 'yellow']} />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider border border-white/30">
              <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Founding Member Launch List</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight">
              Join the Fun!
            </h2>

            <p className="text-sm sm:text-base font-semibold text-rose-50 leading-relaxed">
              We’re welcoming our first members! Our first speed-dating event will be announced once enough compatible singles have joined. Save your free spot on the waiting list today.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2 text-xs font-bold text-white">
              <span className="px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-xs">Free ($0) Browse &amp; Waiting List</span>
              <span>·</span>
              <span className="px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-xs">Premium ($9.99/mo) Chat</span>
              <span>·</span>
              <span className="px-3 py-1.5 rounded-xl bg-white text-red-600 font-black shadow-sm">
                Event membership coming soon.
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
            {hasExistingPremiumPlus ? (
              <button
                onClick={() => setCurrentView('pricing')}
                className="py-4 px-8 rounded-full bg-white hover:bg-rose-50 text-red-600 font-black text-base shadow-xl transition-all cursor-pointer text-center"
              >
                Premium Plus Active
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('pricing')}
                className="py-4 px-7 rounded-full bg-white hover:bg-rose-50 text-[#9D174D] font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer text-center"
              >
                Event membership coming soon.
              </button>
            )}
            <button
              onClick={handleWaitlistAction}
              className="py-3.5 px-6 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/40 backdrop-blur-md transition-all cursor-pointer text-center"
            >
              {waitlistJoined ? 'On Waiting List (Leave)' : 'Join the Event Waiting List'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
