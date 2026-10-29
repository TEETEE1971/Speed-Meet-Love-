import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SpeedEvent, EventType, EventStatus } from '../types';
import {
  Calendar,
  Clock,
  Users,
  Sparkles,
  Heart,
  Plus,
  Play,
  CheckCircle,
  Lock,
  ArrowRight,
  Flame,
  ShieldCheck,
  Table,
  LayoutGrid,
  Crown,
  Check,
  Globe,
  Coffee,
  Radio
} from 'lucide-react';
import { Avatar } from './Avatar';
import { EventsTableInspector } from './EventsTableInspector';
import { RainbowHeart } from './RainbowHeart';

export const EventList: React.FC = () => {
  const {
    events,
    currentUser,
    registerForEvent,
    registerForMultipleEvents,
    leaveEvent,
    setCurrentView,
    setSelectedEventId,
    startEventLive,
    addEvent,
    canAccessLiveSpeedDating,
    showNotification,
    isEventLive,
    getTimeUntilEventStartMs,
    canEnterVideoRound,
    appMode,
    toggleSimulateLiveEvent,
    simulatedLiveEvents,
    serverTimeFormattedET,
    setAppMode,
    clearLiveSession,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'cards' | 'table'>('cards');
  const [selectedDayFilter, setSelectedDayFilter] = useState<'All' | 'Friday' | 'Saturday' | 'Sunday'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registrationModalData, setRegistrationModalData] = useState<{
    eventName: string;
    day: string;
    date: string;
    time: string;
    eventId: string;
  } | null>(null);

  // Multi-night registration selected IDs
  const [multiSelectEventIds, setMultiSelectEventIds] = useState<string[]>([]);

  const isEligibleForSpeedDating = canAccessLiveSpeedDating(currentUser);

  // Form state for creating a new weekend event
  const [formData, setFormData] = useState({
    EventName: 'Weekend Sparks 7:00 PM Mixer',
    DayOfWeek: 'Friday' as 'Friday' | 'Saturday' | 'Sunday',
    EventDate: '2026-11-06',
    EventStartTime: '19:00',
    EventEndTime: '20:15',
    TimeZone: '7:00 PM EST (4:00 PM PST)',
    MaxParticipants: 16,
    EventType: 'Straight' as EventType,
    Description: 'Exclusive weekend speed dating for Premium Plus members. 5-minute video rounds, up to 2-minute break, private like or pass, and consent-based waiting room.',
    MinAge: 25,
    MaxAge: 35,
    LocationName: 'Virtual Lounge · 7:00 PM EST',
    TotalRounds: 5,
    RoundDurationSeconds: 300,
    BreakDurationSeconds: 120,
    HostID: currentUser.UserID,
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.EventName.trim()) {
      showNotification('Please enter an event name', 'info');
      return;
    }

    addEvent({
      ...formData,
      HostID: currentUser.UserID,
    });

    setShowCreateModal(false);
  };

  const handleToggleMultiSelect = (eventId: string) => {
    setMultiSelectEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const handleRegisterSingle = (evt: SpeedEvent) => {
    const res = registerForEvent(evt.EventID);
    if (res.success) {
      setRegistrationModalData({
        eventName: evt.EventName,
        day: evt.DayOfWeek,
        date: evt.EventDate,
        time: evt.TimeZone,
        eventId: evt.EventID,
      });
    }
  };

  const handleRegisterMultiNights = () => {
    if (!isEligibleForSpeedDating) {
      showNotification('Speed dating is exclusive to Premium Plus ($14.99/mo). Upgrade to join!', 'pink');
      setCurrentView('pricing');
      return;
    }
    if (!multiSelectEventIds.length) {
      showNotification('Please select at least one weekend night to register', 'info');
      return;
    }
    const res = registerForMultipleEvents(multiSelectEventIds);
    if (res.registeredCount > 0) {
      const firstEvt = events.find(e => multiSelectEventIds.includes(e.EventID));
      if (firstEvt) {
        setRegistrationModalData({
          eventName: `${res.registeredCount} Weekend Speed-Dating Sessions`,
          day: 'Friday, Saturday & Sunday',
          date: 'Selected Weekend Dates',
          time: '7:00 PM EST (4:00 PM PST)',
          eventId: firstEvt.EventID,
        });
      }
    }
    setMultiSelectEventIds([]);
  };

  const filteredEvents = events.filter(e => {
    const matchesDay = selectedDayFilter === 'All' || e.DayOfWeek === selectedDayFilter;
    const matchesType = selectedType === 'All' || e.EventType === selectedType;
    return matchesDay && matchesType;
  });

  // Specific Friday, Saturday, Sunday events for Multi-Night Planner, respecting selected category
  const categoryEvents = events.filter(e => selectedType === 'All' ? true : e.EventType === selectedType);
  const fridayEvent = categoryEvents.find(e => e.DayOfWeek === 'Friday') || events.find(e => e.DayOfWeek === 'Friday');
  const saturdayEvent = categoryEvents.find(e => e.DayOfWeek === 'Saturday') || events.find(e => e.DayOfWeek === 'Saturday');
  const sundayEvent = categoryEvents.find(e => e.DayOfWeek === 'Sunday') || events.find(e => e.DayOfWeek === 'Sunday');
  const weekendPlannerEvents = [fridayEvent, saturdayEvent, sundayEvent].filter(Boolean) as SpeedEvent[];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-pink-100 p-6 sm:p-10 shadow-xs">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#FF2E93] font-heading">
            <Calendar className="w-4 h-4 text-[#FF2E93]" />
            <span>3 Nights Every Week · Friday, Saturday & Sunday at 7:00 PM Eastern Time</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight font-heading">
            Fast connections.{' '}
            <span className="bg-gradient-to-r from-[#FF2E93] via-[#FF147E] to-[#E11D48] bg-clip-text text-transparent">
              Real chemistry.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Live online speed dating every <strong>Friday, Saturday, and Sunday at 7:00 PM Eastern Time (America/New_York)</strong>. Daylight saving time is handled automatically. Rotate through 5-minute one-on-one video rounds, take a break of up to 2 minutes between dates, and tap Next Date when you are ready.
          </p>

          {serverTimeFormattedET && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <Clock className="w-3.5 h-3.5 text-[#FF2E93]" />
              <span>Current Server Time: <strong className="font-mono text-slate-900">{serverTimeFormattedET}</strong></span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {isEligibleForSpeedDating ? (
              <button
                onClick={() => {
                  const regLive = events.find(
                    e => e.ParticipantsList.includes(currentUser.UserID) && e.EventStatus === 'Live'
                  );
                  const regUpcoming = events.find(e => e.ParticipantsList.includes(currentUser.UserID));
                  if (regLive) {
                    setSelectedEventId(regLive.EventID);
                    setCurrentView('live');
                  } else if (regUpcoming) {
                    setSelectedEventId(regUpcoming.EventID);
                    setCurrentView('lobby');
                  } else {
                    // Navigate directly to the next session waiting room so they can register and participate
                    const targetEvent =
                      events.find(e => e.EventID === 'evt_staging_dev') ||
                      events.find(e => e.DayOfWeek === 'Friday') ||
                      events[0];
                    setSelectedEventId(targetEvent.EventID);
                    setCurrentView('lobby');
                    showNotification(`Welcome to ${targetEvent.EventName}! Tap Register to enter the Waiting Room.`, 'info');
                  }
                }}
                className="px-6 py-3 rounded-2xl btn-pink-gradient font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-pink-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Enter Weekend Speed Dating
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('pricing')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-[#FF2E93] text-white font-bold text-xs sm:text-sm shadow-md hover:brightness-105 flex items-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 fill-white" />
                Unlock Weekend Speed Dating ($14.99/mo)
              </button>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FF2E93]" />
              Host New Weekend Mixer
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'cards' ? 'table' : 'cards')}
              className="px-4 py-3 rounded-2xl bg-pink-50 hover:bg-pink-100 text-[#FF2E93] text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Table className="w-4 h-4" />
              {activeTab === 'cards' ? 'Events Relational Table' : 'Card View'}
            </button>
          </div>
        </div>

        {/* Quick Feature Metric Strip */}
        <div className="mt-8 pt-6 border-t border-pink-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400">Weekly Schedule</div>
            <div className="text-slate-900 font-bold text-sm">Fri, Sat, Sun · 7:00 PM EST</div>
            <div className="text-[11px] text-slate-500">4:00 PM PST / 6:00 PM CST</div>
          </div>
          <div>
            <div className="text-slate-400">Video Round Format</div>
            <div className="text-[#FF2E93] font-bold text-sm">5 Minutes per 1-on-1 Date</div>
            <div className="text-[11px] text-slate-500">Up to 2-Min Break Between Dates</div>
          </div>
          <div>
            <div className="text-slate-400">Waiting Room & Consent</div>
            <div className="text-slate-900 font-bold text-sm">Next Date Button (Consent)</div>
            <div className="text-[11px] text-slate-500">No calls auto-start without you</div>
          </div>
          <div>
            <div className="text-slate-400">Your Membership Tier</div>
            <div className="text-amber-700 font-bold text-sm flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              {currentUser.SubscriptionTier}
            </div>
            <div className="text-[11px] text-slate-500">
              {isEligibleForSpeedDating ? 'All 3 Nights Unlocked' : 'Upgrade to attend ($14.99/mo)'}
            </div>
          </div>
        </div>
      </div>

      {/* DEVELOPER 2-PERSON LIVEKIT STAGING TEST (Restricted to Authorized Accounts) */}
      {['usr_kristy', 'usr_me', 'usr_01', 'usr_02', 'usr_03'].includes(currentUser.UserID) && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-pink-500/30 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-[#FF2E93] shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base font-heading text-white">
                  Developer 2-Person LiveKit Staging Test
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  Authorized Accounts Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Server-authenticated staging room. Connect two real devices (e.g. Kristy on phone 1 and Marcus on phone 2) to test two-way LiveKit WebRTC video and audio now without waiting until Friday at 7:00 PM.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => {
                if (appMode !== 'production') {
                  setAppMode('production');
                }
                clearLiveSession();
                registerForEvent('evt_staging_dev');
                setSelectedEventId('evt_staging_dev');
                setCurrentView('lobby');
                showNotification('Developer Staging Test initialized! Waiting Room open. Tap "Begin Matchmaking (I\'m Ready)" to connect.', 'pink');
              }}
              className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Launch 2-Person Test</span>
            </button>
          </div>
        </div>
      )}

      {/* MULTI-NIGHT REGISTRATION SELECTOR */}
      <div className="p-6 rounded-3xl bg-white border border-pink-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF2E93] uppercase tracking-wider font-heading">
              <CheckCircle className="w-4 h-4" />
              <span>Multi-Night Planner for Premium Plus</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 font-heading mt-0.5">
              Choose Which Nights to Attend (Register for Multiple Nights)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Select any combination of Friday, Saturday, and Sunday sessions. All sessions take place at <strong>7:00 PM EST (4:00 PM PST)</strong>.
            </p>
          </div>

          <button
            onClick={handleRegisterMultiNights}
            disabled={multiSelectEventIds.length === 0}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              multiSelectEventIds.length > 0
                ? 'btn-pink-gradient text-white shadow-md shadow-pink-500/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Register for {multiSelectEventIds.length || 0} Selected Night{multiSelectEventIds.length !== 1 ? 's' : ''}</span>
          </button>
        </div>

        {/* Checkbox selector cards for upcoming weekend sessions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {weekendPlannerEvents.map(evt => {
            const isRegistered = evt.ParticipantsList.includes(currentUser.UserID);
            const isSelected = multiSelectEventIds.includes(evt.EventID);

            return (
              <div
                key={evt.EventID}
                onClick={() => !isRegistered && handleToggleMultiSelect(evt.EventID)}
                className={`p-4 rounded-2xl border text-xs transition-all flex flex-col justify-between gap-3 ${
                  isRegistered
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : isSelected
                    ? 'bg-pink-50/80 border-[#FF2E93] ring-1 ring-[#FF2E93] cursor-pointer'
                    : 'bg-white border-slate-200 hover:border-pink-300 cursor-pointer'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase tracking-wider text-[#FF2E93] font-heading text-[11px]">
                      {evt.DayOfWeek} 7:00 PM
                    </span>
                    {isRegistered ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Registered
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveEvent(evt.EventID);
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#FF2E93]">Register</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleMultiSelect(evt.EventID)}
                          className="w-4 h-4 rounded text-[#FF2E93] border-slate-300 focus:ring-[#FF2E93] cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{evt.EventName}</div>
                  <div className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>{evt.TimeZone} · {evt.EventDate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>5-Min Rounds · 2-Min Break</span>
                  <span>{evt.ParticipantsList.length} dater{evt.ParticipantsList.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER CONTROLS & NIGHT SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Day-of-week pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['All', 'Friday', 'Saturday', 'Sunday'] as const).map(day => (
            <button
              key={day}
              onClick={() => setSelectedDayFilter(day)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedDayFilter === day
                  ? 'btn-pink-gradient text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-pink-200'
              }`}
            >
              {day === 'All' ? 'All Nights' : `${day} 7:00 PM`}
            </button>
          ))}
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['All', 'Straight', 'LGBTQ+', '30 & Older', 'Age-specific'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: TABLE OR CARDS */}
      {activeTab === 'table' ? (
        <EventsTableInspector />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(evt => {
            const isRegistered = evt.ParticipantsList.includes(currentUser.UserID);
            const isFull = evt.ParticipantsList.length >= evt.MaxParticipants;
            const isLive = isEventLive(evt);
            const isSimulated = simulatedLiveEvents.includes(evt.EventID);
            const isLGBTQ = evt.EventType === 'LGBTQ+';

            return (
              <div
                key={evt.EventID}
                className={`rounded-3xl bg-white border-2 flex flex-col justify-between overflow-hidden shadow-md transition-all hover:shadow-xl ${
                  isLive
                    ? 'border-red-500 ring-2 ring-red-400/30'
                    : isLGBTQ
                    ? 'border-purple-200 hover:border-purple-400'
                    : 'border-rose-100 hover:border-red-300'
                }`}
              >
                <div className="p-6 space-y-4">
                  {/* Top Badge Strip - Server-Validated Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isLive
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {isLive ? (isSimulated ? '● Live (Demo Simulated)' : '● Live Now') : 'Upcoming'}
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-red-600 border border-rose-200 font-heading">
                        {evt.DayOfWeek}
                      </span>
                      {evt.EventType === 'LGBTQ+' ? (
                        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-500/10 via-emerald-500/10 to-purple-500/10 text-purple-900 border border-purple-200 font-heading flex items-center gap-1">
                          <RainbowHeart size={14} />
                          <span>LGBTQ+</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-red-600 border border-rose-200 font-heading flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-red-600 text-red-600" />
                          <span>{evt.EventType}</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1 font-black">
                      <Crown className="w-3 h-3 text-amber-600" />
                      Premium Plus
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-heading leading-snug">
                      {evt.EventName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {evt.Description}
                    </p>
                  </div>

                  {/* Time, TimeZone, and Round Format Details */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-[#FF2E93]" />
                        <span>{evt.DayOfWeek} at {evt.TimeZone}</span>
                      </div>
                      <span className="font-mono text-slate-500 text-[11px]">{evt.EventDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <span>{evt.TotalRounds} Rounds · <strong>5 Mins Each</strong></span>
                      </div>
                      <span className="text-slate-400 text-[11px]">2-Min Breaks</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Participants
                      </span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {evt.ParticipantsList.length} / {evt.MaxParticipants} spots
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF2E93] to-rose-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (evt.ParticipantsList.length / evt.MaxParticipants) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="p-4 bg-[#FFF8FA] border-t border-pink-100 flex flex-col gap-2.5">
                  {!isEligibleForSpeedDating ? (
                    <button
                      onClick={() => {
                        showNotification('Weekend speed dating is exclusive to Premium Plus ($14.99/mo). Upgrade to join!', 'pink');
                        setCurrentView('pricing');
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Premium Plus Required ($14.99/mo)
                    </button>
                  ) : isRegistered ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between w-full gap-2">
                        {isLive ? (
                          <button
                            onClick={() => {
                              setSelectedEventId(evt.EventID);
                              startEventLive(evt.EventID);
                            }}
                            className="flex-1 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-pink-500/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Enter 5-Min Rounds</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedEventId(evt.EventID);
                              setCurrentView('lobby');
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-[#FF2E93] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Registered · Waiting Room</span>
                          </button>
                        )}

                        <button
                          onClick={() => leaveEvent(evt.EventID)}
                          className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Cancel your registration"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Demonstration Sandbox Testing Control */}
                      {appMode === 'demonstration' && (
                        <div className="flex items-center justify-between pt-1 border-t border-pink-100 text-[10px]">
                          <span className="text-slate-400">Demo Sandbox:</span>
                          <button
                            type="button"
                            onClick={() => toggleSimulateLiveEvent(evt.EventID, !isSimulated)}
                            className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                              isSimulated
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isSimulated ? 'Stop Demo Start' : 'Simulate 7 PM Start (Demo)'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full space-y-1.5">
                      {isLGBTQ ? (
                        <button
                          disabled={isFull}
                          onClick={() => handleRegisterSingle(evt)}
                          className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isFull
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'btn-glossy-rainbow text-white shadow-md'
                          }`}
                        >
                          <RainbowHeart size={16} />
                          <span>{isFull ? 'Event Full' : 'RSVP for LGBTQ+ Mixer'}</span>
                        </button>
                      ) : (
                        <button
                          disabled={isFull}
                          onClick={() => handleRegisterSingle(evt)}
                          className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isFull
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'btn-glossy-red-pink text-white shadow-xs'
                          }`}
                        >
                          <Heart className="w-4 h-4 fill-white text-white" />
                          <span>{isFull ? 'Event Full' : `Register for ${evt.DayOfWeek} 7 PM`}</span>
                        </button>
                      )}
                      {(evt.EventType === '30 & Older' || evt.MinAge >= 30) && (!currentUser.Age || currentUser.Age < 30) && (
                        <p className="text-[10px] text-amber-700 text-center font-medium">
                          Requires Age 30+ (Your profile: age {currentUser.Age || 'Not set'})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-[#FF2E93]">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Schedule Weekend Speed Dating Mixer
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.EventName}
                  onChange={e => setFormData({ ...formData, EventName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93] focus:ring-1 focus:ring-[#FF2E93]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={formData.EventType}
                    onChange={e =>
                      setFormData({ ...formData, EventType: e.target.value as EventType })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  >
                    <option value="Straight">Straight</option>
                    <option value="LGBTQ+">LGBTQ+</option>
                    <option value="30 & Older">30 & Older</option>
                    <option value="Age-specific">Age-specific</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Day of the Week
                  </label>
                  <select
                    value={formData.DayOfWeek}
                    onChange={e =>
                      setFormData({ ...formData, DayOfWeek: e.target.value as 'Friday' | 'Saturday' | 'Sunday' })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  >
                    <option value="Friday">Friday (7:00 PM EST)</option>
                    <option value="Saturday">Saturday (7:00 PM EST)</option>
                    <option value="Sunday">Sunday (7:00 PM EST)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Calendar Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.EventDate}
                  onChange={e => setFormData({ ...formData, EventDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Start Time (7:00 PM EST)
                  </label>
                  <input
                    type="time"
                    value={formData.EventStartTime}
                    onChange={e => setFormData({ ...formData, EventStartTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Time Zone Display
                  </label>
                  <input
                    type="text"
                    value={formData.TimeZone}
                    onChange={e => setFormData({ ...formData, TimeZone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Round Duration
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold">
                    5 Minutes (Fixed)
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Post-Round Break
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold">
                    Up to 2 Minutes
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.Description}
                  onChange={e => setFormData({ ...formData, Description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF2E93]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-white shadow-md cursor-pointer"
                >
                  Create Weekend Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTRATION CONFIRMATION MODAL */}
      {registrationModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Registration Confirmed! 🎉
              </h3>
              <p className="text-sm font-bold text-[#FF2E93]">
                {registrationModalData.eventName}
              </p>
              <p className="text-xs text-slate-500">
                {registrationModalData.day} · {registrationModalData.time}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-100 text-xs text-slate-600 text-left space-y-2">
              <div className="font-bold text-slate-800">Your Speed Dating Pass includes:</div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#FF2E93] font-bold">✓</span>
                <span>5-minute one-on-one live video rounds</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#FF2E93] font-bold">✓</span>
                <span>Up to 2-minute break to reflect & relax</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#FF2E93] font-bold">✓</span>
                <span>Next Date button with consent-based waiting room</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#FF2E93] font-bold">✓</span>
                <span>Private Like or Pass ballot after each date</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              You can cancel your registration anytime before rounds start.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedEventId(registrationModalData.eventId);
                  setRegistrationModalData(null);
                  setCurrentView('lobby');
                }}
                className="flex-1 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs text-white shadow-md cursor-pointer"
              >
                Enter Virtual Lobby
              </button>
              <button
                onClick={() => setRegistrationModalData(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
