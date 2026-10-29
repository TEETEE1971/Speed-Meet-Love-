import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Clock,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  MessageCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { LiveKitVideoStage } from './LiveKitVideoStage';
import { FloatingHearts } from './FloatingHearts';
import confetti from 'canvas-confetti';

export const SecondChanceDateRoom: React.FC = () => {
  const {
    currentUser,
    users,
    matches,
    selectedEventId,
    activeSecondDateSession,
    secondDateSessions,
    setCurrentView,
    setSelectedMatchId,
    endSecondDate,
    showNotification,
    appMode,
  } = useApp();

  // Find partner for this second-chance date
  const session =
    activeSecondDateSession ||
    secondDateSessions.find(
      s =>
        s.status === 'active' &&
        s.expiresAt &&
        s.expiresAt > Date.now() &&
        (s.userA === currentUser.UserID || s.userB === currentUser.UserID)
    );

  const partnerId = session
    ? session.userA === currentUser.UserID
      ? session.userB
      : session.userA
    : 'usr_02';

  const partner = users.find(u => u.UserID === partnerId) || users[1];

  // 10-Minute timer state (600 seconds)
  const defaultDuration = session?.durationSeconds || 600;
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (session && session.expiresAt) {
      return Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
    }
    return defaultDuration;
  });

  const [isCompleted, setIsCompleted] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);

  // LiveKit video room credentials
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitServerUrl, setLiveKitServerUrl] = useState<string | null>(null);
  const [liveKitError, setLiveKitError] = useState<string | null>(null);

  // Audio / Camera controls
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Real-time floating heart reactions
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: string; x: number; emoji: string }>>([]);
  const [isSendingHeart, setIsSendingHeart] = useState(false);

  // Server-authoritative timer reference
  const timerDataRef = useRef<{
    expiresAt: number | null;
    isExpired: boolean;
  }>({
    expiresAt: session?.expiresAt || null,
    isExpired: false,
  });

  // Sync with server-authoritative timer
  const syncServerTimer = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/second-date/${session.sessionId}/timer`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          timerDataRef.current = {
            expiresAt: data.expiresAt,
            isExpired: data.isExpired,
          };

          if (data.isExpired || data.remainingSeconds <= 0 || data.status === 'completed') {
            setTimeLeft(0);
            setIsCompleted(true);
            setLiveKitToken(null);
          } else {
            setTimeLeft(data.remainingSeconds);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync second date timer:', err);
    }
  }, [session]);

  // Initial sync & periodic 2-second server timer check (guarantees zero drift across devices)
  useEffect(() => {
    syncServerTimer();
    const interval = setInterval(syncServerTimer, 2000);
    return () => clearInterval(interval);
  }, [syncServerTimer]);

  // Request LiveKit room token bound to this 10-minute second chance date
  const fetchLiveKitToken = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          userName: currentUser.FirstName,
          userAge: currentUser.Age,
          tier: currentUser.SubscriptionTier,
          partnerId: partner.UserID,
          partnerName: partner.FirstName,
          isSecondDate: true,
          secondDateSessionId: session.sessionId,
          mode: appMode,
        }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        setLiveKitToken(data.token);
        setLiveKitServerUrl(data.liveKitUrl);
        setLiveKitError(null);
      } else {
        if (data.code === 'ROUND_EXPIRED' || data.isExpired) {
          setTimeLeft(0);
          setIsCompleted(true);
          setLiveKitToken(null);
        } else {
          setLiveKitError(data.error || 'Video connection check failed.');
        }
      }
    } catch (err) {
      setLiveKitError('LiveKit connection service error.');
    }
  }, [session, currentUser, partner, appMode]);

  useEffect(() => {
    if (!isCompleted) {
      fetchLiveKitToken();
    }
  }, [fetchLiveKitToken, isCompleted]);

  // 1-second wall-clock countdown bound to server expiresAt
  useEffect(() => {
    if (isCompleted) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const expiresAt = timerDataRef.current.expiresAt || (session?.startedAt ? session.startedAt + defaultDuration * 1000 : null);

      if (expiresAt) {
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          // Exactly 10 minutes expired!
          setTimeLeft(0);
          setIsCompleted(true);
          setLiveKitToken(null);

          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#FF2E93', '#FF147E', '#E11D48'],
            });
          } catch (e) {}

          showNotification('10-Minute Second Chance Date Completed! Your mutual match is safely saved.', 'pink');
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCompleted, defaultDuration, session, showNotification]);

  // Camera preview setup
  useEffect(() => {
    let isMounted = true;
    async function setupCamera() {
      if (liveKitToken) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        return;
      }

      try {
        if (navigator.mediaDevices?.getUserMedia && cameraOn) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 } },
            audio: false,
          });
          if (isMounted) {
            streamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.playsInline = true;
              localVideoRef.current.muted = true;
              localVideoRef.current.play().catch(() => {});
            }
          } else {
            stream.getTracks().forEach(t => t.stop());
          }
        }
      } catch (e) {
        console.warn('Camera preview warning:', e);
      }
    }

    setupCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOn, liveKitToken]);

  const sendHeartReaction = () => {
    if (isSendingHeart) return;
    setIsSendingHeart(true);

    const heartId = `rx_${Date.now()}`;
    const emojis = ['❤️', '💖', '💕', '💓', '💗'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomX = Math.floor(Math.random() * 60) + 20;

    setFloatingHearts(prev => [...prev, { id: heartId, x: randomX, emoji: randomEmoji }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== heartId));
    }, 2400);

    try {
      confetti({
        particleCount: 20,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#FF2E93', '#FF147E', '#E11D48'],
      });
    } catch (e) {}

    showNotification(`You sent a heart to ${partner.FirstName}! 💕`, 'pink');
    setTimeout(() => setIsSendingHeart(false), 800);
  };

  const handleConcludeDate = async () => {
    setIsConcluding(true);
    if (session) {
      await endSecondDate(session.sessionId);
    } else {
      setCurrentView('results');
    }
  };

  const formatMinutes = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const existingMatch = matches.find(
    m =>
      (m.UserA === currentUser.UserID && m.UserB === partner.UserID) ||
      (m.UserA === partner.UserID && m.UserB === currentUser.UserID)
  );

  return (
    <div className="relative space-y-5 max-w-6xl mx-auto py-2">
      {/* Real-time floating hearts overlay */}
      {floatingHearts.length > 0 && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
          {floatingHearts.map(h => (
            <div
              key={h.id}
              className="absolute bottom-20 animate-float-heart select-none text-4xl drop-shadow-lg"
              style={{ left: `${h.x}%` }}
            >
              {h.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Top Banner Notice */}
      <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 fill-white shrink-0" />
          <span>
            <strong>10-Minute Second Chance Date:</strong> Private one-on-one video session with {partner.FirstName}. Mutually agreed by both participants!
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs bg-black/25 px-2.5 py-1 rounded-xl border border-white/20">
            Session: {session?.sessionId.slice(-10) || 'Active'}
          </span>
          <button
            onClick={handleConcludeDate}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white text-red-700 hover:bg-rose-50 font-bold transition-colors cursor-pointer text-[11px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Conclude & Save</span>
          </button>
        </div>
      </div>

      {/* COMPLETED 10-MINUTE DATE MODAL */}
      {isCompleted && (
        <div className="rounded-3xl bg-white border-2 border-rose-300 p-8 sm:p-10 text-center space-y-6 shadow-xl max-w-xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full btn-pink-gradient mx-auto flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
            <Heart className="w-10 h-10 fill-white" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
              10-Minute Second Chance Date Completed! 💘
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Your 10-minute video session with <strong>{partner.FirstName}</strong> has concluded. Your mutual match is safely preserved in <strong>My Matches</strong> so you can continue messaging anytime.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (existingMatch) {
                  setSelectedMatchId(existingMatch.MatchID);
                  setCurrentView('messages');
                } else {
                  setCurrentView('matches');
                }
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl btn-glossy-red-pink text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Open Chat in Messages</span>
            </button>

            <button
              onClick={() => setCurrentView('results')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Return to Match Reveal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE 10-MINUTE VIDEO ROOM */}
      {!isCompleted && (
        <div className="space-y-4">
          {/* Status Header */}
          <div className="p-4 rounded-3xl bg-white border-2 border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('results')}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Back to Match Reveal"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-red-600 border border-rose-200 font-heading">
                    Second Chance Date
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-600">
                    10-Minute Private Video Connection
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading mt-0.5">
                  Reconnecting with {partner.FirstName}
                </h1>
              </div>
            </div>

            {/* Countdown Clock & Live Reaction Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border-2 font-mono font-black text-base sm:text-lg transition-colors shadow-2xs ${
                  timeLeft < 60
                    ? 'bg-rose-50 border-rose-400 text-rose-600 animate-pulse'
                    : 'bg-pink-50 border-rose-300 text-red-600'
                }`}
                title="Server-authoritative 10-minute timer. Never resets on refresh or reconnect."
              >
                <Clock className="w-4 h-4 text-red-600" />
                <span className="tracking-tight">{formatMinutes(timeLeft)}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Server Synced Timer" />
              </div>

              {/* Real-time Heart Reaction Button */}
              <button
                onClick={sendHeartReaction}
                disabled={isSendingHeart}
                className="px-3 sm:px-4 py-2 rounded-2xl btn-glossy-red-pink text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                title="Send a heart reaction to express interest"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span className="hidden sm:inline">Send Heart</span>
              </button>

              <button
                onClick={handleConcludeDate}
                disabled={isConcluding}
                className="px-3 sm:px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-bold text-slate-700 hover:text-red-600 transition-colors cursor-pointer"
              >
                Conclude Date
              </button>
            </div>
          </div>

          {/* Main 2-Up Video Room */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Cols: Video Stage */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-3xl overflow-hidden border-2 border-rose-200 bg-slate-950 p-2 shadow-lg">
                {liveKitToken && liveKitServerUrl ? (
                  <LiveKitVideoStage
                    token={liveKitToken}
                    serverUrl={liveKitServerUrl}
                    partner={partner}
                    currentUser={currentUser}
                    cameraOn={cameraOn}
                    micOn={micOn}
                    onToggleMic={() => setMicOn(prev => !prev)}
                    onToggleCamera={() => setCameraOn(prev => !prev)}
                    onReportPartner={() => {}}
                    appMode={appMode}
                    onDisconnect={() => setLiveKitToken(null)}
                    onError={err => console.warn('LiveKit error:', err)}
                  />
                ) : (
                  /* 2-Up Split Screen (Demonstration & Preview Mode) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Partner Mirror Screen */}
                    <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col justify-between p-4">
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/10">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-bold">{partner.FirstName}</span>
                        </div>
                        <span className="text-[10px] text-rose-300 font-mono bg-black/40 px-2 py-0.5 rounded-full">
                          Second Chance Call
                        </span>
                      </div>

                      <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-2">
                        <Avatar user={partner} size="xl" showBadge />
                        <p className="text-white font-extrabold text-sm">{partner.FirstName} {partner.LastName}</p>
                        <p className="text-slate-400 text-xs">{partner.Occupation} · {partner.Location}</p>
                      </div>

                      <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
                        <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs text-[11px]">
                          Private 10-Minute Video Date
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          Connected
                        </span>
                      </div>
                    </div>

                    {/* Self Mirror Screen */}
                    <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col justify-between p-4">
                      {cameraOn ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                          <Avatar user={currentUser} size="xl" />
                          <p className="text-slate-400 text-xs mt-3">Camera is turned off</p>
                        </div>
                      )}

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/10">
                          <span className="font-bold">You ({currentUser.FirstName})</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setMicOn(prev => !prev)}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                              micOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                            }`}
                            title={micOn ? 'Mute Mic' : 'Unmute Mic'}
                          >
                            {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setCameraOn(prev => !prev)}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                              cameraOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                            }`}
                            title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                          >
                            {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300">
                        <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs">
                          Local Mirror
                        </span>
                        <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs font-mono text-[#FF2E93]">
                          {currentUser.SubscriptionTier}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Spark Conversation Prompt */}
              <div className="p-4 rounded-3xl bg-white border border-rose-200 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-red-600 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                    10-Minute Deep Dive Spark
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    “What’s something unexpected you loved finding out about each other in the first 5 minutes?”
                  </p>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Partner Profile & Second Chance Details */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-3xl bg-white border-2 border-rose-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar user={partner} size="md" showBadge />
                  <div>
                    <h3 className="font-extrabold text-slate-900 font-heading text-base">
                      {partner.FirstName} {partner.LastName}
                    </h3>
                    <p className="text-xs text-slate-500">{partner.Occupation} · {partner.Age} years old</p>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 leading-relaxed">
                  {partner.Bio}
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-heading">
                    Shared Chemistry
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {partner.Interests.map(interest => (
                      <span
                        key={interest}
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-red-700 border border-rose-200"
                      >
                        {interest} ✨
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-rose-100 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Second Date Duration:</span>
                    <span className="font-bold text-slate-900">10 Minutes (600s)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Mutual Match Saved:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Permanent
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
