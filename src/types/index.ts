export type SubscriptionTier = 'Free' | 'Premium' | 'Premium Plus';

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid';

export interface StripePriceConfig {
  id: string;
  tier: SubscriptionTier;
  name: string;
  amount: number;
  amountCents: number;
  currency: 'USD';
  interval: 'month';
}

export type AppMode = 'demonstration' | 'production';

export type AppView =
  | 'home'
  | 'browse'
  | 'matches'
  | 'messages'
  | 'friday'
  | 'lobby'
  | 'live'
  | 'results'
  | 'pricing'
  | 'profile'
  | 'tables'
  | 'second_date'
  | 'privacy'
  | 'delete_account'
  | 'child_safety'
  | 'terms'
  | 'acceptable_use'
  | 'refund_policy'
  | 'law_enforcement'
  | 'contact'
  | 'owner_reports'
  | 'owner_users'
  | 'owner_waitlist';

export type SecondDateStatus =
  | 'waiting_for_partner'
  | 'ready_to_start'
  | 'active'
  | 'completed'
  | 'declined';

export interface SecondDateSession {
  sessionId: string;
  eventId: string;
  userA: string;
  userB: string;
  userAName?: string;
  userBName?: string;
  requestedBy: string;
  userAConsent: boolean;
  userBConsent: boolean;
  status: SecondDateStatus;
  startedAt: number | null;
  expiresAt: number | null;
  durationSeconds: number; // 600 seconds = 10 minutes
  createdAt: number;
  lastUpdated?: number;
  mode?: AppMode;
  matchId?: string;
}

export type EventStatus = 'Upcoming' | 'Live' | 'Completed';

export type EventType = 'Straight' | 'LGBTQ+' | '30 & Older' | 'Age-specific' | 'Premium-only';

export type HairColorOption = 'Any' | 'Blonde' | 'Brown' | 'Black' | 'Red' | 'Gray/Silver' | 'Bald' | 'Other';
export type EyeColorOption = 'Any' | 'Blue' | 'Brown' | 'Green' | 'Hazel' | 'Gray' | 'Other';
export type RelationshipIntentOption = 'Any' | 'Serious Relationship' | 'Casual Dating' | 'Friendship First' | 'Not Sure Yet' | 'Long-term relationship' | 'Dating & chemistry' | 'Marriage minded' | 'Casual & fun';
export type SmokingOption = 'Any' | 'Non-smoker' | 'Social smoker' | 'Regular smoker';
export type DrinkingOption = 'Any' | 'Non-drinker' | 'Social drinker' | 'Regular drinker';
export type ChildrenOption = 'Any' | 'Has children' | 'Wants children' | "Doesn't want children" | 'Open to children';

export interface UserPreferences {
  ageMin: number;
  ageMax: number;
  maxDistanceKm?: number;
  distanceMiles?: number;
  hairColor?: HairColorOption;
  heightMinInches?: number;
  heightMaxInches?: number;
  eyeColor?: EyeColorOption;
  gender?: 'Any' | 'Women' | 'Men' | 'Non-Binary';
  intent?: RelationshipIntentOption;
  smoking?: SmokingOption;
  drinking?: DrinkingOption;
  children?: ChildrenOption;
  interests?: string[];
}

export const DEFAULT_DEMO_PREFERENCES: UserPreferences = {
  ageMin: 30,
  ageMax: 55,
  hairColor: 'Any',
  heightMinInches: 0,
  heightMaxInches: 0,
  eyeColor: 'Any',
  distanceMiles: 50,
  gender: 'Any',
  intent: 'Any',
  smoking: 'Any',
  drinking: 'Any',
  children: 'Any',
  interests: [],
};

export interface UserPrivacySettings {
  showHeight?: boolean;
  showSmoking?: boolean;
  showDrinking?: boolean;
  showChildren?: boolean;
  shareLocation?: boolean;
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
  // Physical characteristics & lifestyle
  HairColor?: 'Blonde' | 'Brown' | 'Black' | 'Red' | 'Gray/Silver' | 'Bald' | 'Other';
  HeightInches?: number; // e.g. 68 for 5'8"
  EyeColor?: 'Blue' | 'Brown' | 'Green' | 'Hazel' | 'Gray' | 'Other';
  RelationshipIntent?: 'Serious Relationship' | 'Casual Dating' | 'Friendship First' | 'Not Sure Yet';
  Smoking?: 'Non-smoker' | 'Social smoker' | 'Regular smoker';
  Drinking?: 'Non-drinker' | 'Social drinker' | 'Regular drinker';
  Children?: 'Has children' | 'Wants children' | "Doesn't want children" | 'Open to children';
  DistanceMiles?: number;
  PrivacySettings?: UserPrivacySettings;
  SubscriptionStatus?: SubscriptionStatus;
  StripeCustomerId?: string;
  StripeSubscriptionId?: string;
  IsTester?: boolean;
  IsOwner?: boolean;
  testerAccessGranted?: boolean;
  testerAccessGrantedAt?: number;
  testerAccessGrantedBy?: string;
  EmailVerified?: boolean;
  EmailVerifiedAt?: number | null;
  LaunchOfferGranted?: boolean;
  LaunchOfferGrantNumber?: number | null;
  LaunchOfferGrantedAt?: number | null;
  LaunchOfferExpiresAt?: number | null;
  LaunchOfferActive?: boolean;
  LaunchOfferExpired?: boolean;
  LaunchOfferCelebrationPending?: boolean;
  LaunchOfferCelebrationShownAt?: number | null;
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
  Confirmed?: boolean;
  ConfirmedAt?: number | null;
  IsManualLaunch?: boolean;
  CreatedAt?: number;
  CreatedBy?: string;
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

export type ReportReasonOption =
  | 'Sexually explicit content or solicitation'
  | 'Inappropriate behavior'
  | 'Child safety / Underage / CSAE'
  | 'Harassment'
  | 'Fake profile'
  | 'Spam or advertising'
  | 'Other';

export interface ReportParticipantInfo {
  userId: string;
  name?: string;
  email?: string;
  role?: 'reporter' | 'reported' | 'participant';
}

export interface ReportContextPayload {
  source?: 'live_video_round' | 'second_chance_date' | 'browse' | 'messages' | 'match_results' | 'profile' | 'other';
  eventId?: string;
  eventName?: string;
  roundIndex?: number;
  roundNumber?: number;
  roundId?: string;
  participants?: ReportParticipantInfo[];
  callEndedOnReport?: boolean;
  onAfterSubmitEndCall?: () => Promise<void> | void;
}

export interface ReportNotificationDispatch {
  emailAttempted: boolean;
  emailSent: boolean;
  emailProvider?: string;
  pushAttempted: boolean;
  pushDelivered: number;
  pushSubscriptionsCount: number;
  inAppFlagged: boolean;
  note?: string;
}

export interface UserReport {
  ReportID: string;
  ReportedUserID: string;
  ReporterID: string;
  Reason: ReportReasonOption;
  Notes: string;
  Timestamp: string;
  EventID?: string;
  EventName?: string;
  RoundNumber?: number;
  Urgent?: boolean;
}

export interface OwnerReportItem {
  id: string;
  reporterId: string;
  reporterEmail?: string;
  reporterName?: string;
  reportedUserId: string;
  reportedUserName?: string;
  reportedUserEmail?: string;
  reason: string;
  notes: string;
  timestamp: string;
  createdAt: number;
  status: 'pending' | 'banned' | 'dismissed' | 'reviewed';
  source?: string;
  eventId?: string;
  eventName?: string;
  roundIndex?: number;
  roundNumber?: number;
  roundId?: string;
  participants?: ReportParticipantInfo[];
  callEndedOnReport?: boolean;
  urgent?: boolean;
  urgencyLevel?: 'urgent' | 'standard';
  urgencyReasons?: string[];
  notificationDispatch?: ReportNotificationDispatch;
  actionTaken?: string;
  actionAt?: number;
  actionBy?: string;
}

export interface ActiveRoundParticipantDetail {
  userId: string;
  name: string;
  email?: string;
  removed?: boolean;
  earlyExited?: boolean;
}

export interface ActiveRoundSummary {
  roundId: string;
  roomName: string;
  eventId: string;
  eventName: string;
  roundIndex: number;
  roundNumber: number;
  status: 'call' | 'break' | 'completed';
  mode: string;
  roundStartedAt: number;
  roundExpiresAt: number;
  remainingSeconds: number;
  participants: ActiveRoundParticipantDetail[];
  terminatedAt?: number;
  terminatedByUserId?: string;
  terminatedReason?: string;
}

export interface ActiveRoundRemovalRecord {
  removalId: string;
  eventId: string;
  roundIndex: number;
  roundNumber: number;
  roundId?: string;
  userId: string;
  userName?: string;
  removedBy: string;
  removedAt: number;
  reason: string;
  reportId?: string;
  sfuRemoved?: boolean;
}

export interface RegisteredUserSummary {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  gender: 'Woman' | 'Man' | 'Non-Binary';
  location: string;
  occupation?: string;
  subscriptionTier: SubscriptionTier;
  createdAt: number;
  lastSignIn: number | null; // epoch ms or null if unavailable
  hasActiveSession: boolean;
  isBanned: boolean;
  isOwner: boolean;
  subscriptionStatus?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeCustomerIdLive?: string | null;
  stripeCustomerIdTest?: string | null;
  isTester?: boolean;
  testerAccessGranted?: boolean;
  testerAccessGrantedAt?: number | null;
  testerAccessGrantedBy?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: number | null;
  launchOfferGrantNumber?: number | null;
  launchOfferGrantedAt?: number | null;
  launchOfferExpiresAt?: number | null;
  launchOfferActive?: boolean;
}

export interface TesterGrantRecord {
  email: string;
  grantedAt: number;
  grantedBy: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  location?: string | null;
  currentTier?: string;
  isRegistered?: boolean;
  notes?: string;
}

export interface LiveSessionState {
  userId: string;
  eventId: string;
  roundIndex: number;
  stage: 'call' | 'break' | 'waiting_room';
  roundStartedAt: number; // Unix timestamp in ms
  roundExpiresAt?: number; // Server-authoritative expiration timestamp
  breakStartedAt: number | null; // Unix timestamp in ms
  breakExpiresAt?: number | null; // Server-authoritative break expiration timestamp
  roundDurationSeconds: number; // e.g. 300
  breakDurationSeconds: number; // e.g. 120
  vote: 'like' | 'pass' | null;
  notes: string;
  partnerId: string;
  currentView: AppView;
  lastActive: number;
  mode?: AppMode;
  isPaused?: boolean;
  pausedAt?: number | null;
  accumulatedPauseMs?: number;
  hasEndedEarly?: boolean;
  votedAt?: number;
  isReady?: boolean;
  completedRoundIndex?: number;
}

export interface WaitlistEntrySummary {
  userId: string;
  joinedAt: number;
  updatedAt?: number;
}

export interface OwnerWaitlistMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  gender: 'Woman' | 'Man' | 'Non-Binary';
  interestedIn: 'Men' | 'Women' | 'Everyone';
  location: string;
  relationshipIntent?: string;
  subscriptionTier: SubscriptionTier;
  joinedAt: number;
  updatedAt?: number;
  compatibleCount: number;
  compatibleWithNames: string[];
}

export interface OwnerWaitlistSummary {
  totalWaitlisted: number;
  womenSeekingMen: number;
  menSeekingWomen: number;
  lgbtqOrEveryone: number;
  thirtyPlusCount: number;
  compatiblePairsCount: number;
}


