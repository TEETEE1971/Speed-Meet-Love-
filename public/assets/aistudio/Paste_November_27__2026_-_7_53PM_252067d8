import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, SpeedEvent, Round, Match, Message, SubscriptionTier, EventType, UserReport, AppView, LiveSessionState, AppMode, UserPreferences, SecondDateSession, WaitlistEntrySummary, ReportContextPayload, ReportNotificationDispatch } from '../types';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_ROUNDS, INITIAL_MATCHES, INITIAL_MESSAGES } from '../data/initialData';
import { DEFAULT_SEARCH_PREFERENCES, isLegacyDemoDefaultPreferences, normalizeSearchPreferences } from '../utils/memberSearch';

export type { AppView, LiveSessionState, AppMode, SecondDateSession };

function wantsGenderClient(
  interestedIn: User['InterestedIn'] | string | undefined,
  candidateGender: User['Gender'] | string | undefined
): boolean {
  if (!interestedIn || interestedIn === 'Everyone') return true;
  if (interestedIn === 'Men') return candidateGender === 'Man' || candidateGender === 'Non-Binary';
  if (interestedIn === 'Women') return candidateGender === 'Woman' || candidateGender === 'Non-Binary';
  return true;
}

export function areUsersCompatible(
  userA: User | undefined | null,
  userB: User | undefined | null,
  evt?: SpeedEvent | null
): boolean {
  if (!userA || !userB) return false;
  if (!userA.UserID || !userB.UserID || userA.UserID === userB.UserID) return false;
  if (typeof userA.Age !== 'number' || userA.Age < 18) return false;
  if (typeof userB.Age !== 'number' || userB.Age < 18) return false;
  if (evt && (evt.EventType === '30 & Older' || evt.MinAge >= 30)) {
    if (userA.Age < 30 || userB.Age < 30) return false;
  }
  return (
    wantsGenderClient(userA.InterestedIn, userB.Gender) &&
    wantsGenderClient(userB.InterestedIn, userA.Gender)
  );
}

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
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalTab: 'signin' | 'signup';
  setAuthModalTab: (tab: 'signin' | 'signup') => void;
  openAuthModal: (tab?: 'signin' | 'signup') => void;
  isEmailVerificationModalOpen: boolean;
  setIsEmailVerificationModalOpen: (open: boolean) => void;
  emailVerificationSent: boolean | null;
  refreshCurrentUser: () => Promise<User | null>;
  verifyEmail: (payload: { token: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  resendVerificationEmail: (email?: string) => Promise<{ success: boolean; error?: string; emailSent?: boolean }>;
  markLaunchOfferCelebrated: () => Promise<void>;
  markLaunchOfferActivationSeen: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signUp: (formData: any) => Promise<{ success: boolean; error?: string; user?: User }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; message: string; error?: string }>;
  resetPasswordToken: string | null;
  setResetPasswordToken: (token: string | null) => void;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signOut: () => Promise<void>;
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
  reportModalContext: ReportContextPayload | null;
  setReportModalTarget: (user: User | null, context?: ReportContextPayload | null) => void;
  setCurrentView: (view: AppView) => void;
  setSelectedEventId: (id: string) => void;
  setSelectedMatchId: (id: string | null) => void;
  setActiveRoundIndex: (index: number) => void;
  setCurrentUser: (user: User | null) => void;
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
    alsoBlock: boolean,
    options?: {
      context?: ReportContextPayload | null;
      endActiveCall?: boolean;
    }
  ) => Promise<{
    success: boolean;
    reportId?: string;
    urgent?: boolean;
    urgencyReasons?: string[];
    notificationDispatch?: ReportNotificationDispatch;
    error?: string;
  }>;
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
  canAccessLiveSpeedDating: (user?: User | null) => boolean;
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
  pendingSecondDateCount: number;
  incomingSecondDateInvitation: SecondDateSession | null;
  acceptSecondDateInvitation: (sessionId: string) => Promise<{ success: boolean; session?: SecondDateSession }>;
  declineSecondDateInvitation: (sessionId: string) => Promise<{ success: boolean; session?: SecondDateSession }>;
  dismissSecondDateInvitation: (sessionId: string) => void;
  repairEventRounds: (eventId: string) => Round[];
  createStagingTestSession: () => Promise<{ success: boolean; eventId?: string; joinCode?: string; error?: string }>;
  joinStagingTestSession: (joinCode: string) => Promise<{ success: boolean; eventId?: string; joinCode?: string; error?: string }>;
  authToken: string | null;
  isOwner: boolean;
  syncAuthSession: (user: User) => Promise<string | null>;
  deleteAccount: (confirmEmail: string) => Promise<{ success: boolean; error?: string; purged?: any; retentionExceptions?: string[] }>;
  waitlistJoined: boolean;
  waitlistEntry: WaitlistEntrySummary | null;
  waitlistLoading: boolean;
  refreshWaitlistStatus: () => Promise<void>;
  joinWaitlist: () => Promise<{ success: boolean; error?: string; alreadyJoined?: boolean }>;
  leaveWaitlist: () => Promise<{ success: boolean; error?: string }>;
  confirmedLaunchEvents: SpeedEvent[];
  ownerLaunchEvents: SpeedEvent[];
  refreshLaunchEvents: () => Promise<void>;
  scheduleLaunchEvent: (payload: {
    EventName: string;
    DayOfWeek: 'Friday' | 'Saturday' | 'Sunday';
    EventDate: string;
    EventStartTime?: string;
    EventEndTime?: string;
    TimeZone?: string;
    MaxParticipants?: number;
    EventType: EventType;
    Description?: string;
    MinAge?: number;
    MaxAge?: number;
    LocationName?: string;
    Confirmed?: boolean;
  }) => Promise<{ success: boolean; event?: SpeedEvent; error?: string }>;
  confirmLaunchEvent: (eventId: string, confirmed: boolean) => Promise<{ success: boolean; event?: SpeedEvent; error?: string }>;
  deleteLaunchEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  isFreeDuringLaunch: boolean;
  paidMembershipsReturnedAt: number | null;
  speedDatingLaunched: boolean;
  speedDatingLaunchedAt: number | null;
  first50PreservedCount: number;
  launchModeEnvOverride: boolean;
  refreshLaunchMode: () => Promise<void>;
  toggleLaunchFreeMode: (enabled: boolean) => Promise<{ success: boolean; error?: string; message?: string }>;
  launchSpeedDating: () => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    activatedCount?: number;
    alreadyLaunched?: boolean;
  }>;
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

function hasSavedOwnerSession(): boolean {
  const savedToken = localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
  const savedUserId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`);
  if (!savedToken || !savedUserId) return false;
  try {
    const savedUsersRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
    if (savedUsersRaw) {
      const parsed = JSON.parse(savedUsersRaw);
      if (Array.isArray(parsed)) {
        const matched = parsed.find((u: any) => (u.UserID || u.userId) === savedUserId);
        const email = (matched?.Email || matched?.email || '').toLowerCase().trim();
        if (email === 'speedmeetlove@gmail.com' && (matched?.IsOwner === true || matched?.isOwner === true)) {
          return true;
        }
      }
    }
  } catch (e) {}
  return false;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const legacyMigratedKey = `${STORAGE_KEY_PREFIX}search_filters_v2_migrated`;
          const needsLegacyPresetMigration = !localStorage.getItem(legacyMigratedKey);
          const updated = parsed.map((u: User) => {
            const initialMatch = INITIAL_USERS.find(iu => iu.UserID === u.UserID);
            const rawMergedPrefs = {
              ...(initialMatch?.Preferences || DEFAULT_SEARCH_PREFERENCES),
              ...(u.Preferences || {}),
            };
            const resolvedPrefs =
              needsLegacyPresetMigration && isLegacyDemoDefaultPreferences(rawMergedPrefs)
                ? { ...DEFAULT_SEARCH_PREFERENCES, interests: [] }
                : normalizeSearchPreferences(rawMergedPrefs);
            return {
              ...(initialMatch || {}),
              ...u,
              Age: u.UserID === 'usr_kristy' ? (u.Age && u.Age >= 18 ? u.Age : 28) : u.Age,
              SubscriptionTier: u.UserID === 'usr_kristy' ? ('Premium Plus' as SubscriptionTier) : u.SubscriptionTier,
              Preferences: resolvedPrefs,
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
          if (needsLegacyPresetMigration) {
            localStorage.setItem(legacyMigratedKey, '1');
          }
          const existingIds = new Set(updated.map((u: User) => u.UserID));
          const missingUsers = INITIAL_USERS.filter(iu => !existingIds.has(iu.UserID));
          return [...updated, ...missingUsers];
        }
      } catch (e) {}
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const savedToken = localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    const savedUser = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`);
    if (savedToken && savedUser) return savedUser;
    return '';
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`) || null;
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

  // Application Mode: Demonstration Mode (Owner-only testing sandbox) vs Production Mode (Default for all visitors/testers/members)
  const [rawAppMode, setAppModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`);
    if (saved === 'demonstration' && hasSavedOwnerSession()) {
      return 'demonstration';
    }
    if (saved && saved !== 'production') {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
    }
    return 'production';
  });

  const currentUser: User | null = useMemo(() => {
    if (!currentUserId) return null;
    const found = users.find(u => u.UserID === currentUserId);
    if (found) return found;
    const initialFound = INITIAL_USERS.find(u => u.UserID === currentUserId);
    if (initialFound) return initialFound;
    return null;
  }, [currentUserId, users]);

  const isAuthenticated = Boolean(currentUser && authToken);

  const isOwner = Boolean(
    isAuthenticated &&
    currentUser &&
    currentUser.IsOwner === true &&
    currentUser.Email &&
    currentUser.Email.toLowerCase().trim() === 'speedmeetlove@gmail.com'
  );

  const appMode: AppMode = isOwner ? rawAppMode : 'production';

  const PUBLIC_VIEW_PATHS: Partial<Record<AppView, string>> = {
    pricing: '/pricing',
    privacy: '/privacy',
    delete_account: '/delete-account',
    child_safety: '/child-safety',
    terms: '/terms',
    acceptable_use: '/acceptable-use',
    refund_policy: '/refund-policy',
    law_enforcement: '/law-enforcement',
    contact: '/contact',
  };

  const getViewFromPathname = (pathname: string): AppView | null => {
    const normalized = (pathname || '/').replace(/\/+$/, '') || '/';
    for (const [view, routePath] of Object.entries(PUBLIC_VIEW_PATHS)) {
      if (normalized === routePath) {
        return view as AppView;
      }
    }
    return null;
  };

  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const publicView = getViewFromPathname(window.location.pathname);
      if (publicView) {
        return publicView;
      }
    }
    const ownerHint = hasSavedOwnerSession();
    const initialMode: AppMode =
      localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) === 'demonstration' && ownerHint
        ? 'demonstration'
        : 'production';
    const initialToken = localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    const initialUserId = (initialToken && localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`)) || '';
    if (initialUserId) {
      const savedSession = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
      if (savedSession) {
        try {
          const parsed: LiveSessionState = JSON.parse(savedSession);
          if (parsed.mode === initialMode && parsed.currentView === 'live') return 'live';
        } catch (e) {}
      }
    }
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}currentView_${initialMode}`);
    if ((saved === 'tables' || saved === 'owner_reports' || saved === 'owner_users' || saved === 'owner_waitlist') && !ownerHint) {
      return 'home';
    }
    if (!initialToken) {
      // Logged-out visitors always start on the public home page (or a public
      // info page). A member-area view saved from an earlier visit must not
      // greet a signed-out visitor with a sign-in wall on arrival; the gate
      // appears only when they tap into a member area.
      const publicViews: AppView[] = ['home', ...(Object.keys(PUBLIC_VIEW_PATHS) as AppView[])];
      if (saved && publicViews.includes(saved as AppView)) {
        return saved as AppView;
      }
      return 'home';
    }
    return (saved as AppView) || 'home';
  });

  const [selectedEventId, setSelectedEventIdState] = useState<string>(() => {
    const initialMode: AppMode =
      localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) === 'demonstration' && hasSavedOwnerSession()
        ? 'demonstration'
        : 'production';
    const initialToken = localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    const initialUserId = (initialToken && localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`)) || '';
    if (initialUserId) {
      const savedSession = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
      if (savedSession) {
        try {
          const parsed: LiveSessionState = JSON.parse(savedSession);
          if (parsed.mode === initialMode && parsed.eventId) return parsed.eventId;
        } catch (e) {}
      }
    }
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}selectedEventId_${initialMode}`);
    if (saved) return saved;
    return initialMode === 'production' ? 'evt_staging_dev' : 'evt_live_now';
  });

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const [activeRoundIndex, setActiveRoundIndexState] = useState<number>(() => {
    const initialMode: AppMode =
      localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) === 'demonstration' && hasSavedOwnerSession()
        ? 'demonstration'
        : 'production';
    const initialToken = localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    const initialUserId = (initialToken && localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`)) || '';
    if (initialUserId) {
      const savedSession = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
      if (savedSession) {
        try {
          const parsed: LiveSessionState = JSON.parse(savedSession);
          const now = Date.now();
          if (parsed.mode === initialMode && parsed.lastActive && (now - parsed.lastActive < 30 * 60 * 1000) && typeof parsed.roundIndex === 'number') {
            return parsed.roundIndex;
          }
        } catch (e) {}
      }
    }
    return 0;
  });

  const [liveSession, setLiveSessionState] = useState<LiveSessionState | null>(() => {
    const initialMode: AppMode =
      localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) === 'demonstration' && hasSavedOwnerSession()
        ? 'demonstration'
        : 'production';
    const initialToken = localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    const initialUserId = (initialToken && localStorage.getItem(`${STORAGE_KEY_PREFIX}current_user_id`)) || '';
    if (initialUserId) {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}session_${initialMode}_${initialUserId}`);
      if (saved) {
        try {
          const parsed: LiveSessionState = JSON.parse(saved);
          const now = Date.now();
          if (parsed.mode === initialMode && parsed.lastActive && (now - parsed.lastActive < 30 * 60 * 1000)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return null;
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'pink' } | null>(null);
  const [reportModalTarget, setReportModalTargetState] = useState<User | null>(null);
  const [reportModalContext, setReportModalContext] = useState<ReportContextPayload | null>(null);
  const setReportModalTarget = useCallback((user: User | null, context?: ReportContextPayload | null) => {
    setReportModalTargetState(user);
    setReportModalContext(user ? (context ?? null) : null);
  }, []);
  const [activeSecondDateSession, setActiveSecondDateSession] = useState<SecondDateSession | null>(null);
  const [secondDateSessions, setSecondDateSessions] = useState<SecondDateSession[]>([]);
  const [waitlistJoined, setWaitlistJoined] = useState<boolean>(false);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntrySummary | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState<boolean>(false);
  const [confirmedLaunchEvents, setConfirmedLaunchEvents] = useState<SpeedEvent[]>([]);
  const [ownerLaunchEvents, setOwnerLaunchEvents] = useState<SpeedEvent[]>([]);
  const [isFreeDuringLaunch, setIsFreeDuringLaunch] = useState<boolean>(true);
  const [paidMembershipsReturnedAt, setPaidMembershipsReturnedAt] = useState<number | null>(null);
  const [speedDatingLaunched, setSpeedDatingLaunched] = useState<boolean>(false);
  const [speedDatingLaunchedAt, setSpeedDatingLaunchedAt] = useState<number | null>(null);
  const [first50PreservedCount, setFirst50PreservedCount] = useState<number>(0);
  const [launchModeEnvOverride, setLaunchModeEnvOverride] = useState<boolean>(false);

  const refreshLaunchMode = useCallback(async () => {
    try {
      const res = await fetch('/api/launch-mode');
      if (res.ok) {
        const data = await res.json();
        if (data?.success && typeof data.freeDuringLaunch === 'boolean') {
          setIsFreeDuringLaunch(data.freeDuringLaunch);
          setPaidMembershipsReturnedAt(
            typeof data.paidMembershipsReturnedAt === 'number' ? data.paidMembershipsReturnedAt : null
          );
          setSpeedDatingLaunched(Boolean(data.speedDatingLaunched));
          setSpeedDatingLaunchedAt(
            typeof data.speedDatingLaunchedAt === 'number' ? data.speedDatingLaunchedAt : null
          );
          setFirst50PreservedCount(
            typeof data.first50PreservedCount === 'number' ? data.first50PreservedCount : 0
          );
          setLaunchModeEnvOverride(Boolean(data.envOverrideActive));
        }
      }
    } catch {
      // Keep default launch-free status if offline
    }
  }, []);

  useEffect(() => {
    refreshLaunchMode();
  }, [refreshLaunchMode]);

  const setAppMode = (mode: AppMode) => {
    if (!isOwner) {
      if (rawAppMode !== 'production') {
        setAppModeState('production');
      }
      localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
      return;
    }

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

    if (isOwner) {
      showNotification(
        mode === 'demonstration'
          ? 'Switched to Demonstration Mode (Sandbox Testing).'
          : 'Switched to Production Mode (Live Speed Dating). Real consenting members only.',
        'pink'
      );
    }
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
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!isOwner || !token) return;
    try {
      const res = await fetch(`/api/events/${eventId}/simulate-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
    if (event.EventID === 'evt_staging_dev' || event.EventID.startsWith('evt_staging_')) {
      return Boolean(currentUser && ['usr_kristy', 'usr_me', 'usr_01', 'usr_02', 'usr_03'].includes(currentUser.UserID));
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
    if (!currentUser) {
      return {
        allowed: false,
        reason: 'Please sign in to participate in speed dating rounds.',
      };
    }

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

  // Enforce Production mode silently for all non-owners (testers, other members, signed-out visitors)
  useEffect(() => {
    if (!isOwner) {
      if (rawAppMode !== 'production') {
        setAppModeState('production');
      }
      if (localStorage.getItem(`${STORAGE_KEY_PREFIX}appMode`) !== 'production') {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
      }
      if (currentView === 'tables' || currentView === 'owner_reports' || currentView === 'owner_users' || currentView === 'owner_waitlist') {
        setCurrentViewState('home');
      }
    }
  }, [isOwner, rawAppMode, currentView]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null);
  const [isEmailVerificationModalOpen, setIsEmailVerificationModalOpen] = useState<boolean>(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState<boolean | null>(null);

  const openAuthModal = useCallback((tab: 'signin' | 'signup' = 'signin') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const setCurrentView = (view: AppView) => {
    const ownerOnlyViews: AppView[] = ['tables', 'owner_reports', 'owner_users', 'owner_waitlist'];
    const safeView: AppView = ownerOnlyViews.includes(view) && !isOwner ? 'home' : view;
    setCurrentViewState(safeView);
    if (typeof window !== 'undefined') {
      const targetPath = PUBLIC_VIEW_PATHS[view];
      if (targetPath) {
        if (window.location.pathname !== targetPath) {
          window.history.pushState(null, '', targetPath);
        }
      } else if (getViewFromPathname(window.location.pathname) !== null) {
        window.history.pushState(null, '', '/');
      }
    }
    const isEphemeralOrPublicDoc =
      Boolean(PUBLIC_VIEW_PATHS[safeView]) ||
      safeView === 'owner_reports' ||
      safeView === 'owner_users' ||
      safeView === 'owner_waitlist' ||
      safeView === 'tables';
    if (!isEphemeralOrPublicDoc) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}currentView_${appMode}`, safeView);
    }
    if (liveSession && liveSession.mode === appMode) {
      saveLiveSession({ currentView: safeView });
    }
  };

  // Sync browser back/forward buttons with currentView
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const publicView = getViewFromPathname(window.location.pathname);
        if (publicView) {
          setCurrentViewState(publicView);
        } else {
          const saved = (localStorage.getItem(`${STORAGE_KEY_PREFIX}currentView_${appMode}`) as AppView) || 'home';
          const isDocView = Boolean(PUBLIC_VIEW_PATHS[saved]) || saved === 'tables';
          setCurrentViewState(isDocView ? 'home' : saved);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [appMode]);

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
    if (!currentUser) return;
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
  }, [currentUser?.UserID, selectedEventId, activeRoundIndex, appMode]);

  const clearLiveSession = useCallback(() => {
    setLiveSessionState(null);
    if (currentUser?.UserID) {
      localStorage.removeItem(getSessionStorageKey(appMode, currentUser.UserID));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}session_${currentUser.UserID}`);
      fetch(`/api/session/${currentUser.UserID}?mode=${appMode}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}active_live_session`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}activeRoundIndex_${appMode}`);
    setActiveRoundIndexState(0);
  }, [currentUser?.UserID, appMode]);

  const syncLiveSessionFromServer = async (): Promise<LiveSessionState | null> => {
    if (!currentUser?.UserID) return null;
    try {
      const res = await fetch(`/api/session/${currentUser.UserID}?mode=${appMode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.session) {
          const session = data.session as LiveSessionState;
          const now = Date.now();
          // Abandoned or completed sessions older than 30 minutes must not be revived
          if (session.lastActive && (now - session.lastActive > 30 * 60 * 1000)) {
            clearLiveSession();
            return null;
          }
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
        if (typeof window !== 'undefined' && getViewFromPathname(window.location.pathname) !== null) {
          return;
        }
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

  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'pink' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  // Access rule 1: Live Speed Dating is free for all signed-in members during launch;
  // once paid memberships return, requires Premium Plus ($14.99/mo), active First-50 Premium+ reward, or Free Tester access
  const canAccessLiveSpeedDating = (user?: User | null): boolean => {
    const target = user !== undefined ? user : currentUser;
    if (!target) return false;
    if (isFreeDuringLaunch) return true;
    // Free tester access is kept strictly separate from paid subscription status
    if (target.IsTester || target.IsOwner || isOwner) return true;
    if (target.LaunchOfferActive && (!target.LaunchOfferExpiresAt || Date.now() < target.LaunchOfferExpiresAt)) {
      return true;
    }
    return target.SubscriptionTier === 'Premium Plus';
  };

  // Access rule 2: Private messaging only after mutual match; free for all signed-in members during launch,
  // and requires eligible paid membership (Premium / Premium Plus), First-50 reward, or Free Tester once paid returns
  const canAccessMessaging = (match: Match): { allowed: boolean; reason?: string } => {
    if (!currentUser) {
      return {
        allowed: false,
        reason: 'Please sign in to exchange private messages.',
      };
    }

    const partnerId = match.UserA === currentUser.UserID ? match.UserB : match.UserA;
    if (blockedUserIds.includes(partnerId)) {
      return {
        allowed: false,
        reason: 'Messaging is unavailable because this member is blocked.',
      };
    }

    if (isFreeDuringLaunch) {
      return { allowed: true };
    }

    const isPaidOrTester = (u: User) =>
      u.SubscriptionTier === 'Premium' ||
      u.SubscriptionTier === 'Premium Plus' ||
      Boolean(u.LaunchOfferActive && (!u.LaunchOfferExpiresAt || Date.now() < u.LaunchOfferExpiresAt)) ||
      Boolean(u.IsTester) ||
      Boolean(u.IsOwner) ||
      isOwner;

    const partner = users.find(u => u.UserID === partnerId);

    if (!isPaidOrTester(currentUser)) {
      return {
        allowed: false,
        reason: 'You need an eligible paid membership (Premium $9.99/mo or Premium Plus $14.99/mo) to exchange private messages. Free allows browsing only.',
      };
    }

    if (!partner || !isPaidOrTester(partner)) {
      return {
        allowed: false,
        reason: `${partner?.FirstName || 'Your match'} has a Free membership. Private messaging unlocks only when both members have an eligible paid membership.`,
      };
    }

    return { allowed: true };
  };

  const switchUser = (userId: string) => {
    if (!isOwner || appMode === 'production') {
      if (isOwner) {
        showNotification('Member switching is disabled in Production. Sign out and sign in with your own account.', 'pink');
      }
      return;
    }
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

  const updateUserProfile = async (updated: Partial<User>) => {
    if (!currentUser) return;
    // Immediately update local React state for responsive UX
    setUsers(prev =>
      prev.map(u => (u.UserID === currentUser.UserID ? { ...u, ...updated } : u))
    );

    // Persist to server using authenticated user session
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (token) {
      try {
        const payload: any = {};
        if (updated.FirstName !== undefined) payload.firstName = updated.FirstName;
        if (updated.LastName !== undefined) payload.lastName = updated.LastName;
        if (updated.Age !== undefined) payload.age = updated.Age;
        if (updated.Gender !== undefined) payload.gender = updated.Gender;
        if (updated.InterestedIn !== undefined) payload.interestedIn = updated.InterestedIn;
        if (updated.Location !== undefined) payload.location = updated.Location;
        if (updated.Occupation !== undefined) payload.occupation = updated.Occupation;
        if (updated.Bio !== undefined) payload.bio = updated.Bio;
        if (updated.Interests !== undefined) payload.interests = updated.Interests;
        if (updated.IcebreakerAnswer !== undefined) payload.icebreakerAnswer = updated.IcebreakerAnswer;
        if (updated.AvatarColor !== undefined) payload.avatarColor = updated.AvatarColor;
        if (updated.HairColor !== undefined) payload.hairColor = updated.HairColor;
        if (updated.HeightInches !== undefined) payload.heightInches = updated.HeightInches;
        if (updated.EyeColor !== undefined) payload.eyeColor = updated.EyeColor;
        if (updated.RelationshipIntent !== undefined) payload.relationshipIntent = updated.RelationshipIntent;
        if (updated.Smoking !== undefined) payload.smoking = updated.Smoking;
        if (updated.Drinking !== undefined) payload.drinking = updated.Drinking;
        if (updated.Children !== undefined) payload.children = updated.Children;
        if (updated.PrivacySettings !== undefined) payload.privacySettings = updated.PrivacySettings;
        if (updated.Preferences !== undefined) payload.preferences = updated.Preferences;
        if (updated.ProfilePhoto !== undefined) payload.profilePhoto = updated.ProfilePhoto || null;

        const res = await fetch('/api/account/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.user) {
          const normalized = normalizeUserFromApi(data.user);
          setUsers(prev => prev.map(u => (u.UserID === normalized.UserID ? normalized : u)));
        }
      } catch (err) {
        console.warn('Failed to save profile update to server:', err);
      }
    }

    showNotification('Profile updated successfully!', 'success');
  };

  const updateAnyUser = (userId: string, updated: Partial<User>) => {
    if (!currentUser || userId !== currentUser.UserID) {
      showNotification('Permission denied: You can only edit your own profile.', 'info');
      return;
    }
    void updateUserProfile(updated);
  };

  const updateUserPreferences = (userId: string, prefs: Partial<UserPreferences>) => {
    if (!currentUser || userId !== currentUser.UserID) {
      showNotification('Permission denied: You can only update your own search preferences.', 'info');
      return;
    }
    setUsers(prev =>
      prev.map(u => {
        if (u.UserID === currentUser.UserID) {
          const updatedPrefs = normalizeSearchPreferences({
            ...u.Preferences,
            ...prefs,
          });
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
    if (appMode === 'production' || !isOwner) {
      showNotification('Plan upgrades cannot be simulated in Production.', 'pink');
      return;
    }
    if (!currentUser) return;
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
    if (!currentUser) {
      openAuthModal('signin');
      return { isMatch: false };
    }
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
          isFreeDuringLaunch ||
          ((currentUser.SubscriptionTier === 'Premium' ||
            currentUser.SubscriptionTier === 'Premium Plus' ||
            Boolean(currentUser.LaunchOfferActive)) &&
            (partner.SubscriptionTier === 'Premium' ||
              partner.SubscriptionTier === 'Premium Plus' ||
              Boolean(partner.LaunchOfferActive)));

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
    if (!currentUser) return;
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

  // Safety: Report User (strictly awaits server persistence before confirming)
  const reportUser = async (
    targetUserId: string,
    reason: UserReport['Reason'],
    notes: string,
    alsoBlock: boolean,
    options?: {
      context?: ReportContextPayload | null;
      endActiveCall?: boolean;
    }
  ): Promise<{
    success: boolean;
    reportId?: string;
    urgent?: boolean;
    urgencyReasons?: string[];
    notificationDispatch?: ReportNotificationDispatch;
    error?: string;
  }> => {
    if (!currentUser) {
      openAuthModal('signin');
      return { success: false, error: 'Please sign in to submit a safety report.' };
    }

    const ctx = options?.context ?? reportModalContext;
    const endActiveCall = Boolean(options?.endActiveCall);

    try {
      const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportedUserId: targetUserId,
          reason,
          notes,
          alsoBlock,
          reporterId: currentUser.UserID,
          source: ctx?.source || 'other',
          eventId: ctx?.eventId,
          eventName: ctx?.eventName,
          roundIndex: ctx?.roundIndex,
          roundNumber: ctx?.roundNumber,
          roundId: ctx?.roundId,
          participants: ctx?.participants,
          callEndedOnReport: endActiveCall,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const errMsg = data.error || `Failed to save report (HTTP ${res.status}). Please retry.`;
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      }

      const newReport: UserReport = {
        ReportID: data.reportId || `rep_${Date.now()}`,
        ReportedUserID: targetUserId,
        ReporterID: currentUser.UserID,
        Reason: reason,
        Notes: notes,
        Timestamp: data.report?.timestamp || new Date().toISOString(),
        EventID: ctx?.eventId,
        EventName: ctx?.eventName,
        RoundNumber: ctx?.roundNumber,
        Urgent: Boolean(data.urgent),
      };

      setReports(prev => [newReport, ...prev]);

      if (alsoBlock) {
        blockUser(targetUserId);
      }

      if (endActiveCall && ctx?.onAfterSubmitEndCall) {
        await ctx.onAfterSubmitEndCall();
      }

      showNotification(
        data.urgent
          ? 'Report saved and flagged as urgent for founder/moderator review.'
          : data.message || 'Report saved securely for platform owner review.',
        'success'
      );
      setReportModalTarget(null);

      return {
        success: true,
        reportId: data.reportId,
        urgent: Boolean(data.urgent),
        urgencyReasons: Array.isArray(data.urgencyReasons) ? data.urgencyReasons : [],
        notificationDispatch: data.notificationDispatch,
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error while submitting report. Please try again.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    }
  };

  const addEvent = (
    eventData: Omit<SpeedEvent, 'EventID' | 'ParticipantsList' | 'RoundsGenerated' | 'EventStatus'>
  ): SpeedEvent => {
    const newEvent: SpeedEvent = {
      ...eventData,
      EventID: `evt_${Date.now()}`,
      ParticipantsList: currentUser ? [currentUser.UserID] : [],
      RoundsGenerated: false,
      EventStatus: 'Upcoming',
      RoundDurationSeconds: 300,
    };
    setEvents(prev => [newEvent, ...prev]);
    showNotification(`Friday Speed Dating event "${newEvent.EventName}" created!`, 'success');
    return newEvent;
  };

  const registerForEvent = (eventId: string): { success: boolean; message: string } => {
    if (!currentUser) {
      openAuthModal('signin');
      return { success: false, message: 'Please sign in or create an account to register.' };
    }
    const targetEvent = events.find(e => e.EventID === eventId);
    if (!targetEvent) return { success: false, message: 'Event not found' };

    if (!canAccessLiveSpeedDating(currentUser)) {
      showNotification('Event membership coming soon.', 'pink');
      return {
        success: false,
        message: 'Event membership coming soon.',
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

    if (targetEvent.IsManualLaunch || eventId.startsWith('evt_launch_')) {
      const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
      if (token) {
        fetch(`/api/launch-events/${eventId}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    }

    showNotification(
      `✓ Registration Confirmed! You are registered for ${targetEvent.EventName} (${targetEvent.DayOfWeek} at 7:00 PM EST).`,
      'success'
    );
    return { success: true, message: 'Successfully registered!' };
  };

  const registerForMultipleEvents = (eventIds: string[]): { registeredCount: number; message: string } => {
    if (!currentUser) {
      openAuthModal('signin');
      return { registeredCount: 0, message: 'Please sign in or create an account to register.' };
    }
    if (!canAccessLiveSpeedDating(currentUser)) {
      showNotification('Event membership coming soon.', 'pink');
      setCurrentView('pricing');
      return { registeredCount: 0, message: 'Event membership coming soon.' };
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
    if (!currentUser) return;

    // 1. Notify server to remove user from matchmaking queue, readiness consent, and active sessions
    if (currentUser?.UserID) {
      fetch(`/api/events/${eventId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.UserID }),
      }).catch(err => console.warn('Server leave event call error:', err));

      if (eventId.startsWith('evt_launch_')) {
        const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
        if (token) {
          fetch(`/api/launch-events/${eventId}/leave`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      }
    }

    // 2. Clear live session and reset active round index to 0
    clearLiveSession();
    setActiveRoundIndexState(0);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}activeRoundIndex_${appMode}`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}activeRoundIndex_demonstration`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}activeRoundIndex_production`);

    // 3. Clear all session progression and early exit keys
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && (k.includes(eventId) || k.startsWith('sml_ended_early_') || k.startsWith('sml_round_completed_') || k.startsWith('sml_auto_adv_'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
      }
    } catch (e) {}

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
      `You left ${targetEvent?.EventName || 'the event'}. Your queue presence and live round were cleared. Your saved votes and matches remain safe!`,
      'info'
    );
  };

  const handlePartnerUnavailable = (roundId: string): { newPartner?: User; success: boolean } => {
    if (!currentUser) return { success: false };
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
    if (!currentUser) return [];
    const targetEvent = events.find(e => e.EventID === eventId);
    if (!targetEvent) return [];

    let candidatePartners: User[] = [];

    if (eventId === 'evt_staging_dev' || eventId.startsWith('evt_staging_')) {
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
      // Production mode: Connect real consenting, mutually compatible registered members only
      candidatePartners = users.filter(
        u =>
          targetEvent.ParticipantsList.includes(u.UserID) &&
          u.UserID !== currentUser.UserID &&
          !blockedUserIds.includes(u.UserID) &&
          areUsersCompatible(currentUser, u, targetEvent)
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

    // Ensure candidatePartners has at least 5 daters in demonstration mode
    const targetRoundCount = targetEvent.TotalRounds || 5;
    if (appMode === 'demonstration' && candidatePartners.length < targetRoundCount) {
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

    for (let index = 0; index < targetRoundCount; index++) {
      const partner = candidatePartners[index];
      const roundStart = new Date(baseTime + index * (duration + 120) * 1000).toISOString();
      const roundEnd = new Date(baseTime + (index * (duration + 120) + duration) * 1000).toISOString();

      newRounds.push({
        RoundID: `rnd_${eventId}_${index + 1}_${Date.now().toString(36)}`,
        EventID: eventId,
        RoundNumber: index + 1,
        UserA: meId,
        UserB: partner ? partner.UserID : '',
        RoundStart: roundStart,
        RoundEnd: roundEnd,
        UserA_Like: null,
        UserB_Like: partner && appMode === 'demonstration' ? Math.random() > 0.35 : null,
        UserA_Notes: '',
        UserB_Notes: partner && appMode === 'demonstration' ? `Enjoyed connecting on ${targetEvent.DayOfWeek} night!` : '',
      });
    }

    setRounds(prev => {
      const filtered = prev.filter(r => r.EventID !== eventId);
      const updated = [...filtered, ...newRounds];
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}rounds`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setEvents(prev =>
      prev.map(e => (e.EventID === eventId ? { ...e, RoundsGenerated: true } : e))
    );

    return newRounds;
  };

  const repairEventRounds = useCallback((eventId: string): Round[] => {
    if (!currentUser) return [];
    const targetEvent = events.find(e => e.EventID === eventId);
    const targetRoundCount = targetEvent?.TotalRounds || 5;
    const meId = currentUser.UserID;

    // Find rounds for this event that involve the current user
    const userEventRounds = rounds.filter(
      r => r.EventID === eventId && (r.UserA === meId || r.UserB === meId)
    );
    const relevantRounds = userEventRounds.length > 0 ? userEventRounds : rounds.filter(r => r.EventID === eventId);

    // Existing round numbers
    const existingNumbers = new Set(relevantRounds.map(r => r.RoundNumber));

    // If already has targetRoundCount rounds, return sorted rounds
    if (existingNumbers.size >= targetRoundCount) {
      return [...relevantRounds].sort((a, b) => a.RoundNumber - b.RoundNumber);
    }

    // Existing partner IDs to avoid duplicate dates with the same partner
    const existingPartners = new Set<string>();
    relevantRounds.forEach(r => {
      const pid = r.UserA === meId ? r.UserB : r.UserA;
      if (pid) existingPartners.add(pid);
    });

    // Determine available partners
    let availablePartners: User[] = [];
    if (appMode === 'production') {
      // In production, NEVER invent or pair incompatible participants
      const isStagingEvt = eventId === 'evt_staging_dev' || eventId.startsWith('evt_staging_');
      if (targetEvent) {
        availablePartners = users.filter(
          u =>
            targetEvent.ParticipantsList.includes(u.UserID) &&
            u.UserID !== meId &&
            !blockedUserIds.includes(u.UserID) &&
            !existingPartners.has(u.UserID) &&
            (isStagingEvt || areUsersCompatible(currentUser, u, targetEvent))
        );
      }
    } else {
      // In demonstration mode: select from matching demo users
      availablePartners = users.filter(
        u =>
          u.UserID !== meId &&
          !blockedUserIds.includes(u.UserID) &&
          !existingPartners.has(u.UserID)
      );
    }

    const duration = targetEvent?.RoundDurationSeconds || 300;
    const breakDuration = targetEvent?.BreakDurationSeconds || 120;
    const baseTime = Date.now();

    const missingSlots: Round[] = [];
    let partnerIdx = 0;

    for (let rNum = 1; rNum <= targetRoundCount; rNum++) {
      if (!existingNumbers.has(rNum)) {
        let partnerId = '';
        if (appMode === 'production') {
          if (partnerIdx < availablePartners.length) {
            partnerId = availablePartners[partnerIdx].UserID;
            partnerIdx++;
          } else {
            // No eligible registered partner available: leave blank for real matchmaking
            partnerId = '';
          }
        } else {
          if (partnerIdx < availablePartners.length) {
            partnerId = availablePartners[partnerIdx].UserID;
            partnerIdx++;
          } else {
            const fallback = users.find(u => u.UserID !== meId && !blockedUserIds.includes(u.UserID));
            partnerId = fallback ? fallback.UserID : 'usr_02';
          }
        }

        const roundStart = new Date(baseTime + (rNum - 1) * (duration + breakDuration) * 1000).toISOString();
        const roundEnd = new Date(baseTime + ((rNum - 1) * (duration + breakDuration) + duration) * 1000).toISOString();

        missingSlots.push({
          RoundID: `rnd_${eventId}_${rNum}_slot_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          EventID: eventId,
          RoundNumber: rNum,
          UserA: meId,
          UserB: partnerId,
          RoundStart: roundStart,
          RoundEnd: roundEnd,
          UserA_Like: null,
          UserB_Like: partnerId && appMode === 'demonstration' ? true : null,
          UserA_Notes: '',
          UserB_Notes: partnerId && appMode === 'demonstration' ? `Great connecting on Round ${rNum}!` : '',
        });
      }
    }

    if (missingSlots.length > 0) {
      const updatedRounds = [...rounds, ...missingSlots];
      setRounds(updatedRounds);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}rounds`, JSON.stringify(updatedRounds));
      } catch (e) {}
      return [...relevantRounds, ...missingSlots].sort((a, b) => a.RoundNumber - b.RoundNumber);
    }

    return [...relevantRounds].sort((a, b) => a.RoundNumber - b.RoundNumber);
  }, [events, rounds, currentUser?.UserID, appMode, users, blockedUserIds]);

  const startEventLive = (eventId: string): boolean => {
    if (!currentUser) {
      openAuthModal('signin');
      return false;
    }
    const targetEvent = events.find(e => e.EventID === eventId);
    if (!targetEvent) return false;

    if (!canAccessLiveSpeedDating(currentUser)) {
      showNotification('Event membership coming soon.', 'pink');
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
    if (eventId === 'evt_staging_dev' || eventId.startsWith('evt_staging_') || myRounds.length < 5) {
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

    setSelectedEventId(eventId);
    setActiveRoundIndex(targetRoundIdx);
    setCurrentView('live');

    const activeRound = eventRounds[targetRoundIdx];
    const rawPartnerId = activeRound ? (activeRound.UserA === currentUser.UserID ? activeRound.UserB : activeRound.UserA) : '';
    const isStagingEvt = eventId === 'evt_staging_dev' || eventId.startsWith('evt_staging_');
    const partnerObj = rawPartnerId ? users.find(u => u.UserID === rawPartnerId) : undefined;
    const isPartnerValid =
      Boolean(partnerObj) &&
      (appMode !== 'production' || isStagingEvt || areUsersCompatible(currentUser, partnerObj, targetEvent));
    const partnerId = isPartnerValid ? rawPartnerId : '';
    const initialStage = partnerId ? 'call' : 'waiting_room';

    // Preserve existing roundStartedAt and roundExpiresAt if re-entering an active session
    const hasActiveRoundTimer = Boolean(
      liveSession &&
      liveSession.eventId === eventId &&
      liveSession.roundIndex === targetRoundIdx &&
      liveSession.roundExpiresAt &&
      Date.now() < liveSession.roundExpiresAt
    );

    saveLiveSession({
      userId: currentUser.UserID,
      eventId,
      roundIndex: targetRoundIdx,
      stage: hasActiveRoundTimer ? (liveSession?.stage || initialStage) : initialStage,
      roundStartedAt: hasActiveRoundTimer ? liveSession!.roundStartedAt : Date.now(),
      roundExpiresAt: hasActiveRoundTimer ? liveSession!.roundExpiresAt : (Date.now() + 300 * 1000),
      breakStartedAt: hasActiveRoundTimer ? liveSession?.breakStartedAt || null : null,
      breakExpiresAt: hasActiveRoundTimer ? liveSession?.breakExpiresAt || null : null,
      roundDurationSeconds: 300,
      breakDurationSeconds: 120,
      vote: hasActiveRoundTimer ? liveSession?.vote || null : null,
      notes: hasActiveRoundTimer ? liveSession?.notes || '' : '',
      partnerId,
      currentView: 'live',
      lastActive: Date.now(),
      mode: appMode,
      hasEndedEarly: hasActiveRoundTimer ? Boolean(liveSession?.hasEndedEarly) : false,
    });

    showNotification(
      initialStage === 'call'
        ? `${targetEvent.EventName} is LIVE! 5-minute video round ${targetRoundIdx + 1} started.`
        : `${targetEvent.EventName} is LIVE! Waiting for a compatible participant...`,
      'pink'
    );
    return true;
  };

  const submitRoundDecision = (
    roundId: string,
    like: boolean,
    notes: string
  ): { isMatch: boolean; partner?: User } => {
    if (!currentUser) return { isMatch: false };
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
          isFreeDuringLaunch ||
          ((currentUser.SubscriptionTier === 'Premium' ||
            currentUser.SubscriptionTier === 'Premium Plus' ||
            Boolean(currentUser.LaunchOfferActive)) &&
            (targetPartner.SubscriptionTier === 'Premium' ||
              targetPartner.SubscriptionTier === 'Premium Plus' ||
              Boolean(targetPartner.LaunchOfferActive)));

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
    if (!currentUser || !canAccessLiveSpeedDating(currentUser)) {
      showNotification('Round Skip is exclusive to Premium Plus members ($14.99/mo)!', 'pink');
      return { success: false, message: 'Premium Plus required to skip rounds.' };
    }

    setRounds(prev =>
      prev.map(r =>
        r.RoundID === roundId ? { ...r, SkipTriggeredBy: currentUser.UserID } : r
      )
    );
    showNotification('Round skipped. Advancing to next round...', 'info');
    return { success: true, message: 'Round skipped' };
  };

  const requestReplay = (roundId: string): { success: boolean; message: string } => {
    if (!currentUser || !canAccessLiveSpeedDating(currentUser)) {
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
    if (!currentUser) {
      openAuthModal('signin');
      return { success: false, reason: 'Sign-in required' };
    }
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

    // Call server endpoint to enforce server-side access
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (token) {
      fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId, text: text.trim(), recipientId: partnerId }),
      })
        .then(async res => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            if (res.status === 403 && errData.code === 'SUBSCRIPTION_REQUIRED') {
              showNotification(errData.error || 'Messaging requires an eligible paid subscription.', 'pink');
              setCurrentView('pricing');
            }
          }
        })
        .catch(() => null);
    }

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
    if (!currentUser) return [];
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
  }, [currentUser?.UserID, selectedEventId]);

  const [dismissedInvitationIds, setDismissedInvitationIds] = useState<string[]>([]);

  useEffect(() => {
    refreshSecondDateSessions();
    const interval = setInterval(refreshSecondDateSessions, 3500);

    const handleReactivation = () => {
      if (document.visibilityState === 'visible') {
        refreshSecondDateSessions();
      }
    };
    document.addEventListener('visibilitychange', handleReactivation);
    window.addEventListener('focus', handleReactivation);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleReactivation);
      window.removeEventListener('focus', handleReactivation);
    };
  }, [refreshSecondDateSessions]);

  const pendingSecondDateCount = useMemo(() => {
    if (!currentUser) return 0;
    return secondDateSessions.filter(s => {
      const isParticipant = s.userA === currentUser.UserID || s.userB === currentUser.UserID;
      if (!isParticipant) return false;
      // Incoming invitation waiting for current user's consent
      if (s.status === 'waiting_for_partner' && s.requestedBy !== currentUser.UserID) return true;
      // Or both agreed, ready to enter
      if (s.status === 'ready_to_start') return true;
      return false;
    }).length;
  }, [secondDateSessions, currentUser?.UserID]);

  const incomingSecondDateInvitation = useMemo(() => {
    if (!currentUser) return null;
    const activePending = secondDateSessions.find(s => {
      const isParticipant = s.userA === currentUser.UserID || s.userB === currentUser.UserID;
      if (!isParticipant) return false;
      if (dismissedInvitationIds.includes(s.sessionId)) return false;
      if (s.status === 'waiting_for_partner' && s.requestedBy !== currentUser.UserID) return true;
      if (s.status === 'ready_to_start') return true;
      return false;
    });
    return activePending || null;
  }, [secondDateSessions, currentUser?.UserID, dismissedInvitationIds]);

  const acceptSecondDateInvitation = async (sessionId: string) => {
    return respondToSecondDate(sessionId, 'accept');
  };

  const declineSecondDateInvitation = async (sessionId: string) => {
    setDismissedInvitationIds(prev => [...prev, sessionId]);
    return respondToSecondDate(sessionId, 'decline');
  };

  const dismissSecondDateInvitation = (sessionId: string) => {
    setDismissedInvitationIds(prev => [...prev, sessionId]);
  };

  const requestSecondDate = async (
    partnerId: string,
    matchId?: string,
    simulatePartnerConsent = false
  ): Promise<{ success: boolean; session?: SecondDateSession; error?: string }> => {
    if (!currentUser) {
      openAuthModal('signin');
      return { success: false, error: 'Sign-in required' };
    }
    if (!canAccessLiveSpeedDating(currentUser)) {
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
    if (!currentUser) return { success: false };
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
    if (!currentUser) {
      openAuthModal('signin');
      return { success: false, error: 'Sign-in required' };
    }
    if (!canAccessLiveSpeedDating(currentUser)) {
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

  const createStagingTestSession = async (): Promise<{ success: boolean; eventId?: string; joinCode?: string; error?: string }> => {
    if (!currentUser) {
      openAuthModal('signin');
      return { success: false, error: 'Sign-in required' };
    }
    try {
      const res = await fetch('/api/staging/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.UserID }),
      });
      const data = await res.json();
      if (data.success && data.eventId) {
        const newEvent: SpeedEvent = {
          EventID: data.eventId,
          EventName: `Staging Test (Code: ${data.joinCode})`,
          DayOfWeek: 'Friday',
          EventDate: new Date().toISOString().split('T')[0],
          EventStartTime: '19:00',
          EventEndTime: '23:59',
          TimeZone: 'On-Demand Staging (America/New_York)',
          MaxParticipants: 4,
          ParticipantsList: [currentUser.UserID],
          EventStatus: 'Upcoming',
          RoundsGenerated: false,
          HostID: 'host_speedmeet_01',
          EventType: 'Straight',
          Description: `Developer 2-Phone LiveKit Staging Test. Join Code: ${data.joinCode}. 5-minute video rounds with 2-minute breaks.`,
          TotalRounds: 5,
          RoundDurationSeconds: 300,
          BreakDurationSeconds: 120,
          MinAge: 21,
          MaxAge: 65,
          LocationName: `Staging Room ${data.joinCode}`,
          ThemeIcon: 'Sparkles',
        };
        setEvents(prev => [...prev.filter(e => e.EventID !== data.eventId), newEvent]);
        setSelectedEventIdState(data.eventId);
        setActiveRoundIndexState(0);
        showNotification(`Fresh test session created! Join Code: ${data.joinCode}. Enter this code on phone 2.`, 'success');
        return { success: true, eventId: data.eventId, joinCode: data.joinCode };
      }
      return { success: false, error: data.error || 'Failed to create staging session' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const joinStagingTestSession = async (joinCode: string): Promise<{ success: boolean; eventId?: string; joinCode?: string; error?: string }> => {
    if (!currentUser) {
      openAuthModal('signin');
      return { success: false, error: 'Sign-in required' };
    }
    try {
      const res = await fetch('/api/staging/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode, userId: currentUser.UserID }),
      });
      const data = await res.json();
      if (data.success && data.eventId) {
        const newEvent: SpeedEvent = {
          EventID: data.eventId,
          EventName: `Staging Test (Code: ${data.joinCode})`,
          DayOfWeek: 'Friday',
          EventDate: new Date().toISOString().split('T')[0],
          EventStartTime: '19:00',
          EventEndTime: '23:59',
          TimeZone: 'On-Demand Staging (America/New_York)',
          MaxParticipants: 4,
          ParticipantsList: [currentUser.UserID],
          EventStatus: 'Upcoming',
          RoundsGenerated: false,
          HostID: 'host_speedmeet_01',
          EventType: 'Straight',
          Description: `Developer 2-Phone LiveKit Staging Test. Join Code: ${data.joinCode}. 5-minute video rounds with 2-minute breaks.`,
          TotalRounds: 5,
          RoundDurationSeconds: 300,
          BreakDurationSeconds: 120,
          MinAge: 21,
          MaxAge: 65,
          LocationName: `Staging Room ${data.joinCode}`,
          ThemeIcon: 'Sparkles',
        };
        setEvents(prev => [...prev.filter(e => e.EventID !== data.eventId), newEvent]);
        setSelectedEventIdState(data.eventId);
        setActiveRoundIndexState(0);
        showNotification(`Connected to staging session ${data.joinCode}! Starting at Round 1.`, 'success');
        return { success: true, eventId: data.eventId, joinCode: data.joinCode };
      }
      return { success: false, error: data.error || 'Session not found or expired' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  // ============================================================================
  // SERVER-AUTHENTICATED SESSION TOKEN & SECURE ACCOUNT DELETION
  // ============================================================================


  // Helper: Normalize user object returned by server API to guarantee all standard User properties
  const normalizeUserFromApi = useCallback((apiUser: any): User => {
    const userId = apiUser.UserID || apiUser.userId || '';
    const email = apiUser.Email || apiUser.email || '';
    const isFounder = userId === 'usr_kristy' || userId === 'usr_kristy_demo' || (email && email.toLowerCase().trim() === 'speedmeetlove@gmail.com');
    const firstName = apiUser.FirstName || apiUser.firstName || 'Member';
    const lastName = apiUser.LastName || apiUser.lastName || '';
    const age = typeof apiUser.Age === 'number' ? apiUser.Age : (typeof apiUser.age === 'number' ? apiUser.age : 28);
    const gender = apiUser.Gender || apiUser.gender || 'Woman';
    const interestedIn = apiUser.InterestedIn || apiUser.interestedIn || 'Men';
    const location = apiUser.Location || apiUser.location || 'New York, NY';
    const occupation = apiUser.Occupation || apiUser.occupation || '';
    const bio = apiUser.Bio || apiUser.bio || '';

    // Photo isolation:
    // Only founder defaults to founder photo. Real members without uploaded photo get empty string (initials avatar).
    // If a member had accidentally cached the founder photo, strip it so their initials display.
    const rawPhoto = apiUser.ProfilePhoto ?? apiUser.profilePhoto ?? null;
    const isFounderPhoto = rawPhoto === '/assets/kristy_exact.png' || rawPhoto === '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png';
    const profilePhoto = (rawPhoto && !isFounderPhoto)
      ? rawPhoto
      : (isFounder ? '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png' : '');

    const subscriptionTier = apiUser.SubscriptionTier || apiUser.subscriptionTier || 'Free';
    const interests = Array.isArray(apiUser.Interests)
      ? apiUser.Interests
      : (Array.isArray(apiUser.interests) ? apiUser.interests : ['Speed Dating', 'Coffee', 'Travel']);

    // Only founder inherits founder seed record; normal registered members have their own isolated record
    const initialMatch = isFounder ? INITIAL_USERS.find(iu => iu.UserID === 'usr_kristy') : undefined;

    const emailVerified = Boolean(apiUser.EmailVerified ?? apiUser.emailVerified);
    const launchOfferGranted = emailVerified && Boolean(apiUser.LaunchOfferGranted ?? apiUser.launchOfferGranted);
    const launchOfferGrantNumber = launchOfferGranted && typeof (apiUser.LaunchOfferGrantNumber ?? apiUser.launchOfferGrantNumber) === 'number'
      ? (apiUser.LaunchOfferGrantNumber ?? apiUser.launchOfferGrantNumber)
      : null;

    return {
      ...(initialMatch || {}),
      UserID: userId,
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      Gender: gender,
      InterestedIn: interestedIn,
      Age: age,
      Location: location,
      ProfilePhoto: profilePhoto,
      SubscriptionTier: subscriptionTier,
      SubscriptionStatus: apiUser.SubscriptionStatus || apiUser.subscriptionStatus || 'none',
      StripeCustomerId: apiUser.StripeCustomerId || apiUser.stripeCustomerId || undefined,
      IsTester: Boolean(apiUser.IsTester || apiUser.isTester),
      IsOwner: Boolean(apiUser.IsOwner ?? apiUser.isOwner),
      EmailVerified: emailVerified,
      EmailVerifiedAt: emailVerified ? (apiUser.EmailVerifiedAt ?? apiUser.emailVerifiedAt ?? null) : null,
      LaunchOfferGranted: launchOfferGranted,
      LaunchOfferGrantNumber: launchOfferGrantNumber,
      LaunchOfferGrantedAt: launchOfferGranted ? (apiUser.LaunchOfferGrantedAt ?? apiUser.launchOfferGrantedAt ?? null) : null,
      LaunchOfferActivatedAt: launchOfferGranted ? (apiUser.LaunchOfferActivatedAt ?? apiUser.launchOfferActivatedAt ?? null) : null,
      LaunchOfferExpiresAt: launchOfferGranted ? (apiUser.LaunchOfferExpiresAt ?? apiUser.launchOfferExpiresAt ?? null) : null,
      LaunchOfferDeferred: launchOfferGranted && Boolean(apiUser.LaunchOfferDeferred ?? apiUser.launchOfferDeferred),
      LaunchOfferRewardTier: launchOfferGranted
        ? (apiUser.LaunchOfferRewardTier ?? apiUser.launchOfferRewardTier ?? 'Premium Plus')
        : null,
      LaunchOfferActive: launchOfferGranted && Boolean(apiUser.LaunchOfferActive ?? apiUser.launchOfferActive),
      LaunchOfferExpired: launchOfferGranted && Boolean(apiUser.LaunchOfferExpired ?? apiUser.launchOfferExpired),
      LaunchOfferCelebrationPending: launchOfferGranted && Boolean(apiUser.LaunchOfferCelebrationPending ?? apiUser.launchOfferCelebrationPending),
      LaunchOfferCelebrationShownAt: launchOfferGranted ? (apiUser.LaunchOfferCelebrationShownAt ?? apiUser.launchOfferCelebrationShownAt ?? null) : null,
      LaunchOfferActivationPending: launchOfferGranted && Boolean(apiUser.LaunchOfferActivationPending ?? apiUser.launchOfferActivationPending),
      LaunchOfferActivationNotifiedAt: launchOfferGranted ? (apiUser.LaunchOfferActivationNotifiedAt ?? apiUser.launchOfferActivationNotifiedAt ?? null) : null,
      Bio: bio,
      Occupation: occupation,
      Interests: interests,
      IcebreakerAnswer: apiUser.IcebreakerAnswer || apiUser.icebreakerAnswer || undefined,
      AvatarColor: apiUser.AvatarColor || apiUser.avatarColor || '#FF2E93',
      HairColor: apiUser.HairColor || apiUser.hairColor || undefined,
      HeightInches: typeof apiUser.HeightInches === 'number' ? apiUser.HeightInches : (typeof apiUser.heightInches === 'number' ? apiUser.heightInches : undefined),
      EyeColor: apiUser.EyeColor || apiUser.eyeColor || undefined,
      RelationshipIntent: apiUser.RelationshipIntent || apiUser.relationshipIntent || undefined,
      Smoking: apiUser.Smoking || apiUser.smoking || undefined,
      Drinking: apiUser.Drinking || apiUser.drinking || undefined,
      Children: apiUser.Children || apiUser.children || undefined,
      PrivacySettings: apiUser.PrivacySettings || apiUser.privacySettings || {
        showHeight: true,
        showSmoking: true,
        showDrinking: true,
        showChildren: true,
        shareLocation: true,
      },
      Preferences: normalizeSearchPreferences(apiUser.Preferences || apiUser.preferences || DEFAULT_SEARCH_PREFERENCES),
      EventHistory: apiUser.EventHistory || apiUser.eventHistory || [],
      MatchHistory: apiUser.MatchHistory || apiUser.matchHistory || [],
    };
  }, []);

  const applyAuthenticatedUserSnapshot = useCallback((rawUser: any, tokenValue: string) => {
    const normalized = normalizeUserFromApi(rawUser);
    const userId = normalized.UserID;
    const userIsOwner = Boolean(
      normalized.IsOwner === true &&
      normalized.Email &&
      normalized.Email.toLowerCase().trim() === 'speedmeetlove@gmail.com'
    );
    setAuthToken(tokenValue);
    setCurrentUserId(userId);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user_id`, userId);
    setUsers(prev => {
      const exists = prev.some(u => u.UserID === userId);
      return exists ? prev.map(u => (u.UserID === userId ? { ...u, ...normalized } : u)) : [normalized, ...prev];
    });
    if (!userIsOwner) {
      setAppModeState('production');
      localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
    }
    if (normalized.EmailVerified === true || userIsOwner || normalized.IsTester) {
      setEmailVerificationSent(null);
      setIsEmailVerificationModalOpen(false);
    }
    return normalized;
  }, [normalizeUserFromApi]);

  const refreshCurrentUser = useCallback(async (): Promise<User | null> => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`) : null);
    if (!token) return null;

    const wasVerified = currentUser?.EmailVerified === true;
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        const normalized = applyAuthenticatedUserSnapshot(data.user, token);
        if (!wasVerified && normalized.EmailVerified === true) {
          showNotification('Email verified successfully!', 'success');
        }
        return normalized;
      }
      if (res.status === 401) {
        setAuthToken(null);
        setCurrentUserId('');
        setAppModeState('production');
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}authToken`);
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user_id`);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
      }
    } catch {
      // Network offline or server restarting: keep cached session
    }
    return null;
  }, [applyAuthenticatedUserSnapshot, authToken, currentUser?.EmailVerified, showNotification]);

  // Sync real registered members from the server so Browse shows actual
  // members, not only the built-in demonstration profiles. The server
  // returns public profile fields only (no emails or account data).
  // Skipped in demonstration mode, which is a self-contained sandbox.
  const serverMemberIdsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!authToken || !currentUserId || rawAppMode === 'demonstration') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/members', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || !data.success || !Array.isArray(data.members)) return;
        const incoming = data.members
          .map((raw: any) => normalizeUserFromApi(raw))
          .filter((u: User) => u && u.UserID && u.UserID !== currentUserId);
        const incomingIds = new Set<string>(incoming.map((u: User) => u.UserID));
        setUsers(prev => {
          // Drop members the server no longer returns (e.g. banned or
          // deleted accounts) while keeping demonstration profiles and
          // any locally known users untouched.
          const kept = prev.filter(u => !serverMemberIdsRef.current.has(u.UserID) || incomingIds.has(u.UserID));
          const byId = new Map(kept.map(u => [u.UserID, u]));
          for (const member of incoming) {
            const existing = byId.get(member.UserID);
            byId.set(member.UserID, existing ? { ...existing, ...member } : member);
          }
          return Array.from(byId.values());
        });
        serverMemberIdsRef.current = incomingIds;
      } catch {
        // Offline or server restarting: keep the cached list
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, currentUserId, rawAppMode, normalizeUserFromApi]);

  // Handle email verification link (/verify-email?token=...) and hydrate session sequentially to avoid race conditions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    const initializeAuthAndVerification = async () => {
      const storedToken = localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
      const params = new URLSearchParams(window.location.search);
      const linkVerifyToken = window.location.pathname === '/verify-email' ? params.get('token') : null;
      const linkResetToken = window.location.pathname === '/reset-password' ? params.get('token') : null;

      if (linkResetToken) {
        window.history.replaceState({}, '', '/');
        setResetPasswordToken(linkResetToken);
        openAuthModal('signin');
      }

      let linkError: string | null = null;
      let linkSucceeded = false;

      if (linkVerifyToken) {
        window.history.replaceState({}, '', '/');
        try {
          const vRes = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
            },
            body: JSON.stringify({ token: linkVerifyToken }),
          });
          const vData = await vRes.json().catch(() => ({}));
          if (!isMounted) return;
          if (vRes.ok && vData.success) {
            linkSucceeded = true;
            if (vData.user && storedToken) {
              applyAuthenticatedUserSnapshot(vData.user, storedToken);
            }
            setIsEmailVerificationModalOpen(false);
            try {
              localStorage.setItem(`${STORAGE_KEY_PREFIX}emailVerifiedSync`, String(Date.now()));
            } catch {
              // Ignore storage quota errors
            }
            if (!storedToken) {
              showNotification('Email verified! Please sign in to view your account status.', 'success');
              openAuthModal('signin');
            } else {
              showNotification('Email verified successfully!', 'success');
            }
          } else {
            linkError = vData.error || 'Email verification link is invalid or expired.';
          }
        } catch {
          linkError = 'Could not verify your email link right now. Please try again.';
        }
      }

      if (!storedToken) {
        if (isMounted) {
          if (linkError) {
            showNotification(linkError, 'pink');
          }
          setCurrentUserId('');
          setAppModeState('production');
          localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.user) {
          const normalized = applyAuthenticatedUserSnapshot(data.user, storedToken);
          if (linkError && normalized.EmailVerified !== true) {
            showNotification(linkError, 'pink');
          } else if (linkVerifyToken && !linkSucceeded && normalized.EmailVerified === true) {
            showNotification('Your email address is verified!', 'success');
          }
        } else {
          if (linkError) {
            showNotification(linkError, 'pink');
          }
          // Stale or invalid token
          setAuthToken(null);
          setCurrentUserId('');
          setAppModeState('production');
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}authToken`);
          localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user_id`);
          localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
        }
      } catch {
        if (isMounted && linkError) {
          showNotification(linkError, 'pink');
        }
      }
    };

    initializeAuthAndVerification();

    return () => {
      isMounted = false;
    };
  }, [applyAuthenticatedUserSnapshot, openAuthModal, showNotification]);

  // Automatically dismiss verification modal if user is already verified, founder, or tester
  useEffect(() => {
    if (currentUser?.EmailVerified === true || isOwner || currentUser?.IsTester) {
      setIsEmailVerificationModalOpen(false);
    }
  }, [currentUser?.EmailVerified, currentUser?.IsTester, isOwner]);

  // Refresh verification status automatically when an unverified member returns to the app after clicking the email link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !currentUser || currentUser.EmailVerified === true || isOwner || currentUser.IsTester) {
      return;
    }

    const syncOnReturn = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      refreshCurrentUser();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `${STORAGE_KEY_PREFIX}emailVerifiedSync`) {
        refreshCurrentUser();
      }
    };

    window.addEventListener('focus', syncOnReturn);
    window.addEventListener('pageshow', syncOnReturn);
    document.addEventListener('visibilitychange', syncOnReturn);
    window.addEventListener('storage', handleStorage);

    const intervalId = isEmailVerificationModalOpen
      ? window.setInterval(() => {
          if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
            refreshCurrentUser();
          }
        }, 4000)
      : null;

    return () => {
      window.removeEventListener('focus', syncOnReturn);
      window.removeEventListener('pageshow', syncOnReturn);
      document.removeEventListener('visibilitychange', syncOnReturn);
      window.removeEventListener('storage', handleStorage);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    isAuthenticated,
    currentUser,
    isOwner,
    isEmailVerificationModalOpen,
    refreshCurrentUser,
  ]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid email or password.' };
      }

      localStorage.setItem(`${STORAGE_KEY_PREFIX}authToken`, data.token);
      const normalized = applyAuthenticatedUserSnapshot(data.user, data.token);

      showNotification(`Welcome back, ${normalized.FirstName}!`, 'success');
      return { success: true, user: normalized };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during sign-in.' };
    }
  }, [applyAuthenticatedUserSnapshot, showNotification]);

  const signUp = useCallback(async (formData: any): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      localStorage.setItem(`${STORAGE_KEY_PREFIX}authToken`, data.token);
      const normalized = applyAuthenticatedUserSnapshot(data.user, data.token);

      const delivered = Boolean(data.verificationDelivery?.emailSent);
      setEmailVerificationSent(delivered);

      if (normalized.EmailVerified !== true && !normalized.IsOwner && !normalized.IsTester) {
        setIsEmailVerificationModalOpen(true);
      }

      showNotification(
        delivered
          ? `Welcome to Speed Meet Love, ${normalized.FirstName}! Check your email and click the verification link.`
          : `Welcome to Speed Meet Love, ${normalized.FirstName}! Please verify your email address via link to complete activation.`,
        'pink'
      );
      return { success: true, user: normalized };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration.' };
    }
  }, [applyAuthenticatedUserSnapshot, showNotification]);

  const verifyEmail = useCallback(async (payload: { token: string }): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ token: payload.token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Email verification failed.' };
      }

      let normalized: User | undefined;
      if (data.user && token) {
        normalized = applyAuthenticatedUserSnapshot(data.user, token);
      }
      setEmailVerificationSent(null);
      setIsEmailVerificationModalOpen(false);
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}emailVerifiedSync`, String(Date.now()));
      } catch {
        // Ignore storage quota errors
      }
      showNotification('Email verified successfully!', 'success');
      return { success: true, user: normalized };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error verifying email.' };
    }
  }, [applyAuthenticatedUserSnapshot, authToken, showNotification]);

  const resendVerificationEmail = useCallback(async (email?: string): Promise<{ success: boolean; error?: string; emailSent?: boolean }> => {
    try {
      const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setEmailVerificationSent(false);
        return { success: false, error: data.error || 'Failed to resend verification email.' };
      }
      const sent = Boolean(data.verificationDelivery?.emailSent);
      setEmailVerificationSent(sent);
      if (data.user) {
        const normalized = normalizeUserFromApi(data.user);
        setUsers(prev => prev.map(u => (u.UserID === normalized.UserID ? { ...u, ...normalized } : u)));
      }
      return { success: true, emailSent: sent };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error resending verification email.' };
    }
  }, [authToken, normalizeUserFromApi]);

  const markLaunchOfferCelebrated = useCallback(async () => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!token) return;
    const now = Date.now();
    // Optimistically clear local flag so modal closes responsively
    if (currentUser) {
      setUsers(prev =>
        prev.map(u =>
          u.UserID === currentUser.UserID
            ? {
                ...u,
                LaunchOfferCelebrationPending: false,
                LaunchOfferCelebrationShownAt: now,
                ...(speedDatingLaunched
                  ? { LaunchOfferActivationPending: false, LaunchOfferActivationNotifiedAt: now }
                  : {}),
              }
            : u
        )
      );
    }
    try {
      const res = await fetch('/api/account/launch-offer/celebrated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const normalized = normalizeUserFromApi(data.user);
        setUsers(prev => prev.map(u => (u.UserID === normalized.UserID ? { ...u, ...normalized } : u)));
      }
    } catch {
      // Non-fatal
    }
  }, [authToken, currentUser, normalizeUserFromApi, speedDatingLaunched]);

  const markLaunchOfferActivationSeen = useCallback(async () => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!token) return;
    const now = Date.now();
    if (currentUser) {
      setUsers(prev =>
        prev.map(u =>
          u.UserID === currentUser.UserID
            ? { ...u, LaunchOfferActivationPending: false, LaunchOfferActivationNotifiedAt: now }
            : u
        )
      );
    }
    try {
      const res = await fetch('/api/account/launch-offer/activation-notified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const normalized = normalizeUserFromApi(data.user);
        setUsers(prev => prev.map(u => (u.UserID === normalized.UserID ? { ...u, ...normalized } : u)));
      }
    } catch {
      // Non-fatal
    }
  }, [authToken, currentUser, normalizeUserFromApi]);

  // If a signed-in First-50 member has a reserved reward waiting for official speed-dating launch,
  // re-check launch status on tab focus and periodically so they receive their in-app notification promptly.
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.LaunchOfferGranted || !currentUser?.LaunchOfferDeferred) {
      return;
    }
    let cancelled = false;
    const checkForLaunch = async () => {
      try {
        const res = await fetch('/api/launch-mode');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.success && data.speedDatingLaunched) {
          setSpeedDatingLaunched(true);
          setSpeedDatingLaunchedAt(
            typeof data.speedDatingLaunchedAt === 'number' ? data.speedDatingLaunchedAt : Date.now()
          );
          await refreshCurrentUser();
        }
      } catch {
        // Ignore transient network errors
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForLaunch();
      }
    };
    window.addEventListener('focus', checkForLaunch);
    document.addEventListener('visibilitychange', handleVisibility);
    const timer = window.setInterval(checkForLaunch, 60000);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', checkForLaunch);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(timer);
    };
  }, [isAuthenticated, currentUser?.LaunchOfferGranted, currentUser?.LaunchOfferDeferred, refreshCurrentUser]);

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.error || 'Failed to send password-reset email.',
          error: data.error || 'Failed to send password-reset email.',
        };
      }
      return {
        success: true,
        message: data.message || 'If an account exists for this email, you’ll receive a password-reset link. Check your spam folder too.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error while requesting password reset.',
        error: err.message || 'Network error while requesting password reset.',
      };
    }
  }, []);

  const confirmPasswordReset = useCallback(async (token: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update password. Please request a new reset link.',
        };
      }
      // Clear any stale local session since server revoked active tokens
      setAuthToken(null);
      setCurrentUserId('');
      setAppModeState('production');
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}authToken`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user_id`);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
      showNotification('Password updated! You can now sign in with your new password.', 'success');
      return {
        success: true,
        message: data.message || 'Your password has been updated. You can now sign in with your new password.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error while resetting password.',
      };
    }
  }, [showNotification]);

  const signOut = useCallback(async () => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (token) {
      try {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {}
    }

    setAuthToken(null);
    setCurrentUserId('');
    setEmailVerificationSent(null);
    setIsEmailVerificationModalOpen(false);
    setWaitlistJoined(false);
    setWaitlistEntry(null);
    setOwnerLaunchEvents([]);
    setAppModeState('production');
    localStorage.setItem(`${STORAGE_KEY_PREFIX}appMode`, 'production');
    clearLiveSession();
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}authToken`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user_id`);
    // Reset in-memory users state to prevent profile state leakage between accounts
    setUsers(INITIAL_USERS);
    setCurrentViewState('home');
    showNotification('You have been securely signed out.', 'info');
  }, [authToken, clearLiveSession]);

  // ============================================================================
  // LAUNCH WAITING LIST & FOUNDER-CONFIRMED LAUNCH EVENTS
  // (Notice: Zero automated invitations or notifications dispatched yet)
  // ============================================================================

  const refreshWaitlistStatus = useCallback(async () => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!token || !currentUserId) {
      setWaitlistJoined(false);
      setWaitlistEntry(null);
      return;
    }
    try {
      const res = await fetch('/api/waitlist/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWaitlistJoined(Boolean(data.joined));
          setWaitlistEntry(data.entry || null);
        }
      }
    } catch (e) {
      console.warn('Unable to check waitlist status:', e);
    }
  }, [authToken, currentUserId]);

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      refreshWaitlistStatus();
    } else {
      setWaitlistJoined(false);
      setWaitlistEntry(null);
    }
  }, [isAuthenticated, currentUserId, refreshWaitlistStatus]);

  const joinWaitlist = useCallback(async (): Promise<{ success: boolean; error?: string; alreadyJoined?: boolean }> => {
    if (!currentUser || !isAuthenticated) {
      openAuthModal('signin');
      return { success: false, error: 'Please sign in to join the Event Waiting List.' };
    }
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!token) {
      openAuthModal('signin');
      return { success: false, error: 'Please sign in to join the Event Waiting List.' };
    }

    setWaitlistLoading(true);
    try {
      const res = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Could not join the Event Waiting List.';
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      }

      setWaitlistJoined(true);
      setWaitlistEntry(data.entry || { userId: currentUser.UserID, joinedAt: Date.now() });
      showNotification(
        data.alreadyJoined
          ? "You're already saved on the Event Waiting List."
          : "You're on the Event Waiting List! Your interest has been saved.",
        'success'
      );
      return { success: true, alreadyJoined: Boolean(data.alreadyJoined) };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error saving waitlist interest.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    } finally {
      setWaitlistLoading(false);
    }
  }, [currentUser, isAuthenticated, authToken, openAuthModal, showNotification]);

  const leaveWaitlist = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !isAuthenticated) {
      openAuthModal('signin');
      return { success: false, error: 'Please sign in to update your waiting list status.' };
    }
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!token) {
      openAuthModal('signin');
      return { success: false, error: 'Authentication required.' };
    }

    setWaitlistLoading(true);
    try {
      const res = await fetch('/api/waitlist/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Could not leave the Event Waiting List.';
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      }

      setWaitlistJoined(false);
      setWaitlistEntry(null);
      showNotification('You have left the Event Waiting List.', 'info');
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error updating waiting list.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    } finally {
      setWaitlistLoading(false);
    }
  }, [currentUser, isAuthenticated, authToken, openAuthModal, showNotification]);

  const refreshLaunchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/launch-events');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          setConfirmedLaunchEvents(data.events);
          setEvents(prev => {
            const nonLaunch = prev.filter(e => !e.EventID.startsWith('evt_launch_') && !e.IsManualLaunch);
            return [...data.events, ...nonLaunch];
          });
        }
      }
    } catch (e) {
      console.warn('Unable to load confirmed launch events:', e);
    }

    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (isOwner && token) {
      try {
        const ownerRes = await fetch('/api/owner/launch-events', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ownerRes.ok) {
          const ownerData = await ownerRes.json();
          if (ownerData.success && Array.isArray(ownerData.events)) {
            setOwnerLaunchEvents(ownerData.events);
          }
        }
      } catch (e) {
        console.warn('Unable to load owner launch events:', e);
      }
    } else {
      setOwnerLaunchEvents([]);
    }
  }, [isOwner, authToken]);

  useEffect(() => {
    refreshLaunchEvents();
  }, [refreshLaunchEvents]);

  const scheduleLaunchEvent = useCallback(async (payload: {
    EventName: string;
    DayOfWeek: 'Friday' | 'Saturday' | 'Sunday';
    EventDate: string;
    EventStartTime?: string;
    EventEndTime?: string;
    TimeZone?: string;
    MaxParticipants?: number;
    EventType: EventType;
    Description?: string;
    MinAge?: number;
    MaxAge?: number;
    LocationName?: string;
    Confirmed?: boolean;
  }): Promise<{ success: boolean; event?: SpeedEvent; error?: string }> => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!isOwner || !token) {
      return { success: false, error: 'Owner authorization required.' };
    }
    try {
      const res = await fetch('/api/owner/launch-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to schedule launch event.';
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      }
      await refreshLaunchEvents();
      showNotification(data.message || 'Launch event saved (no notifications sent).', 'success');
      return { success: true, event: data.event };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error scheduling launch event.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    }
  }, [isOwner, authToken, refreshLaunchEvents, showNotification]);

  const confirmLaunchEvent = useCallback(async (
    eventId: string,
    confirmed: boolean
  ): Promise<{ success: boolean; event?: SpeedEvent; error?: string }> => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!isOwner || !token) {
      return { success: false, error: 'Owner authorization required.' };
    }
    try {
      const res = await fetch(`/api/owner/launch-events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ Confirmed: confirmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to update launch event confirmation.';
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      }
      await refreshLaunchEvents();
      showNotification(data.message || 'Launch event status updated (no notifications sent).', 'success');
      return { success: true, event: data.event };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error updating launch event.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    }
  }, [isOwner, authToken, refreshLaunchEvents, showNotification]);

  const deleteLaunchEvent = useCallback(async (
    eventId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
    if (!isOwner || !token) {
      return { success: false, error: 'Owner authorization required.' };
    }
    try {
      const res = await fetch(`/api/owner/launch-events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to delete launch event.';
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      }
      await refreshLaunchEvents();
      showNotification('Launch event removed.', 'info');
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error deleting launch event.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    }
  }, [isOwner, authToken, refreshLaunchEvents, showNotification]);

  const syncAuthSession = useCallback(async (user: User): Promise<string | null> => {
    try {
      const existingToken = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
      if (!existingToken) return null;
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${existingToken}`,
        },
        body: JSON.stringify({
          userId: user.UserID,
          email: user.Email || `${user.UserID}@speedmeetlove.app`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          setAuthToken(data.token);
          localStorage.setItem(`${STORAGE_KEY_PREFIX}authToken`, data.token);
          return data.token;
        }
      }
    } catch (err) {
      console.warn('Failed to sync auth session token:', err);
    }
    return null;
  }, [authToken]);

  // Sync token whenever active member changes (in demonstration mode only for verified founder)
  useEffect(() => {
    if (isOwner && appMode === 'demonstration' && currentUser?.UserID) {
      syncAuthSession(currentUser);
    }
  }, [isOwner, appMode, currentUser?.UserID, currentUser?.Email, syncAuthSession]);

  const deleteAccount = async (confirmEmail: string): Promise<{
    success: boolean;
    error?: string;
    purged?: any;
    retentionExceptions?: string[];
  }> => {
    if (!currentUser) {
      return { success: false, error: 'Sign-in required: You must be logged into an active account to delete.' };
    }

    // Securely obtain fresh server session token
    let token = authToken;
    if (!token) {
      token = await syncAuthSession(currentUser);
    }

    if (!token) {
      return {
        success: false,
        error: 'Authentication failed: Unable to establish a verified server session token. Deletion aborted.',
      };
    }

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: currentUser.UserID,
          confirmEmail: confirmEmail.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Server rejected account deletion request.',
        };
      }

      // Deletion confirmed on server! Now purge all local storage records for this account
      const targetId = currentUser.UserID;

      // 1. Invalidate session token
      setAuthToken(null);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}authToken`);

      // 2. Clear live session
      clearLiveSession();
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}session_demonstration_${targetId}`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}session_production_${targetId}`);

      // 3. Purge user from state & storage
      const remainingUsers = users.filter(u => u.UserID !== targetId);
      setUsers(remainingUsers.length > 0 ? remainingUsers : INITIAL_USERS);

      // 4. Purge matches involving target user
      const targetMatchIds = new Set(matches.filter(m => m.UserA === targetId || m.UserB === targetId).map(m => m.MatchID));
      setMatches(prev => prev.filter(m => m.UserA !== targetId && m.UserB !== targetId));

      // 5. Purge messages involving target user or their matches
      setMessages(prev => prev.filter(msg => msg.SenderID !== targetId && !targetMatchIds.has(msg.MatchID)));

      // 6. Purge likes involving target user
      setLikesMap(prev => {
        const copy = { ...prev };
        delete copy[targetId];
        for (const [k, arr] of Object.entries(copy)) {
          copy[k] = arr.filter(id => id !== targetId);
        }
        return copy;
      });

      // 7. Purge registrations from all events
      setEvents(prev => prev.map(ev => ({
        ...ev,
        ParticipantsList: ev.ParticipantsList.filter(id => id !== targetId),
      })));

      // 8. Purge from second date sessions
      setSecondDateSessions(prev => prev.filter(s => s.userA !== targetId && s.userB !== targetId));
      if (activeSecondDateSession && (activeSecondDateSession.userA === targetId || activeSecondDateSession.userB === targetId)) {
        setActiveSecondDateSession(null);
      }

      // 8b. Purge waitlist state on account deletion
      setWaitlistJoined(false);
      setWaitlistEntry(null);

      // 9. In production, remain signed out; in demonstration mode, switch to remaining member
      if (appMode === 'production') {
        setCurrentUserId('');
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user_id`);
        setCurrentView('home');
      } else {
        const nextUser = remainingUsers[0] || INITIAL_USERS[0];
        setCurrentUserId(nextUser.UserID);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}current_user_id`, nextUser.UserID);
      }

      showNotification('Your Speed Meet Love account and personal records have been permanently deleted.', 'pink');

      return {
        success: true,
        purged: data.purged,
        retentionExceptions: data.retentionExceptions,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error while attempting account deletion.',
      };
    }
  };

  const toggleLaunchFreeMode = useCallback(
    async (enabled: boolean): Promise<{ success: boolean; error?: string; message?: string }> => {
      if (!isOwner) {
        return { success: false, error: 'Owner authorization required.' };
      }
      try {
        const token = authToken || safeStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
        const res = await fetch('/api/owner/launch-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ freeDuringLaunch: enabled }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setIsFreeDuringLaunch(Boolean(data.freeDuringLaunch));
          setPaidMembershipsReturnedAt(
            typeof data.paidMembershipsReturnedAt === 'number' ? data.paidMembershipsReturnedAt : null
          );
          if (typeof data.speedDatingLaunched === 'boolean') {
            setSpeedDatingLaunched(data.speedDatingLaunched);
          }
          if (typeof data.speedDatingLaunchedAt === 'number') {
            setSpeedDatingLaunchedAt(data.speedDatingLaunchedAt);
          }
          if (typeof data.first50PreservedCount === 'number') {
            setFirst50PreservedCount(data.first50PreservedCount);
          }
          showNotification(
            data.message ||
              (enabled ? 'Free During Launch mode enabled.' : 'Paid memberships restored.'),
            'success'
          );
          return { success: true, message: data.message };
        }
        const errMsg = data.error || 'Could not update launch mode.';
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      } catch (err: any) {
        const errMsg = err?.message || 'Network error updating launch mode.';
        showNotification(errMsg, 'pink');
        return { success: false, error: errMsg };
      }
    },
    [authToken, isOwner, showNotification]
  );

  const launchSpeedDating = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    activatedCount?: number;
    alreadyLaunched?: boolean;
  }> => {
    if (!isOwner) {
      return { success: false, error: 'Founder authorization required.' };
    }
    try {
      const token = authToken || safeStorage.getItem(`${STORAGE_KEY_PREFIX}authToken`);
      const res = await fetch('/api/owner/launch-speed-dating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSpeedDatingLaunched(true);
        setSpeedDatingLaunchedAt(
          typeof data.speedDatingLaunchedAt === 'number' ? data.speedDatingLaunchedAt : Date.now()
        );
        if (typeof data.first50PreservedCount === 'number') {
          setFirst50PreservedCount(data.first50PreservedCount);
        }
        showNotification(
          data.message || 'Speed dating officially launched! Reserved First-50 Premium+ rewards have begun.',
          'success'
        );
        return {
          success: true,
          message: data.message,
          activatedCount: typeof data.activatedCount === 'number' ? data.activatedCount : 0,
          alreadyLaunched: Boolean(data.alreadyLaunched),
        };
      }
      const errMsg = data.error || 'Could not launch speed dating.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error launching speed dating.';
      showNotification(errMsg, 'pink');
      return { success: false, error: errMsg };
    }
  }, [authToken, isOwner, showNotification]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        isEmailVerificationModalOpen,
        setIsEmailVerificationModalOpen,
        emailVerificationSent,
        refreshCurrentUser,
        verifyEmail,
        resendVerificationEmail,
        markLaunchOfferCelebrated,
        markLaunchOfferActivationSeen,
        signIn,
        signUp,
        sendPasswordResetEmail,
        resetPasswordToken,
        setResetPasswordToken,
        confirmPasswordReset,
        signOut,
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
        reportModalContext,
        setReportModalTarget,
        setCurrentView,
        setSelectedEventId,
        setSelectedMatchId,
        setActiveRoundIndex,
        setCurrentUser: (u) => setCurrentUserId(u ? u.UserID : ''),
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
        pendingSecondDateCount,
        incomingSecondDateInvitation,
        acceptSecondDateInvitation,
        declineSecondDateInvitation,
        dismissSecondDateInvitation,
        repairEventRounds,
        createStagingTestSession,
        joinStagingTestSession,
        authToken,
        isOwner,
        syncAuthSession,
        deleteAccount,
        waitlistJoined,
        waitlistEntry,
        waitlistLoading,
        refreshWaitlistStatus,
        joinWaitlist,
        leaveWaitlist,
        confirmedLaunchEvents,
        ownerLaunchEvents,
        refreshLaunchEvents,
        scheduleLaunchEvent,
        confirmLaunchEvent,
        deleteLaunchEvent,
        isFreeDuringLaunch,
        paidMembershipsReturnedAt,
        speedDatingLaunched,
        speedDatingLaunchedAt,
        first50PreservedCount,
        launchModeEnvOverride,
        refreshLaunchMode,
        toggleLaunchFreeMode,
        launchSpeedDating,
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
