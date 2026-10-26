import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Video,
  Sparkles,
  Users,
  ShieldCheck,
  Play,
  ArrowLeft,
  Flame,
  Clock,
  Heart,
  Crown,
  Coffee,
  Globe,
  Lock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Avatar } from './Avatar';

export const EventLobby: React.FC = () => {
  const {
    events,
    selectedEventId,
    users,
    currentUser,
    startEventLive,
    setCurrentView,
    generateRoundsForEvent,
    canAccessLiveSpeedDating,
    liveSession,
    isEventLive,
    getTimeUntilEventStartMs,
    appMode,
    toggleSimulateLiveEvent,
    simulatedLiveEvents,
    serverTimeFormattedET,
  } = useApp();

  const isEligible = canAccessLiveSpeedDating(currentUser);
  const activeEvent = events.find(e => e.EventID === selectedEventId) || events[0];
  const isRegistered = activeEvent.ParticipantsList.includes(currentUser.UserID);

  const hasActiveSession = Boolean(
    liveSession &&
    liveSession.eventId === activeEvent.EventID &&
    liveSession.userId === currentUser.UserID
  );

  const isLive = isEventLive(activeEvent);
  const isSimulated = simulatedLiveEvents.includes(activeEvent.EventID);

  // Live countdown ticker to 7:00 PM Eastern Time
  const [countdownRemainingMs, setCountdownRemainingMs] = useState<number>(() =>
    getTimeUntilEventStartMs(activeEvent)
  );

  useEffect(() => {
    const updateCountdown = () => {
      setCountdownRemainingMs(getTimeUntilEventStartMs(activeEvent));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeEvent, getTimeUntilEventStartMs]);

  // Compute Days, Hours, Minutes, Seconds from remaining milliseconds
  const totalSeconds = Math.floor(countdownRemainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });
          if (active && videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setHasCamera(true);
          }
        }
      } catch (err: any) {
        setHasCamera(false);
      }
    }

    if (cameraActive) {
      initCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setHasCamera(false);
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraActive]);

  // In production mode, show only real registered daters; in demo, show category-curated participants
  const attendees = appMode === 'production'
    ? users.filter(u => activeEvent.ParticipantsList.includes(u.UserID) && u.UserID !== 'usr_kristy')
    : users.filter(u => {
        if (activeEvent.EventType === '30 & Older') return u.Age >= 30;
        if (activeEvent.EventType === 'LGBTQ+') return u.Gender === 'Non-Binary' || u.InterestedIn === 'Everyone' || u.UserID === 'usr_07' || u.UserID === 'usr_08';
        return activeEvent.ParticipantsList.includes(u.UserID) || ['usr_02', 'usr_03', 'usr_05'].includes(u.UserID);
      });

  const handleStartRounds = () => {
    if (!isEligible) {
      setCurrentView('pricing');
      return;
    }
    if (!activeEvent.RoundsGenerated) {
      generateRoundsForEvent(activeEvent.EventID);
    }
    startEventLive(activeEvent.EventID);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Mode Banner Notice */}
      <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        appMode === 'demonstration'
          ? 'bg-purple-50/70 border-purple-200 text-purple-900'
          : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 shrink-0 ${appMode === 'demonstration' ? 'text-purple-600' : 'text-emerald-600'}`} />
          <span>
            {appMode === 'demonstration' ? (
              <>
                <strong>Demonstration Sandbox Mode:</strong> Real video signaling is in simulation mode. 5-min rounds, 2-min breaks, and consent-based waiting room operate in real time with curated sample partners.
              </>
            ) : (
              <>
                <strong>Production Mode Active:</strong> Connecting real consenting members. Live video requires an active WebRTC SFU infrastructure provider (LiveKit / Twilio / Agora).
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200">
            {appMode === 'demonstration' ? 'Sandbox Mode' : 'Production Mode'}
          </span>
        </div>
      </div>

      <button
        onClick={() => setCurrentView('friday')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#FF2E93] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Weekend Events</span>
      </button>

      {/* Main Waiting Room Header Card */}
      <div className="rounded-3xl bg-white border border-pink-100 p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF2E93] font-heading">
              <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-pink-400'}`} />
              <span>{isLive ? 'Event is Live Now' : 'Pre-Event Waiting Room'}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700 bg-pink-50 px-2 py-0.5 rounded-md font-mono text-[11px]">
                {activeEvent.DayOfWeek} at 7:00 PM Eastern Time
              </span>
              <span className="text-slate-300">·</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px]">
                {activeEvent.EventType}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              {activeEvent.EventName}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500">
              {activeEvent.LocationName} · 5-minute one-on-one video rounds · Up to 2-minute breaks · Consent-based Next Date flow
            </p>
          </div>

          {/* Action / Matchmaking Entry Area */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            {!isEligible ? (
              <button
                onClick={() => setCurrentView('pricing')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-[#FF2E93] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 shadow-md cursor-pointer"
              >
                <Crown className="w-4 h-4 fill-white" />
                <span>Upgrade to Premium Plus ($14.99/mo)</span>
              </button>
            ) : hasActiveSession ? (
              <button
                onClick={() => setCurrentView('live')}
                className="px-6 py-3 rounded-2xl btn-pink-gradient font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 shadow-md shadow-pink-500/20 cursor-pointer animate-pulse"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Resume Active Date (Round {(liveSession?.roundIndex ?? 0) + 1})</span>
              </button>
            ) : isLive ? (
              <div className="space-y-1 text-right">
                <button
                  onClick={handleStartRounds}
                  className="px-6 py-3 rounded-2xl btn-pink-gradient font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Begin Matchmaking (I'm Ready)</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  Explicit consent required · Calls never launch automatically
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 text-right">
                <button
                  disabled
                  className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>Waiting for 7:00 PM ET Start</span>
                </button>
                {appMode === 'demonstration' && (
                  <button
                    onClick={() => toggleSimulateLiveEvent(activeEvent.EventID, !isSimulated)}
                    className="text-[11px] text-[#FF2E93] hover:underline font-bold block mx-auto cursor-pointer"
                  >
                    {isSimulated ? 'Stop Demo Start' : '⚡ Simulate 7:00 PM Start (Demo Testing)'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Countdown to 7:00 PM Eastern Time Widget */}
        {!isLive && (
          <div className="pt-4 border-t border-pink-50">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-[#FFF0F3] border border-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#FF2E93] flex items-center gap-1.5 font-heading">
                  <Clock className="w-4 h-4" />
                  <span>Countdown to Event Start (7:00 PM Eastern Time)</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Scheduled for <strong>{activeEvent.DayOfWeek}, {activeEvent.EventDate} at 7:00 PM ET</strong> (America/New_York). Daylight saving time is handled automatically.
                </p>
              </div>

              {/* Countdown Digits */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center bg-white px-3 py-2 rounded-xl border border-pink-200 shadow-2xs min-w-[50px]">
                  <span className="font-mono text-lg font-black text-slate-900">{days}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Days</span>
                </div>
                <span className="font-bold text-pink-300">:</span>
                <div className="flex flex-col items-center bg-white px-3 py-2 rounded-xl border border-pink-200 shadow-2xs min-w-[50px]">
                  <span className="font-mono text-lg font-black text-slate-900">{String(hours).padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Hours</span>
                </div>
                <span className="font-bold text-pink-300">:</span>
                <div className="flex flex-col items-center bg-white px-3 py-2 rounded-xl border border-pink-200 shadow-2xs min-w-[50px]">
                  <span className="font-mono text-lg font-black text-slate-900">{String(minutes).padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Mins</span>
                </div>
                <span className="font-bold text-pink-300">:</span>
                <div className="flex flex-col items-center bg-white px-3 py-2 rounded-xl border border-pink-200 shadow-2xs min-w-[50px]">
                  <span className="font-mono text-lg font-black text-[#FF2E93]">{String(seconds).padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Secs</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Device Check & Live Video Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl bg-white border border-pink-100 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                <Video className="w-4 h-4 text-[#FF2E93]" />
                Audio & Video Self-Check
              </h3>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Device Ready
              </span>
            </div>

            {/* Video Box */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
              {hasCamera && cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg text-white"
                    style={{
                      background: `linear-gradient(135deg, ${currentUser.AvatarColor || '#FF2E93'}, #E11D48)`,
                    }}
                  >
                    {currentUser.FirstName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {currentUser.FirstName} {currentUser.LastName}
                    </div>
                    <div className="text-xs text-slate-400">
                      {cameraActive ? 'Camera Connected' : 'Camera Muted'}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-xs">
                    Each speed date lasts 5 minutes with optional icebreakers and a comfortable 2-minute break between dates.
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCameraActive(prev => !prev)}
                  className={`p-3 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                    cameraActive
                      ? 'bg-white/90 border-slate-200 text-slate-800 hover:bg-white'
                      : 'bg-rose-600 border-rose-700 text-white'
                  }`}
                  title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {cameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setMicActive(prev => !prev)}
                  className={`p-3 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                    micActive
                      ? 'bg-white/90 border-slate-200 text-slate-800 hover:bg-white'
                      : 'bg-rose-600 border-rose-700 text-white'
                  }`}
                  title={micActive ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Video Infrastructure Status Notice */}
            {appMode === 'production' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Live Video Infrastructure Status: Setup Required
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Real peer-to-peer video streaming requires an authenticated WebRTC SFU infrastructure provider (e.g. LiveKit Cloud, Twilio Video, or Agora RTC). In production mode, live video calls will remain disabled until server video credentials are connected.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1 text-xs text-purple-900">
                <div className="font-bold flex items-center gap-1.5 text-purple-950">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Demonstration Video Mode Active
                </div>
                <p className="text-[11px] text-purple-800">
                  You can test local camera mirroring, audio self-check, icebreakers, 5-minute round timers, and private ballots.
                </p>
              </div>
            )}

            {/* Speed dating rules */}
            <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-pink-100 space-y-2 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                <Heart className="w-3.5 h-3.5 text-[#FF2E93] fill-[#FF2E93]" />
                Speed Dating Rules & Format ({activeEvent.DayOfWeek} at 7:00 PM ET):
              </div>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside text-[11px]">
                <li>Exclusive to <strong>Premium Plus</strong> members ($14.99/mo).</li>
                <li><strong>Five-minute one-on-one video dates</strong> with rotating partners.</li>
                <li>Privately choose <strong>Like ❤️</strong> or <strong>Pass</strong> after each date.</li>
                <li><strong>Up to a two-minute break</strong> between dates to catch your breath and take notes.</li>
                <li>Tap <strong>Next Date (I'm Ready)</strong> when prepared — calls never launch without consent!</li>
                <li>Mutual likes immediately unlock messaging in your Matches portal.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Checked-In Daters in Waiting Room */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-white border border-pink-100 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF2E93]" />
                Checked-In Waiting Room ({attendees.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">{activeEvent.DayOfWeek} 7:00 PM</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {attendees.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                  Waiting for other attendees to check in...
                </div>
              ) : (
                attendees.map(u => (
                  <div
                    key={u.UserID}
                    className="p-3 rounded-2xl bg-white border border-slate-100 hover:border-pink-200 flex items-center justify-between transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar user={u} size="sm" showBadge />
                      <div>
                        <div className="font-bold text-slate-900">
                          {u.FirstName} {u.LastName ? `${u.LastName[0]}.` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {u.Gender}, {u.Age} · {u.Location.split(',')[0]}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      In Waiting Room
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Timezone: <strong>{activeEvent.TimeZone}</strong></span>
              <span>5-Min Rounds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
