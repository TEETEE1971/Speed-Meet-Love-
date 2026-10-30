import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { LiveKitVideoStage } from './LiveKitVideoStage';
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
  const isStaging = activeEvent.EventID === 'evt_staging_dev';

  // Find rounds for active event that involve the current user
  const userEventRounds = rounds.filter(
    r => r.EventID === activeEvent.EventID && (r.UserA === currentUser.UserID || r.UserB === currentUser.UserID)
  );
  const eventRounds = userEventRounds.length > 0 ? userEventRounds : rounds.filter(r => r.EventID === activeEvent.EventID);
  const currentRound = eventRounds[activeRoundIndex] || eventRounds[0];

  const isUserA = currentRound ? currentRound.UserA === currentUser.UserID : true;
  const defaultStagingPartnerId = currentUser.UserID === 'usr_kristy' ? 'usr_me' : 'usr_kristy';
  const partnerId = currentRound
    ? (isUserA ? currentRound.UserB : currentRound.UserA)
    : (isStaging ? defaultStagingPartnerId : 'usr_02');
  const partner = users.find(u => u.UserID === partnerId) || users.find(u => u.UserID === defaultStagingPartnerId) || users[1];

  // 5-minute round (300 seconds)
  const defaultDuration = activeEvent.RoundDurationSeconds || 300;
  // 2-minute break (120 seconds)
  const defaultBreak = activeEvent.BreakDurationSeconds || 120;

  const isSessionForCurrentModeAndEvent = Boolean(
    liveSession &&
    (!liveSession.mode || liveSession.mode === appMode) &&
    liveSession.eventId === activeEvent.EventID
  );

  // Mount wall-clock timestamp reference to guarantee fresh round never prematurely triggers break
  const callMountTimeRef = useRef<number>(Date.now());

  // Reliable in-memory and storage early exit tracking
  const hasEndedEarlyRef = useRef<boolean>(false);
  const endedEarlySessionKey = `sml_ended_early_${activeEvent.EventID}_${activeRoundIndex}_${currentUser.UserID}`;
  const isLocallyEndedEarly = () => {
    if (hasEndedEarlyRef.current) return true;
    try {
      return typeof window !== 'undefined' && window.sessionStorage?.getItem(endedEarlySessionKey) === 'true';
    } catch (e) {
      return false;
    }
  };

  // Reset in-memory early exit and ballot flags when round index changes
  useEffect(() => {
    hasEndedEarlyRef.current = false;
    setVoteSaved(false);
    setSelectedDecision(null);
    setPrivateNotes('');
    setEndRoundError(null);
    setVoteError(null);
  }, [activeRoundIndex]);

  // Initialize stage from active persistent live session or default to 'call'
  const [stage, setStage] = useState<RoundStage>(() => {
    if (isLocallyEndedEarly()) {
      return 'break';
    }
    if (isSessionForCurrentModeAndEvent && liveSession?.roundIndex === activeRoundIndex) {
      if (liveSession.hasEndedEarly) {
        return 'break';
      }
      const isRecent = Boolean(liveSession.lastActive && Date.now() - liveSession.lastActive < defaultDuration * 1000);
      if (liveSession.stage === 'call') {
        const isExpired = Date.now() >= liveSession.roundStartedAt + defaultDuration * 1000;
        if (isRecent && isExpired) return 'break';
        return 'call';
      }
      if (liveSession.stage === 'break') {
        const breakExpired = Date.now() >= (liveSession.breakStartedAt || 0) + defaultBreak * 1000;
        if (isRecent && !breakExpired) return 'break';
      }
      if (liveSession.stage === 'waiting_room') {
        return 'waiting_room';
      }
    }
    return 'call';
  });

  const stageRef = useRef<RoundStage>(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Reliable state handling for End Round & Vote and Voting
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [endRoundError, setEndRoundError] = useState<string | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSaved, setVoteSaved] = useState<boolean>(false);

  // Calculate actual elapsed wall-clock time
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (isSessionForCurrentModeAndEvent && liveSession?.roundIndex === activeRoundIndex) {
      if (liveSession.stage === 'call') {
        const isRecent = Boolean(liveSession.lastActive && Date.now() - liveSession.lastActive < defaultDuration * 1000);
        if (isRecent) {
          const elapsed = Math.floor((Date.now() - liveSession.roundStartedAt) / 1000);
          if (elapsed < defaultDuration) {
            return Math.max(1, defaultDuration - elapsed);
          }
        }
      }
    }
    return defaultDuration;
  });
  const [isPaused, setIsPaused] = useState(false);

  const [breakTimeLeft, setBreakTimeLeft] = useState<number>(() => {
    if (isSessionForCurrentModeAndEvent && liveSession?.roundIndex === activeRoundIndex) {
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

  // LiveKit Server Gateway Status & Token State
  const [liveKitStatus, setLiveKitStatus] = useState<{
    configured: boolean;
    liveKitUrl: string | null;
    tokenGatewayReady: boolean;
  } | null>(null);

  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitServerUrl, setLiveKitServerUrl] = useState<string | null>(null);
  const [liveKitError, setLiveKitError] = useState<string | null>(null);
  const [isRequestingToken, setIsRequestingToken] = useState<boolean>(false);

  // Real-time floating hearts state (non-verbal expressions of interest)
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: string; x: number; emoji: string }>>([]);
  const [isSendingHeart, setIsSendingHeart] = useState(false);
  const lastHeartIdRef = useRef<string | null>(null);

  // Server-authoritative round timer reference (shared, persisted, and tamper-proof)
  const serverRoundRef = useRef<{
    roundId: string;
    roundStartedAt: number;
    roundExpiresAt: number;
    breakStartedAt: number | null;
    breakExpiresAt: number | null;
    status: 'call' | 'break' | 'completed';
  } | null>(null);

  useEffect(() => {
    fetch('/api/livekit/status')
      .then(res => res.json())
      .then(data => setLiveKitStatus(data))
      .catch(() => {});
  }, []);

  // Restore server-recorded vote for this round on mount or round index change
  useEffect(() => {
    if (!currentUser.UserID || !activeEvent.EventID) return;
    fetch(`/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/vote?userId=${currentUser.UserID}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.vote) {
          setSelectedDecision(data.vote.decision);
          setVoteSaved(true);
          if (data.vote.notes) {
            setPrivateNotes(data.vote.notes);
          }
        }
      })
      .catch(() => {});
  }, [activeEvent.EventID, activeRoundIndex, currentUser.UserID]);

  // In Production Mode, acquire secure LiveKit room token when entering call stage
  const fetchLiveKitRoomToken = useCallback(async () => {
    if (appMode !== 'production' || stage !== 'call' || !liveKitStatus?.configured) {
      return;
    }

    setIsRequestingToken(true);
    setLiveKitError(null);

    try {
      const isRegistered =
        activeEvent.ParticipantsList.includes(currentUser.UserID) ||
        activeEvent.EventID === 'evt_staging_dev';

      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          userName: currentUser.FirstName,
          userAge: currentUser.Age,
          tier: currentUser.SubscriptionTier,
          isRegistered,
          partnerId: partner.UserID,
          partnerName: partner.FirstName,
          partnerAge: partner.Age,
          eventId: activeEvent.EventID,
          eventDate: activeEvent.EventDate,
          eventStartTime: activeEvent.EventStartTime,
          eventEndTime: activeEvent.EventEndTime,
          eventType: activeEvent.EventType,
          roundIndex: activeRoundIndex,
          userConsent: true,
          partnerConsent: true,
          mode: appMode,
          isStagingTest: activeEvent.EventID === 'evt_staging_dev',
        }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        setLiveKitToken(data.token);
        setLiveKitServerUrl(data.liveKitUrl);
        setLiveKitError(null);
      } else {
        // Do NOT automatically exit the video call room on token acquisition delay or reconnection
        setLiveKitError(data.error || 'Waiting for mutual consent from partner...');
      }
    } catch (err: any) {
      setLiveKitError('LiveKit connection service error.');
    } finally {
      setIsRequestingToken(false);
    }
  }, [
    appMode,
    stage,
    liveKitStatus?.configured,
    activeEvent.EventID,
    currentUser.UserID,
    partner.UserID,
    activeRoundIndex,
  ]);

  useEffect(() => {
    fetchLiveKitRoomToken();
  }, [fetchLiveKitRoomToken]);

  const handleLiveKitDisconnect = useCallback((reason?: any) => {
    console.warn('LiveKit room disconnected in LiveRoundScreen, reason:', reason);
    if (stage !== 'call' || timeLeft <= 0) {
      setLiveKitToken(null);
      return;
    }
    // If the 5-minute round is still actively running, reconnect automatically
    showNotification('Video signal reconnecting...', 'pink');
    setTimeout(() => {
      if (stage === 'call' && timeLeft > 0) {
        fetchLiveKitRoomToken();
      }
    }, 1500);
  }, [stage, timeLeft, fetchLiveKitRoomToken, showNotification]);

  const handleLiveKitError = useCallback((err: Error) => {
    console.warn('LiveKit signal stream error caught in LiveRoundScreen:', err);
    if (stage === 'call' && timeLeft > 0) {
      setTimeout(() => {
        fetchLiveKitRoomToken();
      }, 2000);
    }
  }, [stage, timeLeft, fetchLiveKitRoomToken]);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera preview setup
  useEffect(() => {
    let isMounted = true;
    async function setupCamera() {
      // In production mode with LiveKit, release any active stream immediately so LiveKit WebRTC has exclusive hardware camera access on Android/iOS
      if (appMode === 'production' && (liveKitToken || isRequestingToken)) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        return;
      }

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && cameraOn) {
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
              localVideoRef.current.play().catch(e => console.warn('Local video play warning:', e));
            }
          } else {
            stream.getTracks().forEach(t => t.stop());
          }
        }
      } catch (e) {
        console.warn('LiveRoundScreen preview error:', e);
      }
    }

    if (isEligible) {
      setupCamera();
    }

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOn, isEligible, appMode, liveKitToken, isRequestingToken]);

  // Ensure local video element attaches preview stream when mounted
  useEffect(() => {
    if (localVideoRef.current && streamRef.current && cameraOn) {
      localVideoRef.current.srcObject = streamRef.current;
      localVideoRef.current.playsInline = true;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(e => console.warn('Local video play warning:', e));
    }
  }, [cameraOn]);

  // Synchronize server-authoritative shared round timer
  const syncServerRoundTimer = useCallback(async (createIfMissing = false) => {
    try {
      // If user has explicitly advanced to waiting room, never let round timer override it
      if (stageRef.current === 'waiting_room') {
        return null;
      }

      const partnerIdParam = partner?.UserID || '';
      const url = `/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/timer?userId=${currentUser.UserID}&partnerId=${partnerIdParam}`;
      let res = await fetch(url);

      if (!res.ok && createIfMissing) {
        res = await fetch(`/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/timer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.UserID,
            partnerId: partnerIdParam,
            roundDurationSeconds: defaultDuration,
            breakDurationSeconds: defaultBreak,
            mode: appMode,
            forceFresh: true,
          }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.round) {
          const round = data.round;
          const now = Date.now();
          const userEndedEarly = Boolean(round.userEndedEarly || isLocallyEndedEarly() || hasEndedEarlyRef.current);

          // If current user ended early or is in break, keep them in break stage strictly (never bounce back to call)
          if (userEndedEarly || round.userStage === 'break' || stageRef.current === 'break') {
            serverRoundRef.current = {
              roundId: round.roundId,
              roundStartedAt: round.roundStartedAt,
              roundExpiresAt: round.roundExpiresAt,
              breakStartedAt: round.breakStartedAt,
              breakExpiresAt: round.breakExpiresAt,
              status: round.status,
            };

            setStage('break');
            setTimeLeft(0);
            setLiveKitToken(null);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
              streamRef.current = null;
            }
            if (round.remainingBreakSeconds !== undefined) {
              setBreakTimeLeft(round.remainingBreakSeconds);
            }

            saveLiveSession({
              stage: 'break',
              roundStartedAt: round.roundStartedAt,
              breakStartedAt: round.breakStartedAt || now,
              roundDurationSeconds: round.roundDurationSeconds,
              breakDurationSeconds: round.breakDurationSeconds,
              hasEndedEarly: userEndedEarly,
              lastActive: now,
              mode: appMode,
            });
            return round;
          }

          // Active 5-minute video call in progress for this participant
          if (round.status === 'call' && !round.isExpired && !userEndedEarly) {
            serverRoundRef.current = {
              roundId: round.roundId,
              roundStartedAt: round.roundStartedAt,
              roundExpiresAt: round.roundExpiresAt,
              breakStartedAt: round.breakStartedAt,
              breakExpiresAt: round.breakExpiresAt,
              status: round.status,
            };

            if (stageRef.current === 'call') {
              setStage('call');
            }
            setTimeLeft(round.remainingSeconds);
            saveLiveSession({
              stage: 'call',
              roundStartedAt: round.roundStartedAt,
              breakStartedAt: null,
              roundDurationSeconds: round.roundDurationSeconds,
              breakDurationSeconds: round.breakDurationSeconds,
              lastActive: now,
              mode: appMode,
            });
            return round;
          }

          // Both participants moved to break when 5-minute round has expired on server
          if (round.status === 'break' || round.isExpired) {
            serverRoundRef.current = {
              roundId: round.roundId,
              roundStartedAt: round.roundStartedAt,
              roundExpiresAt: round.roundExpiresAt,
              breakStartedAt: round.breakStartedAt,
              breakExpiresAt: round.breakExpiresAt,
              status: round.status,
            };

            setStage('break');
            setTimeLeft(0);
            setLiveKitToken(null);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
              streamRef.current = null;
            }
            setBreakTimeLeft(round.remainingBreakSeconds);

            saveLiveSession({
              stage: 'break',
              roundStartedAt: round.roundStartedAt,
              breakStartedAt: round.breakStartedAt || now,
              roundDurationSeconds: round.roundDurationSeconds,
              breakDurationSeconds: round.breakDurationSeconds,
              lastActive: now,
              mode: appMode,
            });
            return round;
          }

          // If the round has completed/expired in the past, start a fresh round when requested
          if (createIfMissing) {
            const freshRes = await fetch(`/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/timer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUser.UserID,
                partnerId: partnerIdParam,
                roundDurationSeconds: defaultDuration,
                breakDurationSeconds: defaultBreak,
                mode: appMode,
                forceFresh: true,
              }),
            });
            if (freshRes.ok) {
              const freshData = await freshRes.json();
              if (freshData.success && freshData.round) {
                serverRoundRef.current = {
                  roundId: freshData.round.roundId,
                  roundStartedAt: freshData.round.roundStartedAt,
                  roundExpiresAt: freshData.round.roundExpiresAt,
                  breakStartedAt: freshData.round.breakStartedAt,
                  breakExpiresAt: freshData.round.breakExpiresAt,
                  status: freshData.round.status,
                };
                if (stageRef.current === 'call') {
                  setStage('call');
                }
                setTimeLeft(freshData.round.remainingSeconds);
                return freshData.round;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Server round timer sync failed:', err);
    }
    return null;
  }, [activeEvent.EventID, activeRoundIndex, currentUser.UserID, partner?.UserID, defaultDuration, defaultBreak, appMode, saveLiveSession]);

  // Initial synchronization upon entering round or changing index
  useEffect(() => {
    syncServerRoundTimer(true);
  }, [activeRoundIndex, activeEvent.EventID, syncServerRoundTimer]);

  // Real-Time 1-Second Wall-Clock Interval bound to server expiration timestamp
  useEffect(() => {
    if (!isEligible) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const serverRound = serverRoundRef.current;

      if (stage === 'call' && !isPaused) {
        // Authoritative expiration calculation:
        // Prioritize server expiration timestamp.
        // Fall back to clean round timer starting from callMountTimeRef so fresh calls start at 5:00.
        let expiresAt = serverRound?.roundExpiresAt;
        if (!expiresAt) {
          const isRecent = Boolean(liveSession?.roundStartedAt && (now - liveSession.roundStartedAt < defaultDuration * 1000));
          expiresAt = isRecent ? (liveSession!.roundStartedAt + defaultDuration * 1000) : (callMountTimeRef.current + defaultDuration * 1000);
        }

        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(remaining);

        // Guard: round must have been active on screen for at least 8 seconds before remaining <= 0
        // can transition to break, preventing initial mount race conditions or stale cached data
        const screenElapsedMs = now - callMountTimeRef.current;
        if (remaining <= 0 && screenElapsedMs >= 8000) {
          // Exactly 5 minutes have elapsed!
          // Server and client automatically end video round, disconnect LiveKit, and show voting screen
          setStage('break');
          setTimeLeft(0);
          setLiveKitToken(null);
          setBreakTimeLeft(defaultBreak);

          if (serverRound) {
            serverRound.status = 'break';
            serverRound.breakStartedAt = expiresAt;
            serverRound.breakExpiresAt = expiresAt + defaultBreak * 1000;
          }

          saveLiveSession({
            stage: 'break',
            breakStartedAt: expiresAt,
            lastActive: now,
            mode: appMode,
          });

          // Enforce server-side round status transition to break
          fetch(`/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/timer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.UserID,
              partnerId: partner?.UserID || '',
              action: 'end_round',
              mode: appMode,
            }),
          }).catch(() => {});

          showNotification('5-minute round concluded! Video date ended. Please cast your confidential vote.', 'pink');
        }
      } else if (stage === 'break' && !breakPaused) {
        const breakExpiresAt = serverRound?.breakExpiresAt || (liveSession?.breakStartedAt ? liveSession.breakStartedAt + defaultBreak * 1000 : now + defaultBreak * 1000);
        const remainingBreak = Math.max(0, Math.floor((breakExpiresAt - now) / 1000));
        setBreakTimeLeft(remainingBreak);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, isPaused, breakPaused, liveSession, isEligible, activeEvent.EventID, activeRoundIndex, currentUser.UserID, partner?.UserID, defaultDuration, defaultBreak, appMode, saveLiveSession, showNotification]);

  // Periodic server timer resync every 3 seconds to guarantee zero client drift across iOS & Android
  useEffect(() => {
    if (!isEligible || stage === 'waiting_room') return;

    const syncInterval = setInterval(() => {
      syncServerRoundTimer(false);
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [isEligible, stage, syncServerRoundTimer]);

  // Tab switching, browser backgrounding, and phone sleep recovery listener
  useEffect(() => {
    const handleVisibilityOrResume = () => {
      if (document.visibilityState === 'visible') {
        syncServerRoundTimer(true);
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
  }, [syncServerRoundTimer]);

  // Send real-time heart reaction to speed dating partner
  const sendHeartReaction = async () => {
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
        particleCount: 25,
        spread: 55,
        origin: { y: 0.8 },
        colors: ['#FF2E93', '#FF147E', '#E11D48'],
      });
    } catch (e) {}

    showNotification(`You sent a heart to ${partner.FirstName}! 💕`, 'pink');

    try {
      await fetch(`/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          userName: currentUser.FirstName,
          partnerId: partner.UserID,
        }),
      });
    } catch (e) {
      console.warn('Failed to send heart reaction:', e);
    } finally {
      setTimeout(() => setIsSendingHeart(false), 800);
    }
  };

  // Poll for partner's heart reactions every 2.5 seconds during live video call
  useEffect(() => {
    if (stage !== 'call' || !isEligible) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/reactions?userId=${currentUser.UserID}&partnerId=${partner.UserID}&since=${Date.now() - 4000}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.reactions)) {
            for (const rx of data.reactions) {
              if (rx.senderId !== currentUser.UserID && rx.id !== lastHeartIdRef.current) {
                lastHeartIdRef.current = rx.id;
                const emojis = ['❤️', '💖', '💕', '💓', '💗'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                const randomX = Math.floor(Math.random() * 60) + 20;

                setFloatingHearts(prev => [...prev, { id: rx.id, x: randomX, emoji: randomEmoji }]);
                setTimeout(() => {
                  setFloatingHearts(prev => prev.filter(h => h.id !== rx.id));
                }, 2400);

                showNotification(`${partner.FirstName} sent you a heart! 💕`, 'pink');
              }
            }
          }
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [stage, isEligible, activeEvent.EventID, activeRoundIndex, currentUser.UserID, partner.UserID, partner.FirstName, showNotification]);

  // Waiting room matchmaking pulse
  useEffect(() => {
    if (stage !== 'waiting_room' || !isEligible) return;

    let isMounted = true;
    const nextIndex = activeRoundIndex + 1;
    const totalEventRounds = Math.max(5, eventRounds.length);

    if (nextIndex >= totalEventRounds) {
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
      return;
    }

    const nextRound = eventRounds[nextIndex];
    const nextPartnerId = nextRound ? (nextRound.UserA === currentUser.UserID ? nextRound.UserB : nextRound.UserA) : '';
    const nextPartner = users.find(u => u.UserID === nextPartnerId);

    // Poll server matchmaking / consent
    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${activeEvent.EventID}/match-status/${currentUser.UserID}?roundIndex=${nextIndex}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'matched') {
            if (isMounted) {
              setFoundPartnerName(data.partner?.userName || nextPartner?.FirstName || 'Next Partner');
              setWaitingCountdown(3);
              clearInterval(checkInterval);
            }
            return;
          }
        }
      } catch (e) {}
    }, 2000);

    // In demo or staging after 3.5 seconds, if not matched by poll, smoothly pair with candidate
    const matchmakerTimeout = setTimeout(() => {
      if (isMounted) {
        setFoundPartnerName(nextPartner ? `${nextPartner.FirstName}, ${nextPartner.Age}` : 'Next Partner');
        setWaitingCountdown(3);
        clearInterval(checkInterval);
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(checkInterval);
      clearTimeout(matchmakerTimeout);
    };
  }, [stage, activeRoundIndex, eventRounds, isEligible, activeEvent.EventID, currentUser.UserID, users, setCurrentView, clearLiveSession]);

  // Waiting room 3-2-1 countdown into call
  useEffect(() => {
    if (waitingCountdown === null) return;
    if (waitingCountdown <= 0) {
      const nextIdx = activeRoundIndex + 1;
      setActiveRoundIndex(nextIdx);
      const now = Date.now();
      callMountTimeRef.current = now;
      hasEndedEarlyRef.current = false;
      stageRef.current = 'call';
      setStage('call');
      setTimeLeft(defaultDuration);
      setBreakTimeLeft(defaultBreak);
      setSelectedDecision(null);
      setPrivateNotes('');
      setVoteSaved(false);
      setWaitingCountdown(null);
      setFoundPartnerName(null);

      const nextRound = eventRounds[nextIdx];
      const nextPartnerId = nextRound ? (nextRound.UserA === currentUser.UserID ? nextRound.UserB : nextRound.UserA) : '';

      // Clear sessionStorage for this round
      try {
        const endedEarlyKey = `sml_ended_early_${activeEvent.EventID}_${nextIdx}_${currentUser.UserID}`;
        window.sessionStorage?.removeItem(endedEarlyKey);
      } catch (e) {}

      // Initialize fresh 5-minute round on server for this next date
      fetch(`/api/events/${activeEvent.EventID}/rounds/${nextIdx}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          partnerId: nextPartnerId,
          roundDurationSeconds: defaultDuration,
          breakDurationSeconds: defaultBreak,
          mode: appMode,
          forceFresh: true,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.round) {
            serverRoundRef.current = data.round;
            setTimeLeft(data.round.remainingSeconds);
          }
        })
        .catch(err => console.warn('Failed to start next round timer on server:', err));

      saveLiveSession({
        roundIndex: nextIdx,
        stage: 'call',
        roundStartedAt: now,
        breakStartedAt: null,
        vote: null,
        notes: '',
        partnerId: nextPartnerId,
        lastActive: now,
        hasEndedEarly: false,
      });
      return;
    }

    const timer = setTimeout(() => {
      setWaitingCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [waitingCountdown, activeRoundIndex, eventRounds, activeEvent.EventID, currentUser.UserID, defaultDuration, defaultBreak, appMode, saveLiveSession, setActiveRoundIndex]);

  // Immediately and cleanly end round early for this user and show confidential voting screen
  const handleEndRoundAndVote = async () => {
    if (isEndingRound) return;
    setIsEndingRound(true);
    setEndRoundError(null);

    const now = Date.now();
    hasEndedEarlyRef.current = true;
    stageRef.current = 'break';

    // 1. Immediately terminate audio and video hardware streams
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
        streamRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn('Error stopping local media tracks:', e);
    }
    setLiveKitToken(null);

    // 2. Immediately transition local stage to 'break' and reset round timer
    setStage('break');
    setTimeLeft(0);
    setBreakTimeLeft(defaultBreak);

    // Persist early exit state locally to prevent any reload / network race conditions
    const endedEarlyKey = `sml_ended_early_${activeEvent.EventID}_${activeRoundIndex}_${currentUser.UserID}`;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(endedEarlyKey, 'true');
      }
    } catch (e) {}

    if (serverRoundRef.current) {
      serverRoundRef.current.status = 'break';
      serverRoundRef.current.breakStartedAt = now;
      serverRoundRef.current.breakExpiresAt = now + defaultBreak * 1000;
    }

    saveLiveSession({
      stage: 'break',
      breakStartedAt: now,
      hasEndedEarly: true,
      lastActive: now,
      mode: appMode,
    });

    showNotification('Video call ended. Please cast your confidential Like or Pass vote below.', 'pink');

    // 3. Notify server endpoint /api/events/:eventId/rounds/:roundIndex/end-early
    try {
      const res = await fetch(`/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/end-early`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          partnerId: partner?.UserID || '',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.remainingBreakSeconds !== undefined) {
        setBreakTimeLeft(data.remainingBreakSeconds);
      }
    } catch (err: any) {
      console.warn('Server early end sync failed:', err);
      setEndRoundError(err.message || 'Server sync error. Your voting ballot is safely active.');
    } finally {
      setIsEndingRound(false);
    }
  };

  const enterBreakStage = () => {
    handleEndRoundAndVote();
  };

  const handleDecision = async (decision: 'like' | 'pass') => {
    if (isSubmittingVote) return;
    setIsSubmittingVote(true);
    setVoteError(null);
    setSelectedDecision(decision);

    try {
      // 1. Submit to context store
      if (currentRound) {
        submitRoundDecision(currentRound.RoundID, decision === 'like', privateNotes);
      }
      saveLiveSession({ vote: decision, notes: privateNotes, votedAt: Date.now() });

      // 2. Submit to server-authoritative voting endpoint (idempotent: 1 vote per user per round)
      const res = await fetch(`/api/events/${activeEvent.EventID}/rounds/${activeRoundIndex}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.UserID,
          partnerId: partner.UserID,
          decision,
          notes: privateNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to record vote (HTTP ${res.status})`);
      }

      const data = await res.json();
      setVoteSaved(true);

      if (decision === 'like') {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#FF2E93', '#FFE600'],
          });
        } catch (e) {}

        if (data.isMutualMatch) {
          showNotification(`It's a Mutual Match with ${partner.FirstName}! Mutual likes unlock messaging in Matches. ❤️⚡`, 'pink');
        } else {
          showNotification(`You liked ${partner.FirstName}! Mutual likes unlock messaging in Matches.`, 'pink');
        }
      } else {
        showNotification(`Pass recorded privately. Your choices remain strictly confidential.`, 'info');
      }
    } catch (err: any) {
      console.warn('Failed to submit confidential vote:', err);
      setVoteError(err.message || 'Failed to record vote. Please tap Retry.');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleNotesChange = (text: string) => {
    setPrivateNotes(text);
    if (currentRound) {
      submitRoundDecision(currentRound.RoundID, selectedDecision === 'like', text);
    }
    saveLiveSession({ notes: text });
  };

  const handleNextDateClick = async () => {
    // If not voted yet, default to pass
    if (selectedDecision === null && currentRound) {
      submitRoundDecision(currentRound.RoundID, false, privateNotes);
      saveLiveSession({ vote: 'pass', notes: privateNotes });
    }

    const nextIndex = activeRoundIndex + 1;
    const totalEventRounds = Math.max(5, eventRounds.length);

    if (nextIndex < totalEventRounds) {
      hasEndedEarlyRef.current = false;
      stageRef.current = 'waiting_room';
      setStage('waiting_room');
      setSelectedDecision(null);
      setPrivateNotes('');
      setVoteSaved(false);
      serverRoundRef.current = null;
      setWaitingCountdown(null);
      setFoundPartnerName(null);

      const nextRound = eventRounds[nextIndex];
      const nextPartnerId = nextRound ? (nextRound.UserA === currentUser.UserID ? nextRound.UserB : nextRound.UserA) : '';

      try {
        const nextEndedEarlyKey = `sml_ended_early_${activeEvent.EventID}_${nextIndex}_${currentUser.UserID}`;
        window.sessionStorage?.removeItem(nextEndedEarlyKey);
      } catch (e) {}

      saveLiveSession({
        roundIndex: activeRoundIndex,
        stage: 'waiting_room',
        vote: null,
        notes: '',
        hasEndedEarly: false,
      });

      showNotification("Waiting for your next date...", 'info');

      // Register readiness with server
      try {
        await fetch(`/api/events/${activeEvent.EventID}/consent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.UserID,
            partnerId: nextPartnerId,
            roundIndex: nextIndex,
            isReady: true,
          }),
        });

        await fetch(`/api/events/${activeEvent.EventID}/matchmaking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.UserID,
            userName: currentUser.FirstName,
            userAge: currentUser.Age,
            gender: currentUser.Gender,
            interestedIn: currentUser.InterestedIn,
            tier: currentUser.SubscriptionTier,
            isRegistered: true,
            roundIndex: nextIndex,
            isReady: true,
            eventId: activeEvent.EventID,
          }),
        });
      } catch (e) {
        console.warn('Readiness sync warning:', e);
      }
    } else {
      // Completed all 5 rounds!
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
      showNotification('Congratulations on completing all 5 speed dating rounds! Revealing your mutual matches...', 'pink');
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
      <div className={`px-4 py-2.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
        appMode === 'demonstration'
          ? 'bg-purple-50/80 border-purple-200 text-purple-900'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 shrink-0 ${appMode === 'demonstration' ? 'text-purple-600' : 'text-emerald-600'}`} />
          <span>
            {appMode === 'demonstration' ? (
              <>
                <strong>Simulated Demonstration Sandbox:</strong> Real video signaling is in simulation mode. 5-min rounds, private secret ballots, 2-min breaks, and consent-based Next Date operate in real time with simulated partner audio.
              </>
            ) : (
              <>
                <strong>Live Production Speed Dating:</strong> Real consenting members connected via LiveKit WebRTC SFU. End-to-end encrypted video, 5-min speed date rounds, and mutual consent Next Date matching.
              </>
            )}
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

            {/* Countdown Clock & Live Reaction Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border font-mono font-black text-base sm:text-lg transition-colors shadow-2xs ${
                  timeLeft < 60
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-pink-50 border-pink-200 text-[#FF2E93]'
                }`}
                title="Shared server-authoritative 5-minute round timer"
              >
                <Clock className="w-4 h-4 text-[#FF2E93]" />
                <span className="tracking-tight">{formatMinutes(timeLeft)}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Server Synced Timer" />
              </div>

              {/* Real-time Heart Reaction Button */}
              <button
                onClick={sendHeartReaction}
                disabled={isSendingHeart}
                className="px-3 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
                title="Send a real-time heart reaction to express interest non-verbally"
              >
                <Heart className="w-4 h-4 fill-white" />
                <span className="hidden sm:inline">Send Heart</span>
              </button>

              {/* End Round & Vote Button with loading spinner and clear active click feedback */}
              <button
                type="button"
                onClick={handleEndRoundAndVote}
                disabled={isEndingRound}
                className="px-3.5 sm:px-4 py-2 min-h-[42px] rounded-2xl bg-white hover:bg-pink-50 active:bg-pink-100 border-2 border-pink-300 text-xs font-black text-[#FF2E93] transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                title="Immediately end your video session and cast your confidential vote"
              >
                {isEndingRound ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#FF2E93] border-t-transparent rounded-full animate-spin" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <>
                    <FastForward className="w-3.5 h-3.5 fill-current" />
                    <span>End Round & Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main 2-Up Video Room */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Cols: Video Stage */}
            <div className="lg:col-span-8 space-y-4 relative">
              {/* Real-time floating hearts overlay */}
              {floatingHearts.length > 0 && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
                  {floatingHearts.map(h => (
                    <div
                      key={h.id}
                      className="absolute bottom-16 animate-float-heart select-none text-4xl drop-shadow-lg"
                      style={{ left: `${h.x}%` }}
                    >
                      {h.emoji}
                    </div>
                  ))}
                </div>
              )}
              {appMode === 'production' && liveKitToken && liveKitServerUrl ? (
                <LiveKitVideoStage
                  token={liveKitToken}
                  serverUrl={liveKitServerUrl}
                  partner={partner}
                  currentUser={currentUser}
                  cameraOn={cameraOn}
                  micOn={micOn}
                  onDisconnect={handleLiveKitDisconnect}
                  onError={handleLiveKitError}
                  onReconnectRequest={fetchLiveKitRoomToken}
                  onToggleMic={() => setMicOn(prev => !prev)}
                  onToggleCamera={() => setCameraOn(prev => !prev)}
                  onReportPartner={() => setReportModalTarget(partner)}
                  appMode={appMode}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Partner Screen (Simulated WebRTC or Connection Standby) */}
                  <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between p-4 group">
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
                        <p className="text-white font-bold text-sm">{partner.FirstName}, {partner.Age}</p>
                        <p className="text-pink-300 text-xs italic">{partner.Occupation}</p>
                      </div>

                      {appMode === 'production' ? (
                        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-pink-500/30 text-white text-xs max-w-xs text-center space-y-2">
                          <div className="font-bold flex items-center justify-center gap-1.5 text-pink-400 text-[11px]">
                            <Radio className="w-3.5 h-3.5 animate-pulse text-[#FF2E93]" />
                            <span>
                              {isRequestingToken
                                ? 'Connecting to LiveKit SFU...'
                                : liveKitError
                                ? 'LiveKit Token Standby'
                                : 'Ready to Connect LiveKit'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300 space-y-1 text-left bg-slate-900/80 p-2 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Endpoint:</span>
                              <span className="font-mono text-pink-300">/api/livekit/token</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Mutual Consent:</span>
                              <span className="text-emerald-400 font-bold">Enforced (Next Date)</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Status:</span>
                              <span className="text-amber-400 font-bold">
                                {liveKitError || 'Acquiring token...'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setIsRequestingToken(true);
                              setLiveKitError(null);
                              fetch('/api/livekit/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: currentUser.UserID,
                                  userName: currentUser.FirstName,
                                  userAge: currentUser.Age,
                                  tier: currentUser.SubscriptionTier,
                                  isRegistered: true,
                                  partnerId: partner.UserID,
                                  partnerName: partner.FirstName,
                                  partnerAge: partner.Age,
                                  eventId: activeEvent.EventID,
                                  eventDate: activeEvent.EventDate,
                                  eventStartTime: activeEvent.EventStartTime,
                                  eventEndTime: activeEvent.EventEndTime,
                                  eventType: activeEvent.EventType,
                                  roundIndex: activeRoundIndex,
                                  userConsent: true,
                                  partnerConsent: true,
                                  mode: appMode,
                                  isStagingTest: activeEvent.EventID === 'evt_staging_dev',
                                }),
                              })
                                .then(r => r.json())
                                .then(d => {
                                  if (d.success && d.token) {
                                    setLiveKitToken(d.token);
                                    setLiveKitServerUrl(d.liveKitUrl);
                                  } else {
                                    setLiveKitError(d.error || 'Waiting for mutual consent from partner.');
                                  }
                                })
                                .catch(() => setLiveKitError('Connection check failed.'))
                                .finally(() => setIsRequestingToken(false));
                            }}
                            className="w-full py-1.5 rounded-lg btn-pink-gradient font-bold text-[10px] cursor-pointer"
                          >
                            Connect / Retry LiveKit Video
                          </button>
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
                        {appMode === 'production'
                          ? liveKitToken
                            ? 'LiveKit SFU: Streaming Active'
                            : 'LiveKit SFU: Ready (Standby)'
                          : 'Partner Audio: Simulated Active'}
                      </span>
                      <span className={`text-[10px] font-mono ${appMode === 'production' ? 'text-pink-400' : 'text-emerald-400'}`}>
                        {appMode === 'production' ? 'LiveKit Gateway' : 'HD Simulation · 60fps'}
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
                        <span className="text-[10px] text-pink-300">Local Camera Preview</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setMicOn(prev => !prev);
                            if (!micOn) {
                              showNotification('Microphone unmuted. Video session continues active.', 'pink');
                            }
                          }}
                          className={`px-2 py-1 rounded-full transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                            micOn ? 'bg-slate-900/80 text-white hover:bg-slate-800' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                          }`}
                          title={micOn ? 'Mute Microphone' : 'Unmute / Retry Microphone'}
                        >
                          {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                          {!micOn && <span>Retry Mic</span>}
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

                    {/* Self bottom info */}
                    <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300">
                      <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs flex items-center gap-1">
                        <span>Mic: {micOn ? 'Active' : 'Muted'}</span>
                        {!micOn && (
                          <button
                            onClick={() => setMicOn(true)}
                            className="ml-1 text-[10px] text-pink-300 underline font-bold cursor-pointer hover:text-white"
                          >
                            Retry
                          </button>
                        )}
                      </span>
                      <span className="bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-xs font-mono text-[#FF2E93]">
                        Tier: {currentUser.SubscriptionTier}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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

              {/* Skip / Report Safety & End Round Controls */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleEndRoundAndVote}
                  disabled={isEndingRound}
                  className="text-[#FF2E93] hover:text-rose-700 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5 fill-current" />
                  <span>{isEndingRound ? 'Ending...' : 'End Round & Vote'}</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSkipRound}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>Skip to Break</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportModalTarget(partner)}
                    className="text-rose-500 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>
                </div>
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

            {/* Error notifications with immediate retry options */}
            {endRoundError && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{endRoundError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleEndRoundAndVote}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-[11px] shrink-0 cursor-pointer shadow-xs"
                >
                  Retry Sync
                </button>
              </div>
            )}

            {voteError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{voteError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => selectedDecision && handleDecision(selectedDecision)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl text-[11px] shrink-0 cursor-pointer shadow-xs"
                >
                  Retry Vote
                </button>
              </div>
            )}

            {/* The Private Like or Pass Ballot */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Confidential Secret Ballot
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={isSubmittingVote}
                  onClick={() => handleDecision('pass')}
                  className={`py-4 px-6 min-h-[52px] rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    selectedDecision === 'pass'
                      ? 'bg-slate-800 text-white shadow-md ring-4 ring-slate-400 scale-[1.02]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 active:scale-98'
                  }`}
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                  <span>{isSubmittingVote && selectedDecision === 'pass' ? 'Saving...' : 'Pass'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingVote}
                  onClick={() => handleDecision('like')}
                  className={`py-4 px-6 min-h-[52px] rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    selectedDecision === 'like'
                      ? 'btn-pink-gradient text-white shadow-lg shadow-pink-500/30 ring-4 ring-pink-300 scale-[1.02]'
                      : 'bg-pink-50 hover:bg-pink-100 text-[#FF2E93] border-2 border-pink-300 active:scale-98'
                  }`}
                >
                  <Heart className="w-5 h-5 fill-current" />
                  <span>{isSubmittingVote && selectedDecision === 'like' ? 'Saving...' : `Like ${partner.FirstName}`}</span>
                </button>
              </div>

              {(selectedDecision || voteSaved) && (
                <div className="text-xs text-emerald-700 font-bold flex items-center justify-center gap-1.5 pt-1.5 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your confidential choice is securely recorded. Neither dater sees this unless it's a mutual match!</span>
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextDateClick();
                }}
                className="w-full py-4 rounded-2xl btn-pink-gradient font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:scale-[1.01] active:scale-98 transition-transform cursor-pointer"
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
