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
  Zap,
} from 'lucide-react';
import { FloatingHearts } from './FloatingHearts';
import { RainbowHeart } from './RainbowHeart';
import { SpeedMeetLoveLogo } from './SpeedMeetLoveLogo';
import confetti from 'canvas-confetti';

interface HomeScreenProps {
  onSelectView?: (view: 'card' | 'grid') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectView }) => {
  const {
    events,
    currentUser,
    setCurrentView,
    setSelectedEventId,
    registerForEvent,
    canAccessLiveSpeedDating,
    showNotification,
    isEventLive,
  } = useApp();

  const isEligible = canAccessLiveSpeedDating(currentUser);

  // Exact 4 upcoming weekend speed-dating events (Requirement: "four upcoming event cards")
  const primaryFourEvents: SpeedEvent[] = [
    // 1. Friday Night Sparks (Straight)
    events.find(e => e.EventID === 'evt_live_now') || {
      EventID: 'evt_live_now',
      EventName: 'Friday Night Sparks: Mid-20s to Mid-30s Singles',
      DayOfWeek: 'Friday',
      EventDate: '2026-10-30',
      EventStartTime: '19:00',
      EventEndTime: '20:15',
      TimeZone: '7:00 PM Eastern Time (America/New_York)',
      MaxParticipants: 16,
      ParticipantsList: ['usr_02', 'usr_03', 'usr_06'],
      EventStatus: 'Upcoming',
      RoundsGenerated: false,
      HostID: 'host_speedmeet_01',
      EventType: 'Straight',
      Description: 'Friday night speed dating for Premium Plus members! Rotate through 5-minute one-on-one video rounds, take a break of up to 2 minutes between dates, and tap Next Date when you are ready.',
      TotalRounds: 5,
      RoundDurationSeconds: 300,
      BreakDurationSeconds: 120,
      MinAge: 25,
      MaxAge: 35,
      LocationName: 'Virtual Lounge · Friday 7:00 PM ET',
    },
    // 2. Friday Night LGBTQ+ Rainbow Mixer (with Rainbow Heart & Rainbow RSVP button)
    events.find(e => e.EventID === 'evt_fri_lgbtq') || {
      EventID: 'evt_fri_lgbtq',
      EventName: 'Friday Night: LGBTQ+ Rainbow Mixer',
      DayOfWeek: 'Friday',
      EventDate: '2026-10-30',
      EventStartTime: '19:00',
      EventEndTime: '20:15',
      TimeZone: '7:00 PM Eastern Time (America/New_York)',
      MaxParticipants: 20,
      ParticipantsList: ['usr_07', 'usr_08'],
      EventStatus: 'Upcoming',
      RoundsGenerated: false,
      HostID: 'host_speedmeet_01',
      EventType: 'LGBTQ+',
      Description: 'Welcoming Friday 7:00 PM LGBTQ+ speed dating event. Five-minute one-on-one video rounds, private like or pass, and relaxed waiting room in an inclusive space.',
      TotalRounds: 5,
      RoundDurationSeconds: 300,
      BreakDurationSeconds: 120,
      MinAge: 21,
      MaxAge: 45,
      LocationName: 'Virtual Lounge · Friday 7:00 PM ET',
    },
    // 3. Friday Night 30 & Older Singles Mixer
    events.find(e => e.EventID === 'evt_fri_30_older') || {
      EventID: 'evt_fri_30_older',
      EventName: 'Friday Night: 30 & Older Singles Mixer',
      DayOfWeek: 'Friday',
      EventDate: '2026-10-30',
      EventStartTime: '19:00',
      EventEndTime: '20:15',
      TimeZone: '7:00 PM Eastern Time (America/New_York)',
      MaxParticipants: 16,
      ParticipantsList: ['usr_04', 'usr_06', 'usr_09'],
      EventStatus: 'Upcoming',
      RoundsGenerated: false,
      HostID: 'host_speedmeet_01',
      EventType: '30 & Older',
      Description: 'Friday 7:00 PM dedicated speed dating reserved exclusively for daters aged 30 and older. 5-minute video rounds with comfortable 2-minute breaks and private ballots.',
      TotalRounds: 5,
      RoundDurationSeconds: 300,
      BreakDurationSeconds: 120,
      MinAge: 30,
      MaxAge: 55,
      LocationName: 'Virtual Lounge · Friday 7:00 PM ET',
    },
    // 4. Saturday Night Connections
    events.find(e => e.EventID === 'evt_sat_creatives') || {
      EventID: 'evt_sat_creatives',
      EventName: 'Saturday Night Connections: Tech, Design & Creators',
      DayOfWeek: 'Saturday',
      EventDate: '2026-10-31',
      EventStartTime: '19:00',
      EventEndTime: '20:15',
      TimeZone: '7:00 PM Eastern Time (America/New_York)',
      MaxParticipants: 18,
      ParticipantsList: ['usr_02', 'usr_03', 'usr_05'],
      EventStatus: 'Upcoming',
      RoundsGenerated: false,
      HostID: 'host_speedmeet_02',
      EventType: 'Straight',
      Description: 'Saturday 7:00 PM speed dating for ambitious innovators, creatives, and engineers. Five-minute video rounds with comfortable 2-minute breaks and consent-based waiting room.',
      TotalRounds: 5,
      RoundDurationSeconds: 300,
      BreakDurationSeconds: 120,
      MinAge: 25,
      MaxAge: 40,
      LocationName: 'Virtual Lounge · Saturday 7:00 PM ET',
    },
  ];

  const handleRSVP = (evt: SpeedEvent) => {
    if (!isEligible) {
      showNotification('Speed dating is exclusive to Premium Plus ($14.99/mo). Upgrade to RSVP!', 'pink');
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
    setSelectedEventId(evt.EventID);
    setCurrentView('lobby');
  };

  const handleJoinAnEventClick = () => {
    const liveOrFirst = primaryFourEvents.find(e => e.EventStatus === 'Live') || primaryFourEvents[0];
    if (liveOrFirst) {
      setSelectedEventId(liveOrFirst.EventID);
      setCurrentView('lobby');
    } else {
      setCurrentView('friday');
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
        <FloatingHearts count={12} colors={['red', 'pink', 'rose']} />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
          
          {/* Recreated Large SPEED MEET Love Logo (Requirement) */}
          <div className="flex justify-center pt-2">
            <SpeedMeetLoveLogo variant="on-light" size="xl" className="transform scale-105 sm:scale-115" />
          </div>

          {/* Schedule Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-rose-200 shadow-xs">
            <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-red-600 font-heading">
              Friday, Saturday & Sunday · 7:00 PM EST
            </span>
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>

          {/* Bold Headline: Real People. Real Connections. In Minutes. */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 font-heading tracking-tight leading-tight">
            Real People. Real Connections.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-[#FF2E93]">
              In Minutes.
            </span>
          </h1>

          {/* Clean Description */}
          <p className="text-base sm:text-xl font-semibold text-slate-700 max-w-3xl mx-auto leading-relaxed">
            Curated 5-minute live video dates every weekend. Rotate through one-on-one conversations,
            take 2-minute comfort breaks, and unlock mutual matches confidentially.
          </p>

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
                    src="/assets/kristy_exact.png"
                    alt="Kristy - Founder of Speed Meet Love"
                    className="w-full h-full object-cover object-[center_20%]"
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

          {/* LARGE "JOIN AN EVENT" BUTTON (Exact Requirement) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <button
              onClick={handleJoinAnEventClick}
              className="btn-glossy-red-pink py-4 sm:py-5 px-10 text-lg sm:text-xl font-black w-full sm:w-auto shadow-2xl cursor-pointer ring-2 ring-white/60 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-6 h-6 mr-1" />
              <span>Join an Event</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>

            <button
              onClick={() => (onSelectView ? onSelectView('grid') : setCurrentView('browse'))}
              className="w-full sm:w-auto py-4 sm:py-5 px-8 rounded-full bg-white hover:bg-rose-50 text-slate-900 hover:text-red-600 font-extrabold text-base border-2 border-rose-200 hover:border-red-500 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Compass className="w-5 h-5 text-red-600" />
              <span>Browse Singles</span>
            </button>
          </div>

          {/* Three Core Speed-Dating Rules */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 font-heading">5-Minute Video Rounds</p>
                <p className="text-[11px] text-slate-600 font-semibold">Server-controlled countdown</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#FF2E93] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 font-heading">2-Minute Breaks</p>
                <p className="text-[11px] text-slate-600 font-semibold">Mutual Next Date consent</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 font-heading">Confidential Voting</p>
                <p className="text-[11px] text-slate-600 font-semibold">Mutual-like reveals only</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          FOUR UPCOMING SPEED DATING EVENT CARDS (Exact Requirement)
          Featuring Rainbow LGBTQ+ Heart and Rainbow RSVP Button
          ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-red-600 font-heading">
              <Heart className="w-4 h-4 text-red-600 fill-red-600" />
              <span>Live Speed Dating Schedule</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight mt-0.5">
              Upcoming Speed Dating Events
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
              Five-minute live video rounds, up to two-minute breaks, and confidential mutual matching.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('friday')}
            className="self-start sm:self-auto text-xs font-extrabold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>View Full Weekend Calendar</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* EXACT FOUR UPCOMING EVENT CARDS GRID (2x2 on desktop, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {primaryFourEvents.map(evt => {
            const isUserRegistered = evt.ParticipantsList.includes(currentUser.UserID);
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
                  {/* Top Badge Strip */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {isLGBTQ ? (
                        /* Rainbow LGBTQ+ Heart and Label (Requirement) */
                        <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-red-500/10 via-emerald-500/10 to-purple-500/10 text-purple-900 border border-purple-200">
                          <RainbowHeart size={16} />
                          <span>LGBTQ+</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-rose-50 text-red-600 border border-rose-200">
                          <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                          <span>{evt.EventType}</span>
                        </span>
                      )}

                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                          ● LIVE NOW
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-black font-mono text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
                      {evt.DayOfWeek} 7:00 PM EST
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading leading-snug">
                    {evt.EventName}
                  </h3>

                  <p className="text-xs sm:text-sm font-medium text-slate-700 mt-2 line-clamp-2 leading-relaxed">
                    {evt.Description}
                  </p>

                  {/* Event Details: Date, Time, 5-Min Rounds */}
                  <div className="mt-4 space-y-2 text-xs font-bold text-slate-800 bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-red-600" />
                        <span>{evt.EventDate}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-red-600" />
                        <span>7:00 PM Eastern Time</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-rose-100">
                      <span className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-red-600" />
                        <span>5-Min Rounds · 2-Min Breaks</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-red-600" />
                        <span>{evt.ParticipantsList.length} / {evt.MaxParticipants} Registered</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action / RSVP Buttons */}
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
                  ) : isLGBTQ ? (
                    /* Rainbow LGBTQ+ RSVP Button (Requirement) */
                    <button
                      onClick={() => handleRSVP(evt)}
                      className="btn-glossy-rainbow py-3.5 px-6 text-sm font-black w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      <RainbowHeart size={18} />
                      <span>RSVP for LGBTQ+ Mixer</span>
                    </button>
                  ) : (
                    /* Glossy Red-to-Pink RSVP Button (Requirement) */
                    <button
                      onClick={() => handleRSVP(evt)}
                      className="btn-glossy-red-pink py-3.5 px-6 text-sm font-black w-full cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Heart className="w-4 h-4 fill-white text-white" />
                      <span>RSVP for Speed Dating</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          RED-AND-PINK "JOIN THE FUN!" PROMOTIONAL BANNER (Exact Requirement)
          With Floating Hearts and Transparent Membership Info
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-500 to-[#FF2E93] text-white p-6 sm:p-10 lg:p-12 shadow-2xl border-2 border-rose-300">
        {/* Floating Hearts in Banner */}
        <FloatingHearts count={10} colors={['white', 'pink', 'rose']} />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider border border-white/30">
              <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Weekend Speed Dating Passes</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight">
              Join the Fun!
            </h2>

            <p className="text-sm sm:text-base font-semibold text-rose-50 leading-relaxed">
              Every Friday, Saturday, and Sunday at 7:00 PM EST. Get matched into curated 5-minute video
              dates, submit confidential ballots, and unlock messaging with mutual sparks!
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2 text-xs font-bold text-white">
              <span className="px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-xs">Free ($0) Browse</span>
              <span>·</span>
              <span className="px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-xs">Premium ($9.99/mo) Chat</span>
              <span>·</span>
              <span className="px-3 py-1.5 rounded-xl bg-white text-red-600 font-black shadow-sm">
                Premium Plus ($14.99/mo) Live Video Speed Dating
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
            <button
              onClick={() => setCurrentView('pricing')}
              className="py-4 px-8 rounded-full bg-white hover:bg-rose-50 text-red-600 hover:text-red-700 font-black text-base shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-center"
            >
              Get Premium Plus ($14.99)
            </button>
            <button
              onClick={() => setCurrentView('friday')}
              className="py-3.5 px-6 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/40 backdrop-blur-md transition-all cursor-pointer text-center"
            >
              View Full Weekend Schedule
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
