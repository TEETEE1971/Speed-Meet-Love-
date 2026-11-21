import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SpeedEvent, EventType } from '../types';
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
  Flame,
  ShieldCheck,
  Table,
  Crown,
  Check,
  Radio,
  Trash2,
} from 'lucide-react';
import { EventsTableInspector } from './EventsTableInspector';
import { RainbowHeart } from './RainbowHeart';

export const EventList: React.FC = () => {
  const {
    events,
    confirmedLaunchEvents,
    ownerLaunchEvents,
    scheduleLaunchEvent,
    confirmLaunchEvent,
    deleteLaunchEvent,
    waitlistJoined,
    waitlistLoading,
    joinWaitlist,
    leaveWaitlist,
    currentUser,
    registerForEvent,
    leaveEvent,
    setCurrentView,
    setSelectedEventId,
    startEventLive,
    canAccessLiveSpeedDating,
    showNotification,
    isEventLive,
    appMode,
    toggleSimulateLiveEvent,
    simulatedLiveEvents,
    serverTimeFormattedET,
    setAppMode,
    clearLiveSession,
    liveSession,
    setActiveRoundIndex,
    openAuthModal,
    isOwner,
    isFreeDuringLaunch,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'cards' | 'table'>('cards');
  const [selectedDayFilter, setSelectedDayFilter] = useState<'All' | 'Friday' | 'Saturday' | 'Sunday'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmImmediately, setConfirmImmediately] = useState(false);
  const [submittingLaunchEvent, setSubmittingLaunchEvent] = useState(false);
  const [registrationModalData, setRegistrationModalData] = useState<{
    eventName: string;
    day: string;
    date: string;
    time: string;
    eventId: string;
  } | null>(null);

  const isEligibleForSpeedDating = canAccessLiveSpeedDating(currentUser);
  const isDemoOwnerSandbox = isOwner && appMode === 'demonstration';

  // Form state for founder scheduling a manual launch event
  const [formData, setFormData] = useState({
    EventName: 'Speed Meet Love Launch Event',
    DayOfWeek: 'Friday' as 'Friday' | 'Saturday' | 'Sunday',
    EventDate: '2026-12-04',
    EventStartTime: '19:00',
    EventEndTime: '20:15',
    TimeZone: '7:00 PM EST (4:00 PM PST)',
    MaxParticipants: 20,
    EventType: 'Straight' as EventType,
    Description:
      'Inaugural Speed Meet Love video speed dating session. Five-minute one-on-one video rounds, up to 2-minute break, private like or pass, and compatible-partner waiting room.',
    MinAge: 21,
    MaxAge: 45,
    LocationName: 'Virtual Lounge · 7:00 PM EST',
    TotalRounds: 5,
    RoundDurationSeconds: 300,
    BreakDurationSeconds: 120,
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    if (!formData.EventName.trim()) {
      showNotification('Please enter an event name', 'info');
      return;
    }

    setSubmittingLaunchEvent(true);
    try {
      const res = await scheduleLaunchEvent({
        ...formData,
        Confirmed: confirmImmediately,
      });
      if (res.success) {
        setShowCreateModal(false);
        setConfirmImmediately(false);
      }
    } finally {
      setSubmittingLaunchEvent(false);
    }
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

  // In production / member view, show ONLY founder-confirmed manual launch events.
  // In owner Demo Sandbox mode, preserve sandbox event testing.
  const sourceEvents = isDemoOwnerSandbox ? events : confirmedLaunchEvents;
  const filteredEvents = sourceEvents.filter(e => {
    const matchesDay = selectedDayFilter === 'All' || e.DayOfWeek === selectedDayFilter;
    const matchesType = selectedType === 'All' || e.EventType === selectedType;
    return matchesDay && matchesType;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-pink-100 p-6 sm:p-10 shadow-xs">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#BE185D] font-heading">
            <Calendar className="w-4 h-4 text-[#BE185D]" />
            <span>
              {confirmedLaunchEvents.length > 0
                ? `${confirmedLaunchEvents.length} Confirmed Launch Event${confirmedLaunchEvents.length > 1 ? 's' : ''} · 7:00 PM EST`
                : 'First event date coming soon.'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-[#111827] tracking-tight leading-tight font-heading">
            Fast connections.{' '}
            <span className="bg-gradient-to-r from-[#BE185D] via-[#E11D48] to-[#B91C1C] bg-clip-text text-transparent">
              Real chemistry.
            </span>
          </h1>

          {/* Launch Waiting List Announcement */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF8FA] border-2 border-pink-200 space-y-2">
            <p className="text-sm sm:text-base text-[#111827] font-bold leading-relaxed">
              We’re welcoming our first members! Our first speed-dating event will be announced once enough compatible singles have joined.
            </p>
            <p className="text-xs text-[#111827] font-medium">
              Joining the Event Waiting List is completely free. Live 5-minute video rounds never pair you without a compatible partner.
            </p>
          </div>

          {serverTimeFormattedET && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-300 text-xs text-[#111827] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#BE185D]" />
              <span>Current Server Time: <strong className="font-mono text-[#111827]">{serverTimeFormattedET}</strong></span>
            </div>
          )}

          {/* Primary Actions: Free Waiting List + Owner Controls + Membership Status */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {waitlistJoined ? (
              <>
                <span className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-[#065F46] font-bold text-xs sm:text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#047857]" />
                  <span>You’re on the Event Waiting List</span>
                </span>
                <button
                  type="button"
                  disabled={waitlistLoading}
                  onClick={() => leaveWaitlist()}
                  className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-[#BE123C] border border-rose-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {waitlistLoading ? 'Updating...' : 'Leave Waiting List'}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={waitlistLoading}
                onClick={() => {
                  if (!currentUser) {
                    openAuthModal('signin');
                    return;
                  }
                  joinWaitlist();
                }}
                className="px-6 py-3 rounded-2xl btn-pink-gradient font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-60"
              >
                <Heart className="w-4 h-4 fill-white text-white" />
                <span>{waitlistLoading ? 'Saving...' : 'Join the Event Waiting List'}</span>
              </button>
            )}

            {isEligibleForSpeedDating ? (
              confirmedLaunchEvents.length > 0 && (
                <button
                  onClick={() => {
                    if (!currentUser) {
                      openAuthModal('signin');
                      return;
                    }
                    const regLive = confirmedLaunchEvents.find(
                      e => e.ParticipantsList.includes(currentUser.UserID) && e.EventStatus === 'Live'
                    );
                    const regUpcoming = confirmedLaunchEvents.find(e => e.ParticipantsList.includes(currentUser.UserID));
                    if (regLive) {
                      setSelectedEventId(regLive.EventID);
                      if (
                        liveSession &&
                        liveSession.eventId === regLive.EventID &&
                        liveSession.lastActive &&
                        Date.now() - liveSession.lastActive < 30 * 60 * 1000
                      ) {
                        setCurrentView('live');
                      } else {
                        setActiveRoundIndex(0);
                        setCurrentView('lobby');
                      }
                    } else if (regUpcoming) {
                      setSelectedEventId(regUpcoming.EventID);
                      setActiveRoundIndex(0);
                      setCurrentView('lobby');
                    } else {
                      const targetEvent = confirmedLaunchEvents[0];
                      setSelectedEventId(targetEvent.EventID);
                      setActiveRoundIndex(0);
                      setCurrentView('lobby');
                    }
                  }}
                  className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Enter Event Lobby</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setCurrentView('pricing')}
                className="px-5 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-[#78350F] border border-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Crown className="w-4 h-4 text-[#B45309]" />
                <span>Event membership coming soon.</span>
              </button>
            )}

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer border border-slate-300"
                >
                  <Plus className="w-4 h-4 text-[#BE185D]" />
                  <span>Schedule Launch Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('owner_waitlist')}
                  className="px-4 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-[#78350F] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border border-amber-300"
                >
                  <Users className="w-4 h-4 text-[#B45309]" />
                  <span>Private Event Waitlist</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'cards' ? 'table' : 'cards')}
                  className="px-4 py-3 rounded-2xl bg-pink-50 hover:bg-pink-100 text-[#BE185D] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border border-pink-200"
                >
                  <Table className="w-4 h-4" />
                  <span>{activeTab === 'cards' ? 'Events Relational Table' : 'Card View'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Feature Metric Strip */}
        <div className="mt-8 pt-6 border-t border-pink-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[#111827] font-semibold">Launch Schedule</div>
            <div className="text-[#111827] font-bold text-sm">
              {confirmedLaunchEvents.length > 0 ? confirmedLaunchEvents[0].EventDate : 'First event date coming soon.'}
            </div>
            <div className="text-[11px] text-[#111827] font-medium">Announced manually when ready</div>
          </div>
          <div>
            <div className="text-[#111827] font-semibold">Video Round Format</div>
            <div className="text-[#BE185D] font-bold text-sm">5 Minutes per 1-on-1 Date</div>
            <div className="text-[11px] text-[#111827] font-medium">Up to 2-Min Break Between Dates</div>
          </div>
          <div>
            <div className="text-[#111827] font-semibold">Compatible Partner Match</div>
            <div className="text-[#111827] font-bold text-sm">Partner Verified First</div>
            <div className="text-[11px] text-[#111827] font-medium">Never enter without a partner</div>
          </div>
          <div>
            <div className="text-[#111827] font-semibold">Waiting List &amp; Access</div>
            <div className="text-[#B45309] font-bold text-sm flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              {isFreeDuringLaunch ? 'Free During Launch' : currentUser?.SubscriptionTier || 'Guest'}
            </div>
            <div className="text-[11px] text-[#111827] font-medium">
              {isFreeDuringLaunch
                ? currentUser
                  ? 'Free live events unlocked · No card required'
                  : 'Join Free to attend · No card required'
                : currentUser
                ? isEligibleForSpeedDating
                  ? 'Existing Plus / Tester Access Active'
                  : waitlistJoined
                  ? 'Free Waiting List Joined'
                  : 'Event membership coming soon.'
                : 'Sign in to join waiting list'}
            </div>
          </div>
        </div>
      </div>

      {/* DEVELOPER 2-PERSON LIVEKIT STAGING TEST (Restricted to Authorized Accounts) */}
      {Boolean(currentUser && ['usr_kristy', 'usr_me', 'usr_01', 'usr_02', 'usr_03'].includes(currentUser.UserID)) && (
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
                Server-authenticated staging room. Connect two real devices (e.g. Kristy on phone 1 and Marcus on phone 2) to test two-way LiveKit WebRTC video and audio now without waiting for a launch event.
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
                showNotification(
                  'Developer Staging Test initialized! Waiting Room open. Tap "Begin Matchmaking (I\'m Ready)" to connect.',
                  'pink'
                );
              }}
              className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Launch 2-Person Test</span>
            </button>
          </div>
        </div>
      )}

      {/* FOUNDER-ONLY LAUNCH EVENT MANAGER (Drafts & Confirmed Events) */}
      {isOwner && (
        <div className="p-6 rounded-3xl bg-white border-2 border-amber-300 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#92400E] uppercase tracking-wider font-heading">
                <Lock className="w-3.5 h-3.5 text-[#B45309]" />
                <span>Founder-Only Launch Event Control</span>
              </div>
              <h2 className="text-lg font-bold text-[#111827] font-heading mt-0.5">
                Manual Launch Event Schedule ({ownerLaunchEvents.length})
              </h2>
              <p className="text-xs text-[#111827] font-medium mt-0.5">
                Only events marked <strong>Confirmed</strong> are displayed to members. No invitations or notifications are sent automatically.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl btn-pink-gradient text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Launch Event</span>
              </button>
            </div>
          </div>

          {ownerLaunchEvents.length === 0 ? (
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-dashed border-amber-300 text-center text-xs text-[#111827] font-medium">
              No manual launch events scheduled yet. Members currently see <strong>“First event date coming soon.”</strong> Review your{' '}
              <button
                type="button"
                onClick={() => setCurrentView('owner_waitlist')}
                className="font-bold text-[#BE185D] underline cursor-pointer"
              >
                Private Event Waitlist
              </button>{' '}
              and click <strong>Schedule Launch Event</strong> when you are ready to set the date.
            </div>
          ) : (
            <div className="space-y-3">
              {ownerLaunchEvents.map(evt => (
                <div
                  key={evt.EventID}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    evt.Confirmed ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          evt.Confirmed
                            ? 'bg-emerald-100 text-[#065F46] border border-emerald-300'
                            : 'bg-amber-100 text-[#78350F] border border-amber-300'
                        }`}
                      >
                        {evt.Confirmed ? 'Confirmed (Visible to Members)' : 'Draft (Hidden from Members)'}
                      </span>
                      <span className="font-mono text-[11px] text-[#111827] font-semibold">{evt.EventID}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#B91C1C] border border-rose-200 font-bold text-[10px]">
                        {evt.EventType}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#111827]">{evt.EventName}</div>
                    <div className="text-[#111827] font-medium">
                      {evt.DayOfWeek}, {evt.EventDate} · {evt.TimeZone} · {evt.ParticipantsList.length}/{evt.MaxParticipants} joined
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => confirmLaunchEvent(evt.EventID, !evt.Confirmed)}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                        evt.Confirmed
                          ? 'bg-amber-100 hover:bg-amber-200 text-[#78350F] border border-amber-300'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                      }`}
                    >
                      {evt.Confirmed ? 'Move to Draft' : 'Confirm Launch Event'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLaunchEvent(evt.EventID)}
                      className="p-2 rounded-xl bg-white hover:bg-red-50 text-[#BE123C] border border-rose-200 cursor-pointer transition-colors"
                      title="Delete launch event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FILTER CONTROLS (shown when events exist or in owner table/demo mode) */}
      {(sourceEvents.length > 0 || (isOwner && activeTab === 'table')) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(['All', 'Friday', 'Saturday', 'Sunday'] as const).map(day => (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedDayFilter === day
                    ? 'btn-pink-gradient text-white shadow-xs'
                    : 'bg-white text-[#111827] border border-slate-300 hover:border-pink-300'
                }`}
              >
                {day === 'All' ? 'All Nights' : `${day} 7:00 PM`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['All', 'Straight', 'LGBTQ+', '30 & Older', 'Age-specific'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedType === type
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-[#111827] border border-slate-300 hover:border-pink-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: TABLE OR CARDS OR "FIRST EVENT DATE COMING SOON." PLACEHOLDER */}
      {isOwner && activeTab === 'table' ? (
        <EventsTableInspector onOpenCreateModal={() => setShowCreateModal(true)} />
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-pink-200 p-8 sm:p-12 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#BE185D]">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] font-heading">
              First event date coming soon.
            </h2>
            <p className="text-sm text-[#111827] font-medium leading-relaxed">
              We’re welcoming our first members! Our first speed-dating event will be announced once enough compatible singles have joined.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {waitlistJoined ? (
              <>
                <span className="px-5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-[#065F46] font-bold text-xs sm:text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#047857]" />
                  <span>You’re on the Event Waiting List</span>
                </span>
                <button
                  type="button"
                  disabled={waitlistLoading}
                  onClick={() => leaveWaitlist()}
                  className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-[#BE123C] border border-rose-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {waitlistLoading ? 'Updating...' : 'Leave Waiting List'}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={waitlistLoading}
                onClick={() => {
                  if (!currentUser) {
                    openAuthModal('signin');
                    return;
                  }
                  joinWaitlist();
                }}
                className="px-6 py-3 rounded-2xl btn-pink-gradient font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-60"
              >
                <Heart className="w-4 h-4 fill-white text-white" />
                <span>{waitlistLoading ? 'Saving...' : 'Join the Event Waiting List'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(evt => {
            const isRegistered = Boolean(currentUser && evt.ParticipantsList.includes(currentUser.UserID));
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
                  {/* Top Badge Strip */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isLive
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {isLive ? (isSimulated ? '● Live (Demo Simulated)' : '● Live Now') : 'Confirmed Launch'}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-[#B91C1C] border border-rose-200 font-heading">
                        {evt.DayOfWeek}
                      </span>
                      {evt.EventType === 'LGBTQ+' ? (
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-500/10 via-emerald-500/10 to-purple-500/10 text-purple-900 border border-purple-300 font-heading flex items-center gap-1">
                          <RainbowHeart size={14} />
                          <span>LGBTQ+</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-[#B91C1C] border border-rose-200 font-heading flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-[#B91C1C] text-[#B91C1C]" />
                          <span>{evt.EventType}</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-[#78350F] border border-amber-300 flex items-center gap-1 font-bold">
                      <Crown className="w-3 h-3 text-[#B45309]" />
                      Launch Event
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#111827] font-heading leading-snug">
                      {evt.EventName}
                    </h3>
                    <p className="text-xs text-[#111827] font-medium mt-1 line-clamp-2 leading-relaxed">
                      {evt.Description}
                    </p>
                  </div>

                  {/* Time, TimeZone, and Round Format Details */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 text-xs text-[#111827] font-medium">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                        <Clock className="w-3.5 h-3.5 text-[#BE185D]" />
                        <span>{evt.DayOfWeek} at {evt.TimeZone}</span>
                      </div>
                      <span className="font-mono text-[#111827] font-semibold text-[11px]">{evt.EventDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-[#111827]">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-[#BE123C]" />
                        <span>{evt.TotalRounds} Rounds · <strong>5 Mins Each</strong></span>
                      </div>
                      <span className="text-[#111827] font-semibold text-[11px]">2-Min Breaks</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#111827] font-medium flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Participants
                      </span>
                      <span className="font-semibold text-[#111827] tabular-nums">
                        {evt.ParticipantsList.length} / {evt.MaxParticipants} spots
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#BE185D] to-rose-600 rounded-full"
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
                        showNotification('Event membership coming soon.', 'pink');
                        setCurrentView('pricing');
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#78350F] border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#B45309]" />
                      <span>Event membership coming soon.</span>
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
                            className="flex-1 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-300 text-[#BE185D] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Registered · Waiting Room</span>
                          </button>
                        )}

                        <button
                          onClick={() => leaveEvent(evt.EventID)}
                          className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#BE123C] font-bold text-xs border border-rose-300 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Cancel your registration"
                        >
                          Cancel
                        </button>
                      </div>

                      {isOwner && appMode === 'demonstration' && (
                        <div className="flex items-center justify-between pt-1 border-t border-pink-100 text-[10px]">
                          <span className="text-[#111827] font-semibold">Demo Sandbox:</span>
                          <button
                            type="button"
                            onClick={() => toggleSimulateLiveEvent(evt.EventID, !isSimulated)}
                            className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                              isSimulated
                                ? 'bg-amber-100 text-[#78350F] hover:bg-amber-200'
                                : 'bg-slate-100 text-[#111827] hover:bg-slate-200'
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
                          className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isFull
                              ? 'bg-slate-100 text-[#111827] border border-slate-300 cursor-not-allowed'
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
                          className={`w-full py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isFull
                              ? 'bg-slate-100 text-[#111827] border border-slate-300 cursor-not-allowed'
                              : 'btn-glossy-red-pink text-white shadow-xs'
                          }`}
                        >
                          <Heart className="w-4 h-4 fill-white text-white" />
                          <span>{isFull ? 'Event Full' : `Register for ${evt.DayOfWeek} 7 PM`}</span>
                        </button>
                      )}
                      {(evt.EventType === '30 & Older' || evt.MinAge >= 30) &&
                        currentUser &&
                        (!currentUser.Age || currentUser.Age < 30) && (
                          <p className="text-[10px] text-[#92400E] text-center font-semibold">
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

      {/* FOUNDER-ONLY SCHEDULE LAUNCH EVENT MODAL */}
      {isOwner && showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-[#BE185D]">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#111827] font-heading">
                  Schedule Manual Launch Event (Founder Only)
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#111827] font-semibold mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.EventName}
                  onChange={e => setFormData({ ...formData, EventName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D] focus:ring-1 focus:ring-[#BE185D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={formData.EventType}
                    onChange={e => setFormData({ ...formData, EventType: e.target.value as EventType })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  >
                    <option value="Straight">Straight</option>
                    <option value="LGBTQ+">LGBTQ+</option>
                    <option value="30 & Older">30 &amp; Older</option>
                    <option value="Age-specific">Age-specific</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Day of the Week
                  </label>
                  <select
                    value={formData.DayOfWeek}
                    onChange={e =>
                      setFormData({ ...formData, DayOfWeek: e.target.value as 'Friday' | 'Saturday' | 'Sunday' })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  >
                    <option value="Friday">Friday (7:00 PM EST)</option>
                    <option value="Saturday">Saturday (7:00 PM EST)</option>
                    <option value="Sunday">Sunday (7:00 PM EST)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#111827] font-semibold mb-1">
                  Calendar Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.EventDate}
                  onChange={e => setFormData({ ...formData, EventDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Start Time (EST)
                  </label>
                  <input
                    type="time"
                    value={formData.EventStartTime}
                    onChange={e => setFormData({ ...formData, EventStartTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  />
                </div>

                <div>
                  <label className="block text-[#111827] font-semibold mb-1">
                    Time Zone Display
                  </label>
                  <input
                    type="text"
                    value={formData.TimeZone}
                    onChange={e => setFormData({ ...formData, TimeZone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#111827] font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.Description}
                  onChange={e => setFormData({ ...formData, Description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-[#111827] font-medium focus:outline-none focus:border-[#BE185D]"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmImmediately}
                  onChange={e => setConfirmImmediately(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#047857] border-slate-400 cursor-pointer"
                />
                <span className="text-[#111827] font-medium leading-snug">
                  <strong>Confirm &amp; publish launch event now</strong> (visible to members on Home &amp; Events; no invitations or notifications are sent automatically)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLaunchEvent}
                  className="px-5 py-2.5 rounded-xl btn-pink-gradient font-bold text-white shadow-md cursor-pointer disabled:opacity-60"
                >
                  {submittingLaunchEvent
                    ? 'Saving...'
                    : confirmImmediately
                    ? 'Schedule & Confirm Launch Event'
                    : 'Save Launch Event as Draft'}
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
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-[#047857]">
              <CheckCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#111827] font-heading">
                Registration Confirmed!
              </h3>
              <p className="text-sm font-bold text-[#BE185D]">
                {registrationModalData.eventName}
              </p>
              <p className="text-xs text-[#111827] font-medium">
                {registrationModalData.day} · {registrationModalData.time}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-200 text-xs text-[#111827] font-medium text-left space-y-2">
              <div className="font-bold text-[#111827]">Your Speed Dating Pass includes:</div>
              <div className="flex items-center gap-2 text-[11px]">
                <Check className="w-3.5 h-3.5 text-[#BE185D] shrink-0" />
                <span>5-minute one-on-one live video rounds</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Check className="w-3.5 h-3.5 text-[#BE185D] shrink-0" />
                <span>Up to 2-minute break to reflect &amp; relax</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Check className="w-3.5 h-3.5 text-[#BE185D] shrink-0" />
                <span>Compatible partner pairing verified before every call</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Check className="w-3.5 h-3.5 text-[#BE185D] shrink-0" />
                <span>Private Like or Pass ballot after each date</span>
              </div>
            </div>

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
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-semibold text-xs cursor-pointer"
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
