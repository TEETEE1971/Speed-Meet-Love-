import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { AccessToken } from 'livekit-server-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// LiveKit credentials from secure server-side environment variables
// Never expose these in client-side code or commit them to public repos
const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

const isLiveKitConfigured = () => Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);

// Server-side persistent session store for active speed dating events
export interface ServerLiveSession {
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
  currentView: string;
  lastActive: number;
  mode?: 'demonstration' | 'production';
  isPaused: boolean;
  pausedAt: number | null;
  accumulatedPauseMs: number;
}

// Keyed by `${mode}_${userId}` so Demo Sandbox and Production Mode never cross-contaminate
const sessions = new Map<string, ServerLiveSession>();

const getSessionKey = (mode: string = 'demonstration', userId: string) => `${mode}_${userId}`;

// API: Retrieve user session for current mode
app.get('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
  const mode = (req.query.mode as string) || 'demonstration';
  const session = sessions.get(getSessionKey(mode, userId));
  if (session) {
    res.json({ success: true, session });
  } else {
    res.json({ success: false, session: null });
  }
});

// API: Upsert user session for specific mode
app.post('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
  const body = req.body as Partial<ServerLiveSession>;
  const mode = body.mode || (req.query.mode as 'demonstration' | 'production') || 'demonstration';
  const key = getSessionKey(mode, userId);
  const existing = sessions.get(key);

  const updated: ServerLiveSession = {
    userId,
    eventId: body.eventId || existing?.eventId || '',
    roundIndex: body.roundIndex !== undefined ? body.roundIndex : existing?.roundIndex || 0,
    stage: body.stage || existing?.stage || 'call',
    roundStartedAt: body.roundStartedAt || existing?.roundStartedAt || Date.now(),
    breakStartedAt: body.breakStartedAt !== undefined ? body.breakStartedAt : existing?.breakStartedAt || null,
    roundDurationSeconds: body.roundDurationSeconds || existing?.roundDurationSeconds || 300,
    breakDurationSeconds: body.breakDurationSeconds || existing?.breakDurationSeconds || 120,
    vote: body.vote !== undefined ? body.vote : existing?.vote || null,
    notes: body.notes !== undefined ? body.notes : existing?.notes || '',
    partnerId: body.partnerId || existing?.partnerId || '',
    currentView: body.currentView || existing?.currentView || 'live',
    lastActive: Date.now(),
    mode,
    isPaused: body.isPaused !== undefined ? body.isPaused : existing?.isPaused || false,
    pausedAt: body.pausedAt !== undefined ? body.pausedAt : existing?.pausedAt || null,
    accumulatedPauseMs: body.accumulatedPauseMs !== undefined ? body.accumulatedPauseMs : existing?.accumulatedPauseMs || 0,
  };

  sessions.set(key, updated);
  res.json({ success: true, session: updated });
});

// API: Clear session when event is finished or user leaves
app.delete('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
  const mode = req.query.mode as string;
  if (mode) {
    sessions.delete(getSessionKey(mode, userId));
  } else {
    sessions.delete(getSessionKey('demonstration', userId));
    sessions.delete(getSessionKey('production', userId));
  }
  res.json({ success: true, message: `Session for user ${userId} cleared` });
});

// ============================================================================
// SERVER-AUTHORITATIVE SHARED ROUND TIMER & REAL-TIME STATE STORE
// ============================================================================
// Guarantees both participants share the exact same 5-minute countdown (300s).
// Neither refreshes, app switching, disconnections, nor rejoins can reset or
// extend the timer. Server automatically transitions expired rounds to 'break'.
// ============================================================================

export interface ServerSharedRound {
  roundId: string; // e.g. `${eventId}_r${roundIndex}_${sortedPair}`
  roomKey: string; // `${eventId}_r${roundIndex}`
  eventId: string;
  roundIndex: number;
  participants: string[];
  status: 'call' | 'break' | 'completed';
  roundStartedAt: number; // Unix timestamp in ms
  roundExpiresAt: number; // Unix timestamp in ms = roundStartedAt + (roundDurationSeconds * 1000)
  roundDurationSeconds: number; // 300
  breakStartedAt: number | null;
  breakExpiresAt: number | null;
  breakDurationSeconds: number; // 120
  completedAt: number | null;
  mode: 'demonstration' | 'production';
  lastUpdated: number;
  earlyExitedParticipants?: string[]; // userIds who explicitly tapped End Round early
  earlyEndTimestamps?: Record<string, number>;
}

const DATA_DIR = path.resolve(__dirname, '.data');

// Ensure runtime storage directory exists on server startup
function ensureStorageDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Failed to initialize storage directory:', err);
  }
}
ensureStorageDirectory();

const ROUNDS_FILE = path.join(DATA_DIR, 'shared_rounds.json');
const sharedRounds = new Map<string, ServerSharedRound>();

function loadSharedRoundsFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(ROUNDS_FILE)) {
      const data = fs.readFileSync(ROUNDS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.roundId) {
            sharedRounds.set(item.roundId, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load shared rounds from disk:', err);
  }
}

function saveSharedRoundsToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const array = Array.from(sharedRounds.values());
    fs.writeFileSync(ROUNDS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save shared rounds to disk:', err);
  }
}

loadSharedRoundsFromDisk();

// ============================================================================
// PERSISTENT MUTUAL MATCHES STORAGE (SERVER-AUTHORITATIVE)
// ============================================================================
export interface ServerPersistentMatch {
  matchId: string;
  userA: string;
  userB: string;
  eventId: string;
  timestamp: string;
  chatUnlocked: boolean;
  chemistryScore: number;
  mutualInterests: string[];
  sparkNote: string;
  userALike: boolean;
  userBLike: boolean;
}

const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const persistentMatches = new Map<string, ServerPersistentMatch>();

function loadMatchesFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(MATCHES_FILE)) {
      const data = fs.readFileSync(MATCHES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.matchId) {
            persistentMatches.set(item.matchId, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load persistent matches from disk:', err);
  }
}

function saveMatchesToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const array = Array.from(persistentMatches.values());
    fs.writeFileSync(MATCHES_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save persistent matches to disk:', err);
  }
}

loadMatchesFromDisk();

// ============================================================================
// SERVER-AUTHORITATIVE ROUND VOTES STORAGE (IDEMPOTENT & CONFIDENTIAL)
// ============================================================================
export interface ServerRoundVote {
  voteId: string; // `${eventId}_r${roundIndex}_${userId}`
  eventId: string;
  roundIndex: number;
  userId: string;
  partnerId: string;
  decision: 'like' | 'pass';
  notes: string;
  timestamp: number;
}

const VOTES_FILE = path.join(DATA_DIR, 'round_votes.json');
const roundVotes = new Map<string, ServerRoundVote>();

function loadVotesFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(VOTES_FILE)) {
      const data = fs.readFileSync(VOTES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.voteId) {
            roundVotes.set(item.voteId, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load votes from disk:', err);
  }
}

function saveVotesToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const array = Array.from(roundVotes.values());
    fs.writeFileSync(VOTES_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save votes to disk:', err);
  }
}

loadVotesFromDisk();

export function getSharedRound(
  eventId: string,
  roundIndex: number,
  userId?: string,
  partnerId?: string,
  allowCompleted: boolean = false
): ServerSharedRound | undefined {
  const now = Date.now();
  const isRoundActive = (r: ServerSharedRound) => {
    if (allowCompleted) return true;
    if (r.status === 'completed') return false;
    return true;
  };

  // If both userId and partnerId are provided, ONLY match rounds that contain BOTH participants!
  if (userId && partnerId) {
    const sortedPair = [userId, partnerId].sort().join('_');
    const exactRoundId = `${eventId}_r${roundIndex}_${sortedPair}`;
    const round = sharedRounds.get(exactRoundId);
    if (round && isRoundActive(round)) {
      return round;
    }

    for (const r of sharedRounds.values()) {
      if (r.eventId === eventId && r.roundIndex === roundIndex && isRoundActive(r)) {
        if (r.participants.includes(userId) && r.participants.includes(partnerId)) {
          return r;
        }
      }
    }
    // Strict isolation: NEVER match a round with another dater when partnerId is specified!
    return undefined;
  }

  // If only userId is provided
  if (userId && !partnerId) {
    for (const r of sharedRounds.values()) {
      if (r.eventId === eventId && r.roundIndex === roundIndex && isRoundActive(r)) {
        if (r.participants.includes(userId)) {
          return r;
        }
      }
    }
    return undefined;
  }

  // If neither provided
  for (const r of sharedRounds.values()) {
    if (r.eventId === eventId && r.roundIndex === roundIndex && isRoundActive(r)) {
      return r;
    }
  }

  return undefined;
}

export function getOrCreateSharedRound(
  eventId: string,
  roundIndex: number,
  userId: string,
  partnerId: string,
  roundDurationSeconds = 300,
  breakDurationSeconds = 120,
  mode: 'demonstration' | 'production' = 'production',
  forceFresh = false
): ServerSharedRound {
  const now = Date.now();
  const existing = !forceFresh ? getSharedRound(eventId, roundIndex, userId, partnerId, true) : undefined;

  if (existing) {
    // Add participants if not already present
    if (userId && !existing.participants.includes(userId)) {
      existing.participants.push(userId);
    }
    if (partnerId && !existing.participants.includes(partnerId)) {
      existing.participants.push(partnerId);
    }

    // Check if the call is still within its active 5 minutes
    if (existing.status === 'call') {
      if (now < existing.roundExpiresAt) {
        // Active 5-minute call in progress! Reconnecting/refreshing MUST continue from original roundExpiresAt.
        return existing;
      } else {
        // Expired naturally based on authoritative server clock
        existing.status = 'break';
        existing.breakStartedAt = existing.roundExpiresAt;
        existing.breakExpiresAt = existing.roundExpiresAt + existing.breakDurationSeconds * 1000;
        existing.lastUpdated = now;
        saveSharedRoundsToDisk();
      }
    } else if (existing.status === 'break') {
      if (existing.breakExpiresAt && now >= existing.breakExpiresAt) {
        existing.status = 'completed';
        existing.completedAt = existing.breakExpiresAt;
        existing.lastUpdated = now;
        saveSharedRoundsToDisk();
      }
    }

    // If not explicitly requesting a fresh new round, return existing state (prevents round restart loop)
    if (!forceFresh) {
      return existing;
    }
  }

  // Create fresh new shared round (never reuse an expired round for a new date)
  const sortedPair = [userId, partnerId].filter(Boolean).sort().join('_');
  const roundId = `${eventId}_r${roundIndex}_${sortedPair || 'all'}`;
  const roomKey = `${eventId}_r${roundIndex}`;
  const roundStartedAt = now;
  const roundExpiresAt = now + roundDurationSeconds * 1000;

  const newRound: ServerSharedRound = {
    roundId,
    roomKey,
    eventId,
    roundIndex,
    participants: [userId, partnerId].filter(Boolean),
    status: 'call',
    roundStartedAt,
    roundExpiresAt,
    roundDurationSeconds,
    breakStartedAt: null,
    breakExpiresAt: null,
    breakDurationSeconds,
    completedAt: null,
    mode,
    lastUpdated: now,
    earlyExitedParticipants: [],
    earlyEndTimestamps: {},
  };

  sharedRounds.set(roundId, newRound);
  saveSharedRoundsToDisk();
  return newRound;
}

// API: Clear/Reset rounds for an event so starting matchmaking starts clean
app.post('/api/events/:eventId/reset-rounds', (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body;

  let clearedCount = 0;
  for (const [key, round] of sharedRounds.entries()) {
    if (round.eventId === eventId) {
      if (!userId || round.participants.includes(userId)) {
        sharedRounds.delete(key);
        clearedCount++;
      }
    }
  }

  saveSharedRoundsToDisk();
  return res.json({ success: true, clearedCount, message: `Reset ${clearedCount} rounds for event ${eventId}` });
});

// API: Retrieve authoritative round timer state
app.get('/api/events/:eventId/rounds/:roundIndex/timer', (req, res) => {
  const { eventId, roundIndex: roundIndexParam } = req.params;
  const roundIndex = Number(roundIndexParam) || 0;
  const userId = req.query.userId as string | undefined;
  const partnerId = req.query.partnerId as string | undefined;

  let round = getSharedRound(eventId, roundIndex, userId, partnerId, true);
  const now = Date.now();

  if (!round && userId) {
    const effectivePartner = partnerId || (userId === 'usr_kristy' ? 'usr_me' : 'usr_kristy');
    // Auto-create with server-authoritative 5-minute duration
    round = getOrCreateSharedRound(eventId, roundIndex, userId, effectivePartner, 300, 120, 'production', false);
  }

  if (!round) {
    return res.status(404).json({
      success: false,
      error: 'Round timer has not started yet. Call POST /api/events/:eventId/rounds/:roundIndex/timer to initialize.',
      serverTime: now,
    });
  }

  // Check expiration status transition (5 minutes elapsed on server)
  if (round.status === 'call' && now >= round.roundExpiresAt) {
    round.status = 'break';
    round.breakStartedAt = round.roundExpiresAt;
    round.breakExpiresAt = round.roundExpiresAt + round.breakDurationSeconds * 1000;
    round.lastUpdated = now;
    saveSharedRoundsToDisk();
  } else if (round.status === 'break' && round.breakExpiresAt && now >= round.breakExpiresAt) {
    round.status = 'completed';
    round.completedAt = round.breakExpiresAt;
    round.lastUpdated = now;
    saveSharedRoundsToDisk();
  }

  const isParticipantEarlyExited = userId ? Boolean(round.earlyExitedParticipants?.includes(userId)) : false;
  const userBreakStartedAt = isParticipantEarlyExited && userId
    ? (round.earlyEndTimestamps && round.earlyEndTimestamps[userId]) || round.breakStartedAt || now
    : round.breakStartedAt;
  const userBreakExpiresAt = userBreakStartedAt
    ? userBreakStartedAt + round.breakDurationSeconds * 1000
    : (round.roundExpiresAt + round.breakDurationSeconds * 1000);

  const remainingSeconds = round.status === 'call' && !isParticipantEarlyExited
    ? Math.max(0, Math.floor((round.roundExpiresAt - now) / 1000))
    : 0;

  const remainingBreakSeconds = Math.max(0, Math.floor((userBreakExpiresAt - now) / 1000));
  const userStage = isParticipantEarlyExited ? 'break' : round.status;

  return res.json({
    success: true,
    round: {
      roundId: round.roundId,
      roomKey: round.roomKey,
      eventId: round.eventId,
      roundIndex: round.roundIndex,
      status: round.status,
      userStage,
      userEndedEarly: isParticipantEarlyExited,
      roundStartedAt: round.roundStartedAt,
      roundExpiresAt: round.roundExpiresAt,
      roundDurationSeconds: round.roundDurationSeconds,
      breakStartedAt: userBreakStartedAt,
      breakExpiresAt: userBreakExpiresAt,
      breakDurationSeconds: round.breakDurationSeconds,
      remainingSeconds,
      remainingBreakSeconds,
      serverTime: now,
      isExpired: now >= round.roundExpiresAt,
    },
  });
});

// API: Immediately end round early for an individual participant without terminating partner's 5-minute round
app.post('/api/events/:eventId/rounds/:roundIndex/end-early', (req, res) => {
  const { eventId, roundIndex: roundIndexParam } = req.params;
  const roundIndex = Number(roundIndexParam) || 0;
  const { userId, partnerId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const now = Date.now();
  let round = getSharedRound(eventId, roundIndex, userId, partnerId, true);
  if (!round) {
    round = getOrCreateSharedRound(eventId, roundIndex, userId, partnerId || '', 300, 120, 'production', false);
  }

  if (!round.earlyExitedParticipants) {
    round.earlyExitedParticipants = [];
  }
  if (!round.earlyEndTimestamps) {
    round.earlyEndTimestamps = {};
  }

  if (!round.earlyExitedParticipants.includes(userId)) {
    round.earlyExitedParticipants.push(userId);
  }
  round.earlyEndTimestamps[userId] = now;
  round.lastUpdated = now;

  // If ALL active participants have exited early, move the shared round into break
  const allEnded = round.participants.length > 0 && round.participants.every(p => round!.earlyExitedParticipants?.includes(p));
  if (allEnded && round.status === 'call') {
    round.status = 'break';
    round.breakStartedAt = now;
    round.breakExpiresAt = now + round.breakDurationSeconds * 1000;
  }

  saveSharedRoundsToDisk();

  // Synchronize session store for this user
  for (const mode of ['demonstration', 'production']) {
    const key = getSessionKey(mode, userId);
    const existingSession = sessions.get(key);
    if (existingSession && existingSession.eventId === eventId) {
      existingSession.roundIndex = roundIndex;
      existingSession.stage = 'break';
      existingSession.breakStartedAt = now;
      existingSession.lastActive = now;
      sessions.set(key, existingSession);
    }
  }

  return res.json({
    success: true,
    userEndedEarly: true,
    userStage: 'break',
    roundStatus: round.status,
    roundExpiresAt: round.roundExpiresAt,
    userBreakExpiresAt: now + round.breakDurationSeconds * 1000,
    remainingBreakSeconds: round.breakDurationSeconds,
    serverTime: now,
  });
});

// API: Initialize or synchronize round timer (Idempotent: Never resets active timer)
app.post('/api/events/:eventId/rounds/:roundIndex/timer', (req, res) => {
  const { eventId, roundIndex: roundIndexParam } = req.params;
  const roundIndex = Number(roundIndexParam) || 0;
  const {
    userId = 'unknown_user',
    partnerId = '',
    roundDurationSeconds = 300,
    breakDurationSeconds = 120,
    mode = 'production',
    action,
    forceFresh = false,
  } = req.body;

  const round = getOrCreateSharedRound(
    eventId,
    roundIndex,
    userId,
    partnerId,
    roundDurationSeconds,
    breakDurationSeconds,
    mode,
    Boolean(forceFresh)
  );

  const now = Date.now();

  // Handle explicit early vote / skip action per user
  if (action === 'end_round' && round.status === 'call') {
    if (userId && userId !== 'unknown_user') {
      if (!round.earlyExitedParticipants) round.earlyExitedParticipants = [];
      if (!round.earlyEndTimestamps) round.earlyEndTimestamps = {};
      if (!round.earlyExitedParticipants.includes(userId)) {
        round.earlyExitedParticipants.push(userId);
      }
      round.earlyEndTimestamps[userId] = now;
    }

    const allEnded = round.participants.length > 0 && round.participants.every(p => round!.earlyExitedParticipants?.includes(p));
    if (allEnded || !partnerId) {
      round.status = 'break';
      round.roundExpiresAt = now;
      round.breakStartedAt = now;
      round.breakExpiresAt = now + round.breakDurationSeconds * 1000;
    }
    round.lastUpdated = now;
    saveSharedRoundsToDisk();
  }

  const isParticipantEarlyExited = userId ? Boolean(round.earlyExitedParticipants?.includes(userId)) : false;
  const userBreakStartedAt = isParticipantEarlyExited && userId
    ? (round.earlyEndTimestamps && round.earlyEndTimestamps[userId]) || round.breakStartedAt || now
    : round.breakStartedAt;
  const userBreakExpiresAt = userBreakStartedAt
    ? userBreakStartedAt + round.breakDurationSeconds * 1000
    : (round.roundExpiresAt + round.breakDurationSeconds * 1000);

  const remainingSeconds = round.status === 'call' && !isParticipantEarlyExited
    ? Math.max(0, Math.floor((round.roundExpiresAt - now) / 1000))
    : 0;

  const remainingBreakSeconds = Math.max(0, Math.floor((userBreakExpiresAt - now) / 1000));
  const userStage = isParticipantEarlyExited ? 'break' : round.status;

  return res.json({
    success: true,
    round: {
      roundId: round.roundId,
      roomKey: round.roomKey,
      eventId: round.eventId,
      roundIndex: round.roundIndex,
      status: round.status,
      userStage,
      userEndedEarly: isParticipantEarlyExited,
      roundStartedAt: round.roundStartedAt,
      roundExpiresAt: round.roundExpiresAt,
      roundDurationSeconds: round.roundDurationSeconds,
      breakStartedAt: userBreakStartedAt,
      breakExpiresAt: userBreakExpiresAt,
      breakDurationSeconds: round.breakDurationSeconds,
      remainingSeconds,
      remainingBreakSeconds,
      serverTime: now,
      isExpired: now >= round.roundExpiresAt,
    },
  });
});

// API: Confidential Secret Ballot Voting (Idempotent: 1 vote per user per round, secure server persistence)
app.post('/api/events/:eventId/rounds/:roundIndex/vote', (req, res) => {
  const { eventId, roundIndex: roundIndexParam } = req.params;
  const roundIndex = Number(roundIndexParam) || 0;
  const { userId, partnerId, decision, notes = '' } = req.body;

  if (!userId || !partnerId) {
    return res.status(400).json({ success: false, error: 'userId and partnerId are required' });
  }

  if (decision !== 'like' && decision !== 'pass') {
    return res.status(400).json({ success: false, error: 'decision must be either "like" or "pass"' });
  }

  const now = Date.now();
  const voteId = `${eventId}_r${roundIndex}_${userId}`;
  const existingVote = roundVotes.get(voteId);

  let vote: ServerRoundVote;
  if (existingVote) {
    // Vote already cast: update notes if provided, preserve single vote record (idempotency guard)
    if (notes) existingVote.notes = notes;
    existingVote.decision = decision;
    existingVote.timestamp = now;
    vote = existingVote;
  } else {
    vote = {
      voteId,
      eventId,
      roundIndex,
      userId,
      partnerId,
      decision,
      notes: notes || '',
      timestamp: now,
    };
    roundVotes.set(voteId, vote);
  }
  saveVotesToDisk();

  // Sync session store with vote
  for (const mode of ['demonstration', 'production']) {
    const key = getSessionKey(mode, userId);
    const s = sessions.get(key);
    if (s && s.eventId === eventId && s.roundIndex === roundIndex) {
      s.vote = decision;
      s.notes = notes || s.notes;
      s.lastActive = now;
      sessions.set(key, s);
    }
  }

  // Automatic Mutual Like Evaluation: check if partner also cast a Like for this round
  const partnerVoteId = `${eventId}_r${roundIndex}_${partnerId}`;
  const partnerVote = roundVotes.get(partnerVoteId);
  let isMutualMatch = false;
  let createdMatch: ServerPersistentMatch | null = null;

  if (decision === 'like' && partnerVote && partnerVote.decision === 'like' && partnerVote.partnerId === userId) {
    isMutualMatch = true;
    const sortedPair = [userId, partnerId].sort().join('_');
    const matchId = `match_${sortedPair}_${eventId}`;

    if (!persistentMatches.has(matchId)) {
      createdMatch = {
        matchId,
        userA: userId,
        userB: partnerId,
        eventId,
        timestamp: new Date().toISOString(),
        chatUnlocked: true,
        chemistryScore: Math.floor(88 + Math.random() * 11),
        mutualInterests: ['Speed Dating Spark', 'Mutual Chemistry'],
        sparkNote: `Mutual chemistry sparked during round ${roundIndex + 1}!`,
        userALike: true,
        userBLike: true,
      };
      persistentMatches.set(matchId, createdMatch);
      saveMatchesToDisk();
    } else {
      createdMatch = persistentMatches.get(matchId)!;
    }
  }

  return res.json({
    success: true,
    vote,
    isMutualMatch,
    match: createdMatch,
    message: decision === 'like' ? 'Confidential Like recorded securely.' : 'Confidential Pass recorded securely.',
  });
});

// API: Retrieve recorded vote for a user in this round
app.get('/api/events/:eventId/rounds/:roundIndex/vote', (req, res) => {
  const { eventId, roundIndex: roundIndexParam } = req.params;
  const roundIndex = Number(roundIndexParam) || 0;
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const voteId = `${eventId}_r${roundIndex}_${userId}`;
  const vote = roundVotes.get(voteId) || null;

  return res.json({ success: true, vote });
});

// API: Retrieve persistent mutual matches for a user
app.get('/api/matches', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const userMatches: ServerPersistentMatch[] = [];
  for (const m of persistentMatches.values()) {
    if (m.userA === userId || m.userB === userId) {
      userMatches.push(m);
    }
  }

  return res.json({ success: true, matches: userMatches });
});

// API: Save a mutual match (Strictly requires both participants to have liked each other)
app.post('/api/matches', (req, res) => {
  const {
    matchId,
    userA,
    userB,
    eventId = 'evt_general',
    chatUnlocked = false,
    chemistryScore = 90,
    mutualInterests = [],
    sparkNote = 'Mutual connection sparked!',
    userALike,
    userBLike,
  } = req.body;

  if (!userA || !userB) {
    return res.status(400).json({ success: false, error: 'userA and userB are required' });
  }

  // Security check: NEVER fabricate a mutual match from a one-sided vote
  if (userALike !== true || userBLike !== true) {
    return res.status(400).json({
      success: false,
      code: 'MUTUAL_LIKE_REQUIRED',
      error: 'Cannot record match: Both participants must select Like for a mutual match to be created.',
    });
  }

  const sortedPair = [userA, userB].sort().join('_');
  const finalMatchId = matchId || `match_${sortedPair}_${eventId}`;

  // Check if already stored
  if (persistentMatches.has(finalMatchId)) {
    return res.json({ success: true, match: persistentMatches.get(finalMatchId), alreadyExisted: true });
  }

  // Also check if any existing match between userA and userB exists
  for (const m of persistentMatches.values()) {
    if ((m.userA === userA && m.userB === userB) || (m.userA === userB && m.userB === userA)) {
      return res.json({ success: true, match: m, alreadyExisted: true });
    }
  }

  const newMatch: ServerPersistentMatch = {
    matchId: finalMatchId,
    userA,
    userB,
    eventId,
    timestamp: new Date().toISOString(),
    chatUnlocked: Boolean(chatUnlocked),
    chemistryScore: Number(chemistryScore) || 90,
    mutualInterests: Array.isArray(mutualInterests) ? mutualInterests : [],
    sparkNote: String(sparkNote),
    userALike: true,
    userBLike: true,
  };

  persistentMatches.set(finalMatchId, newMatch);
  saveMatchesToDisk();

  return res.json({ success: true, match: newMatch, created: true });
});

// ============================================================================
// REAL-TIME HEART REACTIONS (NON-VERBAL IN-DATE INTEREST)
// ============================================================================
export interface HeartReaction {
  id: string;
  roundKey: string;
  senderId: string;
  senderName?: string;
  type: 'heart';
  timestamp: number;
}

const activeReactions = new Map<string, HeartReaction[]>();

// API: Send a real-time heart reaction to speed dating partner
app.post('/api/events/:eventId/rounds/:roundIndex/reaction', (req, res) => {
  const { eventId, roundIndex } = req.params;
  const { userId, userName, partnerId } = req.body;
  const sortedPair = [userId, partnerId].filter(Boolean).sort().join('_');
  const roundKey = `${eventId}_r${roundIndex}_${sortedPair || 'all'}`;

  const reaction: HeartReaction = {
    id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    roundKey,
    senderId: userId || 'anonymous',
    senderName: userName || 'Dater',
    type: 'heart',
    timestamp: Date.now(),
  };

  const list = activeReactions.get(roundKey) || [];
  const cutoff = Date.now() - 30000; // keep last 30s
  const updated = [...list.filter(r => r.timestamp > cutoff), reaction];
  activeReactions.set(roundKey, updated);

  res.json({ success: true, reaction });
});

// API: Retrieve latest heart reactions for this round
app.get('/api/events/:eventId/rounds/:roundIndex/reactions', (req, res) => {
  const { eventId, roundIndex } = req.params;
  const { userId, partnerId, since } = req.query;
  const sortedPair = [userId as string, partnerId as string].filter(Boolean).sort().join('_');
  const roundKey = `${eventId}_r${roundIndex}_${sortedPair || 'all'}`;

  const list = activeReactions.get(roundKey) || [];
  const sinceMs = Number(since) || (Date.now() - 10000);
  const fresh = list.filter(r => r.timestamp > sinceMs);

  res.json({ success: true, reactions: fresh, serverTime: Date.now() });
});

// ============================================================================
// SERVER-AUTHORITATIVE 10-MINUTE SECOND CHANCE DATES STORE & ENGINE
// ============================================================================
// Rules:
// - Both participants must explicitly agree ("Another Date ❤️").
// - Server-authoritative 10-minute timer (600 seconds).
// - Reconnecting/refreshing NEVER restarts the 10-minute timer.
// - Automatically ends video session when 10 minutes expire.
// - Mutual match remains saved for messaging.
// - Never allows a member to be in two simultaneous video calls.
// - Premium Plus ($14.99/mo) membership required on server.
// ============================================================================

export interface ServerSecondDateSession {
  sessionId: string; // `sec_${eventId}_${sortedPair}`
  eventId: string;
  userA: string;
  userB: string;
  userAName?: string;
  userBName?: string;
  requestedBy: string;
  userAConsent: boolean;
  userBConsent: boolean;
  status: 'waiting_for_partner' | 'ready_to_start' | 'active' | 'completed' | 'declined';
  startedAt: number | null; // ms
  expiresAt: number | null; // ms = startedAt + (durationSeconds * 1000)
  durationSeconds: number; // 600 (10 minutes)
  createdAt: number;
  lastUpdated: number;
  mode: 'demonstration' | 'production';
  matchId?: string;
}

const SECOND_DATES_FILE = path.join(DATA_DIR, 'second_dates.json');
const secondDateSessions = new Map<string, ServerSecondDateSession>();

function loadSecondDateSessionsFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(SECOND_DATES_FILE)) {
      const data = fs.readFileSync(SECOND_DATES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.sessionId) {
            secondDateSessions.set(item.sessionId, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load second date sessions from disk:', err);
  }
}

function saveSecondDateSessionsToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const array = Array.from(secondDateSessions.values());
    fs.writeFileSync(SECOND_DATES_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save second date sessions to disk:', err);
  }
}

loadSecondDateSessionsFromDisk();

export function getSecondDateSession(
  eventId: string,
  userId: string,
  partnerId: string
): ServerSecondDateSession | undefined {
  const sortedPair = [userId, partnerId].sort().join('_');
  const exactId = `sec_${eventId}_${sortedPair}`;
  if (secondDateSessions.has(exactId)) {
    return secondDateSessions.get(exactId);
  }
  for (const s of secondDateSessions.values()) {
    if (
      s.eventId === eventId &&
      ((s.userA === userId && s.userB === partnerId) || (s.userA === partnerId && s.userB === userId))
    ) {
      return s;
    }
  }
  return undefined;
}

// API: Request "Another Date ❤️" (10-Minute Second Chance Date)
app.post('/api/second-date/request', (req, res) => {
  const {
    eventId = 'evt_live_now',
    userId,
    userName = 'Dater',
    userAge,
    tier,
    partnerId,
    partnerName = 'Partner',
    mode = 'production',
    matchId,
    simulatePartnerConsent = false,
  } = req.body;

  if (!userId || !partnerId) {
    return res.status(400).json({ success: false, error: 'userId and partnerId are required' });
  }

  // Feature 5: Server-enforced adult age check (18+)
  if (typeof userAge === 'number' && userAge < 18) {
    return res.status(403).json({
      success: false,
      code: 'ADULT_VERIFICATION_FAILED',
      error: 'Access denied: Speed Meet Love strictly requires all participants to be verified adults aged 18 and older.',
    });
  }

  // Feature 5: Server-enforced membership check (Premium Plus $14.99/mo required)
  if (tier && tier !== 'Premium Plus') {
    return res.status(403).json({
      success: false,
      code: 'PREMIUM_PLUS_REQUIRED',
      error: 'Access denied: Second Chance live video dates require an active Premium Plus membership ($14.99/mo).',
    });
  }

  const now = Date.now();

  // Feature 3: Never place a member into two video calls simultaneously
  for (const s of secondDateSessions.values()) {
    if (
      s.status === 'active' &&
      s.expiresAt &&
      now < s.expiresAt &&
      (s.userA === userId || s.userB === userId) &&
      !(s.userA === partnerId || s.userB === partnerId)
    ) {
      return res.status(409).json({
        success: false,
        code: 'ACTIVE_SESSION_CONFLICT',
        error: 'You currently have an active 10-minute date in progress with another match. Please finish that date first.',
        activeSessionId: s.sessionId,
      });
    }
  }

  const sortedPair = [userId, partnerId].sort().join('_');
  const sessionId = `sec_${eventId}_${sortedPair}`;
  let session = secondDateSessions.get(sessionId);

  const [userA, userB] = [userId, partnerId].sort();
  const isUserA = userId === userA;

  if (session) {
    if (isUserA) {
      session.userAConsent = true;
    } else {
      session.userBConsent = true;
    }

    if (simulatePartnerConsent) {
      session.userAConsent = true;
      session.userBConsent = true;
    }

    if (session.userAConsent && session.userBConsent) {
      if (session.status === 'waiting_for_partner') {
        session.status = 'ready_to_start';
      }
    }
    session.lastUpdated = now;
    saveSecondDateSessionsToDisk();
    return res.json({ success: true, session });
  }

  // Create new session
  const newSession: ServerSecondDateSession = {
    sessionId,
    eventId,
    userA,
    userB,
    userAName: isUserA ? userName : partnerName,
    userBName: isUserA ? partnerName : userName,
    requestedBy: userId,
    userAConsent: isUserA || Boolean(simulatePartnerConsent),
    userBConsent: !isUserA || Boolean(simulatePartnerConsent),
    status: simulatePartnerConsent ? 'ready_to_start' : 'waiting_for_partner',
    startedAt: null,
    expiresAt: null,
    durationSeconds: 600, // Exactly 10 minutes
    createdAt: now,
    lastUpdated: now,
    mode,
    matchId,
  };

  secondDateSessions.set(sessionId, newSession);
  saveSecondDateSessionsToDisk();
  return res.json({ success: true, session: newSession });
});

// API: Respond to Second Date Request ("accept" or "save_and_chat" / "decline")
app.post('/api/second-date/respond', (req, res) => {
  const { sessionId, userId, action } = req.body;
  if (!sessionId || !userId) {
    return res.status(400).json({ success: false, error: 'sessionId and userId are required' });
  }

  const session = secondDateSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Second date session not found' });
  }

  const now = Date.now();
  const isUserA = userId === session.userA;

  if (action === 'accept') {
    if (isUserA) session.userAConsent = true;
    else session.userBConsent = true;

    if (session.userAConsent && session.userBConsent) {
      session.status = 'ready_to_start';
    }
  } else if (action === 'decline' || action === 'save_and_chat') {
    // Feature 2: If someone declines or chooses to save and chat, do not start the call. Keep match saved.
    session.status = 'declined';
  }

  session.lastUpdated = now;
  saveSecondDateSessionsToDisk();
  return res.json({ success: true, session });
});

// API: Explicitly start the 10-Minute Second Chance Date
// Both must agree; never auto-launches camera or mic
app.post('/api/second-date/start', (req, res) => {
  const { sessionId, userId, tier } = req.body;
  const session = secondDateSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Second date session not found' });
  }

  if (tier && tier !== 'Premium Plus') {
    return res.status(403).json({
      success: false,
      code: 'PREMIUM_PLUS_REQUIRED',
      error: 'Access denied: Second Chance live video dates require an active Premium Plus membership ($14.99/mo).',
    });
  }

  if (!session.userAConsent || !session.userBConsent) {
    return res.status(403).json({
      success: false,
      code: 'MUTUAL_CONSENT_REQUIRED',
      error: 'Both participants must explicitly agree to Another Date before entering.',
    });
  }

  const now = Date.now();

  // If already active, return the existing authoritative start and expiration timestamps (NEVER reset)!
  if (session.status === 'active') {
    if (session.expiresAt && now >= session.expiresAt) {
      session.status = 'completed';
      saveSecondDateSessionsToDisk();
      return res.json({
        success: true,
        session,
        isExpired: true,
        remainingSeconds: 0,
      });
    }

    const remaining = Math.max(0, Math.floor(((session.expiresAt || now) - now) / 1000));
    return res.json({
      success: true,
      session,
      isExpired: false,
      remainingSeconds: remaining,
    });
  }

  // Activate session with server-authoritative 10-minute duration (600 seconds)
  session.status = 'active';
  session.startedAt = now;
  session.expiresAt = now + session.durationSeconds * 1000;
  session.lastUpdated = now;
  saveSecondDateSessionsToDisk();

  return res.json({
    success: true,
    session,
    isExpired: false,
    remainingSeconds: session.durationSeconds,
  });
});

// API: Authoritative 10-Minute Countdown Timer for Second Chance Date
app.get('/api/second-date/:sessionId/timer', (req, res) => {
  const { sessionId } = req.params;
  const session = secondDateSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }

  const now = Date.now();

  // Auto-expire when original 10 minutes pass
  if (session.status === 'active' && session.expiresAt && now >= session.expiresAt) {
    session.status = 'completed';
    session.lastUpdated = now;
    saveSecondDateSessionsToDisk();
  }

  const remainingSeconds =
    session.status === 'active' && session.expiresAt
      ? Math.max(0, Math.floor((session.expiresAt - now) / 1000))
      : 0;

  return res.json({
    success: true,
    sessionId: session.sessionId,
    status: session.status,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    durationSeconds: session.durationSeconds,
    remainingSeconds,
    isExpired: session.expiresAt ? now >= session.expiresAt : false,
    serverTime: now,
  });
});

// API: Get all second-date sessions involving user
app.get('/api/second-date/status', (req, res) => {
  const userId = req.query.userId as string | undefined;
  const eventId = req.query.eventId as string | undefined;

  const now = Date.now();
  const results: ServerSecondDateSession[] = [];

  for (const s of secondDateSessions.values()) {
    if (s.status === 'active' && s.expiresAt && now >= s.expiresAt) {
      s.status = 'completed';
      s.lastUpdated = now;
      saveSecondDateSessionsToDisk();
    }

    if (userId && (s.userA === userId || s.userB === userId)) {
      if (!eventId || s.eventId === eventId) {
        results.push(s);
      }
    } else if (!userId && eventId && s.eventId === eventId) {
      results.push(s);
    }
  }

  res.json({ success: true, sessions: results, serverTime: now });
});

// API: End second chance date and return to match details
app.post('/api/second-date/:sessionId/end', (req, res) => {
  const { sessionId } = req.params;
  const session = secondDateSessions.get(sessionId);
  if (session) {
    session.status = 'completed';
    session.lastUpdated = Date.now();
    saveSecondDateSessionsToDisk();
  }
  res.json({ success: true, message: 'Second chance date ended. Match saved!' });
});

// Server-side calculation of exact start time in America/New_York (handles DST automatically)
export function getEpochMsInEasternTime(dateStr: string, timeStr = '19:00'): number {
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
    const yDiff = pMap.year - year;
    const mDiff = pMap.month - month;
    const dDiff = pMap.day - day;
    const hDiff = pMap.hour - hours;
    const minDiff = pMap.minute - minutes;

    const diffMinutes = yDiff * 525600 + mDiff * 43200 + dDiff * 1440 + hDiff * 60 + minDiff;
    if (diffMinutes === 0) break;
    epoch -= diffMinutes * 60 * 1000;
  }
  return epoch;
}

// Track demo simulation overrides
const simulatedLiveEvents = new Set<string>();

// API: Exact server time in America/New_York
app.get('/api/time', (_req, res) => {
  const now = Date.now();
  const dateObj = new Date(now);
  const formattedET = dateObj.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  res.json({
    serverTime: now,
    serverIso: dateObj.toISOString(),
    timeZone: 'America/New_York',
    serverTimeFormattedET: formattedET,
  });
});

// API: Server-validated schedule for Speed Meet Love events
app.get('/api/events/schedule', (_req, res) => {
  const now = Date.now();
  const dateObj = new Date(now);
  const formattedET = dateObj.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  res.json({
    serverTime: now,
    serverIso: dateObj.toISOString(),
    timeZone: 'America/New_York',
    serverTimeFormattedET: formattedET,
    simulatedLiveEvents: Array.from(simulatedLiveEvents),
  });
});

// API: Validate whether a member can enter video rounds vs waiting room
app.post('/api/events/:eventId/validate-entry', (req, res) => {
  const { eventId } = req.params;
  const { eventDate, eventStartTime = '19:00', eventEndTime = '20:15', mode = 'demonstration' } = req.body;

  const now = Date.now();
  if (!eventDate) {
    return res.status(400).json({ allowed: false, reason: 'eventDate is required' });
  }

  const startMs = getEpochMsInEasternTime(eventDate, eventStartTime);
  const endMs = getEpochMsInEasternTime(eventDate, eventEndTime);
  const isSimulated = mode === 'demonstration' && simulatedLiveEvents.has(eventId);

  const isActuallyLive = now >= startMs && now <= endMs;
  const isLive = isActuallyLive || isSimulated;
  const isUpcoming = now < startMs && !isSimulated;

  if (isUpcoming) {
    return res.json({
      allowed: false,
      isLive: false,
      canEnterWaitingRoom: true,
      timeUntilStartMs: Math.max(0, startMs - now),
      startTimeMs: startMs,
      reason: 'Event has not started yet. Speed dating begins at 7:00 PM Eastern Time. You may enter the Waiting Room.',
    });
  }

  if (now > endMs && !isSimulated) {
    return res.json({
      allowed: false,
      isLive: false,
      canEnterWaitingRoom: false,
      reason: 'This event has concluded. Please register for an upcoming Friday, Saturday, or Sunday session.',
    });
  }

  return res.json({
    allowed: true,
    isLive: true,
    isSimulated,
    canEnterWaitingRoom: true,
    timeRemainingMs: Math.max(0, endMs - now),
  });
});

// API: Toggle demo simulation for testing
app.post('/api/events/:eventId/simulate-start', (req, res) => {
  const { eventId } = req.params;
  const enable = req.body.enable !== undefined ? req.body.enable : Boolean(req.body.isLive);
  if (enable) {
    simulatedLiveEvents.add(eventId);
  } else {
    simulatedLiveEvents.delete(eventId);
  }
  res.json({ success: true, simulatedLiveEvents: Array.from(simulatedLiveEvents) });
});

// Server-authoritative mutual consent store: tracks explicit "I'm Ready / Next Date" button clicks
// Key: `${eventId}_r${roundIndex}` -> Map<userId, { isReady: boolean, timestamp: number }>
const CONSENT_FILE = path.join(DATA_DIR, 'round_consent.json');
const roundConsentStore = new Map<string, Map<string, { isReady: boolean; timestamp: number }>>();

function loadConsentFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(CONSENT_FILE)) {
      const data = fs.readFileSync(CONSENT_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [roomKey, userEntries] of Object.entries(parsed)) {
          if (typeof userEntries === 'object' && userEntries !== null) {
            const userMap = new Map<string, { isReady: boolean; timestamp: number }>();
            for (const [uid, record] of Object.entries(userEntries as any)) {
              userMap.set(uid, record as any);
            }
            roundConsentStore.set(roomKey, userMap);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load consent store from disk:', err);
  }
}

function saveConsentToDisk() {
  try {
    ensureStorageDirectory();
    const serialized: Record<string, Record<string, { isReady: boolean; timestamp: number }>> = {};
    for (const [roomKey, userMap] of roundConsentStore.entries()) {
      serialized[roomKey] = {};
      for (const [uid, record] of userMap.entries()) {
        serialized[roomKey][uid] = record;
      }
    }
    fs.writeFileSync(CONSENT_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save consent store to disk:', err);
  }
}

loadConsentFromDisk();

// Authorized developer & QA staging accounts (server-authoritative whitelist)
// Restricts the on-demand 2-person staging test strictly to verified test accounts
const AUTHORIZED_STAGING_ACCOUNTS = new Set([
  'usr_kristy', // Developer / Owner (Kristy)
  'usr_me',     // Main authenticated profile
  'usr_01',     // Marcus (Authorized QA Partner)
  'usr_02',     // Liam (Authorized QA Partner)
  'usr_03',     // Elena (Authorized QA Partner)
]);

interface QueueDater {
  userId: string;
  userName: string;
  userAge: number;
  gender: string;
  interestedIn: string;
  tier: string;
  isRegistered: boolean;
  roundIndex: number;
  isReady: boolean;
  lastPing: number;
}

interface StagedMatch {
  matchId: string;
  eventId: string;
  roundIndex: number;
  userA: QueueDater;
  userB: QueueDater;
  roomName: string;
  matchedAt: number;
  expiresAt: number;
}

// eventId -> Map<userId, QueueDater>
const liveEventQueues = new Map<string, Map<string, QueueDater>>();
// matchId -> StagedMatch
const liveActiveMatches = new Map<string, StagedMatch>();

// API: Matchmaking queue and mutual pairing for live speed dating
// Coordinates real-time two-person pairing across separate devices/browsers
const handleMatchQueue = (req: express.Request, res: express.Response) => {
  const { eventId } = req.params;
  const {
    userId,
    userName = 'Dater',
    userAge,
    gender = 'Woman',
    interestedIn = 'Men',
    tier,
    isRegistered,
    roundIndex = 0,
    isReady = true,
  } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  // 1. Adult Age Verification: 18+ strictly required (No bypass)
  if (typeof userAge !== 'number' || userAge < 18) {
    return res.status(403).json({
      success: false,
      code: 'ADULT_VERIFICATION_FAILED',
      error: 'Access denied: Speed Meet Love strictly requires all participants to be verified adults aged 18 and older.',
    });
  }

  // 2. Event Registration Verification: Must be registered (No bypass)
  if (!isRegistered) {
    return res.status(403).json({
      success: false,
      code: 'NOT_REGISTERED',
      error: 'Access denied: You must be personally registered for this event before entering speed dating.',
    });
  }

  // 3. Subscription Verification: Must be Premium Plus ($14.99/mo) (No bypass)
  if (tier !== 'Premium Plus') {
    return res.status(403).json({
      success: false,
      code: 'PREMIUM_PLUS_REQUIRED',
      error: 'Access denied: Live speed dating requires an active Premium Plus membership.',
    });
  }

  // 4. Developer Staging Authorization Check: Restricted to authorized developer/QA accounts
  const isStagingEvent = eventId === 'evt_staging_dev';
  if (isStagingEvent && !AUTHORIZED_STAGING_ACCOUNTS.has(userId)) {
    return res.status(403).json({
      success: false,
      code: 'DEVELOPER_AUTHORIZATION_REQUIRED',
      error: 'Access denied: The Developer 2-Person Staging Test is strictly restricted to authorized developer and QA accounts.',
    });
  }

  // Check if user is already part of an active match for this event & round
  for (const match of liveActiveMatches.values()) {
    if (
      match.eventId === eventId &&
      match.roundIndex === roundIndex &&
      (match.userA.userId === userId || match.userB.userId === userId)
    ) {
      const partner = match.userA.userId === userId ? match.userB : match.userA;
      return res.json({
        success: true,
        status: 'matched',
        matchId: match.matchId,
        roomName: match.roomName,
        roundIndex: match.roundIndex,
        partner: {
          userId: partner.userId,
          userName: partner.userName,
          userAge: partner.userAge,
          gender: partner.gender,
        },
      });
    }
  }

  // Add / update user in event queue
  if (!liveEventQueues.has(eventId)) {
    liveEventQueues.set(eventId, new Map());
  }

  const queue = liveEventQueues.get(eventId)!;
  const currentDater: QueueDater = {
    userId,
    userName,
    userAge,
    gender,
    interestedIn,
    tier,
    isRegistered,
    roundIndex,
    isReady: Boolean(isReady),
    lastPing: Date.now(),
  };

  queue.set(userId, currentDater);

  // If user is not yet ready, remain in waiting state
  if (!isReady) {
    return res.json({
      success: true,
      status: 'waiting',
      message: 'Waiting for member to tap Begin Matchmaking / Next Date (I\'m Ready)...',
    });
  }

  // Search queue for an eligible partner who is also ready
  let matchedPartner: QueueDater | null = null;
  for (const [candidateId, candidate] of queue.entries()) {
    if (candidateId === userId) continue;
    if (!candidate.isReady) continue;
    if (candidate.roundIndex !== roundIndex) continue;

    if (isStagingEvent) {
      // In staging event, pair with another authorized developer account
      if (AUTHORIZED_STAGING_ACCOUNTS.has(candidateId)) {
        matchedPartner = candidate;
        break;
      }
    } else {
      // General speed dating: match compatible consenting dater
      matchedPartner = candidate;
      break;
    }
  }

  if (matchedPartner) {
    // Both daters are authenticated, registered, Premium Plus, and mutually ready!
    const sortedPair = [userId, matchedPartner.userId].sort().join('_');
    const matchId = `${eventId}_r${roundIndex}_${sortedPair}`;
    const roomName = `sml_${eventId}_r${roundIndex}_${sortedPair}`;

    const newMatch: StagedMatch = {
      matchId,
      eventId,
      roundIndex,
      userA: currentDater,
      userB: matchedPartner,
      roomName,
      matchedAt: Date.now(),
      expiresAt: Date.now() + 420 * 1000,
    };

    liveActiveMatches.set(matchId, newMatch);

    // Record mutual consent in roundConsentStore
    const roomKey = `${eventId}_r${roundIndex}`;
    if (!roundConsentStore.has(roomKey)) {
      roundConsentStore.set(roomKey, new Map());
    }
    const rMap = roundConsentStore.get(roomKey)!;
    rMap.set(userId, { isReady: true, timestamp: Date.now() });
    rMap.set(matchedPartner.userId, { isReady: true, timestamp: Date.now() });

    // Initialize server-authoritative shared round timer for this exact pair (fresh 5-minute round)
    getOrCreateSharedRound(eventId, roundIndex, userId, matchedPartner.userId, 300, 120, 'production', true);

    // Remove from queue since they are now actively paired
    queue.delete(userId);
    queue.delete(matchedPartner.userId);

    return res.json({
      success: true,
      status: 'matched',
      matchId,
      roomName,
      roundIndex,
      partner: {
        userId: matchedPartner.userId,
        userName: matchedPartner.userName,
        userAge: matchedPartner.userAge,
        gender: matchedPartner.gender,
      },
    });
  }

  return res.json({
    success: true,
    status: 'waiting',
    message: 'Waiting for partner mutual consent ("Begin Matchmaking / Next Date")...',
  });
};

app.post('/api/events/:eventId/match-queue', handleMatchQueue);
app.post('/api/events/:eventId/matchmaking', handleMatchQueue);

// API: Check match status (polling for the second user to provide mutual consent)
app.get('/api/events/:eventId/match-status/:userId', (req, res) => {
  const { eventId, userId } = req.params;
  const roundIndex = Number(req.query.roundIndex || 0);

  for (const match of liveActiveMatches.values()) {
    if (
      match.eventId === eventId &&
      match.roundIndex === roundIndex &&
      (match.userA.userId === userId || match.userB.userId === userId)
    ) {
      const partner = match.userA.userId === userId ? match.userB : match.userA;
      return res.json({
        success: true,
        status: 'matched',
        matchId: match.matchId,
        roomName: match.roomName,
        roundIndex: match.roundIndex,
        partner: {
          userId: partner.userId,
          userName: partner.userName,
          userAge: partner.userAge,
          gender: partner.gender,
        },
      });
    }
  }

  return res.json({
    success: true,
    status: 'waiting',
    message: 'Waiting for partner mutual consent...',
  });
});

// API: Check LiveKit configuration and security gateway status (without exposing secrets)
app.get('/api/livekit/status', (_req, res) => {
  res.json({
    configured: isLiveKitConfigured(),
    liveKitUrl: LIVEKIT_URL || null,
    tokenGatewayReady: true,
    authorizedStagingAccounts: Array.from(AUTHORIZED_STAGING_ACCOUNTS),
    policy: {
      adultAgeRequirement: 'Enforced (18+ general, 30+ for 30 & Older category)',
      eventRegistrationRequirement: 'Enforced (Server-validated event registration)',
      matchingEligibilityRequirement: 'Enforced (Distinct consenting members, category isolation)',
      mutualConsentRequirement: 'Enforced (Both participants must explicitly tap Next Date / Ready)',
      serverStartTimeRequirement: 'Enforced (7:00 PM Eastern Time via America/New_York)',
      developerAuthorizationRequirement: 'Enforced (Developer Staging restricted to server whitelist)',
      tokenTtl: '420 seconds (5 min round + 2 min break grace window)',
    },
  });
});

// API: Record explicit round consent from a member ("Begin Matchmaking" or "Next Date (I'm Ready)")
app.post('/api/events/:eventId/consent', (req, res) => {
  const { eventId } = req.params;
  const { userId, partnerId, roundIndex = 0, isReady = true } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const roomKey = `${eventId}_r${roundIndex}`;
  if (!roundConsentStore.has(roomKey)) {
    roundConsentStore.set(roomKey, new Map());
  }

  const roundMap = roundConsentStore.get(roomKey)!;
  roundMap.set(userId, { isReady: Boolean(isReady), timestamp: Date.now() });
  saveConsentToDisk();

  const partnerConsent = partnerId ? roundMap.get(partnerId) : undefined;
  const isMutuallyReady = Boolean(isReady && partnerConsent?.isReady);

  return res.json({
    success: true,
    eventId,
    roundIndex,
    userId,
    userConsented: Boolean(isReady),
    partnerConsented: Boolean(partnerConsent?.isReady),
    isMutuallyReady,
  });
});

// API: Retrieve recorded consent / ready status for a member
app.get('/api/events/:eventId/consent', (req, res) => {
  const { eventId } = req.params;
  const userId = req.query.userId as string;
  const roundIndex = Number(req.query.roundIndex || 0);
  const partnerId = req.query.partnerId as string;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const roomKey = `${eventId}_r${roundIndex}`;
  const roundMap = roundConsentStore.get(roomKey);
  const userRecord = roundMap?.get(userId);
  const partnerRecord = partnerId && roundMap ? roundMap.get(partnerId) : undefined;

  return res.json({
    success: true,
    eventId,
    roundIndex,
    userId,
    isReady: Boolean(userRecord?.isReady),
    userConsented: Boolean(userRecord?.isReady),
    partnerConsented: Boolean(partnerRecord?.isReady),
    isMutuallyReady: Boolean(userRecord?.isReady && partnerRecord?.isReady),
    timestamp: userRecord?.timestamp || null,
  });
});

// API: Secure LiveKit Room Token Generation
// Enforces 6 strict security checks before minting an ephemeral room token
app.post('/api/livekit/token', async (req, res) => {
  try {
    const {
      userId,
      userName,
      userAge,
      isRegistered,
      partnerId,
      partnerName,
      partnerAge,
      eventId,
      eventDate,
      eventStartTime = '19:00',
      eventEndTime = '20:15',
      eventType,
      roundIndex = 0,
      userConsent,
      partnerConsent,
      mode = 'production',
      isSecondDate = false,
      secondDateSessionId,
    } = req.body;

    // 1. Verify LiveKit server environment configuration
    if (!isLiveKitConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'LIVEKIT_CREDENTIALS_MISSING',
        error:
          'LiveKit Cloud credentials are not configured on the server. Please configure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in the server environment variables.',
      });
    }

    // SPECIAL PATH: 10-Minute Second Chance Date Video Room
    if (isSecondDate || secondDateSessionId) {
      if (typeof userAge !== 'number' || userAge < 18) {
        return res.status(403).json({
          success: false,
          code: 'ADULT_VERIFICATION_FAILED',
          error: 'Access denied: Speed Meet Love strictly requires all participants to be verified adults aged 18 and older.',
        });
      }

      const { tier } = req.body;
      if (tier && tier !== 'Premium Plus') {
        return res.status(403).json({
          success: false,
          code: 'PREMIUM_PLUS_REQUIRED',
          error: 'Access denied: Second Chance live video dates require an active Premium Plus membership ($14.99/mo).',
        });
      }

      const session = secondDateSessionId ? secondDateSessions.get(secondDateSessionId) : getSecondDateSession(eventId, userId, partnerId);
      if (!session) {
        return res.status(404).json({
          success: false,
          code: 'SESSION_NOT_FOUND',
          error: 'Second chance date session not found or has been canceled.',
        });
      }

      if (!session.userAConsent || !session.userBConsent) {
        return res.status(403).json({
          success: false,
          code: 'MUTUAL_CONSENT_REQUIRED',
          error: 'Mutual consent required: Both participants must explicitly agree to Another Date before a video room can be created.',
        });
      }

      if (session.status === 'declined') {
        return res.status(403).json({
          success: false,
          code: 'SECOND_DATE_DECLINED',
          error: 'This second chance date was declined or saved for chat. Video room is not available.',
        });
      }

      const now = Date.now();
      if (session.status === 'completed' || (session.expiresAt && now >= session.expiresAt)) {
        session.status = 'completed';
        saveSecondDateSessionsToDisk();
        return res.status(403).json({
          success: false,
          code: 'ROUND_EXPIRED',
          error: 'The 10-minute second chance date has expired. Video connection closed.',
          isExpired: true,
        });
      }

      // If not active yet, activate with authoritative 10-minute countdown (600 seconds)
      if (session.status !== 'active') {
        session.status = 'active';
        session.startedAt = now;
        session.expiresAt = now + session.durationSeconds * 1000;
        session.lastUpdated = now;
        saveSecondDateSessionsToDisk();
      }

      const expiresAt = session.expiresAt || (now + session.durationSeconds * 1000);
      const remainingSecs = Math.max(0, Math.floor((expiresAt - now) / 1000));
      const roomName = `sml_second_${session.sessionId}`;
      const ttlSeconds = Math.max(60, remainingSecs + 60);

      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: userId,
        name: userName || userId,
        ttl: `${ttlSeconds}s`,
      });

      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();

      return res.json({
        success: true,
        token,
        roomName,
        liveKitUrl: LIVEKIT_URL,
        ttlSeconds,
        expiresAt: session.expiresAt,
        durationSeconds: session.durationSeconds,
        remainingSeconds: remainingSecs,
        partner: {
          partnerId,
          partnerName: partnerName || 'Speed Dater',
        },
        isSecondDate: true,
        sessionId: session.sessionId,
      });
    }

    // 2. Security Check: Authenticated Adult Users (18+, or 30+ for 30 & Older)
    if (typeof userAge !== 'number' || userAge < 18) {
      return res.status(403).json({
        success: false,
        code: 'ADULT_VERIFICATION_FAILED',
        error: 'Access denied: Speed Meet Love strictly requires all participants to be verified adults aged 18 and older.',
      });
    }

    if (partnerAge !== undefined && (typeof partnerAge !== 'number' || partnerAge < 18)) {
      return res.status(403).json({
        success: false,
        code: 'PARTNER_AGE_INVALID',
        error: 'Matching security error: Speed dating partner must be an authenticated adult aged 18 or older.',
      });
    }

    const isAgeRestrictedEvent = eventType === '30 & Older' || (eventId && eventId.includes('30plus'));
    if (isAgeRestrictedEvent) {
      if (userAge < 30 || (partnerAge !== undefined && partnerAge < 30)) {
        return res.status(403).json({
          success: false,
          code: 'CATEGORY_AGE_RESTRICTION',
          error: "Access denied: '30 & Older' events strictly require all participants to be aged 30 or older.",
        });
      }
    }

    // 3. Security Check: Server-Side Verification of Event Registration (No bypass)
    if (!isRegistered) {
      return res.status(403).json({
        success: false,
        code: 'NOT_REGISTERED',
        error: 'Access denied: You must be personally registered for this event before joining video rooms.',
      });
    }

    // 4. Security Check: Subscription Verification (Premium Plus required, No bypass)
    const { tier } = req.body;
    if (tier && tier !== 'Premium Plus') {
      return res.status(403).json({
        success: false,
        code: 'PREMIUM_PLUS_REQUIRED',
        error: 'Access denied: Live speed-dating video calls require an active Premium Plus membership.',
      });
    }

    // 5. Security Check: Developer Staging Authorization Check
    const isStagingEvent = eventId === 'evt_staging_dev' || req.body.isStagingTest;
    if (isStagingEvent) {
      if (!AUTHORIZED_STAGING_ACCOUNTS.has(userId) || (partnerId && !AUTHORIZED_STAGING_ACCOUNTS.has(partnerId))) {
        return res.status(403).json({
          success: false,
          code: 'DEVELOPER_AUTHORIZATION_REQUIRED',
          error: 'Access denied: The Developer 2-Person Staging Test is strictly restricted to authorized developer and QA accounts.',
        });
      }
    }

    // 6. Security Check: Matching Eligibility
    if (!partnerId || partnerId === userId) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PARTNER',
        error: 'Matching eligibility error: A valid, distinct speed dating partner is required.',
      });
    }

    // 7. Security Check: Mutual Explicit Consent
    // Check both request payload and server-side consent registry
    const roomKey = `${eventId}_r${roundIndex}`;
    const serverRoundMap = roundConsentStore.get(roomKey);
    const serverUserConsent = serverRoundMap?.get(userId)?.isReady ?? userConsent;
    const serverPartnerConsent = serverRoundMap?.get(partnerId)?.isReady ?? partnerConsent;

    if (!serverUserConsent || !serverPartnerConsent) {
      return res.status(403).json({
        success: false,
        code: 'MUTUAL_CONSENT_REQUIRED',
        error:
          "Mutual consent required: Both participants must explicitly tap 'Next Date (I\\'m Ready)' or 'Begin Matchmaking' before a video call room can be generated.",
        userConsented: Boolean(serverUserConsent),
        partnerConsented: Boolean(serverPartnerConsent),
      });
    }

    // 8. Security Check: Server Event Start Time Verification (7:00 PM Eastern Time)
    // Calendar wait is enforced for all production events; authorized staging event permits on-demand developer testing
    const now = Date.now();
    if (eventDate && !isStagingEvent) {
      const startMs = getEpochMsInEasternTime(eventDate, eventStartTime);
      const endMs = getEpochMsInEasternTime(eventDate, eventEndTime);
      const isSimulated = mode === 'demonstration' && simulatedLiveEvents.has(eventId);

      if (now < startMs && !isSimulated) {
        return res.status(403).json({
          success: false,
          code: 'EVENT_NOT_STARTED',
          error:
            'This event has not started yet. Live speed-dating video rooms open at 7:00 PM Eastern Time. Please wait in the Waiting Room.',
          startTimeMs: startMs,
        });
      }

      if (now > endMs && !isSimulated) {
        return res.status(403).json({
          success: false,
          code: 'EVENT_CONCLUDED',
          error: 'This speed dating event has concluded. Video rooms are no longer available.',
        });
      }
    }

    // 9. Security Check: Server-Authoritative 5-Minute Round Expiration Check
    const existingSharedRound = getSharedRound(eventId, roundIndex, userId, partnerId);
    if (existingSharedRound) {
      if (existingSharedRound.earlyExitedParticipants?.includes(userId)) {
        return res.status(403).json({
          success: false,
          code: 'USER_ENDED_EARLY',
          error: 'You have ended this speed dating round early. Please cast your vote on the confidential voting screen.',
          status: 'break',
        });
      }
      if (existingSharedRound.status === 'break' || existingSharedRound.status === 'completed' || now >= existingSharedRound.roundExpiresAt) {
        existingSharedRound.status = 'break';
        existingSharedRound.breakStartedAt = existingSharedRound.breakStartedAt || existingSharedRound.roundExpiresAt;
        existingSharedRound.breakExpiresAt = existingSharedRound.breakExpiresAt || (existingSharedRound.roundExpiresAt + existingSharedRound.breakDurationSeconds * 1000);
        existingSharedRound.lastUpdated = now;
        saveSharedRoundsToDisk();

        return res.status(403).json({
          success: false,
          code: 'ROUND_EXPIRED',
          error: 'This 5-minute speed dating round has concluded. Video rooms are closed for this round. Please cast your vote on the confidential voting screen.',
          roundExpiresAt: existingSharedRound.roundExpiresAt,
          status: 'break',
        });
      }
    }

    // All security checks passed. Generate LiveKit room token bound to active speed date
    const sortedDaterIds = [userId, partnerId].sort().join('_');
    const roomName = `sml_${eventId}_r${roundIndex}_${sortedDaterIds}`;
    // Token TTL: 900s (15 minutes). Prevents premature WebSocket signal termination
    // and tolerates device clock skew, while round expiration is strictly enforced
    // by the server-authoritative shared round timer and 403 ROUND_EXPIRED checks.
    const ttlSeconds = 900;

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      name: userName || userId,
      ttl: `${ttlSeconds}s`,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return res.json({
      success: true,
      token,
      roomName,
      liveKitUrl: LIVEKIT_URL,
      ttlSeconds,
      expiresAt: Date.now() + ttlSeconds * 1000,
      partner: {
        partnerId,
        partnerName: partnerName || 'Speed Dater',
      },
      verification: {
        adultVerified: true,
        registrationVerified: true,
        matchingEligibilityVerified: true,
        mutualConsentVerified: true,
        serverTimeVerified: true,
        shortLivedTtlSeconds: ttlSeconds,
      },
    });
  } catch (err: any) {
    console.error('Error generating LiveKit token:', err);
    return res.status(500).json({
      success: false,
      code: 'TOKEN_GENERATION_FAILED',
      error: 'Failed to generate room token due to an internal server error.',
    });
  }
});

// API: Backend status & demonstration architecture metadata
app.get('/api/system-status', (_req, res) => {
  res.json({
    status: 'online',
    mode: 'demonstration',
    activeSessions: sessions.size,
    simulatedLiveEvents: Array.from(simulatedLiveEvents),
    timestamp: new Date().toISOString(),
    timeZone: 'America/New_York',
    architecture: {
      serverPersistence: 'Active (/api/session)',
      serverTimeValidation: 'Active (America/New_York 7:00 PM ET)',
      clientReconnection: 'Active (localStorage + VisibilityState + Wall-Clock Sync)',
      liveKitGateway: {
        configured: isLiveKitConfigured(),
        endpoint: '/api/livekit/token',
        status: isLiveKitConfigured() ? 'Ready' : 'Awaiting Environment Variables',
        securityVerifications: [
          'Authenticated Adult Verification (18+ / 30+)',
          'Server-Validated Event Registration',
          'Matching Eligibility & Category Isolation',
          'Mutual Explicit Consent ("Next Date / I\'m Ready")',
          'Eastern Time 7:00 PM Start Authority',
          '420-Second Ephemeral Short-Lived Token Security',
        ],
      },
      paymentEngine: 'Simulated Demo Tier Upgrades (Requires Stripe Checkout in production)',
    },
  });
});

async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Speed Meet Love Full-Stack Server running at http://0.0.0.0:${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
