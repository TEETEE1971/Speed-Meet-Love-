import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ICEBREAKER_QUESTIONS } from '../data/initialData';
import {
  Heart,
  X,
  FastForward,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Clock,
  Mic,
  MicOff,
  Video,
  VideoOff,
  FileText,
  ChevronRight,
  ShieldCheck,
  Zap,
  Lock,
  Crown,
  AlertCircle,
  Ban,
  ShieldAlert,
  ArrowLeft,
  Coffee,
  CheckCircle,
  LogOut,
  Radio,
  UserCheck,
  Smile,
  Pause,
  Play
} from 'lucide-react';
import { Avatar } from './Avatar';
import confetti from 'canvas-confetti';

type RoundStage = 'call' | 'break' | 'waiting_room';

export const LiveRoundScreen: React.FC = () => {
  const {
    events,
    selectedEventId,
    rounds,
    users,
    currentUser,
    activeRoundIndex,
    setActiveRoundIndex,
    submitRoundDecision,
    skipRound,
    requestReplay,
    setCurrentView,
    setSubscriptionTier,
    canAccessLiveSpeedDating,
    blockUser,
    setReportModalTarget,
    showNotification,
    leaveEvent,
    handlePartnerUnavailable,
    liveSession,
    saveLiveSession,
    clearLiveSession,
    syncLiveSessionFromServer,
    appMode,
  } = useApp();

  const isEligible = canAccessLiveSpeedDating(currentUser);

  const activeEvent = events.find(e => e.EventID === selectedEventId) || events[0];
  const eventRounds = rounds.filter(r => r.EventID === activeEvent.EventID);
  const currentRound = eventRounds[activeRoundIndex] || eventRounds[0];

  const isUserA = currentRound ? currentRound.UserA === currentUser.UserID : true;
  const partnerId = currentRound ? (isUserA ? currentRound.UserB : currentRound.UserA) : 'usr_02';
  const partner = users.find(u => u.UserID === partnerId) || users[1];

  // 5-minute round (300 seconds)
  const defaultDuration = activeEvent.RoundDurationSeconds || 300;
  // 2-minute break (120 seconds)
  const defaultBreak = activeEvent.BreakDurationSeconds || 120;

  // Initialize stage from active persistent live session or default to 'call'
  const [stage, setStage] = useState<RoundStage>(() => {
    if (liveSession && liveSession.eventId === activeEvent.EventID && liveSession.roundIndex === activeRoundIndex) {
      return liveSession.stage;
    }
    return 'call';
  });

  // Calculate actual elapsed wall-clock time
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (liveSession && liveSession.eventId === activeEvent.EventID && liveSession.roundIndex === activeRoundIndex) {
      if (liveSession.stage === 'call') {
        const elapsed = Math.floor((Date.now() - liveSession.roundStartedAt) / 1000);
        return Math.max(0, defaultDuration - elapsed);
      }
      return 0;
    }
    return defaultDuration;
  });
  const [isPaused, setIsPaused] = useState(false);

  const [breakTimeLeft, setBreakTimeLeft] = useState<number>(() => {
    if (liveSession && liveSession.eventId === activeEvent.EventID && liveSession.roundIndex === activeRoundIndex) {
      if (liveSession.stage === 'break') {
        const breakStart = liveSession.breakStartedAt || Date.now();
        const elapsed = Math.floor((Date.now() - breakStart) / 1000);
        return Math.max(0, defaultBreak - elapsed);
      }
    }
    return defaultBreak;
  });
  const [breakPaused, setBreakPaused] = useState(false);

  // Waiting room matchmaking state
  const [waitingCountdown, setWaitingCountdown] = useState<number | null>(null);
  const [foundPartnerName, setFoundPartnerName] = useState<string | null>(null);

  // Leave event confirmation modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSessionInfoModal, setShowSessionInfoModal] = useState(false);

  const [icebreakerIdx, setIcebreakerIdx] = useState(0);

  // Preserve private notes and votes from persistent session or round history
  const [privateNotes, setPrivateNotes] = useState<string>(() => {
    if (liveSession && liveSession.eventId === activeEvent.EventID && liveSession.roundIndex === activeRoundIndex) {
      return liveSession.notes || '';
    }
    return isUserA ? currentRound?.UserA_Notes || '' : currentRound?.UserB_Notes || '';
  });

  const [selectedDecision, setSelectedDecision] = useState<'like' | 'pass' | null>(() => {
    if (liveSession && liveSession.eventId === activeEvent.EventID && liveSession.roundIndex === activeRoundIndex) {
      return liveSession.vote;
    }
    return isUserA
      ? currentRound?.UserA_Like !== null ? (currentRound?.UserA_Like ? 'like' : 'pass') : null
      : currentRound?.UserB_Like !== null ? (currentRound?.UserB_Like ? 'like' : 'pass') : null;
  });

  const [replayRequested, setReplayRequested] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera preview setup
  useEffect(() => {
    let isMounted = true;
    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && cameraOn) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (isMounted && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        }
      } catch (e) {}
    }
    if (isEligible) {
      setupCamera();
    }

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraOn, isEligible]);

  // Synchronize with persistent session state and actual wall-clock elapsed time
  useEffect(() => {
    if (liveSession && liveSession.eventId === activeEvent.EventID && liveSession.roundIndex === activeRoundIndex) {
      const now = Date.now();
      if (liveSession.stage === 'call') {
        const elapsed = Math.floor((now - liveSession.roundStartedAt) / 1000);
        if (elapsed >= liveSession.roundDurationSeconds) {
          // 5-minute round completed while away! Transition to break automatically
          const breakStart = liveSession.breakStartedAt || (liveSession.roundStartedAt + liveSession.roundDurationSeconds * 1000);
          const breakElapsed = Math.floor((now - breakStart) / 1000);
          const remainingBreak = Math.max(0, liveSession.breakDurationSeconds - breakElapsed);

          setStage('break');
          setTimeLeft(0);
          setBreakTimeLeft(remainingBreak);

          saveLiveSession({
            stage: 'break',
            breakStartedAt: breakStart,
            lastActive: now,
          });

          showNotification('Welcome back! Round call ended while away. Cast your vote & take your break.', 'pink');
        } else {
          setStage('call');
          setTimeLeft(liveSession.roundDurationSeconds - elapsed);
        }
      } else if (liveSession.stage === 'break') {
        setStage('break');
        setTimeLeft(0);
        const breakStart = liveSession.breakStartedAt || now;
        const breakElapsed = Math.floor((now - breakStart) / 1000);
        setBreakTimeLeft(Math.max(0, liveSession.breakDurationSeconds - breakElapsed));
      } else if (liveSession.stage === 'waiting_room') {
        setStage('waiting_room');
      }

      if (liveSession.vote !== undefined) {
        setSelectedDecision(liveSession.vote);
      }
      if (liveSession.notes !== undefined) {
        setPrivateNotes(liveSession.notes);
      }
    } else {
      // Establish new persistent session for this round
      const now = Date.now();
      const initialNotes = isUserA ? currentRound?.UserA_Notes || '' : currentRound?.UserB_Notes || '';
      const initialVote = isUserA
        ? currentRound?.UserA_Like !== null ? (currentRound?.UserA_Like ? 'like' : 'pass') : null
        : currentRound?.UserB_Like !== null ? (currentRound?.UserB_Like ? 'like' : 'pass') : null;

      saveLiveSession({
        userId: currentUser.UserID,
        eventId: activeEvent.EventID,
        roundIndex: activeRoundIndex,
        stage: 'call',
        roundStartedAt: now,
        breakStartedAt: null,
        roundDurationSeconds: defaultDuration,
        breakDurationSeconds: defaultBreak,
        vote: initialVote,
        notes: initialNotes,
        partnerId: partner.UserID,
        currentView: 'live',
        lastActive: now,
      });

      setStage('call');
      setTimeLeft(defaultDuration);
      setBreakTimeLeft(defaultBreak);
      setPrivateNotes(initialNotes);
      setSelectedDecision(initialVote);
      setWaitingCountdown(null);
      setFoundPartnerName(null);
    }
  }, [activeRoundIndex, activeEvent.EventID]);

  // Real-Time Wall-Clock Interval for accurate countdown
  useEffect(() => {
    if (!isEligible) return;

    const timer = setInterval(() => {
      const now = Date.now();
      if (!liveSession) return;

      if (stage === 'call' && !isPaused) {
        const elapsed = Math.floor((now - liveSession.roundStartedAt) / 1000);
        const remaining = Math.max(0, liveSession.roundDurationSeconds - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          const breakStart = Date.now();
          setStage('break');
          setBreakTimeLeft(liveSession.breakDurationSeconds);
          saveLiveSession({
            stage: 'break',
            breakStartedAt: breakStart,
            lastActive: now,
          });
          showNotification('5-minute round finished! Cast your secret vote & take a 2-minute break.', 'pink');
        }
      } else if (stage === 'break' && !breakPaused) {
        const breakStart = liveSession.breakStartedAt || now;
        const elapsed = Math.floor((now - breakStart) / 1000);
        const remaining = Math.max(0, liveSession.breakDurationSeconds - elapsed);
        setBreakTimeLeft(remaining);
        // Do NOT automatically start another video date without user clicking Next Date
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, isPaused, breakPaused, liveSession, isEligible]);

  // Tab switching, browser backgrounding, and phone sleep recovery listener
  useEffect(() => {
    const handleVisibilityOrResume = () => {
      if (document.visibilityState === 'visible') {
        syncLiveSessionFromServer().then(session => {
          const activeSess = session || liveSession;
          if (activeSess) {
            const now = Date.now();
            if (activeSess.stage === 'call') {
              const elapsed = Math.floor((now - activeSess.roundStartedAt) / 1000);
              if (elapsed >= activeSess.roundDurationSeconds) {
                const breakStart = activeSess.breakStartedAt || (activeSess.roundStartedAt + activeSess.roundDurationSeconds * 1000);
                const breakElapsed = Math.floor((now - breakStart) / 1000);
                const remainingBreak = Math.max(0, activeSess.breakDurationSeconds - breakElapsed);

                setStage('break');
                setTimeLeft(0);
                setBreakTimeLeft(remainingBreak);

                saveLiveSession({
                  stage: 'break',
                  breakStartedAt: breakStart,
                  lastActive: now,
                });

                showNotification('Welcome back! 5-minute round ended while away. Cast your vote & take your break.', 'pink');
              } else {
                setTimeLeft(Math.max(0, activeSess.roundDurationSeconds - elapsed));
              }
            } else if (activeSess.stage === 'break') {
              const breakStart = activeSess.breakStartedAt || now;
              const breakElapsed = Math.floor((now - breakStart) / 1000);
              setBreakTimeLeft(Math.max(0, activeSess.breakDurationSeconds - breakElapsed));
            }
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrResume);
    window.addEventListener('focus', handleVisibilityOrResume);
    window.addEventListener('pageshow', handleVisibilityOrResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrResume);
      window.removeEventListener('focus', handleVisibilityOrResume);
      window.removeEventListener('pageshow', handleVisibilityOrResume);
    };
  }, [liveSession]);

  // Waiting room matchmaking pulse
  useEffect(() => {
    if (stage !== 'waiting_room' || !isEligible) return;

    // Simulate matchmaking discovery after 3 seconds
    const matchmakerTimeout = setTimeout(() => {
      const nextIndex = activeRoundIndex + 1;
      if (nextIndex < eventRounds.length) {
        const nextRound = eventRounds[nextIndex];
        const nextPartnerId = nextRound.UserA === currentUser.UserID ? nextRound.UserB : nextRound.UserA;
        const nextPartner = users.find(u => u.UserID === nextPartnerId);
        setFoundPartnerName(nextPartner ? `${nextPartner.FirstName}, ${nextPartner.Age}` : 'Next Partner');
        setWaitingCountdown(3);
      } else {
        // Event completed
        clearLiveSession();
        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#FF2E93', '#FF147E', '#E11D48'],
          });
        } catch (e) {}
        setCurrentView('results');
      }
    }, 3000);

    return () => clearTimeout(matchmakerTimeout);
  }, [stage, activeRoundIndex, eventRounds, isEligible]);

  // Waiting room 3-2-1 countdown into call
  useEffect(() => {
    if (waitingCountdown === null) return;
    if (waitingCountdown <= 0) {
      const nextIdx = activeRoundIndex + 1;
      setActiveRoundIndex(nextIdx);
      const now = Date.now();
      setStage('call');
      setTimeLeft(defaultDuration);
      setBreakTimeLeft(defaultBreak);
      setSelectedDecision(null);
      setPrivateNotes('');
      setWaitingCountdown(null);
      setFoundPartnerName(null);

      const nextRound = eventRounds[nextIdx];
      const nextPartnerId = nextRound ? (nextRound.UserA === currentUser.UserID ? nextRound.UserB : nextRound.UserA) : '';

      saveLiveSession({
        roundIndex: nextIdx,
        stage: 'call',
        roundStartedAt: now,
        breakStartedAt: null,
        vote: null,
        notes: '',
        partnerId: nextPartnerId,
        lastActive: now,
      });
      return;
    }

    const timer = setTimeout(() => {
      setWaitingCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [waitingCountdown, activeRoundIndex, eventRounds]);

  const enterBreakStage = () => {
    const breakStart = Date.now();
    setStage('break');
    setBreakTimeLeft(defaultBreak);
    saveLiveSession({
      stage: 'break',
      breakStartedAt: breakStart,
      lastActive: breakStart,
    });
    showNotification('5-minute round finished! Cast your secret vote & take a 2-minute break.', 'pink');
  };

  const handleDecision = (decision: 'like' | 'pass') => {
    setSelectedDecision(decision);
    if (currentRound) {
      submitRoundDecision(currentRound.RoundID, decision === 'like', privateNotes);
    }
    saveLiveSession({ vote: decision, notes: privateNotes });

    if (decision === 'like') {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#FF2E93', '#FFE600'],
        });
      } catch (e) {}
      showNotification(`You liked ${partner.FirstName}! Mutual likes unlock messaging in Matches.`, 'pink');
    } else {
      showNotification(`Pass recorded privately. Your choices remain strictly confidential.`, 'info');
    }
  };

  const handleNotesChange = (text: string) => {
    setPrivateNotes(text);
    if (currentRound) {
      submitRoundDecision(currentRound.RoundID, selectedDecision === 'like', text);
    }
    saveLiveSession({ notes: text });
  };

  const handleNextDateClick = () => {
    // If not voted yet, default to pass
    if (selectedDecision === null && currentRound) {
      submitRoundDecision(currentRound.RoundID, false, privateNotes);
      saveLiveSession({ vote: 'pass', notes: privateNotes });
    }

    if (activeRoundIndex < eventRounds.length - 1) {
      setStage('waiting_room');
      saveLiveSession({ stage: 'waiting_room' });
      showNotification("Placed in Waiting Room. Matching you with the next dater...", 'info');
    } else {
      // Completed all rounds
      clearLiveSession();
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FF2E93', '#FF147E', '#E11D48'],
        });
      } catch (e) {}
      setCurrentView('results');
    }
  };

  const handleSkipRound = () => {
    if (currentRound) {
      skipRound(currentRound.RoundID);
    }
    enterBreakStage();
  };

  const handleSimulatePartnerUnavailable = () => {
    if (currentRound) {
      handlePartnerUnavailable(currentRound.RoundID);
    }
  };

  const handleConfirmLeaveEvent = () => {
    setShowLeaveModal(false);
    leaveEvent(activeEvent.EventID);
  };

  const formatMinutes = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentIcebreaker = ICEBREAKER_QUESTIONS[icebreakerIdx % ICEBREAKER_QUESTIONS.length];

  // Gating for non-Premium Plus
  if (!isEligible) {
    return (
      <div className="max-w-xl mx-auto p-8 sm:p-10 rounded-3xl bg-white border border-pink-200 shadow-xl text-center space-y-5 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-600 shadow-sm">
          <Crown className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-heading">
            Premium Plus Exclusive
          </span>
          <h2 className="text-2xl font-bold text-slate-900 font-heading mt-1">Weekend Speed Dating Locked</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Live online speed dating every Friday, Saturday, and Sunday at 7:00 PM is an exclusive privilege of the <strong>Premium Plus</strong> tier ($14.99/mo).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setCurrentView('friday')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
          >
            Back to Weekend Events
          </button>
          <button
            onClick={() => {
              setSubscriptionTier('Premium Plus');
              showNotification('Upgraded to Premium Plus ($14.99/mo)! Entering speed dating...', 'pink');
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl btn-pink-gradient font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5 fill-white" />
            Upgrade to Premium Plus ($14.99/mo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Banner Notice */}
      <div className="px-4 py-2.5 rounded-2xl bg-[#FFF0F3] border border-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#FF2E93] shrink-0" />
          <span>
            <strong>Working Demonstration Sandbox:</strong> Real video signaling is in simulation mode. 5-min rounds, private secret ballots, 2-min breaks, and consent-based Next Date operate in real time.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSessionInfoModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors cursor-pointer text-[11px]"
            title="View persistent session state and backend services checklist"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Persistent Session Active</span>
          </button>
          <span className="font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-pink-200 text-[11px]">
            {activeEvent.DayOfWeek} at {activeEvent.TimeZone}
          </span>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold transition-colors cursor-pointer text-[11px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Event</span>
          </button>
        </div>
      </div>

      {/* STAGE 1: ACTIVE 5-MINUTE VIDEO ROUND */}
      {stage === 'call' && (
        <div className="space-y-4">
          {/* Status Header */}
          <div className="p-4 rounded-3xl bg-white border border-pink-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLeaveModal(true)}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                title="Leave event"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-50 text-[#FF2E93] border border-pink-100 font-heading">
                    Round {activeRoundIndex + 1} of {eventRounds.length || 5}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-600">
                    5-Minute One-on-One Speed Date
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading mt-0.5">
                  Dating with {partner.FirstName}
                </h1>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold text-base sm:text-lg transition-colors ${
                  timeLeft < 60
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-pink-50 border-pink-200 text-[#FF2E93]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatMinutes(timeLeft)}</span>
              </div>

              <button
                onClick={enterBreakStage}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-pink-50 border border-slate-200 hover:border-pink-200 text-xs font-bold text-slate-700 hover:text-[#FF2E93] transition-colors cursor-pointer"
                title="Conclude 5-min round early to cast your ballot and take your break"
              >
                End Round & Vote
              </button>
            </div>
          </div>

          {/* Main 2-Up Video Room */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Cols: Video Stage */}
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Partner Screen (Simulated WebRTC) */}
                <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between p-4 group">
                  {/* Subtle video background gradient animation */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 opacity-90" />
                  <div
                    className="absolute inset-0 opacity-20 bg-cover bg-center blur-sm"
                    style={{ backgroundColor: partner.AvatarColor }}
                  />

                  {/* Top dater tag */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold">
                        {appMode === 'demonstration' ? 'Simulated Partner: ' : 'Consenting Member: '}
                        {partner.FirstName}, {partner.Age}
                      </span>
                      <span className="text-slate-400 text-[10px]">· {partner.Location.split(',')[0]}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {appMode === 'demonstration' && (
                        <button
                          onClick={handleSimulatePartnerUnavailable}
                          className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-white/10 cursor-pointer"
                          title="Simulate partner dropped / unavailable to test graceful recovery"
                        >
                          Simulate Drop
                        </button>
                      )}
                      <button
                        onClick={() => setReportModalTarget(partner)}
                        className="p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors"
                        title="Report partner"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Center Avatar & Status */}
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-3 my-auto">
                    <Avatar user={partner} size="xl" showBadge />
                    <div className="text-center">
                      <p className="text-white font-bold text-sm">{partner.Occupation}</p>
                      <p className="text-pink-300 text-xs italic">Looking for: {partner.Preferences.intent}</p>
                    </div>

                    {appMode === 'production' ? (
                      <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-500/30 text-amber-200 text-xs max-w-xs text-center space-y-1">
                        <div className="font-bold flex items-center justify-center gap-1 text-amber-300 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Live Video Infrastructure Offline
                        </div>
                        <p className="text-[10px] text-amber-200/80 leading-relaxed">
                          Requires a certified WebRTC SFU streaming provider (LiveKit Cloud, Twilio Video, or Agora RTC). Live peer video stream will become operational once credentials are connected.
                        </p>
                      </div>
                    ) : (
                      /* Simulated Voice Waveform */
                      <div className="flex items-center gap-1 pt-1">
                        <span className="w-1 h-3 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-5 bg-[#FF2E93] rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.4s]" />
                        <span className="w-1 h-4 bg-[#FF2E93] rounded-full animate-bounce" />
                      </div>
                    )}
                  </div>

                  {/* Bottom bar */}
                  <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
                    <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs text-[11px]">
                      {appMode === 'production' ? 'Audio Stream: Awaiting SFU' : 'Partner Audio: Simulated Active'}
                    </span>
                    <span className={`text-[10px] font-mono ${appMode === 'production' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {appMode === 'production' ? 'Production Mode' : 'HD Simulation · 60fps'}
                    </span>
                  </div>
                </div>

                {/* Self Screen (Live Camera Mirror or Avatar) */}
                <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between p-4">
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

                  {/* Self header overlay */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/10">
                      <span className="font-bold">You ({currentUser.FirstName})</span>
                      <span className="text-[10px] text-pink-300">You are live</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setMicOn(prev => !prev)}
                        className={`p-1.5 rounded-full transition-colors ${
                          micOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                        }`}
                        title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
                      >
                        {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setCameraOn(prev => !prev)}
                        className={`p-1.5 rounded-full transition-colors ${
                          cameraOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-rose-600 text-white'
                        }`}
                        title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                      >
                        {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Self bottom info */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs">
                      Self Mirror View
                    </span>
                    <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs font-mono text-[#FF2E93]">
                      Tier: {currentUser.SubscriptionTier}
                    </span>
                  </div>
                </div>

              </div>

              {/* In-Call Chemistry Spark / Icebreaker prompt */}
              <div className="p-4 rounded-3xl bg-white border border-pink-100 shadow-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#FF2E93] shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                        Conversation Spark #{icebreakerIdx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-[#FF2E93] bg-pink-50 px-2 py-0.5 rounded-full">
                        {currentIcebreaker.category}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5">
                      “{currentIcebreaker.question}”
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIcebreakerIdx(prev => prev + 1)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 shrink-0 transition-colors"
                >
                  Next Question
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Partner Profile & Private Notes */}
            <div className="lg:col-span-4 space-y-4">
              {/* Partner Quick Bio */}
              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar user={partner} size="md" showBadge />
                  <div>
                    <h3 className="font-extrabold text-slate-900 font-heading text-base">
                      {partner.FirstName} {partner.LastName}
                    </h3>
                    <p className="text-xs text-slate-500">{partner.Occupation} · {partner.Age}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-pink-50/50 p-3 rounded-2xl border border-pink-100 leading-relaxed">
                  {partner.Bio}
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-heading">
                    Shared Interests
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {partner.Interests.map(interest => {
                      const isShared = currentUser.Interests.includes(interest);
                      return (
                        <span
                          key={interest}
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                            isShared
                              ? 'bg-pink-100 text-[#FF2E93] font-bold border border-pink-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {interest} {isShared && '✨'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {partner.IcebreakerAnswer && (
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-700">Fun Fact: </span>
                    <span className="text-slate-600">{partner.IcebreakerAnswer}</span>
                  </div>
                )}
              </div>

              {/* Private In-Round Notes */}
              <div className="p-5 rounded-3xl bg-white border border-pink-100 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#FF2E93]" />
                    Private Notes (Confidential)
                  </span>
                  <span className="text-[10px] text-slate-400">Only you see this</span>
                </div>
                <textarea
                  rows={3}
                  value={privateNotes}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="Notes on energy, shared hobbies, humor, vibe..."
                  className="w-full p-3 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF2E93] focus:ring-1 focus:ring-[#FF2E93]"
                />
              </div>

              {/* Skip / Report Safety */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  onClick={handleSkipRound}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Skip to Break
                </button>
                <button
                  onClick={() => setReportModalTarget(partner)}
                  className="text-rose-500 hover:text-rose-700 flex items-center gap-1 font-semibold"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Report / Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: POST-ROUND BREAK & SECRET BALLOT (Up to 2 Minutes) */}
      {stage === 'break' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-pink-200 shadow-md space-y-6 text-center animate-in fade-in duration-200">
            
            {/* Header & Break Timer */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-bold text-[#FF2E93] uppercase tracking-wider font-heading">
                <Coffee className="w-3.5 h-3.5" />
                <span>Round {activeRoundIndex + 1} Concluded · 2-Minute Break</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                How did you feel about {partner.FirstName}?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Cast your confidential vote below. Neither dater will know the other’s choice unless it’s a mutual like!
              </p>
            </div>

            {/* Break Countdown Bar */}
            <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 text-left">
                <Clock className="w-4 h-4 text-[#FF2E93] shrink-0" />
                <div>
                  <div>Break Timer: <span className="font-mono text-[#FF2E93] text-sm">{formatMinutes(breakTimeLeft)}</span> remaining</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    {breakTimeLeft > 0 ? 'Grab water, take a breath, or write notes.' : 'Break completed! Tap Next Date when ready.'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setBreakPaused(prev => !prev)}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                {breakPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{breakPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>

            {/* Partner Snapshot */}
            <div className="flex items-center justify-center gap-4 py-2">
              <Avatar user={partner} size="lg" showBadge />
              <div className="text-left">
                <div className="font-extrabold text-slate-900 text-lg font-heading">
                  {partner.FirstName} {partner.LastName}, {partner.Age}
                </div>
                <div className="text-xs text-slate-500">{partner.Occupation} · {partner.Location}</div>
              </div>
            </div>

            {/* The Private Like or Pass Ballot */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Confidential Secret Ballot
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleDecision('pass')}
                  className={`py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedDecision === 'pass'
                      ? 'bg-slate-800 text-white shadow-md ring-2 ring-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <X className="w-5 h-5" />
                  <span>Pass</span>
                </button>

                <button
                  onClick={() => handleDecision('like')}
                  className={`py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedDecision === 'like'
                      ? 'btn-pink-gradient text-white shadow-lg shadow-pink-500/25 ring-2 ring-pink-300'
                      : 'bg-pink-50 hover:bg-pink-100 text-[#FF2E93] border border-pink-200'
                  }`}
                >
                  <Heart className="w-5 h-5 fill-current" />
                  <span>Like {partner.FirstName}</span>
                </button>
              </div>

              {selectedDecision && (
                <div className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1.5 pt-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Your choice is recorded and 100% confidential.</span>
                </div>
              )}
            </div>

            {/* Notes edit */}
            <div className="text-left space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Update Private Notes
              </label>
              <textarea
                rows={2}
                value={privateNotes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="What did you connect on? Add private memory triggers..."
                className="w-full p-3 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF2E93] focus:ring-1 focus:ring-[#FF2E93]"
              />
            </div>

            {/* Consent-Based Next Date Button */}
            <div className="pt-4 border-t border-pink-100 space-y-3">
              <button
                onClick={handleNextDateClick}
                className="w-full py-4 rounded-2xl btn-pink-gradient font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:scale-[1.01] transition-transform cursor-pointer"
              >
                <span>Next Date (I'm Ready)</span>
                <ChevronRight className="w-5 h-5" />
              </button>
              <p className="text-[11px] text-slate-400">
                We never automatically start calls without your explicit consent. Tapping Next Date places you into the waiting room.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* STAGE 3: WAITING ROOM SCREEN */}
      {stage === 'waiting_room' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-pink-200 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            
            {/* Radar matchmaking pulse */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-pink-400/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-pink-500/10 animate-pulse" />
              <div className="w-20 h-20 rounded-full btn-pink-gradient flex items-center justify-center text-white shadow-xl shadow-pink-500/30 relative z-10">
                <Radio className="w-9 h-9 animate-spin [animation-duration:8s]" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#FF2E93] font-heading">
                Speed Meet Love Waiting Room
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                {foundPartnerName ? `Found Your Next Date!` : `Matching with Your Next Date...`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                {foundPartnerName
                  ? `Paired with ${foundPartnerName}. Initializing 5-minute video round...`
                  : `Waiting for the next eligible participant to complete their break and tap Ready.`}
              </p>
            </div>

            {/* Countdown Badge if match found */}
            {waitingCountdown !== null && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-2 animate-bounce">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Starting video round in {waitingCountdown} seconds...</span>
              </div>
            )}

            {/* Waiting room controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setStage('break');
                  saveLiveSession({ stage: 'break', breakStartedAt: Date.now() });
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Pause & Take More Break</span>
              </button>

              <button
                onClick={() => {
                  // Instant pair for demonstration
                  const nextIndex = activeRoundIndex + 1;
                  if (nextIndex < eventRounds.length) {
                    const now = Date.now();
                    setActiveRoundIndex(nextIndex);
                    setStage('call');
                    setTimeLeft(defaultDuration);
                    setBreakTimeLeft(defaultBreak);
                    setSelectedDecision(null);
                    setPrivateNotes('');
                    setWaitingCountdown(null);
                    setFoundPartnerName(null);

                    const nextRound = eventRounds[nextIndex];
                    const nextPartnerId = nextRound ? (nextRound.UserA === currentUser.UserID ? nextRound.UserB : nextRound.UserA) : '';

                    saveLiveSession({
                      roundIndex: nextIndex,
                      stage: 'call',
                      roundStartedAt: now,
                      breakStartedAt: null,
                      vote: null,
                      notes: '',
                      partnerId: nextPartnerId,
                      lastActive: now,
                    });
                  } else {
                    clearLiveSession();
                    try {
                      confetti({
                        particleCount: 90,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#FF2E93', '#FF147E', '#E11D48'],
                      });
                    } catch (e) {}
                    setCurrentView('results');
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#FF2E93] border border-pink-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Connect Now (Demo)
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              You maintain full control. If a partner is excused or unavailable, our system smoothly pairs you with another attendee without penalty.
            </p>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: LEAVE EVENT */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 font-heading">
                Leave Speed Dating Session?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You can gracefully leave at any time. All private votes you’ve cast for completed rounds will remain safely saved, and any mutual matches will still unlock in your Matches tab!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Stay in Event
              </button>
              <button
                onClick={handleConfirmLeaveEvent}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Leave Gracefully
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHITECTURE & SERVICE BOUNDARY MODAL */}
      {showSessionInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-heading">
                    Session Persistence & Architecture
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-medium">Demonstration Mode + Production Checklist</span>
                </div>
              </div>
              <button
                onClick={() => setShowSessionInfoModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Currently Implemented & Active
                </div>
                <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[11px]">
                  <li><strong>Real Elapsed Wall-Clock Timers:</strong> Timers calculate true elapsed time via epoch timestamps (`roundStartedAt`), eliminating timer drift when mobile phones sleep or tabs are backgrounded.</li>
                  <li><strong>Automatic Screen Restoration:</strong> Leaving the tab or refreshing immediately restores your exact stage (active call, 2-minute break, or waiting room) rather than dumping you into the lobby.</li>
                  <li><strong>Private Ballot & Notes Persistence:</strong> Your private votes and notes are safely committed to memory, localStorage, and the Express `/api/session/:userId` store.</li>
                  <li><strong>Consent-Based Progression:</strong> Speed Meet Love never forces a video date to begin automatically. Members must tap "Next Date (I'm Ready)" when prepared.</li>
                  <li><strong>Graceful Waiting Room:</strong> If placed in the waiting room while an eligible partner finishes their break, refreshing keeps you in the queue.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Demonstration Boundaries (Production Integration Steps)
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                  <li><strong>Live Video WebRTC Infrastructure:</strong> Currently using local camera mirroring and simulated remote video streams. Production requires integrating a WebRTC Selective Forwarding Unit (SFU) service (such as LiveKit, Daily.co, Twilio Video, or Agora RTC) for peer streaming, STUN/TURN relays, and noise suppression.</li>
                  <li><strong>Production WebSocket Mesh:</strong> Real-time cross-client event synchronization currently runs via the demo server. Production deployment requires Socket.io, Ably, or Pusher clustering across load-balanced instances.</li>
                  <li><strong>Payment Gateway:</strong> Subscriptions ($9.99 Premium, $14.99 Premium Plus) are simulated with real-time tier gating. Production requires Stripe Elements & Webhooks.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowSessionInfoModal(false)}
                className="w-full py-2.5 rounded-xl btn-pink-gradient font-bold text-xs"
              >
                Close & Continue Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
