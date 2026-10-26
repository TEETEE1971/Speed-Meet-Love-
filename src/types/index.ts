export type SubscriptionTier = 'Free' | 'Premium' | 'Premium Plus';

export type AppMode = 'demonstration' | 'production';

export type AppView =
  | 'browse'
  | 'matches'
  | 'messages'
  | 'friday'
  | 'lobby'
  | 'live'
  | 'results'
  | 'pricing'
  | 'profile'
  | 'tables';

export type EventStatus = 'Upcoming' | 'Live' | 'Completed';

export type EventType = 'Straight' | 'LGBTQ+' | '30 & Older' | 'Age-specific' | 'Premium-only';

export interface UserPreferences {
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  intent: 'Long-term relationship' | 'Dating & chemistry' | 'Marriage minded' | 'Casual & fun';
}

export interface User {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Gender: 'Woman' | 'Man' | 'Non-Binary';
  InterestedIn: 'Men' | 'Women' | 'Everyone';
  Age: number;
  Location: string;
  ProfilePhoto: string;
  SubscriptionTier: SubscriptionTier;
  Bio: string;
  Occupation: string;
  Interests: string[];
  IcebreakerAnswer?: string;
  Preferences: UserPreferences;
  EventHistory: string[];
  MatchHistory: string[];
  AvatarColor: string;
}

export interface SpeedEvent {
  EventID: string;
  EventName: string;
  DayOfWeek: 'Friday' | 'Saturday' | 'Sunday';
  EventDate: string; // YYYY-MM-DD
  EventStartTime: string; // e.g. 19:00 (7:00 PM)
  EventEndTime: string; // e.g. 20:15
  TimeZone: string; // e.g. "7:00 PM EST (4:00 PM PST)"
  MaxParticipants: number;
  ParticipantsList: string[]; // UserIDs
  EventStatus: EventStatus;
  RoundsGenerated: boolean;
  HostID: string;
  EventType: EventType;
  Description: string;
  TotalRounds: number;
  RoundDurationSeconds: number; // 300 seconds = 5 minutes
  BreakDurationSeconds: number; // 120 seconds = 2 minutes
  MinAge: number;
  MaxAge: number;
  LocationName: string;
  ThemeIcon?: string;
}

export interface Round {
  RoundID: string;
  EventID: string;
  RoundNumber: number;
  UserA: string; // UserID
  UserB: string; // UserID
  RoundStart: string; // ISO string
  RoundEnd: string; // ISO string
  UserA_Like: boolean | null;
  UserB_Like: boolean | null;
  UserA_Notes: string;
  UserB_Notes: string;
  SkipTriggeredBy?: string | null;
  ReplayRequestedBy?: string[];
  PartnerStatus?: 'active' | 'unavailable' | 'no-show' | 'left';
}

export interface Match {
  MatchID: string;
  UserA: string;
  UserB: string;
  EventID: string;
  Timestamp: string;
  ChatUnlocked: boolean;
  ChemistryScore: number;
  MutualInterests: string[];
  SparkNote?: string;
}

export interface Message {
  MessageID: string;
  MatchID: string;
  SenderID: string;
  MessageText: string;
  Timestamp: string;
  Read: boolean;
}

export interface IcebreakerQuestion {
  id: string;
  category: 'Fun' | 'Deep' | 'Travel & Food' | 'Chemistry';
  question: string;
}

export interface UserReport {
  ReportID: string;
  ReportedUserID: string;
  ReporterID: string;
  Reason: 'Inappropriate behavior' | 'Fake profile' | 'Spam or advertising' | 'Harassment' | 'Other';
  Notes: string;
  Timestamp: string;
}

export interface LiveSessionState {
  userId: string;
  eventId: string;
  roundIndex: number;
  stage: 'call' | 'break' | 'waiting_room';
  roundStartedAt: number; // Unix timestamp in ms
  breakStartedAt: number | null; // Unix timestamp in ms
  roundDurationSeconds: number; // e.g. 300
  breakDurationSeconds: number; // e.g. 120
  vote: 'like' | 'pass' | null;
  notes: string;
  partnerId: string;
  currentView: AppView;
  lastActive: number;
  isPaused?: boolean;
  pausedAt?: number | null;
  accumulatedPauseMs?: number;
}

