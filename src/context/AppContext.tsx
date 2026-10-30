import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, SpeedEvent, Round, Match, Message, SubscriptionTier, EventType, UserReport, AppView, LiveSessionState, AppMode, UserPreferences, SecondDateSession } from '../types';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_ROUNDS, INITIAL_MATCHES, INITIAL_MESSAGES } from '../data/initialData';

export type { AppView, LiveSessionState, AppMode, SecondDateSession };

// Calculate exact epoch ms in America/New_York (handles DST automatically)
export function getEpochMsInEasternTime(dateStr: string, timeStr = '19:00'): number {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    let epoch = Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0);

    for (let iter = 0; iter < 4; iter++) {
      const d = new Date(epoch);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(d);
      const pMap: Record<string, number> = {};
      for (const p of parts) {
        if (p.type !== 'literal') pMap[p.type] = Number(p.value);
      }
      const diffMinutes =
        (pMap.year - year) * 525600 +
        (pMap.month - month) * 43200 +
        (pMap.day - day) * 1440 +
        (pMap.hour - hours) * 60 +
        (pMap.minute - minutes);
      if (diffMinutes === 0) break;
      epoch -= diffMinutes * 60 * 1000;
    }
    return epoch;
  } catch (err) {
    return Date.parse(`${dateStr}T${timeStr}:00-04:00`) || Date.now();
  }
}

interface AppContextType {
  currentUser: User;
  users: User[];
  events: SpeedEvent[];
  rounds: Round[];
  matches: Match[];
  messages: Message[];
  blockedUserIds: string[];
  reports: UserReport[];
  currentView: AppView;
  selectedEventId: string;
  selectedMatchId: string | null;
  activeRoundIndex: number;
  liveSession: LiveSessionState | null;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  serverTimeOffset: number;
  serverTimeFormattedET: string;
  simulatedLiveEvents: string[];
  toggleSimulateLiveEvent: (eventId: string, enable: boolean) => Promise<void>;
  isEventLive: (event: SpeedEvent) => boolean;
  canEnterVideoRound: (event: SpeedEvent) => { allowed: boolean; reason?: string };
  getTimeUntilEventStartMs: (event: SpeedEvent) => number;
  notification: { message: string; type: 'success' | 'info' | 'pink' } | null;
  reportModalTarget: User | null;
  setReportModalTarget: (user: User | null) => void;
  setCurrentView: (view: AppView) => void;
  setSelectedEventId: (id: string) => void;
  setSelectedMatchId: (id: string | null) => void;
  setActiveRoundIndex: (index: number) => void;
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  updateUserProfile: (updated: Partial<User>) => void;
  updateAnyUser: (userId: string, updated: Partial<User>) => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  likeProfile: (targetUserId: string) => { isMatch: boolean; partner?: User };
  passProfile: (targetUserId: string) => void;
  blockUser: (targetUserId: string) => void;
  unblockUser: (targetUserId: string) => void;
  reportUser: (
    targetUserId: string,
    reason: UserReport['Reason'],
    notes: string,
    alsoBlock: boolean
  ) => void;
  addEvent: (
    event: Omit<SpeedEvent, 'EventID' | 'ParticipantsList' | 'RoundsGenerated' | 'EventStatus'>
  ) => SpeedEvent;
  registerForEvent: (eventId: string) => { success: boolean; message: string };
  registerForMultipleEvents: (eventIds: string[]) => { registeredCount: number; message: string };
  leaveEvent: (eventId: string) => void;
  startEventLive: (eventId: string) => boolean;
  generateRoundsForEvent: (eventId: string) => Round[];
  submitRoundDecision: (roundId: string, like: boolean, notes: string) => { isMatch: boolean; partner?: User };
  handlePartnerUnavailable: (roundId: string) => { newPartner?: User; success: boolean };
  skipRound: (roundId: string) => { success: boolean; message: string };
  requestReplay: (roundId: string) => { success: boolean; message: string };
  sendMessage: (matchId: string, text: string) => { success: boolean; reason?: string };
  resetDemoData: () => void;
  clearNotification: () => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'pink') => void;
  canAccessLiveSpeedDating: (user?: User) => boolean;
  canAccessMessaging: (match: Match) => { allowed: boolean; reason?: string };
  upgradeOtherUser: (userId: string, tier: SubscriptionTier) => void;
  updateUserPreferences: (userId: string, prefs: Partial<UserPreferences>) => void;
  saveLiveSession: (session: Partial<LiveSessionState>) => void;
  clearLiveSession: () => void;
  syncLiveSessionFromServer: () => Promise<LiveSessionState | null>;
  activeSecondDateSession: SecondDateSession | null;
  setActiveSecondDateSession: (session: SecondDateSession | null) => void;
  secondDateSessions: SecondDateSession[];
  requestSecondDate: (
    partnerId: string,
    matchId?: string,
    simulatePartnerConsent?: boolean
  ) => Promise<{ success: boolean; session?: SecondDateSession; error?: string }>;
  respondToSecondDate: (
    sessionId: string,
    action: 'accept' | 'decline' | 'save_and_chat'
  ) => Promise<{ success: boolean; session?: SecondDateSession }>;
  startSecondDate: (
    sessionId: string
  ) => Promise<{ success: boolean; session?: SecondDateSession; error?: string }>;
  endSecondDate: (sessionId: string) => Promise<{ success: boolean }>;
  refreshSecondDateSessions: () => Promise<SecondDateSession[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'sml_brand_v6_';

const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Safari private browsing or storage access blocked
    }
    return memoryStore[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      // Safari quota exceeded or private browsing
    }
    memoryStore[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    delete memoryStore[key];
  },
};

// Module-level safe storage wrapper that prevents Safari crashes
const localStorage = safeStorage;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = parsed.map((u: User) => {
            const initialMatch = INITIAL_USERS.find(iu => iu.UserID === u.UserID);
            return {
              ...(initialMatch || {}),
              ...u,
              Age: u.UserID === 'usr_kristy' ? (u.Age && u.Age >= 18 ? u.Age : 28) : u.Age,
              SubscriptionTier: u.UserID === 'usr_kristy' ? ('Premium Plus' as SubscriptionTier) : u.SubscriptionTier,
              Preferences: {
                ...(initialMatch?.Preferences || {}),
                ...(u.Preferences || {}),
              },
              PrivacySettings: {
                ...(initialMatch?.PrivacySettings || {
                  showHeight: true,
                  showSmoking: true,
                  showDrinking: true,
                  showChildren: true,
                  shareLocation: true,
                }),
                ...(u.PrivacySettings || {}),
              },
            };
          });
          const existingIds = new Set(updated.map((u: User) => u.UserID));
          const missingUsers = INITIAL_USERS.filter(iu => !existingIds.has(iu.UserID));
          return [...updated, ...missingUsers];
        }
      } catch (e) {}
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`);
    if (saved) return saved;
    return 'usr_kristy';
  });

  const [events, setEvents] = useState<SpeedEvent[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}events`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].DayOfWeek) {
          // Always ensure new INITIAL_EVENTS (such as evt_staging_dev) are merged into cached events
          const existingIds = new Set(parsed.map((e: SpeedEvent) => e.EventID));
          const missing = INITIAL_EVENTS.filter(e => !existingIds.has(e.EventID));
          if (missing.length > 0) {
            const merged = [...parsed, ...missing];
            localStorage.setItem(`${STORAGE_KEY_PREFIX}events`, JSON.stringify(merged));
            return merged;
          }
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_EVENTS;
  });

  const [rounds, setRounds] = useState<Round[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}rounds`);
    return saved ? JSON.parse(saved) : INITIAL_ROUNDS;
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}matches`);
    return saved ? JSON.parse(saved) : INITIAL_MATCHES;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}messages`);
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}blocked`);
    return saved ? JSON.parse(saved) : [];
  });

  const [reports, setReports] = useState<UserReport[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reports`);
    return saved ? JSON.parse(saved) : [];
  });

  // Track likes given by users: Map user -> string[] of targetUserIds
  const [likesMap, setLikesMap] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}likes`);
    return saved
      ? JSON.parse(saved)
      : {
          usr_me: ['usr_02', 'usr_03'], // Sarah & Elena
          usr_02: ['usr_me'],
          usr_03: ['usr_me'],
          usr_04: ['usr_me'], // Maya likes Alex
          usr_05: [],
          usr_06: [],
        };
  });

  // Helper: mode-scoped session key so demo sandbox and production never interfere
  const getSessionStorageKey = (mode: AppMode, userId: string) =>
    `${STORAGE_KEY_PREFIX}session_${mode}_${userId}`;

  // Application Mode: Demonstration Mode (Testing sandbox) vs Production Mode (Real consenting members)
  const [appMode, setAppModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`);
    return (saved as AppMode) || 'demonstration';
  });

  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    const initialMode = (localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) as AppMode) || 'demonstration';
    const initialUserId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`) || 'usr_kristy';
    const savedSession = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
    if (savedSession) {
      try {
        const parsed: LiveSessionState = JSON.parse(savedSession);
        if (parsed.mode === initialMode && parsed.currentView === 'live') return 'live';
      } catch (e) {}
    }
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}currentView_${initialMode}`);
    return (saved as AppView) || 'home';
  });

  const [selectedEventId, setSelectedEventIdState] = useState<string>(() => {
    const initialMode = (localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) as AppMode) || 'demonstration';
    const initialUserId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`) || 'usr_kristy';
    const savedSession = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
    if (savedSession) {
      try {
        const parsed: LiveSessionState = JSON.parse(savedSession);
        if (parsed.mode === initialMode && parsed.eventId) return parsed.eventId;
      } catch (e) {}
    }
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}selectedEventId_${initialMode}`);
    if (saved) return saved;
    return initialMode === 'production' ? 'evt_staging_dev' : 'evt_live_now';
  });

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const [activeRoundIndex, setActiveRoundIndexState] = useState<number>(() => {
    const initialMode = (localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) as AppMode) || 'demonstration';
    const initialUserId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`) || 'usr_kristy';
    const savedSession = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
    if (savedSession) {
      try {
        const parsed: LiveSessionState = JSON.parse(savedSession);
        if (parsed.mode === initialMode && typeof parsed.roundIndex === 'number') return parsed.roundIndex;
      } catch (e) {}
    }
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}activeRoundIndex_${initialMode}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [liveSession, setLiveSessionState] = useState<LiveSessionState | null>(() => {
    const initialMode = (localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) as AppMode) || 'demonstration';
    const initialUserId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`) || 'usr_kristy';
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
    if (saved) {
      try {
        const parsed: LiveSessionState = JSON.parse(saved);
        if (parsed.mode === initialMode) return parsed;
      } catch (e) {}
    }
    return null;
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'pink' } | null>(null);
  const [reportModalTarget, setReportModalTarget] = useState<User | null>(null);
  const [activeSecondDateSession, setActiveSecondDateSession] = useState<SecondDateSession | null>(null);
  const [secondDateSessions, setSecondDateSessions] = useState<SecondDateSession[]>([]);

  const setAppMode = (mode: AppMode) => {
    const prevMode = appMode;
    setAppModeState(mode);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, mode);

    // Save current liveSession to previous mode's storage
    if (liveSession) {
      localStorage.setItem(
        getSessionStorageKey(prevMode, currentUserId),
        JSON.stringify({ ...liveSession, mode: prevMode })
      );
    }

    // Retrieve the target mode's session
    const targetSessionRaw = localStorage.getItem(getSessionStorageKey(mode, currentUserId));
    let targetSession: LiveSessionState | null = null;
    if (targetSessionRaw) {
      try {
        const parsed = JSON.parse(targetSessionRaw);
        if (parsed.mode === mode) {
          targetSession = parsed;
        }
      } catch (e) {}
    }

    setLiveSessionState(targetSession);

    // If switching to production mode, ensure we are not in an old demo date with Sarah
    if (mode === 'production') {
      if (selectedEventId === 'evt_live_now') {
        setSelectedEventIdState('evt_staging_dev');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}selectedEventId_production`, 'evt_staging_dev');
      }
      if (currentView === 'live' && (!targetSession || targetSession.eventId === 'evt_live_now')) {
        setCurrentViewState('lobby');
        localStorage.setItem(`${STORAGE_KEY_PREFIX}currentView_production`, 'lobby');
      }
    } else {
      if (selectedEventId === 'evt_staging_dev') {
        setSelectedEventIdState('evt_live_now');
      }
    }

    showNotification(
      mode === 'demonstration'
        ? 'Switched to Demonstration Mode (Sandbox Testing).'
        : 'Switched to Production Mode (Live Speed Dating). Real consenting members only.',
      'pink'
    );
  };

  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [serverTimeFormattedET, setServerTimeFormattedET] = useState<string>('');
  const [simulatedLiveEvents, setSimulatedLiveEvents] = useState<string[]>([]);

  // Sync server-validated time & schedule periodically
  useEffect(() => {
    let isMounted = true;
    const syncServerTime = async () => {
      try {
        const res = await fetch('/api/time');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.serverTime === 'number') {
            const offset = data.serverTime - Date.now();
            setServerTimeOffset(offset);
            if (data.serverTimeFormattedET) {
              setServerTimeFormattedET(data.serverTimeFormattedET);
            }
          }
        }
      } catch (e) {}

      try {
        const schedRes = await fetch('/api/events/schedule');
        if (schedRes.ok) {
          const schedData = await schedRes.json();
          if (isMounted && Array.isArray(schedData.simulatedLiveEvents)) {
            setSimulatedLiveEvents(schedData.simulatedLiveEvents);
          }
        }
      } catch (e) {}
    };

    syncServerTime();
    const interval = setInterval(syncServerTime, 10000); // Poll every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const toggleSimulateLiveEvent = async (eventId: string, enable: boolean) => {
    try {
      const res = await fetch(`/api/events/${eventId}/simulate-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedLiveEvents(data.simulatedLiveEvents || []);
        showNotification(
          enable
            ? 'Demonstration: 7:00 PM start simulated! Video matchmaking unlocked for testing.'
            : 'Demonstration simulation stopped. Reverted to upcoming schedule.',
          'pink'
        );
      }
    } catch (e) {
      setSimulatedLiveEvents(prev => enable ? [...new Set([...prev, eventId])] : prev.filter(id => id !== eventId));
    }
  };

  const getTimeUntilEventStartMs = (event: SpeedEvent): number => {
    const serverNow = Date.now() + serverTimeOffset;
    const startMs = getEpochMsInEasternTime(event.EventDate, event.EventStartTime || '19:00');
    return Math.max(0, startMs - serverNow);
  };

  const isEventLive = (event: SpeedEvent): boolean => {
    // Authorized developer staging test is available on-demand for verified test accounts
    if (event.EventID === 'evt_staging_dev') {
      return ['usr_kristy', 'usr_me', 'usr_01', 'usr_02', 'usr_03'].includes(currentUser.UserID);
    }

    const serverNow = Date.now() + serverTimeOffset;
    const startMs = getEpochMsInEasternTime(event.EventDate, event.EventStartTime || '19:00');
    const endMs = getEpochMsInEasternTime(event.EventDate, event.EventEndTime || '20:15');

    if (appMode === 'demonstration' && simulatedLiveEvents.includes(event.EventID)) {
      return true;
    }

    // Must be server-validated within America/New_York scheduled window (7:00 PM to 8:15 PM)
    return serverNow >= startMs && serverNow <= endMs;
  };

  const canEnterVideoRound = (event: SpeedEvent): { allowed: boolean; reason?: string } => {
    if (!canAccessLiveSpeedDating(currentUser)) {
      return {
        allowed: false,
        reason: 'Weekend Speed Dating requires a Premium Plus membership ($14.99/mo). Upgrade to join!',
      };
    }

    if (!event.ParticipantsList.includes(currentUser.UserID)) {
      return {
        allowed: false,
        reason: `Please register for ${event.EventName} before entering active video rounds.`,
      };
    }

    const live = isEventLive(event);
    if (!live) {
      return {
        allowed: false,
        reason: `Event has not started yet. ${event.DayOfWeek} speed dating begins at 7:00 PM Eastern Time. You may enter the Waiting Room.`,
      };
    }

    return { allowed: true };
  };

  // Sync mutual matches with server-authoritative store
  useEffect(() => {
    let isMounted = true;
    const fetchServerMatches = async () => {
      try {
        const res = await fetch(`/api/matches?userId=${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.matches)) {
            const serverMatches: Match[] = data.matches.map((sm: any) => ({
              MatchID: sm.matchId,
              UserA: sm.userA,
              UserB: sm.userB,
              EventID: sm.eventId,
              Timestamp: sm.timestamp,
              ChatUnlocked: Boolean(sm.chatUnlocked),
              ChemistryScore: sm.chemistryScore || 90,
              MutualInterests: sm.mutualInterests || ['Speed Date Spark'],
              SparkNote: sm.sparkNote || 'Mutual attraction confirmed!',
            }));

            setMatches(prev => {
              const combined = [...prev];
              for (const sm of serverMatches) {
                const exists = combined.some(
                  m =>
                    (m.UserA === sm.UserA && m.UserB === sm.UserB) ||
                    (m.UserA === sm.UserB && m.UserB === sm.UserA)
                );
                if (!exists) {
                  combined.unshift(sm);
                }
              }
              return combined;
            });
          }
        }
      } catch (e) {
        console.warn('Failed to sync server matches:', e);
      }
    };

    fetchServerMatches();
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  // Persistence
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}events`, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}rounds`, JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}matches`, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}messages`, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}blocked`, JSON.stringify(blockedUserIds));
  }, [blockedUserIds]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reports`, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}likes`, JSON.stringify(likesMap));
  }, [likesMap]);

  const currentUser = users.find(u => u.UserID === currentUserId) || users[0];

  const setCurrentView = (view: AppView) => {
    setCurrentViewState(view);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}currentView_${appMode}`, view);
    if (liveSession && liveSession.mode === appMode) {
      saveLiveSession({ currentView: view });
    }
  };

  const setSelectedEventId = (id: string) => {
    setSelectedEventIdState(id);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}selectedEventId_${appMode}`, id);
    if (liveSession && liveSession.mode === appMode) {
      saveLiveSession({ eventId: id });
    }
  };

  const setActiveRoundIndex = (index: number) => {
    setActiveRoundIndexState(index);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}activeRoundIndex_${appMode}`, index.toString());
    if (liveSession && liveSession.mode === appMode) {
      saveLiveSession({ roundIndex: index });
    }
  };

  const saveLiveSession = useCallback((partial: Partial<LiveSessionState>) => {
    setLiveSessionState(prev => {
      const base: LiveSessionState = prev || {
        userId: currentUser.UserID,
        eventId: selectedEventId,
        roundIndex: activeRoundIndex,
        stage: 'call',
        roundStartedAt: Date.now(),
        breakStartedAt: null,
        roundDurationSeconds: 300,
        breakDurationSeconds: 120,
        vote: null,
        notes: '',
        partnerId: '',
        currentView: 'live',
        lastActive: Date.now(),
        mode: appMode,
      };

      const updated: LiveSessionState = {
        ...base,
        ...partial,
        userId: currentUser.UserID,
        lastActive: Date.now(),
        mode: appMode,
      };

      localStorage.setItem(getSessionStorageKey(appMode, currentUser.UserID), JSON.stringify(updated));

      fetch(`/api/session/${currentUser.UserID}?mode=${appMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(err => {
        console.warn('Server session sync offline fallback:', err);
      });

      return updated;
    });
  }, [currentUser.UserID, selectedEventId, activeRoundIndex, appMode]);

  const clearLiveSession = () => {
    setLiveSessionState(null);
    localStorage.removeItem(getSessionStorageKey(appMode, currentUser.UserID));
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}active_live_session`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}session_${currentUser.UserID}`);
    fetch(`/api/session/${currentUser.UserID}?mode=${appMode}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const syncLiveSessionFromServer = async (): Promise<LiveSessionState | null> => {
    try {
      const res = await fetch(`/api/session/${currentUser.UserID}?mode=${appMode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          const session = data.session as LiveSessionState;
          if (session.mode === appMode) {
            setLiveSessionState(session);
            localStorage.setItem(getSessionStorageKey(appMode, currentUser.UserID), JSON.stringify(session));
            return session;
          }
        }
      }
    } catch (e) {
      console.warn('Server sync unavailable, using local cache');
    }
    return liveSession;
  };

  // Reconnection & visibility change listener to restore exact screen & state
  useEffect(() => {
    const handleReactivation = () => {
      if (document.visibilityState === 'visible') {
        syncLiveSessionFromServer().then(session => {
          if (session && session.currentView === 'live') {
            setCurrentViewState('live');
            setSelectedEventIdState(session.eventId);
            setActiveRoundIndexState(session.roundIndex);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleReactivation);
    window.addEventListener('focus', handleReactivation);
    window.addEventListener('pageshow', handleReactivation);

    return () => {
      document.removeEventListener('visibilitychange', handleReactivation);
      window.removeEventListener('focus', handleReactivation);
      window.removeEventListener('pageshow', handleReactivation);
    };
  }, [currentUserId]);

  const showNotification = (message: string, type: 'success' | 'info' | 'pink' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const clearNotification = () => setNotification(null);

  // Access rule 1: Live Friday Speed Dating requires Premium Plus ($14.99/mo)
  const canAccessLiveSpeedDating = (user: User = currentUser): boolean => {
    return user.SubscriptionTier === 'Premium Plus';
  };

  // Access rule 2: Private messaging only after mutual like AND both hold an eligible paid membership (Premium or Premium Plus)
  const canAccessMessaging = (match: Match): { allowed: boolean; reason?: string } => {
    const isPaid = (tier: SubscriptionTier) => tier === 'Premium' || tier === 'Premium Plus';

    const partnerId = match.UserA === currentUser.UserID ? match.UserB : match.UserA;
    const partner = users.find(u => u.UserID === partnerId);

    if (!isPaid(currentUser.SubscriptionTier)) {
      return {
        allowed: false,
        reason: 'You need an eligible paid membership (Premium $9.99/mo or Premium Plus $14.99/mo) to exchange private messages.',
      };
    }

    if (!partner || !isPaid(partner.SubscriptionTier)) {
      return {
        allowed: false,
        reason: `${partner?.FirstName || 'Your match'} has a Free membership. Private messaging unlocks only when both members have an eligible paid membership.`,
      };
    }

    return { allowed: true };
  };

  const switchUser = (userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user_id`, userId);
    const targetUser = users.find(u => u.UserID === userId);
    if (targetUser) {
      showNotification(`Switched profile to ${targetUser.FirstName} (${targetUser.SubscriptionTier})`, 'pink');
    }

    const savedUserSession = localStorage.getItem(getSessionStorageKey(appMode, userId));
    if (savedUserSession) {
      try {
        const parsed: LiveSessionState = JSON.parse(savedUserSession);
        if (parsed.mode === appMode) {
          setLiveSessionState(parsed);
          if (parsed.currentView === 'live') {
            setCurrentViewState('live');
            setSelectedEventIdState(parsed.eventId);
            setActiveRoundIndexState(parsed.roundIndex);
          }
          return;
        }
      } catch (e) {
        setLiveSessionState(null);
      }
    }
    setLiveSessionState(null);
  };

  const updateUserProfile = (updated: Partial<User>) => {
    setUsers(prev =>
      prev.map(u => (u.UserID === currentUser.UserID ? { ...u, ...updated } : u))
    );
    showNotification('Profile updated successfully!', 'success');
  };

  const updateAnyUser = (userId: string, updated: Partial<User>) => {
    setUsers(prev =>
      prev.map(u => (u.UserID === userId ? { ...u, ...updated } : u))
    );
    showNotification('Profile updated successfully!', 'success');
  };

  const updateUserPreferences = (userId: string, prefs: Partial<UserPreferences>) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.UserID === userId) {
          const updatedPrefs: UserPreferences = {
            ...u.Preferences,
            ...prefs,
          };
          return {
            ...u,
            Preferences: updatedPrefs,
          };
        }
        return u;
      })
    );
  };

  const upgradeOtherUser = (userId: string, tier: SubscriptionTier) => {
    setUsers(prev =>
      prev.map(u => (u.UserID === userId ? { ...u, SubscriptionTier: tier } : u))
    );
    const target = users.find(u => u.UserID === userId);
    showNotification(`Simulated upgrade: ${target?.FirstName} is now ${tier}!`, 'success');
  };

  const setSubscriptionTier = (tier: SubscriptionTier) => {
    setUsers(prev =>
      prev.map(u => (u.UserID === currentUser.UserID ? { ...u, SubscriptionTier: tier } : u))
    );

    if (tier === 'Premium Plus') {
      showNotification('Upgraded to Premium Plus ($14.99/mo)! Friday-night speed dating and messaging unlocked.', 'pink');
    } else if (tier === 'Premium') {
      showNotification('Upgraded to Premium ($9.99/mo)! Private messaging with paid matches unlocked.', 'success');
    } else {
      showNotification('Switched to Free Tier ($0/mo). Browsing and mutual matches active.', 'info');
    }
  };

  // Browse action: Like
  const likeProfile = (targetUserId: string): { isMatch: boolean; partner?: User } => {
    const partner = users.find(u => u.UserID === targetUserId);
    if (!partner) return { isMatch: false };

    // Record like from current user
    const currentLikes = likesMap[currentUser.UserID] || [];
    if (!currentLikes.includes(targetUserId)) {
      setLikesMap(prev => ({
        ...prev,
        [currentUser.UserID]: [...(prev[currentUser.UserID] || []), targetUserId],
      }));
    }

    // Check if target user likes current user back
    const partnerLikes = likesMap[targetUserId] || [];
    const isMutual = partnerLikes.includes(currentUser.UserID);

    if (isMutual) {
      // Create mutual match if not already existing
      const alreadyMatched = matches.some(
        m =>
          (m.UserA === currentUser.UserID && m.UserB === targetUserId) ||
          (m.UserA === targetUserId && m.UserB === currentUser.UserID)
      );

      if (!alreadyMatched) {
        const sharedInterests = currentUser.Interests.filter(i => partner.Interests.includes(i));
        const bothPaid =
          (currentUser.SubscriptionTier === 'Premium' || currentUser.SubscriptionTier === 'Premium Plus') &&
          (partner.SubscriptionTier === 'Premium' || partner.SubscriptionTier === 'Premium Plus');

        const newMatch: Match = {
          MatchID: `match_${Date.now()}`,
          UserA: currentUser.UserID,
          UserB: targetUserId,
          EventID: 'evt_browse_spark',
          Timestamp: new Date().toISOString(),
          ChatUnlocked: bothPaid,
          ChemistryScore: Math.floor(86 + Math.random() * 13),
          MutualInterests: sharedInterests.length > 0 ? sharedInterests : ['Chemistry', 'Great Conversation'],
          SparkNote: `Mutual spark sparked through member browsing!`,
        };

        setMatches(prev => [newMatch, ...prev]);

        // Persist mutual match to server store
        fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: newMatch.MatchID,
            userA: newMatch.UserA,
            userB: newMatch.UserB,
            eventId: newMatch.EventID,
            chatUnlocked: newMatch.ChatUnlocked,
            chemistryScore: newMatch.ChemistryScore,
            mutualInterests: newMatch.MutualInterests,
            sparkNote: newMatch.SparkNote,
            userALike: true,
            userBLike: true,
          }),
        }).catch(err => console.warn('Failed to persist match to server:', err));

        if (bothPaid) {
          const starterMsg: Message = {
            MessageID: `msg_${Date.now()}`,
            MatchID: newMatch.MatchID,
            SenderID: targetUserId,
            MessageText: `Hey ${currentUser.FirstName}! We just matched! Loved your profile.`,
            Timestamp: new Date().toISOString(),
            Read: false,
          };
          setMessages(prev => [...prev, starterMsg]);
        }
      }

      showNotification(`It's a Mutual Match with ${partner.FirstName}! ❤️⚡`, 'pink');
      return { isMatch: true, partner };
    }

    showNotification(`Liked ${partner.FirstName}. Saved to your likes!`, 'pink');
    return { isMatch: false, partner };
  };

  // Browse action: Pass
  const passProfile = (targetUserId: string) => {
    const partner = users.find(u => u.UserID === targetUserId);
    showNotification(`Passed on ${partner?.FirstName || 'profile'}. Moving to next profile.`, 'info');
  };

  // Safety: Block User
  const blockUser = (targetUserId: string) => {
    const partner = users.find(u => u.UserID === targetUserId);
    const name = partner ? partner.FirstName : 'User';

    setBlockedUserIds(prev => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));

    // Remove any matches with this user
    setMatches(prev =>
      prev.filter(
        m =>
          !(
            (m.UserA === currentUser.UserID && m.UserB === targetUserId) ||
            (m.UserA === targetUserId && m.UserB === currentUser.UserID)
          )
      )
    );

    // Filter out messages
    setMessages(prev =>
      prev.filter(m => {
        const match = matches.find(mat => mat.MatchID === m.MatchID);
        if (!match) return true;
        const involves =
          (match.UserA === currentUser.UserID && match.UserB === targetUserId) ||
          (match.UserA === targetUserId && match.UserB === currentUser.UserID);
        return !involves;
      })
    );

    showNotification(`${name} has been blocked and removed from your feed.`, 'info');
  };

  const unblockUser = (targetUserId: string) => {
    setBlockedUserIds(prev => prev.filter(id => id !== targetUserId));
    showNotification('Member unblocked.', 'success');
  };

  // Safety: Report User
  const reportUser = (
    targetUserId: string,
    reason: UserReport['Reason'],
    notes: string,
    alsoBlock: boolean
  ) => {
    const newReport: UserReport = {
      ReportID: `rep_${Date.now()}`,
      ReportedUserID: targetUserId,
      ReporterID: currentUser.UserID,
      Reason: reason,
      Notes: notes,
      Timestamp: new Date().toISOString(),
    };

    setReports(prev => [newReport, ...prev]);

    if (alsoBlock) {
      blockUser(targetUserId);
    }

    showNotification(
      'Thank you for reporting. Our safety team is reviewing this profile.',
      'success'
    );
    setReportModalTarget(null);
  };

  const addEvent = (
    eventData: Omit<SpeedEvent, 'EventID' | 'ParticipantsList' | 'RoundsGenerated' | 'EventStatus'>
  ): SpeedEvent => {
    const newEvent: SpeedEvent = {
      ...eventData,
      EventID: `evt_${Date.now()}`,
      ParticipantsList: [currentUser.UserID],
      RoundsGenerated: false,
      EventStatus: 'Upcoming',
      RoundDurationSeconds: 300,
    };
    setEvents(prev => [newEvent, ...prev]);
    showNotification(`Friday Speed Dating event "${newEvent.EventName}" created!`, 'success');
    return newEvent;
  };

  const registerForEvent = (eventId: string): { success: boolean; message: string } => {
    const targetEvent = events.find(e => e.EventID === eventId);
    if (!targetEvent) return { success: false, message: 'Event not found' };

    if (!canAccessLiveSpeedDating(currentUser)) {
      showNotification(
        'Weekend Speed Dating requires a Premium Plus membership ($14.99/mo). Upgrade to join!',
        'pink'
      );
      return {
        success: false,
        message: 'Premium Plus ($14.99/mo) required to participate in weekend speed dating.',
      };
    }

    // Age restriction for '30 & Older' events or MinAge >= 30
    const is30PlusEvent = targetEvent.EventType === '30 & Older' || targetEvent.MinAge >= 30;
    if (is30PlusEvent) {
      if (!currentUser.Age || currentUser.Age < 30) {
        const ageMsg = currentUser.Age ? `(Your current profile age is ${currentUser.Age})` : `(Your age is not set on your profile)`;
        showNotification(
          `Registration restricted: "${targetEvent.EventName}" is reserved for members aged 30 and older. ${ageMsg}`,
          'pink'
        );
        return {
          success: false,
          message: `Only members aged 30 or older may register for this event. ${ageMsg}`,
        };
      }
    }

    if (targetEvent.ParticipantsList.includes(currentUser.UserID)) {
      return { success: false, message: 'You are already registered for this event.' };
    }

    if (targetEvent.ParticipantsList.length >= targetEvent.MaxParticipants) {
      return { success: false, message: 'Event is already at maximum capacity.' };
    }

    setEvents(prev =>
      prev.map(e =>
        e.EventID === eventId
          ? { ...e, ParticipantsList: [...e.ParticipantsList, currentUser.UserID] }
          : e
      )
    );

    setUsers(prev =>
      prev.map(u =>
        u.UserID === currentUser.UserID && !u.EventHistory.includes(eventId)
          ? { ...u, EventHistory: [...u.EventHistory, eventId] }
          : u
      )
    );

    showNotification(
      `✓ Registration Confirmed! You are registered for ${targetEvent.EventName} (${targetEvent.DayOfWeek} at 7:00 PM EST).`,
      'success'
    );
    return { success: true, message: 'Successfully registered!' };
  };

  const registerForMultipleEvents = (eventIds: string[]): { registeredCount: number; message: string } => {
    if (!canAccessLiveSpeedDating(currentUser)) {
      showNotification(
        'Multi-night registration requires a Premium Plus membership ($14.99/mo). Upgrade to join!',
        'pink'
      );
      setCurrentView('pricing');
      return { registeredCount: 0, message: 'Premium Plus required' };
    }

    if (!eventIds.length) {
      return { registeredCount: 0, message: 'No events selected' };
    }

    // Check age requirement for any selected events that are 30 & Older
    const selectedEvents = events.filter(e => eventIds.includes(e.EventID));
    const restrictedEvents = selectedEvents.filter(
      e => (e.EventType === '30 & Older' || e.MinAge >= 30) && (!currentUser.Age || currentUser.Age < 30)
    );

    if (restrictedEvents.length > 0) {
      const ageMsg = currentUser.Age ? `(Your profile age is ${currentUser.Age})` : '(Your age is not set on your profile)';
      showNotification(
        `Registration restricted: "${restrictedEvents[0].EventName}" is reserved for daters aged 30 and older. ${ageMsg}`,
        'pink'
      );
      return {
        registeredCount: 0,
        message: `Only members aged 30 or older may register for "${restrictedEvents[0].EventName}".`,
      };
    }

    setEvents(prev =>
      prev.map(e =>
        eventIds.includes(e.EventID) && !e.ParticipantsList.includes(currentUser.UserID)
          ? { ...e, ParticipantsList: [...e.ParticipantsList, currentUser.UserID] }
          : e
      )
    );

    setUsers(prev =>
      prev.map(u =>
        u.UserID === currentUser.UserID
          ? { ...u, EventHistory: [...new Set([...u.EventHistory, ...eventIds])] }
          : u
      )
    );

    showNotification(
      `✓ Registration Confirmed for ${eventIds.length} weekend speed-dating night${eventIds.length > 1 ? 's' : ''} (7:00 PM EST)!`,
      'success'
    );
    return { registeredCount: eventIds.length, message: 'Successfully registered for all selected nights' };
  };

  const leaveEvent = (eventId: string) => {
    clearLiveSession();
    const targetEvent = events.find(e => e.EventID === eventId);
    setEvents(prev =>
      prev.map(e =>
        e.EventID === eventId
          ? { ...e, ParticipantsList: e.ParticipantsList.filter(id => id !== currentUser.UserID) }
          : e
      )
    );
    setUsers(prev =>
      prev.map(u =>
        u.UserID === currentUser.UserID
          ? { ...u, EventHistory: u.EventHistory.filter(id => id !== eventId) }
          : u
      )
    );
    if (currentView === 'live' || currentView === 'lobby') {
      setCurrentView('friday');
    }
    showNotification(
      `Registration canceled for ${targetEvent?.EventName || 'event'}. Your spot has been released.`,
      'info'
    );
  };

  const handlePartnerUnavailable = (roundId: string): { newPartner?: User; success: boolean } => {
    const currentRound = rounds.find(r => r.RoundID === roundId);
    if (!currentRound) return { success: false };

    // Find candidate users not currently in this round, not blocked, not self
    const candidates = users.filter(
      u => u.UserID !== currentUser.UserID &&
           u.UserID !== currentRound.UserB &&
           !blockedUserIds.includes(u.UserID)
    );

    const replacement = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : undefined;

    if (replacement) {
      setRounds(prev =>
        prev.map(r =>
          r.RoundID === roundId
            ? {
                ...r,
                UserB: replacement.UserID,
                PartnerStatus: 'active',
                UserB_Like: Math.random() > 0.4,
                UserB_Notes: 'Happy to connect with you!',
              }
            : r
        )
      );
      showNotification(
        `Partner excused. Re-paired with ${replacement.FirstName} without consuming your round!`,
        'success'
      );
      return { newPartner: replacement, success: true };
    } else {
      setRounds(prev =>
        prev.map(r =>
          r.RoundID === roundId
            ? { ...r, PartnerStatus: 'unavailable' }
            : r
        )
      );
      showNotification(
        'Partner was unavailable. Waiting room will pair you in the next rotation without penalty.',
        'info'
      );
      return { success: false };
    }
  };

  const generateRoundsForEvent = (eventId: string): Round[] => {
    const targetEvent = events.find(e => e.EventID === eventId);
    if (!targetEvent) return [];

    let candidatePartners: User[] = [];

    if (eventId === 'evt_staging_dev') {
      // Developer Staging: Dedicated two-person test pairing between verified test accounts
      const preferredPartnerId =
        currentUser.UserID === 'usr_kristy'
          ? 'usr_01' // Marcus
          : currentUser.UserID === 'usr_01'
          ? 'usr_kristy' // Kristy
          : currentUser.UserID === 'usr_me'
          ? 'usr_kristy'
          : 'usr_kristy';
      const preferredPartner = users.find(u => u.UserID === preferredPartnerId);
      const otherAuthorized = users.filter(
        u =>
          ['usr_kristy', 'usr_01', 'usr_me', 'usr_02', 'usr_03'].includes(u.UserID) &&
          u.UserID !== currentUser.UserID &&
          u.UserID !== preferredPartnerId
      );
      candidatePartners = preferredPartner ? [preferredPartner, ...otherAuthorized] : otherAuthorized;
    } else if (appMode === 'production') {
      // Production mode: Connect real consenting registered members
      candidatePartners = users.filter(
        u =>
          targetEvent.ParticipantsList.includes(u.UserID) &&
          u.UserID !== currentUser.UserID &&
          !blockedUserIds.includes(u.UserID)
      );
    } else {
      // Demonstration mode: Curated simulated partners strictly matching category & orientation
      if (targetEvent.EventType === '30 & Older' || targetEvent.MinAge >= 30) {
        // Strictly 30 and older
        candidatePartners = users.filter(
          u => u.UserID !== currentUser.UserID && !blockedUserIds.includes(u.UserID) && u.Age >= 30
        );
      } else if (targetEvent.EventType === 'LGBTQ+') {
        // LGBTQ+ inclusive singles
        candidatePartners = users.filter(
          u =>
            u.UserID !== currentUser.UserID &&
            !blockedUserIds.includes(u.UserID) &&
            (u.Gender === 'Non-Binary' ||
              u.InterestedIn === 'Everyone' ||
              (currentUser.Gender === 'Man' && u.InterestedIn === 'Men') ||
              (currentUser.Gender === 'Woman' && u.InterestedIn === 'Women') ||
              u.UserID === 'usr_07' ||
              u.UserID === 'usr_08' ||
              u.UserID === 'usr_09')
        );
      } else {
        // General / Straight speed dating
        candidatePartners = users.filter(
          u =>
            u.UserID !== currentUser.UserID &&
            !blockedUserIds.includes(u.UserID) &&
            (currentUser.InterestedIn === 'Everyone' || u.Gender === (currentUser.InterestedIn === 'Women' ? 'Woman' : 'Man'))
        );
      }

      // Rotate dater order so Friday, Saturday, and Sunday each have unique, distinctive partner rotations
      if (targetEvent.DayOfWeek === 'Saturday') {
        candidatePartners = [...candidatePartners].reverse();
      } else if (targetEvent.DayOfWeek === 'Sunday') {
        candidatePartners = candidatePartners.slice(1).concat(candidatePartners.slice(0, 1));
      }
    }

    // Ensure candidatePartners has at least 5 daters to guarantee 5 scheduled speed-dating rounds
    const targetRoundCount = targetEvent.TotalRounds || 5;
    if (candidatePartners.length < targetRoundCount) {
      const remainingUsers = users.filter(
        u =>
          u.UserID !== currentUser.UserID &&
          !blockedUserIds.includes(u.UserID) &&
          !candidatePartners.some(cp => cp.UserID === u.UserID)
      );
      candidatePartners = [...candidatePartners, ...remainingUsers];
    }

    const meId = currentUser.UserID;
    const newRounds: Round[] = [];
    const duration = 300; // Exactly 5 minutes
    const baseTime = Date.now();

    candidatePartners.slice(0, targetRoundCount).forEach((partner, index) => {
      const roundStart = new Date(baseTime + index * (duration + 120) * 1000).toISOString();
      const roundEnd = new Date(baseTime + (index * (duration + 120) + duration) * 1000).toISOString();

      newRounds.push({
        RoundID: `rnd_${eventId}_${index + 1}_${Date.now().toString(36)}`,
        EventID: eventId,
        RoundNumber: index + 1,
        UserA: meId,
        UserB: partner.UserID,
        RoundStart: roundStart,
        RoundEnd: roundEnd,
        UserA_Like: null,
        UserB_Like: Math.random() > 0.35,
        UserA_Notes: '',
        UserB_Notes: `Enjoyed connecting on ${targetEvent.DayOfWeek} night!`,
      });
    });

    setRounds(prev => {
      const filtered = prev.filter(r => r.EventID !== eventId);
      return [...filtered, ...newRounds];
    });

    setEvents(prev =>
      prev.map(e => (e.EventID === eventId ? { ...e, RoundsGenerated: true } : e))
    );

    return newRounds;
  };

  const startEventLive = (eventId: string): boolean => {
    const targetEvent = events.find(e => e.EventID === eventId);
    if (!targetEvent) return false;

    if (!canAccessLiveSpeedDating(currentUser)) {
      showNotification(
        'Weekend Speed Dating requires a Premium Plus membership ($14.99/mo). Upgrade to join!',
        'pink'
      );
      setCurrentView('pricing');
      return false;
    }

    if (!targetEvent.ParticipantsList.includes(currentUser.UserID)) {
      setEvents(prev =>
        prev.map(e =>
          e.EventID === eventId
            ? { ...e, ParticipantsList: Array.from(new Set([...e.ParticipantsList, currentUser.UserID])) }
            : e
        )
      );
    }

    // Server-validated event scheduling check
    const check = canEnterVideoRound(targetEvent);
    if (!check.allowed) {
      showNotification(
        check.reason || 'Event has not started yet. Entering the Waiting Room...',
        'info'
      );
      setSelectedEventId(eventId);
      setCurrentView('lobby');
      return false;
    }

    setEvents(prev =>
      prev.map(e => (e.EventID === eventId ? { ...e, EventStatus: 'Live', RoundsGenerated: true } : e))
    );

    const myRounds = rounds.filter(
      r => r.EventID === eventId && (r.UserA === currentUser.UserID || r.UserB === currentUser.UserID)
    );
    let eventRounds = myRounds;
    if (eventId === 'evt_staging_dev' || myRounds.length < 5) {
      eventRounds = generateRoundsForEvent(eventId);
    }

    // Check which rounds are already completed/voted
    const uncompletedIdx = eventRounds.findIndex(r => {
      const isUserA = r.UserA === currentUser.UserID;
      const myVote = isUserA ? r.UserA_Like : r.UserB_Like;
      return myVote === null || myVote === undefined;
    });

    // If all 5 scheduled rounds are completed and voted, go straight to match results
    if (uncompletedIdx === -1 && eventRounds.length >= 5) {
      setSelectedEventId(eventId);
      setCurrentView('results');
      showNotification('All 5 speed dating rounds complete! Revealing mutual matches...', 'pink');
      return true;
    }

    const targetRoundIdx = uncompletedIdx >= 0 ? uncompletedIdx : 0;

    // Only clear server rounds if starting from round 0 fresh with no prior votes
    if (targetRoundIdx === 0 && (!eventRounds[0] || (eventRounds[0].UserA_Like === null && eventRounds[0].UserB_Like === null))) {
      fetch(`/api/events/${eventId}/reset-rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.UserID }),
      }).catch(() => {});
    }

    setSelectedEventId(eventId);
    setActiveRoundIndex(targetRoundIdx);
    setCurrentView('live');

    const activeRound = eventRounds[targetRoundIdx];
    const partnerId = activeRound ? (activeRound.UserA === currentUser.UserID ? activeRound.UserB : activeRound.UserA) : '';
    const initialStage = partnerId ? 'call' : 'waiting_room';

    saveLiveSession({
      userId: currentUser.UserID,
      eventId,
      roundIndex: targetRoundIdx,
      stage: initialStage,
      roundStartedAt: Date.now(),
      breakStartedAt: null,
      roundDurationSeconds: 300,
      breakDurationSeconds: 120,
      vote: null,
      notes: '',
      partnerId,
      currentView: 'live',
      lastActive: Date.now(),
      mode: appMode,
      hasEndedEarly: false,
    });

    showNotification(
      initialStage === 'call'
        ? `${targetEvent.EventName} is LIVE! 5-minute video round ${targetRoundIdx + 1} started.`
        : `${targetEvent.EventName} is LIVE! Waiting for an eligible partner in the Waiting Room...`,
      'pink'
    );
    return true;
  };

  const submitRoundDecision = (
    roundId: string,
    like: boolean,
    notes: string
  ): { isMatch: boolean; partner?: User } => {
    let partnerUser: User | undefined;
    let isMutual = false;

    setRounds(prev =>
      prev.map(r => {
        if (r.RoundID !== roundId) return r;
        const isUserA = r.UserA === currentUser.UserID;
        const partnerId = isUserA ? r.UserB : r.UserA;
        partnerUser = users.find(u => u.UserID === partnerId);

        const updatedRound: Round = {
          ...r,
          UserA_Like: isUserA ? like : r.UserA_Like,
          UserB_Like: !isUserA ? like : r.UserB_Like,
          UserA_Notes: isUserA ? notes : r.UserA_Notes,
          UserB_Notes: !isUserA ? notes : r.UserB_Notes,
        };

        const mutualLike = (updatedRound.UserA_Like === true && updatedRound.UserB_Like === true);
        if (mutualLike) {
          isMutual = true;
        }

        return updatedRound;
      })
    );

    if (isMutual && partnerUser) {
      const targetPartner = partnerUser;
      const targetRound = rounds.find(r => r.RoundID === roundId);
      const eventId = targetRound?.EventID || selectedEventId;

      const alreadyMatched = matches.some(
        m =>
          (m.UserA === currentUser.UserID && m.UserB === targetPartner.UserID) ||
          (m.UserA === targetPartner.UserID && m.UserB === currentUser.UserID)
      );

      if (!alreadyMatched) {
        const sharedInterests = currentUser.Interests.filter(i => targetPartner.Interests.includes(i));
        const bothPaid =
          (currentUser.SubscriptionTier === 'Premium' || currentUser.SubscriptionTier === 'Premium Plus') &&
          (targetPartner.SubscriptionTier === 'Premium' || targetPartner.SubscriptionTier === 'Premium Plus');

        const newMatch: Match = {
          MatchID: `match_${Date.now()}`,
          UserA: currentUser.UserID,
          UserB: targetPartner.UserID,
          EventID: eventId,
          Timestamp: new Date().toISOString(),
          ChatUnlocked: bothPaid,
          ChemistryScore: Math.floor(85 + Math.random() * 14),
          MutualInterests: sharedInterests.length > 0 ? sharedInterests : ['Friday Speed Date Spark', 'Authentic Chemistry'],
          SparkNote: `Mutual chemistry sparked during Friday-night round ${targetRound?.RoundNumber || 1}!`,
        };

        setMatches(prev => [newMatch, ...prev]);

        // Persist mutual match to server store
        fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: newMatch.MatchID,
            userA: newMatch.UserA,
            userB: newMatch.UserB,
            eventId: newMatch.EventID,
            chatUnlocked: newMatch.ChatUnlocked,
            chemistryScore: newMatch.ChemistryScore,
            mutualInterests: newMatch.MutualInterests,
            sparkNote: newMatch.SparkNote,
            userALike: true,
            userBLike: true,
          }),
        }).catch(err => console.warn('Failed to persist match to server:', err));

        if (bothPaid) {
          const welcomeMessage: Message = {
            MessageID: `msg_welcome_${Date.now()}`,
            MatchID: newMatch.MatchID,
            SenderID: targetPartner.UserID,
            MessageText: `Hi ${currentUser.FirstName}! I loved our 5-minute Friday speed round. Excited to chat!`,
            Timestamp: new Date().toISOString(),
            Read: false,
          };
          setMessages(prev => [...prev, welcomeMessage]);
        }

        showNotification(`It's a Match! You and ${targetPartner.FirstName} mutually liked each other! ❤️⚡`, 'pink');
      }
    }

    return { isMatch: isMutual, partner: partnerUser };
  };

  const skipRound = (roundId: string): { success: boolean; message: string } => {
    if (currentUser.SubscriptionTier !== 'Premium Plus') {
      showNotification('Round Skip is exclusive to Premium Plus members ($14.99/mo)!', 'pink');
      return { success: false, message: 'Premium Plus required to skip rounds.' };
    }

    setRounds(prev =>
      prev.map(r =>
        r.RoundID === roundId ? { ...r, SkipTriggeredBy: currentUser.UserID } : r
      )
    );
    showNotification('Round skipped via Premium Plus perk. Advancing to next round...', 'info');
    return { success: true, message: 'Round skipped' };
  };

  const requestReplay = (roundId: string): { success: boolean; message: string } => {
    if (currentUser.SubscriptionTier !== 'Premium Plus') {
      showNotification('Replay Round is exclusive to Premium Plus members ($14.99/mo)!', 'pink');
      return { success: false, message: 'Premium Plus required to replay rounds.' };
    }

    setRounds(prev =>
      prev.map(r => {
        if (r.RoundID !== roundId) return r;
        const currentReplays = r.ReplayRequestedBy || [];
        return {
          ...r,
          ReplayRequestedBy: [...new Set([...currentReplays, currentUser.UserID])],
        };
      })
    );
    showNotification('Replay requested! Round tagged for encore session.', 'pink');
    return { success: true, message: 'Replay requested successfully.' };
  };

  const sendMessage = (matchId: string, text: string): { success: boolean; reason?: string } => {
    if (!text.trim()) return { success: false, reason: 'Empty text' };

    const targetMatch = matches.find(m => m.MatchID === matchId);
    if (!targetMatch) return { success: false, reason: 'Match not found' };

    const check = canAccessMessaging(targetMatch);
    if (!check.allowed) {
      showNotification(check.reason || 'Messaging locked.', 'pink');
      return { success: false, reason: check.reason };
    }

    const partnerId = targetMatch.UserA === currentUser.UserID ? targetMatch.UserB : targetMatch.UserA;
    const partner = users.find(u => u.UserID === partnerId);

    const newMsg: Message = {
      MessageID: `msg_${Date.now()}`,
      MatchID: matchId,
      SenderID: currentUser.UserID,
      MessageText: text.trim(),
      Timestamp: new Date().toISOString(),
      Read: true,
    };

    setMessages(prev => [...prev, newMsg]);

    if (partner) {
      setTimeout(() => {
        const replies = [
          `That sounds amazing! I was just thinking about that earlier today. What's your favorite neighborhood spot?`,
          `Haha completely agree! That made my day. Have you tried anything new this week?`,
          `Yes! Totally on the same page. Loved our conversation.`,
          `Ooh great question! Honestly, if I could pick anything right now, it would be catching a sunset rooftop coffee.`,
          `That is such a good take haha! Let's definitely keep this conversation going.`,
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        const partnerReply: Message = {
          MessageID: `msg_reply_${Date.now()}`,
          MatchID: matchId,
          SenderID: partner.UserID,
          MessageText: randomReply,
          Timestamp: new Date().toISOString(),
          Read: false,
        };

        setMessages(mPrev => [...mPrev, partnerReply]);
      }, 1500);
    }

    return { success: true };
  };

  const resetDemoData = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}users`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}events`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}rounds`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}matches`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}messages`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}blocked`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}reports`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}likes`);
    setUsers(INITIAL_USERS);
    setCurrentUserId('usr_me');
    setEvents(INITIAL_EVENTS);
    setRounds(INITIAL_ROUNDS);
    setMatches(INITIAL_MATCHES);
    setMessages(INITIAL_MESSAGES);
    setBlockedUserIds([]);
    setReports([]);
    setLikesMap({
      usr_me: ['usr_02', 'usr_03'],
      usr_02: ['usr_me'],
      usr_03: ['usr_me'],
      usr_04: ['usr_me'],
      usr_05: [],
      usr_06: [],
    });
    setSelectedEventId('evt_live_now');
    setSelectedMatchId(null);
    setCurrentView('browse');
    showNotification('Database reset to fresh Speed Meet Love seed', 'info');
  };

  const refreshSecondDateSessions = useCallback(async (): Promise<SecondDateSession[]> => {
    try {
      const res = await fetch(`/api/second-date/status?userId=${currentUser.UserID}&eventId=${selectedEventId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sessions)) {
          setSecondDateSessions(data.sessions);
          const active = data.sessions.find(
            (s: SecondDateSession) =>
              s.status === 'active' && s.expiresAt && s.expiresAt > Date.now()
          );
          if (active) {
            setActiveSecondDateSession(active);
          }
          return data.sessions;
        }
      }
    } catch (err) {
      console.warn('Failed to refresh second date sessions:', err);
    }
    return [];
  }, [currentUser.UserID, selectedEventId]);

  useEffect(() => {
    if (currentView !== 'results' && currentView !== 'second_date' && currentView !== 'matches') return;
    refreshSecondDateSessions();
    const interval = setInterval(refreshSecondDateSessions, 3000);
    return () => clearInterval(interval);
  }, [currentView, refreshSecondDateSessions]);

  const requestSecondDate = async (
    partnerId: string,
    matchId?: string,
    simulatePartnerConsent = false
  ): Promise<{ success: boolean; session?: SecondDateSession; error?: string }> => {
    if (currentUser.SubscriptionTier !== 'Premium Plus') {
      showNotification('Second Chance live video dates are exclusive to Premium Plus members ($14.99/mo)!', 'pink');
      return { success: false, error: 'Premium Plus membership ($14.99/mo) required.' };
    }

    const partner = users.find(u => u.UserID === partnerId);
    try {
      const res = await fetch('/api/second-date/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          userId: currentUser.UserID,
          userName: currentUser.FirstName,
          userAge: currentUser.Age,
          tier: currentUser.SubscriptionTier,
          partnerId,
          partnerName: partner?.FirstName || 'Partner',
          mode: appMode,
          matchId,
          simulatePartnerConsent,
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setSecondDateSessions(prev => {
          const filtered = prev.filter(s => s.sessionId !== data.session.sessionId);
          return [...filtered, data.session];
        });

        if (data.session.status === 'ready_to_start') {
          showNotification(`Both of you agreed to Another Date! Ready to enter your 10-minute date.`, 'pink');
        } else {
          showNotification(`Invitation sent to ${partner?.FirstName || 'your match'}. Waiting for mutual confirmation...`, 'pink');
        }
        return { success: true, session: data.session };
      } else {
        const errMsg = data.error || 'Failed to request second date.';
        showNotification(errMsg, 'info');
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      showNotification('Network connection error while requesting date.', 'info');
      return { success: false, error: err.message };
    }
  };

  const respondToSecondDate = async (
    sessionId: string,
    action: 'accept' | 'decline' | 'save_and_chat'
  ): Promise<{ success: boolean; session?: SecondDateSession }> => {
    try {
      const res = await fetch('/api/second-date/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: currentUser.UserID,
          action,
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setSecondDateSessions(prev =>
          prev.map(s => (s.sessionId === sessionId ? data.session : s))
        );
        if (action === 'accept') {
          showNotification(`You agreed to Another Date! You can enter whenever you're ready.`, 'pink');
        } else {
          showNotification(`Saved match for chat! No second date started.`, 'info');
        }
        return { success: true, session: data.session };
      }
    } catch (err) {
      console.warn('Error responding to second date:', err);
    }
    return { success: false };
  };

  const startSecondDate = async (
    sessionId: string
  ): Promise<{ success: boolean; session?: SecondDateSession; error?: string }> => {
    if (currentUser.SubscriptionTier !== 'Premium Plus') {
      showNotification('Second Chance live video dates require Premium Plus ($14.99/mo).', 'pink');
      return { success: false, error: 'Premium Plus required.' };
    }

    try {
      const res = await fetch('/api/second-date/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: currentUser.UserID,
          tier: currentUser.SubscriptionTier,
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setActiveSecondDateSession(data.session);
        setSecondDateSessions(prev =>
          prev.map(s => (s.sessionId === sessionId ? data.session : s))
        );
        setCurrentView('second_date');
        showNotification('10-Minute Second Chance Date Started! ❤️ Enjoy your conversation.', 'pink');
        return { success: true, session: data.session };
      } else {
        const errorMsg = data.error || 'Cannot start date: mutual consent required.';
        showNotification(errorMsg, 'info');
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const endSecondDate = async (sessionId: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`/api/second-date/${sessionId}/end`, { method: 'POST' });
    } catch (e) {}
    setActiveSecondDateSession(null);
    refreshSecondDateSessions();
    setCurrentView('results');
    showNotification('Second Chance Date concluded! Your mutual match remains safely in My Matches.', 'pink');
    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        events,
        rounds,
        matches,
        messages,
        blockedUserIds,
        reports,
        currentView,
        selectedEventId,
        selectedMatchId,
        activeRoundIndex,
        liveSession,
        appMode,
        setAppMode,
        serverTimeOffset,
        serverTimeFormattedET,
        simulatedLiveEvents,
        toggleSimulateLiveEvent,
        isEventLive,
        canEnterVideoRound,
        getTimeUntilEventStartMs,
        notification,
        reportModalTarget,
        setReportModalTarget,
        setCurrentView,
        setSelectedEventId,
        setSelectedMatchId,
        setActiveRoundIndex,
        setCurrentUser: (u) => setCurrentUserId(u.UserID),
        switchUser,
        updateUserProfile,
        updateAnyUser,
        setSubscriptionTier,
        likeProfile,
        passProfile,
        blockUser,
        unblockUser,
        reportUser,
        addEvent,
        registerForEvent,
        registerForMultipleEvents,
        leaveEvent,
        startEventLive,
        generateRoundsForEvent,
        submitRoundDecision,
        handlePartnerUnavailable,
        skipRound,
        requestReplay,
        sendMessage,
        resetDemoData,
        clearNotification,
        showNotification,
        canAccessLiveSpeedDating,
        canAccessMessaging,
        upgradeOtherUser,
        updateUserPreferences,
        saveLiveSession,
        clearLiveSession,
        syncLiveSessionFromServer,
        activeSecondDateSession,
        setActiveSecondDateSession,
        secondDateSessions,
        requestSecondDate,
        respondToSecondDate,
        startSecondDate,
        endSecondDate,
        refreshSecondDateSessions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
