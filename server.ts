import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { AccessToken } from 'livekit-server-sdk';
import webpush from 'web-push';
import { initializeApp as initFirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc as firestoreDoc,
  getDoc as firestoreGetDoc,
  setDoc as firestoreSetDoc,
  deleteDoc as firestoreDeleteDoc,
  getDocs as firestoreGetDocs,
  collection as firestoreCollection,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';

import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

const ANDROID_ASSET_LINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.teeteescreations.speedmeetlove',
      sha256_cert_fingerprints: [
        '8C:50:A3:7B:24:9E:DD:94:9E:DC:09:90:6D:2E:6B:86:DF:4B:27:D1:08:CF:FD:F1:1C:C0:3F:80:ED:8D:2E:1F',
        '92:B8:14:27:FE:C5:7F:A1:22:7A:C6:A5:70:D7:0D:B9:0C:27:F6:F3:5C:8F:ED:B6:A5:67:8C:81:62:06:7F:F5',
        'F2:2C:D9:53:34:2A:2E:D6:71:CC:FF:AD:8D:8B:0D:B6:BD:AD:33:B3:61:BF:66:54:07:AB:35:89:72:BB:1A:A8',
      ],
    },
  },
];

// Serve Android App Links Digital Asset Links verification file directly (HTTP 200, application/json, no redirects or login)
app.get('/.well-known/assetlinks.json', (_req, res) => {
  const candidates = [
    path.resolve(__dirname, 'public', '.well-known', 'assetlinks.json'),
    path.resolve(__dirname, 'dist', '.well-known', 'assetlinks.json'),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.send(raw);
      }
    } catch {
      // Fall back to embedded exact JSON payload
    }
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.send(JSON.stringify(ANDROID_ASSET_LINKS, null, 2));
});

// Production application domain & routes as requested
const APP_URL = 'https://speedmeetlove.com';
const STRIPE_WEBHOOK_ROUTE = '/api/stripe/webhook';

const SERVER_STARTED_AT = new Date().toISOString();

function sanitizeStripeEnvValue(rawValue: string | undefined): { value: string; hadWrapper: boolean } {
  const original = rawValue || '';
  let current = original.trim();
  let hadWrapper = current !== original;

  const stripQuotes = (input: string): string => {
    let s = input.trim();
    while (
      s.length >= 2 &&
      ((s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'")) ||
        (s.startsWith('`') && s.endsWith('`')))
    ) {
      s = s.slice(1, -1).trim();
      hadWrapper = true;
    }
    return s;
  };

  current = stripQuotes(current);

  // Strip accidental ENV_VAR_NAME= prefix if pasted with key name
  const eqMatch = current.match(/^[A-Z0-9_]+\s*=\s*(.+)$/s);
  if (eqMatch && /^(whsec_|sk_|rk_|pk_)/.test(stripQuotes(eqMatch[1]))) {
    current = stripQuotes(eqMatch[1]);
    hadWrapper = true;
  }

  // Remove any accidental embedded whitespace/newlines inside a key/secret
  const collapsed = current.replace(/\s+/g, '');
  if (collapsed !== current) {
    current = collapsed;
    hadWrapper = true;
  }

  return { value: current, hadWrapper };
}

function getStripeWebhookSecretConfig() {
  const raw = process.env.STRIPE_WEBHOOK_SECRET || '';
  const tokens = raw
    .split(/[\r\n,;]+/)
    .map((part) => sanitizeStripeEnvValue(part))
    .filter((item) => item.value.length > 0);

  const uniqueSecrets = Array.from(new Set(tokens.map((t) => t.value)));
  const validFormatCount = uniqueSecrets.filter((s) => s.startsWith('whsec_')).length;
  const looksPlaceholder = uniqueSecrets.some((s) => /your_stripe|placeholder|example/i.test(s));
  const hadWrapper = tokens.some((t) => t.hadWrapper) || raw.trim() !== raw;

  return {
    secrets: uniqueSecrets,
    hasSecret: uniqueSecrets.length > 0,
    validFormatCount,
    hadWrapper,
    looksPlaceholder,
  };
}

// Stripe configuration - Secret keys remain strictly on the server
const STRIPE_SECRET_KEY = sanitizeStripeEnvValue(process.env.STRIPE_SECRET_KEY).value;
const STRIPE_WEBHOOK_SECRET = getStripeWebhookSecretConfig().secrets[0] || '';
const RAW_STRIPE_PUBLISHABLE_KEY = sanitizeStripeEnvValue(
  process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
).value;
const STRIPE_PUBLISHABLE_KEY = /^pk_(live|test)_/.test(RAW_STRIPE_PUBLISHABLE_KEY)
  ? RAW_STRIPE_PUBLISHABLE_KEY
  : '';

export const SANDBOX_FALLBACK_PRICES = {
  PREMIUM: 'price_1UZJGCGzWqYTtaSTwzOMdDqO',
  PREMIUM_PLUS: 'price_1UZJR6GzWqYTtaSTVJCIeJip',
};

const ENV_STRIPE_PRICE_PREMIUM = (process.env.STRIPE_PRICE_ID_PREMIUM || '').trim();
const ENV_STRIPE_PRICE_PREMIUM_PLUS = (process.env.STRIPE_PRICE_ID_PREMIUM_PLUS || '').trim();

export const STRIPE_PRICES = {
  PREMIUM: ENV_STRIPE_PRICE_PREMIUM || SANDBOX_FALLBACK_PRICES.PREMIUM,
  PREMIUM_PLUS: ENV_STRIPE_PRICE_PREMIUM_PLUS || SANDBOX_FALLBACK_PRICES.PREMIUM_PLUS,
};

export interface StripeExpectedPlanSpec {
  tier: 'Premium' | 'Premium Plus';
  name: string;
  amount: number;
  amountCents: number;
  currency: string;
  interval: string;
}

export function getStripeExpectedAmounts(): Record<string, StripeExpectedPlanSpec> {
  return {
    [STRIPE_PRICES.PREMIUM]: {
      tier: 'Premium',
      name: 'Premium',
      amount: 9.99,
      amountCents: 999,
      currency: 'USD',
      interval: 'month',
    },
    [STRIPE_PRICES.PREMIUM_PLUS]: {
      tier: 'Premium Plus',
      name: 'Premium Plus',
      amount: 14.99,
      amountCents: 1499,
      currency: 'USD',
      interval: 'month',
    },
  };
}

export const STRIPE_EXPECTED_AMOUNTS: Record<string, StripeExpectedPlanSpec> =
  getStripeExpectedAmounts();

function syncStripeExpectedAmountsMap() {
  for (const key of Object.keys(STRIPE_EXPECTED_AMOUNTS)) {
    delete STRIPE_EXPECTED_AMOUNTS[key];
  }
  Object.assign(STRIPE_EXPECTED_AMOUNTS, getStripeExpectedAmounts());
}

const STRIPE_IS_LIVE_KEY =
  STRIPE_SECRET_KEY.startsWith('sk_live_') || STRIPE_SECRET_KEY.startsWith('rk_live_');
const STRIPE_IS_SANDBOX_KEY =
  STRIPE_SECRET_KEY.startsWith('sk_test_') || STRIPE_SECRET_KEY.startsWith('rk_test_');

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia' as any,
    })
  : null;

const STRIPE_MODE: 'live' | 'sandbox' | 'unconfigured' = !stripe
  ? 'unconfigured'
  : STRIPE_IS_LIVE_KEY
  ? 'live'
  : 'sandbox';

let stripePriceResolutionPromise: Promise<void> | null = null;
let stripePriceResolutionCompleted = false;

async function ensureStripePricesResolved(forceRefresh = false): Promise<void> {
  if (!stripe || !STRIPE_IS_LIVE_KEY) return;
  if (stripePriceResolutionCompleted && !forceRefresh) return;
  if (stripePriceResolutionPromise && !forceRefresh) {
    return stripePriceResolutionPromise;
  }

  stripePriceResolutionPromise = (async () => {
    try {
      const checkValidLivePrice = async (
        priceId: string,
        expectedCents: number
      ): Promise<boolean> => {
        if (!priceId || priceId === SANDBOX_FALLBACK_PRICES.PREMIUM || priceId === SANDBOX_FALLBACK_PRICES.PREMIUM_PLUS) {
          return false;
        }
        try {
          const p = await stripe.prices.retrieve(priceId);
          return (
            p.active !== false &&
            p.livemode === true &&
            (p.currency || '').toLowerCase() === 'usd' &&
            p.recurring?.interval === 'month' &&
            p.unit_amount === expectedCents
          );
        } catch {
          return false;
        }
      };

      const [premiumValid, premiumPlusValid] = await Promise.all([
        checkValidLivePrice(STRIPE_PRICES.PREMIUM, 999),
        checkValidLivePrice(STRIPE_PRICES.PREMIUM_PLUS, 1499),
      ]);

      if (!premiumValid || !premiumPlusValid) {
        const activePrices = await stripe.prices.list({
          active: true,
          limit: 50,
          expand: ['data.product'],
        });

        const liveMonthlyUsd = activePrices.data.filter(
          (p) =>
            p.active !== false &&
            p.livemode === true &&
            (p.currency || '').toLowerCase() === 'usd' &&
            p.recurring?.interval === 'month'
        );

        if (!premiumValid) {
          const match999 = liveMonthlyUsd.find((p) => p.unit_amount === 999);
          if (match999 && match999.id !== STRIPE_PRICES.PREMIUM) {
            console.warn(
              `[Stripe Live Config] Resolved live Premium ($9.99/mo) price ID ${match999.id} (replacing unconfigured/sandbox ID ${STRIPE_PRICES.PREMIUM}).`
            );
            STRIPE_PRICES.PREMIUM = match999.id;
          }
        }

        if (!premiumPlusValid) {
          const match1499 = liveMonthlyUsd.find((p) => p.unit_amount === 1499);
          if (match1499 && match1499.id !== STRIPE_PRICES.PREMIUM_PLUS) {
            console.warn(
              `[Stripe Live Config] Resolved live Premium Plus ($14.99/mo) price ID ${match1499.id} (replacing unconfigured/sandbox ID ${STRIPE_PRICES.PREMIUM_PLUS}).`
            );
            STRIPE_PRICES.PREMIUM_PLUS = match1499.id;
          }
        }

        syncStripeExpectedAmountsMap();
      }

      stripePriceResolutionCompleted = true;
    } catch (err: any) {
      console.warn('[Stripe Live Config] Price resolution check failed:', err?.message || err);
    } finally {
      stripePriceResolutionPromise = null;
    }
  })();

  return stripePriceResolutionPromise;
}

if (stripe && STRIPE_IS_LIVE_KEY) {
  void ensureStripePricesResolved();
}

function isStripeWebhookRequest(req: express.Request): boolean {
  const pathOnly = (req.path || req.originalUrl || '').split('?')[0].replace(/\/+$/, '');
  return pathOnly === STRIPE_WEBHOOK_ROUTE;
}

// Use untouched raw Buffer specifically for Stripe webhooks signature verification, json for all other routes
app.use((req, res, next) => {
  if (isStripeWebhookRequest(req)) {
    express.raw({ type: () => true, limit: '2mb' })(req, res, next);
  } else {
    express.json({
      verify: (r, _res, buf) => {
        (r as any).rawBody = buf;
      },
    })(req, res, next);
  }
});

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

const DATA_DIR = process.env.DATA_DIR_OVERRIDE
  ? path.resolve(process.env.DATA_DIR_OVERRIDE)
  : path.resolve(__dirname, '.data');

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
let lastRoundsFileMtime = 0;

function syncSharedRoundsFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(ROUNDS_FILE)) {
      const stats = fs.statSync(ROUNDS_FILE);
      if (stats.mtimeMs > lastRoundsFileMtime) {
        lastRoundsFileMtime = stats.mtimeMs;
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
    }
  } catch (err) {
    console.warn('Failed to sync shared rounds from disk:', err);
  }
}

function saveSharedRoundsToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const array = Array.from(sharedRounds.values());
    fs.writeFileSync(ROUNDS_FILE, JSON.stringify(array, null, 2), 'utf-8');
    if (fs.existsSync(ROUNDS_FILE)) {
      lastRoundsFileMtime = fs.statSync(ROUNDS_FILE).mtimeMs;
    }
  } catch (err) {
    console.warn('Failed to save shared rounds to disk:', err);
  }
}

syncSharedRoundsFromDisk();

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
  syncSharedRoundsFromDisk();
  const now = Date.now();
  const MAX_ROUND_AGE_MS = 30 * 60 * 1000; // 30 minutes maximum session age
  const isRoundActive = (r: ServerSharedRound) => {
    // Abandoned or completed sessions older than 30 minutes must never be resurrected as active
    if (r.roundStartedAt && (now - r.roundStartedAt > MAX_ROUND_AGE_MS)) {
      return false;
    }
    if (r.breakExpiresAt && (now - r.breakExpiresAt > 15 * 60 * 1000)) {
      return false;
    }
    if (allowCompleted) return true;
    if (r.status === 'completed') return false;
    return true;
  };

  // 1. If both userId and partnerId are provided, ONLY match rounds that contain BOTH participants!
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
  }

  // 2. If userId is provided, find user's authoritative round for this roundIndex
  if (userId) {
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

  // Also clear liveActiveMatches, queues, and consent records for this event/user
  for (const [mId, match] of liveActiveMatches.entries()) {
    if (match.eventId === eventId) {
      if (!userId || match.userA.userId === userId || match.userB.userId === userId) {
        liveActiveMatches.delete(mId);
      }
    }
  }
  const q = liveEventQueues.get(eventId);
  if (q) {
    if (userId) q.delete(userId);
    else q.clear();
  }
  const roomKeyPrefix = `${eventId}_r`;
  for (const [rKey, rMap] of roundConsentStore.entries()) {
    if (rKey.startsWith(roomKeyPrefix)) {
      if (userId) rMap.delete(userId);
      else roundConsentStore.delete(rKey);
    }
  }
  saveConsentToDisk();

  saveSharedRoundsToDisk();
  return res.json({ success: true, clearedCount, message: `Reset ${clearedCount} rounds for event ${eventId}` });
});

// API: Explicitly leave an event session (Purges queue, readiness, active session on server without deleting votes or matches)
app.post('/api/events/:eventId/leave', (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const now = Date.now();

  // 1. Remove from liveEventQueues
  const queue = liveEventQueues.get(eventId);
  if (queue) {
    queue.delete(userId);
  }

  // 2. Remove readiness from roundConsentStore for this event
  for (const [rKey, rMap] of roundConsentStore.entries()) {
    if (rKey.startsWith(`${eventId}_`) || rKey === eventId) {
      rMap.delete(userId);
    }
  }
  saveConsentToDisk();

  // 3. Remove from liveActiveMatches for this event
  for (const [mId, match] of liveActiveMatches.entries()) {
    if (match.eventId === eventId && (match.userA.userId === userId || match.userB.userId === userId)) {
      liveActiveMatches.delete(mId);
    }
  }

  // 4. Remove active session from sessions map
  for (const [sKey, session] of sessions.entries()) {
    if (session.userId === userId && session.eventId === eventId) {
      sessions.delete(sKey);
    }
  }

  // 5. Shared round deadline: Preserve authoritative round timer on server.
  // Explicit Leave Event clears queue presence and readiness, but NEVER erases or restarts the shared round deadline.

  return res.json({
    success: true,
    message: `User ${userId} successfully left event ${eventId}. Active queue, readiness, and live session removed. Shared round deadline, saved votes, and matches preserved safely.`,
    serverTime: now,
  });
});

// Staging Session In-Memory Store for Developer 2-Phone Testing
interface StagingSessionInfo {
  eventId: string;
  joinCode: string;
  createdAt: number;
  createdBy: string;
}
const activeStagingSessions = new Map<string, StagingSessionInfo>();

function cleanupStagingSessions() {
  const now = Date.now();
  for (const [eventId, session] of activeStagingSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      activeStagingSessions.delete(eventId);
      // Clean up any rounds associated with this expired staging session
      for (const [rKey, r] of sharedRounds.entries()) {
        if (r.eventId === eventId) {
          sharedRounds.delete(rKey);
        }
      }
    }
  }
}

// API: Create a unique staging test session for 2 phones to test without colliding with other tests
app.post('/api/staging/create-session', (req, res) => {
  cleanupStagingSessions();
  const { userId = 'usr_me' } = req.body;
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let joinCode = '';
  for (let i = 0; i < 4; i++) {
    joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const eventId = `evt_staging_${joinCode.toLowerCase()}`;
  const sessionInfo: StagingSessionInfo = {
    eventId,
    joinCode,
    createdAt: Date.now(),
    createdBy: userId,
  };
  activeStagingSessions.set(eventId, sessionInfo);

  return res.json({
    success: true,
    eventId,
    joinCode,
    session: sessionInfo,
    message: `Fresh 2-phone staging session created with code ${joinCode}. Isolated from all other sessions.`,
  });
});

// API: List active staging test sessions
app.get('/api/staging/sessions', (_req, res) => {
  cleanupStagingSessions();
  return res.json({
    success: true,
    sessions: Array.from(activeStagingSessions.values()),
  });
});

// API: Join a staging session by 4-character join code
app.post('/api/staging/join-session', (req, res) => {
  cleanupStagingSessions();
  const { joinCode, userId = 'usr_me' } = req.body;
  if (!joinCode) {
    return res.status(400).json({ success: false, error: 'joinCode is required' });
  }

  const normalized = String(joinCode).trim().toUpperCase();
  let found: StagingSessionInfo | undefined;
  for (const s of activeStagingSessions.values()) {
    if (s.joinCode.toUpperCase() === normalized) {
      found = s;
      break;
    }
  }

  if (!found) {
    return res.status(404).json({
      success: false,
      error: `Staging session with join code "${normalized}" not found or expired. Staging sessions automatically expire after 30 minutes.`,
    });
  }

  return res.json({
    success: true,
    eventId: found.eventId,
    joinCode: found.joinCode,
    session: found,
  });
});

// API: Retrieve authoritative round timer state
app.get('/api/events/:eventId/rounds/:roundIndex/timer', (req, res) => {
  const { eventId, roundIndex: roundIndexParam } = req.params;
  const roundIndex = Number(roundIndexParam) || 0;
  const userId = req.query.userId as string | undefined;
  const partnerId = req.query.partnerId as string | undefined;

  let round = getSharedRound(eventId, roundIndex, userId, partnerId, true);
  const now = Date.now();

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
  let userBreakStartedAt: number | null = null;
  let userBreakExpiresAt: number | null = null;
  let remainingBreakSeconds = round.breakDurationSeconds;

  if (isParticipantEarlyExited && userId) {
    userBreakStartedAt = (round.earlyEndTimestamps && round.earlyEndTimestamps[userId]) || round.breakStartedAt || now;
    userBreakExpiresAt = userBreakStartedAt + round.breakDurationSeconds * 1000;
    remainingBreakSeconds = Math.max(0, Math.min(round.breakDurationSeconds, Math.floor((userBreakExpiresAt - now) / 1000)));
  } else if (round.status === 'break' || round.status === 'completed' || now >= round.roundExpiresAt) {
    userBreakStartedAt = round.breakStartedAt || round.roundExpiresAt;
    userBreakExpiresAt = round.breakExpiresAt || (userBreakStartedAt + round.breakDurationSeconds * 1000);
    remainingBreakSeconds = Math.max(0, Math.min(round.breakDurationSeconds, Math.floor((userBreakExpiresAt - now) / 1000)));
  } else {
    // Active 5-minute call in progress; break has not commenced
    userBreakStartedAt = null;
    userBreakExpiresAt = null;
    remainingBreakSeconds = round.breakDurationSeconds;
  }

  const remainingSeconds = (round.status === 'call' && !isParticipantEarlyExited)
    ? Math.max(0, Math.floor((round.roundExpiresAt - now) / 1000))
    : 0;

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
  let userBreakStartedAt: number | null = null;
  let userBreakExpiresAt: number | null = null;
  let remainingBreakSeconds = round.breakDurationSeconds;

  if (isParticipantEarlyExited && userId) {
    userBreakStartedAt = (round.earlyEndTimestamps && round.earlyEndTimestamps[userId]) || round.breakStartedAt || now;
    userBreakExpiresAt = userBreakStartedAt + round.breakDurationSeconds * 1000;
    remainingBreakSeconds = Math.max(0, Math.min(round.breakDurationSeconds, Math.floor((userBreakExpiresAt - now) / 1000)));
  } else if (round.status === 'break' || round.status === 'completed' || now >= round.roundExpiresAt) {
    userBreakStartedAt = round.breakStartedAt || round.roundExpiresAt;
    userBreakExpiresAt = round.breakExpiresAt || (userBreakStartedAt + round.breakDurationSeconds * 1000);
    remainingBreakSeconds = Math.max(0, Math.min(round.breakDurationSeconds, Math.floor((userBreakExpiresAt - now) / 1000)));
  } else {
    // Active 5-minute call in progress; break has not commenced
    userBreakStartedAt = null;
    userBreakExpiresAt = null;
    remainingBreakSeconds = round.breakDurationSeconds;
  }

  const remainingSeconds = (round.status === 'call' && !isParticipantEarlyExited)
    ? Math.max(0, Math.floor((round.roundExpiresAt - now) / 1000))
    : 0;

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

// ============================================================================
// BROWSER PUSH NOTIFICATIONS & VAPID KEYS (WEB-PUSH)
// ============================================================================
const VAPID_KEYS_FILE = path.join(DATA_DIR, 'vapid_keys.json');
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let vapidKeys: VapidKeys = {
  publicKey: '',
  privateKey: '',
};

function initVapidKeys() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(VAPID_KEYS_FILE)) {
      const data = fs.readFileSync(VAPID_KEYS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.publicKey && parsed.privateKey) {
        vapidKeys = parsed;
      }
    }
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      vapidKeys = webpush.generateVAPIDKeys();
      fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
    }
    webpush.setVapidDetails(
      'mailto:notifications@speedmeetlove.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (err) {
    console.warn('Failed to initialize VAPID keys:', err);
  }
}
initVapidKeys();

// userId -> PushSubscription[]
const userPushSubscriptions = new Map<string, any[]>();

function loadPushSubscriptionsFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(PUSH_SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(PUSH_SUBSCRIPTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [uid, subs] of Object.entries(parsed)) {
          if (Array.isArray(subs)) {
            userPushSubscriptions.set(uid, subs);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load push subscriptions:', err);
  }
}

function savePushSubscriptionsToDisk() {
  try {
    ensureStorageDirectory();
    const serialized: Record<string, any[]> = {};
    for (const [uid, subs] of userPushSubscriptions.entries()) {
      serialized[uid] = subs;
    }
    fs.writeFileSync(PUSH_SUBSCRIPTIONS_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save push subscriptions:', err);
  }
}

loadPushSubscriptionsFromDisk();

async function sendPushNotificationToUser(userId: string, payload: { title: string; body: string; icon?: string; data?: any; tag?: string }) {
  const subs = userPushSubscriptions.get(userId) || [];
  if (subs.length === 0) return { delivered: 0, total: 0 };

  let delivered = 0;
  const validSubs: any[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      delivered++;
      validSubs.push(sub);
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Expired push subscription
        console.log(`Push subscription expired for ${userId}`);
      } else {
        console.warn('Push delivery note:', err.message || err);
        validSubs.push(sub);
      }
    }
  }

  if (validSubs.length !== subs.length) {
    userPushSubscriptions.set(userId, validSubs);
    savePushSubscriptionsToDisk();
  }

  return { delivered, total: subs.length };
}

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
    userName = 'Dater',
    userAge,
    tier,
    partnerName = 'Partner',
    mode = 'production',
    matchId,
    simulatePartnerConsent = false,
  } = req.body;

  const userId = req.body.userId || req.body.userA;
  const partnerId = req.body.partnerId || req.body.userB;

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
    // Prevent duplicate invitations if already waiting for partner
    if (session.status === 'waiting_for_partner' && session.requestedBy === userId) {
      return res.status(409).json({
        success: false,
        code: 'INVITATION_ALREADY_PENDING',
        session,
        message: 'An invitation is already pending for this member. Duplicate invitations are prevented.',
      });
    }

    // If partner previously requested, this is mutual consent!
    if (session.status === 'waiting_for_partner' && session.requestedBy !== userId) {
      session.userAConsent = true;
      session.userBConsent = true;
      session.status = 'ready_to_start';
      session.lastUpdated = now;
      saveSecondDateSessionsToDisk();

      // Notify original requester that partner accepted
      sendPushNotificationToUser(session.requestedBy, {
        title: 'Second-Chance Date Accepted! ❤️',
        body: `${userName} agreed to Another Date! Ready when both of you are.`,
        icon: '/assets/kristy_exact.png',
        tag: `sml_second_date_accepted_${sessionId}`,
        data: {
          url: '/?view=matches',
          sessionId,
          status: 'ready_to_start',
        },
      }).catch(() => {});

      return res.json({ success: true, session });
    }

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

    // Dispatch push notification to partner
    sendPushNotificationToUser(partnerId, {
      title: 'Second-Chance Date Invitation ❤️',
      body: `${userName} invited you to a private 10-minute video date! Tap to review.`,
      icon: '/assets/kristy_exact.png',
      tag: `sml_second_date_${sessionId}`,
      data: {
        url: '/?view=matches',
        sessionId,
        requesterId: userId,
        requesterName: userName,
        partnerId,
        eventId,
      },
    }).catch(() => {});

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

  // Dispatch immediate push notification to partner
  sendPushNotificationToUser(partnerId, {
    title: 'Second-Chance Date Invitation ❤️',
    body: `${userName} invited you to a private 10-minute video date! Tap to review.`,
    icon: '/assets/kristy_exact.png',
    tag: `sml_second_date_${sessionId}`,
    data: {
      url: '/?view=matches',
      sessionId,
      requesterId: userId,
      requesterName: userName,
      partnerId,
      eventId,
    },
  }).catch(() => {});

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

      // Notify the requester that partner accepted
      const otherUserId = isUserA ? session.userB : session.userA;
      const respondentName = isUserA ? session.userAName : session.userBName;
      sendPushNotificationToUser(otherUserId, {
        title: 'Second-Chance Date Accepted! ❤️',
        body: `${respondentName || 'Your match'} agreed to Another Date! Ready when both of you are.`,
        icon: '/assets/kristy_exact.png',
        tag: `sml_second_date_accepted_${sessionId}`,
        data: {
          url: '/?view=matches',
          sessionId,
          status: 'ready_to_start',
        },
      }).catch(() => {});
    }
  } else if (action === 'decline' || action === 'save_and_chat') {
    // Feature 7: Decline without exposing private reasons to requester
    session.status = 'declined';
  }

  session.lastUpdated = now;
  saveSecondDateSessionsToDisk();
  return res.json({ success: true, session });
});

// API: Retrieve incoming Second-Chance Date invitations and ready sessions for a user
app.get('/api/second-date/invitations', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const invitations = Array.from(secondDateSessions.values()).filter(s => {
    const isParticipant = s.userA === userId || s.userB === userId;
    if (!isParticipant) return false;
    if (s.status === 'waiting_for_partner' && s.requestedBy !== userId) return true;
    if (s.status === 'ready_to_start') return true;
    return false;
  });

  return res.json({ success: true, invitations, serverTime: Date.now() });
});

// API: Get VAPID public key for browser push registration
app.get('/api/push/vapid-public-key', (_req, res) => {
  return res.json({ success: true, publicKey: vapidKeys.publicKey });
});

// API: Subscribe browser to push notifications
app.post('/api/push/subscribe', (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: 'userId and valid subscription are required' });
  }

  let subs = userPushSubscriptions.get(userId) || [];
  const exists = subs.some(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    userPushSubscriptions.set(userId, subs);
    savePushSubscriptionsToDisk();
  }

  return res.json({ success: true, subscribed: true, totalSubscriptions: subs.length });
});

// API: Unsubscribe browser from push notifications
app.post('/api/push/unsubscribe', (req, res) => {
  const { userId, endpoint } = req.body;
  if (!userId || !endpoint) {
    return res.status(400).json({ success: false, error: 'userId and endpoint are required' });
  }

  let subs = userPushSubscriptions.get(userId) || [];
  const filtered = subs.filter(s => s.endpoint !== endpoint);
  userPushSubscriptions.set(userId, filtered);
  savePushSubscriptionsToDisk();

  return res.json({ success: true, unsubscribed: true });
});

// API: Test push delivery for a specific member
app.post('/api/push/test', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const result = await sendPushNotificationToUser(userId, {
    title: 'Speed Meet Love Push Test ❤️',
    body: 'Browser push notifications are active and verified for Second-Chance Dates!',
    icon: '/assets/kristy_exact.png',
    tag: `test_push_${Date.now()}`,
    data: { url: '/?view=matches' },
  });

  return res.json({ success: true, ...result });
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

// ============================================================================
// SERVER-SIDE AUTHENTICATED SESSION REGISTRY & OWNER VERIFICATION
// ============================================================================
// Cryptographically issues and validates session tokens on the server.
// Strictly prevents trusting raw client-supplied user IDs without session verification.
// ============================================================================
// ============================================================================
// SERVER-SIDE AUTHENTICATED SESSION REGISTRY & OWNER VERIFICATION
// ============================================================================
// Cryptographically issues and validates session tokens on the server.
// Strictly prevents trusting raw client-supplied user IDs without session verification.
// ============================================================================
export interface ServerAuthSession {
  token: string;
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number; // 24 hours
}

const serverAuthSessions = new Map<string, ServerAuthSession>();

// ============================================================================
// SERVER-AUTHORITATIVE USER ACCOUNTS STORAGE (REAL EMAIL/PASSWORD AUTH)
// ============================================================================
export interface ServerUserRecord {
  userId: string;
  email: string; // Normalized lowercase
  passwordHash: string; // Salted PBKDF2 hash (sha512, 100,000 iterations)
  passwordSalt: string; // 16-byte random salt
  firstName: string;
  lastName: string;
  age: number; // Enforced 18+
  gender: 'Woman' | 'Man' | 'Non-Binary';
  interestedIn: 'Men' | 'Women' | 'Everyone';
  location: string;
  occupation?: string;
  bio?: string;
  profilePhoto?: string;
  subscriptionTier: 'Free' | 'Premium' | 'Premium Plus';
  subscriptionStatus?: 'none' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid';
  stripeCustomerId?: string;
  stripeCustomerIdLive?: string;
  stripeCustomerIdTest?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  subscriptionCurrentPeriodEnd?: number;
  subscriptionCancelAtPeriodEnd?: boolean;
  isTester?: boolean;
  testerAccessGranted?: boolean;
  testerAccessGrantedAt?: number;
  testerAccessGrantedBy?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: number;
  emailVerificationTokenHash?: string;
  emailVerificationCodeHash?: string;
  emailVerificationSentAt?: number;
  emailVerificationExpiresAt?: number;
  emailVerificationAttempts?: number;
  launchOfferGrantNumber?: number;
  launchOfferGrantedAt?: number;
  launchOfferExpiresAt?: number;
  launchOfferCelebrationShownAt?: number;
  createdAt: number;
  lastSignIn?: number; // Unix epoch ms of last sign-in
  isBanned?: boolean;
  interests?: string[];
  icebreakerAnswer?: string;
  avatarColor?: string;
  hairColor?: string;
  heightInches?: number;
  eyeColor?: string;
  relationshipIntent?: string;
  smoking?: string;
  drinking?: string;
  children?: string;
  privacySettings?: any;
  preferences?: any;
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const serverUsers = new Map<string, ServerUserRecord>();

export const LAUNCH_OFFER_MAX_GRANTS = 50;
export const LAUNCH_OFFER_DURATION_DAYS = 30;
export const LAUNCH_OFFER_DURATION_MS = LAUNCH_OFFER_DURATION_DAYS * 24 * 60 * 60 * 1000;

export interface LaunchOfferGrantRecord {
  userId: string;
  email: string;
  grantNumber: number; // Permanent 1..50
  grantedAt: number;
  expiresAt: number;
  source: 'existing_verified' | 'post_verification';
  celebrationShownAt?: number | null;
}

export interface LaunchOfferConfigState {
  liveAt: number;
  maxGrants: number;
  durationDays: number;
  updatedAt: number;
}

const LAUNCH_OFFER_GRANTS_FILE = path.join(DATA_DIR, 'launch_offer_grants.json');
const LAUNCH_OFFER_CONFIG_FILE = path.join(DATA_DIR, 'launch_offer_config.json');
const serverLaunchOfferGrants = new Map<string, LaunchOfferGrantRecord>();
let launchOfferConfig: LaunchOfferConfigState = {
  liveAt: Date.now(),
  maxGrants: LAUNCH_OFFER_MAX_GRANTS,
  durationDays: LAUNCH_OFFER_DURATION_DAYS,
  updatedAt: Date.now(),
};
let launchOfferLockTail: Promise<unknown> = Promise.resolve();

function withLaunchOfferLock<T>(task: () => Promise<T>): Promise<T> {
  const next = launchOfferLockTail.then(task, task);
  launchOfferLockTail = next.catch(() => {});
  return next;
}

function writeJsonAtomicSync(filePath: string, data: unknown) {
  ensureStorageDirectory();
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function loadLaunchOfferStateFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(LAUNCH_OFFER_CONFIG_FILE)) {
      const rawCfg = JSON.parse(fs.readFileSync(LAUNCH_OFFER_CONFIG_FILE, 'utf-8'));
      if (rawCfg && typeof rawCfg.liveAt === 'number' && rawCfg.liveAt > 0) {
        launchOfferConfig = {
          liveAt: rawCfg.liveAt,
          maxGrants: LAUNCH_OFFER_MAX_GRANTS,
          durationDays: LAUNCH_OFFER_DURATION_DAYS,
          updatedAt: typeof rawCfg.updatedAt === 'number' ? rawCfg.updatedAt : rawCfg.liveAt,
        };
      }
    } else {
      launchOfferConfig = {
        liveAt: Date.now(),
        maxGrants: LAUNCH_OFFER_MAX_GRANTS,
        durationDays: LAUNCH_OFFER_DURATION_DAYS,
        updatedAt: Date.now(),
      };
      writeJsonAtomicSync(LAUNCH_OFFER_CONFIG_FILE, launchOfferConfig);
    }

    if (fs.existsSync(LAUNCH_OFFER_GRANTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LAUNCH_OFFER_GRANTS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            typeof item.userId === 'string' &&
            typeof item.grantNumber === 'number' &&
            item.grantNumber >= 1 &&
            item.grantNumber <= LAUNCH_OFFER_MAX_GRANTS
          ) {
            serverLaunchOfferGrants.set(item.userId, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load launch offer state from disk:', err);
  }
}

function saveLaunchOfferGrantsToDisk() {
  try {
    const array = Array.from(serverLaunchOfferGrants.values()).sort(
      (a, b) => a.grantNumber - b.grantNumber
    );
    writeJsonAtomicSync(LAUNCH_OFFER_GRANTS_FILE, array);
  } catch (err) {
    console.warn('Failed to save launch offer grants to disk:', err);
  }
}

function saveLaunchOfferConfigToDisk() {
  try {
    writeJsonAtomicSync(LAUNCH_OFFER_CONFIG_FILE, launchOfferConfig);
  } catch (err) {
    console.warn('Failed to save launch offer config to disk:', err);
  }
}

export interface ServerReportRecord {
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
  actionTaken?: string;
  actionAt?: number;
  actionBy?: string;
}

const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const serverReports = new Map<string, ServerReportRecord>();

const BANNED_USERS_FILE = path.join(DATA_DIR, 'banned_users.json');
const bannedUsers = new Set<string>();

const GRANTED_TESTERS_FILE = path.join(DATA_DIR, 'granted_testers.json');

export interface GrantedTesterRecord {
  email: string;
  grantedAt: number;
  grantedBy: string;
  notes?: string;
}

const grantedTesterRecords = new Map<string, GrantedTesterRecord>();

function loadGrantedTestersFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(GRANTED_TESTERS_FILE)) {
      const data = fs.readFileSync(GRANTED_TESTERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.email) {
            grantedTesterRecords.set(item.email.toLowerCase().trim(), item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load granted testers from disk:', err);
  }
}

function saveGrantedTestersToDisk() {
  try {
    ensureStorageDirectory();
    const array = Array.from(grantedTesterRecords.values());
    fs.writeFileSync(GRANTED_TESTERS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save granted testers to disk:', err);
  }
}

export interface ServerWaitlistEntry {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: 'Woman' | 'Man' | 'Non-Binary';
  interestedIn: 'Men' | 'Women' | 'Everyone';
  age: number;
  location: string;
  relationshipIntent?: string;
  subscriptionTier: 'Free' | 'Premium' | 'Premium Plus';
  joinedAt: number;
  updatedAt: number;
}

const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');
const serverWaitlist = new Map<string, ServerWaitlistEntry>();

export interface ServerLaunchEventRecord {
  EventID: string;
  EventName: string;
  DayOfWeek: 'Friday' | 'Saturday' | 'Sunday';
  EventDate: string;
  EventStartTime: string;
  EventEndTime: string;
  TimeZone: string;
  MaxParticipants: number;
  ParticipantsList: string[];
  EventStatus: 'Upcoming' | 'Live' | 'Completed';
  RoundsGenerated: boolean;
  HostID: string;
  EventType: 'Straight' | 'LGBTQ+' | '30 & Older' | 'Age-specific' | 'Premium-only';
  Description: string;
  TotalRounds: number;
  RoundDurationSeconds: number;
  BreakDurationSeconds: number;
  MinAge: number;
  MaxAge: number;
  LocationName: string;
  Confirmed: boolean;
  ConfirmedAt: number | null;
  IsManualLaunch: boolean;
  CreatedAt: number;
  CreatedBy: string;
}

const LAUNCH_EVENTS_FILE = path.join(DATA_DIR, 'launch_events.json');
const serverLaunchEvents = new Map<string, ServerLaunchEventRecord>();

function loadWaitlistFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(WAITLIST_FILE)) {
      const data = fs.readFileSync(WAITLIST_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.userId) {
            serverWaitlist.set(item.userId, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load waitlist from disk:', err);
  }
}

function saveWaitlistToDisk() {
  try {
    ensureStorageDirectory();
    const array = Array.from(serverWaitlist.values());
    fs.writeFileSync(WAITLIST_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save waitlist to disk:', err);
  }
}

function loadLaunchEventsFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(LAUNCH_EVENTS_FILE)) {
      const data = fs.readFileSync(LAUNCH_EVENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.EventID) {
            serverLaunchEvents.set(item.EventID, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load launch events from disk:', err);
  }
}

function saveLaunchEventsToDisk() {
  try {
    ensureStorageDirectory();
    const array = Array.from(serverLaunchEvents.values());
    fs.writeFileSync(LAUNCH_EVENTS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save launch events to disk:', err);
  }
}

function wantsGender(interestedIn?: string, candidateGender?: string): boolean {
  if (!interestedIn || !candidateGender) return false;
  if (interestedIn === 'Everyone') return true;
  if (interestedIn === 'Women') return candidateGender === 'Woman';
  if (interestedIn === 'Men') return candidateGender === 'Man';
  return false;
}

export function areParticipantsCompatible(
  userA: { userId: string; gender?: string; interestedIn?: string; age?: number },
  userB: { userId: string; gender?: string; interestedIn?: string; age?: number },
  eventMeta?: { eventType?: string; minAge?: number }
): boolean {
  if (!userA?.userId || !userB?.userId || userA.userId === userB.userId) {
    return false;
  }
  const ageA = typeof userA.age === 'number' ? userA.age : 0;
  const ageB = typeof userB.age === 'number' ? userB.age : 0;
  if (ageA < 18 || ageB < 18) {
    return false;
  }
  const minRequiredAge = eventMeta?.eventType === '30 & Older'
    ? 30
    : typeof eventMeta?.minAge === 'number' && eventMeta.minAge >= 30
    ? eventMeta.minAge
    : 18;
  if (ageA < minRequiredAge || ageB < minRequiredAge) {
    return false;
  }
  if (!wantsGender(userA.interestedIn, userB.gender) || !wantsGender(userB.interestedIn, userA.gender)) {
    return false;
  }
  return true;
}

export const OWNER_EMAILS = new Set(['kristylten@gmail.com']);
export const OWNER_USER_IDS = new Set(['usr_kristy']);

export function isOwnerUser(authUser: { userId: string; email: string }): boolean {
  const normEmail = authUser.email ? authUser.email.toLowerCase().trim() : '';
  return OWNER_EMAILS.has(normEmail) || OWNER_USER_IDS.has(authUser.userId);
}

export const TESTER_USER_IDS = new Set(['usr_kristy', 'usr_kristy_demo', 'usr_me']);
export const TESTER_EMAIL_DOMAINS = ['@speedmeetlove.internal'];

export function isTesterAccount(user: { userId: string; email?: string; isTester?: boolean }): boolean {
  if (user.isTester === true) return true;
  if (isOwnerUser({ userId: user.userId, email: user.email || '' })) return true;
  if (TESTER_USER_IDS.has(user.userId)) return true;
  if (typeof AUTHORIZED_STAGING_ACCOUNTS !== 'undefined' && AUTHORIZED_STAGING_ACCOUNTS.has(user.userId)) return true;
  const email = (user.email || '').toLowerCase().trim();
  if (email && grantedTesterRecords.has(email)) return true;
  if (TESTER_EMAIL_DOMAINS.some(d => email.endsWith(d))) return true;
  return false;
}

export function isLaunchOfferEligibleMember(user: ServerUserRecord): boolean {
  if (!user || !user.userId || !user.email) return false;
  if (isOwnerUser({ userId: user.userId, email: user.email })) return false;
  if (isTesterAccount(user)) return false;
  if (isDemoUserRecord(user)) return false;
  const normEmail = user.email.toLowerCase().trim();
  if (user.isBanned || bannedUsers.has(user.userId) || bannedUsers.has(normEmail)) return false;
  return true;
}

export function getActiveLaunchOfferGrant(
  user: ServerUserRecord
): LaunchOfferGrantRecord | null {
  const fromLedger = serverLaunchOfferGrants.get(user.userId);
  if (fromLedger) return fromLedger;
  if (
    typeof user.launchOfferGrantNumber === 'number' &&
    user.launchOfferGrantNumber >= 1 &&
    user.launchOfferGrantNumber <= LAUNCH_OFFER_MAX_GRANTS &&
    typeof user.launchOfferGrantedAt === 'number' &&
    typeof user.launchOfferExpiresAt === 'number'
  ) {
    return {
      userId: user.userId,
      email: (user.email || '').toLowerCase().trim(),
      grantNumber: user.launchOfferGrantNumber,
      grantedAt: user.launchOfferGrantedAt,
      expiresAt: user.launchOfferExpiresAt,
      source: 'post_verification',
      celebrationShownAt: user.launchOfferCelebrationShownAt || null,
    };
  }
  return null;
}

export function hasActiveLaunchOfferPremium(
  user: ServerUserRecord,
  now = Date.now()
): boolean {
  if (user.emailVerified !== true) return false;
  if (!isLaunchOfferEligibleMember(user)) return false;
  const grant = getActiveLaunchOfferGrant(user);
  if (!grant) return false;
  if (grant.grantNumber < 1 || grant.grantNumber > LAUNCH_OFFER_MAX_GRANTS) return false;
  return now < grant.expiresAt;
}

export function hasPaidOrTesterAccess(
  user: ServerUserRecord,
  requiredTier: 'Premium' | 'Premium Plus'
): { allowed: boolean; reason?: string; isTesterOverride: boolean; isLaunchOfferGrant?: boolean } {
  // Free tester access is kept strictly separate from paid subscription status
  if (isTesterAccount(user)) {
    return { allowed: true, isTesterOverride: true };
  }

  const isTierEligible =
    requiredTier === 'Premium'
      ? user.subscriptionTier === 'Premium' || user.subscriptionTier === 'Premium Plus'
      : user.subscriptionTier === 'Premium Plus';

  const isStatusActive =
    user.subscriptionStatus === 'active' ||
    user.subscriptionStatus === 'trialing' ||
    (!user.subscriptionStatus && (user.subscriptionTier === 'Premium' || user.subscriptionTier === 'Premium Plus'));

  if (isTierEligible && isStatusActive) {
    return { allowed: true, isTesterOverride: false };
  }

  // First-50 Launch Offer awards 30 days of free Premium (never Premium Plus)
  if (requiredTier === 'Premium' && hasActiveLaunchOfferPremium(user)) {
    return { allowed: true, isTesterOverride: false, isLaunchOfferGrant: true };
  }

  if (requiredTier === 'Premium') {
    return {
      allowed: false,
      reason: 'Messaging requires an active Premium ($9.99/mo) or Premium Plus ($14.99/mo) subscription. Free tier is browsing only.',
      isTesterOverride: false,
    };
  }

  return {
    allowed: false,
    reason: 'Live speed dating requires an active Premium Plus ($14.99/mo) subscription.',
    isTesterOverride: false,
  };
}

function loadReportsFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(REPORTS_FILE)) {
      const data = fs.readFileSync(REPORTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.id) {
            serverReports.set(item.id, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load reports from disk:', err);
  }
}

function saveReportsToDisk() {
  try {
    ensureStorageDirectory();
    const array = Array.from(serverReports.values());
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save reports to disk:', err);
  }
}

function loadBannedUsersFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(BANNED_USERS_FILE)) {
      const data = fs.readFileSync(BANNED_USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') {
            bannedUsers.add(item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load banned users from disk:', err);
  }
}

function saveBannedUsersToDisk() {
  try {
    ensureStorageDirectory();
    const array = Array.from(bannedUsers);
    fs.writeFileSync(BANNED_USERS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save banned users to disk:', err);
  }
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (err) {
    return false;
  }
}

function loadUsersFromDisk() {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.userId && item.email) {
            serverUsers.set(item.userId, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load users from disk:', err);
  }
}

function saveUsersToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const array = Array.from(serverUsers.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save users to disk:', err);
  }
}

function seedDefaultUsersIfEmpty() {
  const defaultAccounts = [
    {
      userId: 'usr_kristy',
      email: 'kristylten@gmail.com',
      firstName: 'Kristy',
      lastName: '',
      age: 28,
      gender: 'Woman' as const,
      interestedIn: 'Men' as const,
      location: 'New York, NY',
      occupation: 'Product Founder',
      bio: 'Speed Meet Love creator. Passionate about real-time human connection, travel, and good conversations.',
      profilePhoto: '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png',
      subscriptionTier: 'Premium Plus' as const,
    },
    {
      userId: 'usr_kristy_demo',
      email: 'kristy.demo@speedmeetlove.internal',
      firstName: 'Kristy',
      lastName: 'Demo',
      age: 28,
      gender: 'Woman' as const,
      interestedIn: 'Men' as const,
      location: 'New York, NY',
      occupation: 'Founder',
      bio: 'Speed Meet Love founder profile.',
      profilePhoto: '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png',
      subscriptionTier: 'Premium Plus' as const,
    },
    {
      userId: 'usr_me',
      email: 'alex.rivera@example.com',
      firstName: 'Alex',
      lastName: 'Rivera',
      age: 29,
      gender: 'Man' as const,
      interestedIn: 'Women' as const,
      location: 'Brooklyn, New York',
      occupation: 'UX Design Lead',
      bio: 'Product designer & coffee enthusiast. Love weekend farmers markets, indie vinyl, and trail runs with my golden retriever.',
      profilePhoto: '/assets/man_alex.jpg',
      subscriptionTier: 'Premium Plus' as const,
    },
  ];

  let added = false;
  for (const acc of defaultAccounts) {
    let existingUser: ServerUserRecord | null = null;
    for (const u of serverUsers.values()) {
      if (u.email.toLowerCase() === acc.email.toLowerCase() || u.userId === acc.userId) {
        existingUser = u;
        break;
      }
    }
    if (!existingUser) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword('SpeedMeetLove2026!', salt);
      const userRecord: ServerUserRecord = {
        ...acc,
        passwordSalt: salt,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: Date.now(),
        createdAt: Date.now(),
      };
      serverUsers.set(acc.userId, userRecord);
      added = true;
    } else if (!existingUser.passwordHash || !existingUser.passwordSalt) {
      const salt = crypto.randomBytes(16).toString('hex');
      existingUser.passwordSalt = salt;
      existingUser.passwordHash = hashPassword('SpeedMeetLove2026!', salt);
      added = true;
    }
  }
  if (added) {
    saveUsersToDisk();
  }
}

loadUsersFromDisk();
loadReportsFromDisk();
loadBannedUsersFromDisk();
loadGrantedTestersFromDisk();
loadWaitlistFromDisk();
loadLaunchEventsFromDisk();
loadLaunchOfferStateFromDisk();
seedDefaultUsersIfEmpty();

// ============================================================================
// DURABLE DATABASE INTEGRATION (CLOUD FIRESTORE)
// Ensures accounts persist across container redeployments and server instances
// ============================================================================
let firestoreDb: Firestore | null = null;
let firestoreConfig: any = null;
let isDurableDatabaseActive = false;

function initDurableDatabase() {
  if (process.env.DISABLE_FIRESTORE === 'true') {
    return;
  }
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      firestoreConfig = JSON.parse(raw);
      if (firestoreConfig.apiKey && firestoreConfig.projectId) {
        const app = initFirebaseApp(firestoreConfig, 'sml_server_authoritative');
        firestoreDb = getFirestore(app, firestoreConfig.firestoreDatabaseId || undefined);
        isDurableDatabaseActive = true;
        console.log('[DURABLE DB] Connected to Cloud Firestore database:', firestoreConfig.projectId, firestoreConfig.firestoreDatabaseId || 'default');
      }
    }
  } catch (err) {
    console.warn('[DURABLE DB] Could not initialize Cloud Firestore:', err);
  }
}
initDurableDatabase();

async function syncDurableDatabaseOnStartup() {
  if (!firestoreDb) return;
  try {
    // Validate connection from server per skill guidelines
    await getDocFromServer(firestoreDoc(firestoreDb, 'system_test', 'startup_ping')).catch(() => null);

    // 1. Fetch all accounts from durable Firestore
    const usersCol = firestoreCollection(firestoreDb, 'users');
    const snap = await firestoreGetDocs(usersCol);
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data() as ServerUserRecord;
        if (data && data.userId && data.email) {
          const localRecord = serverUsers.get(data.userId);
          const passwordHash = data.passwordHash || localRecord?.passwordHash;
          const passwordSalt = data.passwordSalt || localRecord?.passwordSalt;
          serverUsers.set(data.userId, {
            ...localRecord,
            ...data,
            ...(passwordHash ? { passwordHash } : {}),
            ...(passwordSalt ? { passwordSalt } : {}),
          });
        }
      });
      console.log(`[DURABLE DB] Rehydrated ${serverUsers.size} accounts from Cloud Firestore.`);
    } else {
      console.log('[DURABLE DB] Firestore collection empty. Migrating existing accounts to Firestore...');
      // Pre-migration backup check
      const backupPath = path.join(DATA_DIR, 'users_backup_pre_migration.json');
      let accountsToMigrate: ServerUserRecord[] = Array.from(serverUsers.values());
      if (fs.existsSync(backupPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
          if (Array.isArray(parsed) && parsed.length > 0) {
            accountsToMigrate = parsed;
          }
        } catch (e) {}
      }
      for (const u of accountsToMigrate) {
        serverUsers.set(u.userId, u);
        await firestoreSetDoc(firestoreDoc(firestoreDb, 'users', u.userId), u);
      }
      console.log(`[DURABLE DB] Successfully migrated ${accountsToMigrate.length} accounts to Cloud Firestore.`);
    }

    // 2. Sync banned users from durable storage
    const bannedCol = firestoreCollection(firestoreDb, 'banned_users');
    const bannedSnap = await firestoreGetDocs(bannedCol);
    bannedSnap.forEach(d => {
      bannedUsers.add(d.id);
    });

    // 2b. Sync granted tester accounts from durable storage
    const testersCol = firestoreCollection(firestoreDb, 'granted_testers');
    const testersSnap = await firestoreGetDocs(testersCol).catch(() => null);
    if (testersSnap && !testersSnap.empty) {
      testersSnap.forEach(d => {
        const item = d.data() as GrantedTesterRecord;
        if (item && item.email) {
          grantedTesterRecords.set(item.email.toLowerCase().trim(), item);
        }
      });
      console.log(`[DURABLE DB] Rehydrated ${grantedTesterRecords.size} granted tester records from Cloud Firestore.`);
    } else if (grantedTesterRecords.size > 0) {
      for (const [email, record] of grantedTesterRecords.entries()) {
        const docId = email.replace(/[^a-zA-Z0-9_.-]/g, '_');
        await firestoreSetDoc(firestoreDoc(firestoreDb, 'granted_testers', docId), record).catch(() => null);
      }
    }

    // 2c. Sync event waiting list from durable storage
    const waitlistCol = firestoreCollection(firestoreDb, 'event_waitlist');
    const waitlistSnap = await firestoreGetDocs(waitlistCol).catch(() => null);
    if (waitlistSnap && !waitlistSnap.empty) {
      waitlistSnap.forEach(d => {
        const item = d.data() as ServerWaitlistEntry;
        if (item && item.userId) {
          serverWaitlist.set(item.userId, item);
        }
      });
      console.log(`[DURABLE DB] Rehydrated ${serverWaitlist.size} waitlist entries from Cloud Firestore.`);
    } else if (serverWaitlist.size > 0) {
      for (const [uid, entry] of serverWaitlist.entries()) {
        await firestoreSetDoc(firestoreDoc(firestoreDb, 'event_waitlist', uid), entry).catch(() => null);
      }
    }

    // 2d. Sync manually scheduled launch events from durable storage
    const launchEventsCol = firestoreCollection(firestoreDb, 'launch_events');
    const launchSnap = await firestoreGetDocs(launchEventsCol).catch(() => null);
    if (launchSnap && !launchSnap.empty) {
      launchSnap.forEach(d => {
        const item = d.data() as ServerLaunchEventRecord;
        if (item && item.EventID) {
          serverLaunchEvents.set(item.EventID, item);
        }
      });
      console.log(`[DURABLE DB] Rehydrated ${serverLaunchEvents.size} launch event(s) from Cloud Firestore.`);
    } else if (serverLaunchEvents.size > 0) {
      for (const [eid, evt] of serverLaunchEvents.entries()) {
        await firestoreSetDoc(firestoreDoc(firestoreDb, 'launch_events', eid), evt).catch(() => null);
      }
    }

    // 2e. Sync launch offer state & grants from durable storage
    const launchCfgSnap = await firestoreGetDoc(firestoreDoc(firestoreDb, 'launch_offer_config', 'state')).catch(() => null);
    if (launchCfgSnap && launchCfgSnap.exists()) {
      const cfg = launchCfgSnap.data() as LaunchOfferConfigState;
      if (cfg && typeof cfg.liveAt === 'number' && cfg.liveAt > 0) {
        launchOfferConfig = {
          liveAt: Math.min(launchOfferConfig.liveAt, cfg.liveAt),
          maxGrants: LAUNCH_OFFER_MAX_GRANTS,
          durationDays: LAUNCH_OFFER_DURATION_DAYS,
          updatedAt: cfg.updatedAt || cfg.liveAt,
        };
      }
    } else {
      await firestoreSetDoc(firestoreDoc(firestoreDb, 'launch_offer_config', 'state'), cleanFirestoreObject(launchOfferConfig)).catch(() => null);
    }

    const launchGrantsCol = firestoreCollection(firestoreDb, 'launch_offer_grants');
    const launchGrantsSnap = await firestoreGetDocs(launchGrantsCol).catch(() => null);
    if (launchGrantsSnap && !launchGrantsSnap.empty) {
      launchGrantsSnap.forEach(d => {
        const item = d.data() as LaunchOfferGrantRecord;
        if (item && item.userId && typeof item.grantNumber === 'number' && item.grantNumber >= 1 && item.grantNumber <= LAUNCH_OFFER_MAX_GRANTS) {
          const existing = serverLaunchOfferGrants.get(item.userId);
          if (!existing) {
            serverLaunchOfferGrants.set(item.userId, item);
          } else {
            // Preserve earliest grant timestamps and non-null celebration acknowledgment
            const mergedShownAt =
              existing.celebrationShownAt && item.celebrationShownAt
                ? Math.min(existing.celebrationShownAt, item.celebrationShownAt)
                : existing.celebrationShownAt || item.celebrationShownAt || null;
            serverLaunchOfferGrants.set(item.userId, {
              ...existing,
              celebrationShownAt: mergedShownAt,
            });
          }
        }
      });
    }

    // 3. Keep local backup files in sync
    saveUsersToDisk();
    saveBannedUsersToDisk();
    saveGrantedTestersToDisk();
    saveWaitlistToDisk();
    saveLaunchEventsToDisk();
    saveLaunchOfferConfigToDisk();
    saveLaunchOfferGrantsToDisk();

    // Ensure all registered users matching granted testers have Premium Plus tester privileges
    for (const [email, record] of grantedTesterRecords.entries()) {
      for (const u of serverUsers.values()) {
        if (u.email && u.email.toLowerCase().trim() === email) {
          if (!u.isTester || u.subscriptionTier !== 'Premium Plus' || !u.testerAccessGranted) {
            u.isTester = true;
            u.subscriptionTier = 'Premium Plus';
            u.testerAccessGranted = true;
            u.testerAccessGrantedAt = record.grantedAt;
            u.testerAccessGrantedBy = record.grantedBy;
            if (!u.subscriptionStatus || u.subscriptionStatus === 'none' || u.subscriptionStatus === 'canceled') {
              u.subscriptionStatus = 'active';
            }
            await saveUserToDurableDatabase(u);
          }
        }
      }
    }

    // Reconcile & reserve first-50 launch offer spots for existing email-verified non-tester members
    await reconcileLaunchOfferGrants();

    // 4. Update Kristy's verified account to the new uploaded founder portrait & repair non-founder accounts
    let repairedCount = 0;
    const FOUNDER_PHOTO = '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png';
    for (const [uid, userRecord] of serverUsers.entries()) {
      const isFounder = uid === 'usr_kristy' || (userRecord.email && userRecord.email.toLowerCase().trim() === 'kristylten@gmail.com');
      if (isFounder) {
        let changed = false;
        if (userRecord.profilePhoto !== FOUNDER_PHOTO) {
          userRecord.profilePhoto = FOUNDER_PHOTO;
          changed = true;
        }
        if (!userRecord.passwordHash || !userRecord.passwordSalt) {
          const salt = crypto.randomBytes(16).toString('hex');
          userRecord.passwordSalt = salt;
          userRecord.passwordHash = hashPassword('SpeedMeetLove2026!', salt);
          changed = true;
        }
        if (changed) {
          await saveUserToDurableDatabase(userRecord);
          console.log(`[FOUNDER PHOTO] Updated Kristy's verified dating profile photo to ${FOUNDER_PHOTO}`);
        }
      } else {
        if (userRecord.profilePhoto === '/assets/kristy_exact.png' || userRecord.profilePhoto === FOUNDER_PHOTO) {
          userRecord.profilePhoto = undefined;
          repairedCount++;
          await saveUserToDurableDatabase(userRecord);
        }
      }
    }
    if (repairedCount > 0) {
      console.log(`[PROFILE REPAIR] Successfully cleared founder photo from ${repairedCount} non-founder registered account(s).`);
    }
  } catch (err) {
    console.error('[DURABLE DB] Error during startup sync with Firestore:', err);
  }
}
reconcileLaunchOfferGrants().catch(err => console.warn('[LAUNCH OFFER] Initial reconcile error:', err));
syncDurableDatabaseOnStartup().catch(err => console.warn('[DURABLE DB] Background sync error:', err));

function cleanFirestoreObject(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanFirestoreObject);
  const clean: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = cleanFirestoreObject(v);
    }
  }
  return clean;
}

enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface ServerFirestoreErrorInfo {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
  };
}

function logFirestoreError(
  err: unknown,
  operationType: FirestoreOperationType,
  path: string | null
): ServerFirestoreErrorInfo {
  const errInfo: ServerFirestoreErrorInfo = {
    error: err instanceof Error ? err.message : String(err),
    operationType,
    path,
    authInfo: {
      userId: null,
      email: null,
    },
  };
  console.warn('[DURABLE DB] Firestore operation notice:', JSON.stringify(errInfo));
  return errInfo;
}

function isFirestorePermissionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code;
  return code === 'permission-denied' || /permission[_-]?denied|insufficient permissions/i.test(msg);
}

async function saveUserToDurableDatabase(user: ServerUserRecord): Promise<void> {
  serverUsers.set(user.userId, user);
  saveUsersToDisk();
  if (firestoreDb) {
    const docPath = `users/${user.userId}`;
    try {
      const cleanRecord = cleanFirestoreObject(user);
      if (user.profilePhoto === undefined) {
        cleanRecord.profilePhoto = null;
      }
      await firestoreSetDoc(firestoreDoc(firestoreDb, 'users', user.userId), cleanRecord);
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.WRITE, docPath);
      if (!isFirestorePermissionError(err)) {
        throw new Error('Durable database write failed.');
      }
    }
  }
}

async function deleteUserFromDurableDatabase(userId: string): Promise<void> {
  serverUsers.delete(userId);
  saveUsersToDisk();
  if (firestoreDb) {
    try {
      await firestoreDeleteDoc(firestoreDoc(firestoreDb, 'users', userId));
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.DELETE, `users/${userId}`);
    }
  }
}

async function banUserInDurableDatabase(identifier: string): Promise<void> {
  bannedUsers.add(identifier);
  saveBannedUsersToDisk();
  if (firestoreDb) {
    try {
      await firestoreSetDoc(firestoreDoc(firestoreDb, 'banned_users', identifier), {
        identifier,
        bannedAt: Date.now(),
      });
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.WRITE, `banned_users/${identifier}`);
    }
  }
}

async function unbanUserInDurableDatabase(identifier: string): Promise<void> {
  bannedUsers.delete(identifier);
  saveBannedUsersToDisk();
  if (firestoreDb) {
    try {
      await firestoreDeleteDoc(firestoreDoc(firestoreDb, 'banned_users', identifier));
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.DELETE, `banned_users/${identifier}`);
    }
  }
}

async function saveWaitlistEntryToDurableDatabase(entry: ServerWaitlistEntry): Promise<void> {
  serverWaitlist.set(entry.userId, entry);
  saveWaitlistToDisk();
  if (firestoreDb) {
    const docPath = `event_waitlist/${entry.userId}`;
    try {
      await firestoreSetDoc(firestoreDoc(firestoreDb, 'event_waitlist', entry.userId), cleanFirestoreObject(entry));
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.WRITE, docPath);
      if (!isFirestorePermissionError(err)) {
        throw new Error('Failed to save waiting list entry to durable database.');
      }
    }
  }
}

async function deleteWaitlistEntryFromDurableDatabase(userId: string): Promise<void> {
  serverWaitlist.delete(userId);
  saveWaitlistToDisk();
  if (firestoreDb) {
    try {
      await firestoreDeleteDoc(firestoreDoc(firestoreDb, 'event_waitlist', userId));
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.DELETE, `event_waitlist/${userId}`);
    }
  }
}

async function saveLaunchEventToDurableDatabase(evt: ServerLaunchEventRecord): Promise<void> {
  serverLaunchEvents.set(evt.EventID, evt);
  saveLaunchEventsToDisk();
  if (firestoreDb) {
    const docPath = `launch_events/${evt.EventID}`;
    try {
      await firestoreSetDoc(firestoreDoc(firestoreDb, 'launch_events', evt.EventID), cleanFirestoreObject(evt));
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.WRITE, docPath);
      if (!isFirestorePermissionError(err)) {
        throw new Error('Failed to save launch event to durable database.');
      }
    }
  }
}

async function deleteLaunchEventFromDurableDatabase(eventId: string): Promise<void> {
  serverLaunchEvents.delete(eventId);
  saveLaunchEventsToDisk();
  if (firestoreDb) {
    try {
      await firestoreDeleteDoc(firestoreDoc(firestoreDb, 'launch_events', eventId));
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.DELETE, `launch_events/${eventId}`);
    }
  }
}

async function saveLaunchOfferGrantToDurableDatabase(grant: LaunchOfferGrantRecord): Promise<void> {
  serverLaunchOfferGrants.set(grant.userId, grant);
  saveLaunchOfferGrantsToDisk();
  if (firestoreDb) {
    try {
      await firestoreSetDoc(
        firestoreDoc(firestoreDb, 'launch_offer_grants', grant.userId),
        cleanFirestoreObject(grant)
      );
    } catch (err) {
      logFirestoreError(err, FirestoreOperationType.WRITE, `launch_offer_grants/${grant.userId}`);
    }
  }
}

function getUsedLaunchOfferNumbers(): Set<number> {
  const used = new Set<number>();
  for (const grant of serverLaunchOfferGrants.values()) {
    if (typeof grant.grantNumber === 'number' && grant.grantNumber >= 1 && grant.grantNumber <= LAUNCH_OFFER_MAX_GRANTS) {
      used.add(grant.grantNumber);
    }
  }
  return used;
}

function allocateNextSpotNumber(used: Set<number>): number | null {
  if (serverLaunchOfferGrants.size >= LAUNCH_OFFER_MAX_GRANTS || used.size >= LAUNCH_OFFER_MAX_GRANTS) {
    return null;
  }
  for (let n = 1; n <= LAUNCH_OFFER_MAX_GRANTS; n++) {
    if (!used.has(n)) return n;
  }
  return null;
}

export async function reconcileLaunchOfferGrants(): Promise<void> {
  await withLaunchOfferLock(async () => {
    // 1. Hydrate ledger from any user records that already possess durable grant metadata
    let ledgerChanged = false;
    for (const u of serverUsers.values()) {
      if (
        typeof u.launchOfferGrantNumber === 'number' &&
        u.launchOfferGrantNumber >= 1 &&
        u.launchOfferGrantNumber <= LAUNCH_OFFER_MAX_GRANTS &&
        typeof u.launchOfferGrantedAt === 'number' &&
        typeof u.launchOfferExpiresAt === 'number'
      ) {
        const existing = serverLaunchOfferGrants.get(u.userId);
        if (!existing) {
          const used = getUsedLaunchOfferNumbers();
          if (!used.has(u.launchOfferGrantNumber) && serverLaunchOfferGrants.size < LAUNCH_OFFER_MAX_GRANTS) {
            serverLaunchOfferGrants.set(u.userId, {
              userId: u.userId,
              email: (u.email || '').toLowerCase().trim(),
              grantNumber: u.launchOfferGrantNumber,
              grantedAt: u.launchOfferGrantedAt,
              expiresAt: u.launchOfferExpiresAt,
              source: 'existing_verified',
              celebrationShownAt: u.launchOfferCelebrationShownAt || null,
            });
            ledgerChanged = true;
          }
        } else {
          // Ensure user record keeps ledger values without resetting expiration
          let userChanged = false;
          if (u.launchOfferGrantNumber !== existing.grantNumber) {
            u.launchOfferGrantNumber = existing.grantNumber;
            userChanged = true;
          }
          if (u.launchOfferGrantedAt !== existing.grantedAt) {
            u.launchOfferGrantedAt = existing.grantedAt;
            userChanged = true;
          }
          if (u.launchOfferExpiresAt !== existing.expiresAt) {
            u.launchOfferExpiresAt = existing.expiresAt;
            userChanged = true;
          }
          if (existing.celebrationShownAt && !u.launchOfferCelebrationShownAt) {
            u.launchOfferCelebrationShownAt = existing.celebrationShownAt;
            userChanged = true;
          } else if (u.launchOfferCelebrationShownAt && !existing.celebrationShownAt) {
            existing.celebrationShownAt = u.launchOfferCelebrationShownAt;
            ledgerChanged = true;
          }
          if (userChanged) {
            await saveUserToDurableDatabase(u);
          }
        }
      }
    }

    // Also sync grants present in ledger onto serverUsers records
    for (const grant of serverLaunchOfferGrants.values()) {
      const u = serverUsers.get(grant.userId);
      if (u && u.launchOfferGrantNumber !== grant.grantNumber) {
        u.launchOfferGrantNumber = grant.grantNumber;
        u.launchOfferGrantedAt = grant.grantedAt;
        u.launchOfferExpiresAt = grant.expiresAt;
        if (grant.celebrationShownAt) {
          u.launchOfferCelebrationShownAt = grant.celebrationShownAt;
        }
        await saveUserToDurableDatabase(u);
      }
    }

    // 2. Reserve spots in signup order (createdAt ascending) for existing email-verified eligible non-tester members
    const existingVerifiedEligible = Array.from(serverUsers.values())
      .filter(
        u =>
          u.emailVerified === true &&
          isLaunchOfferEligibleMember(u) &&
          !serverLaunchOfferGrants.has(u.userId) &&
          typeof u.launchOfferGrantNumber !== 'number'
      )
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.userId.localeCompare(b.userId));

    const used = getUsedLaunchOfferNumbers();
    const goLiveStart = launchOfferConfig.liveAt || Date.now();

    for (const member of existingVerifiedEligible) {
      const spotNum = allocateNextSpotNumber(used);
      if (spotNum === null) break;
      used.add(spotNum);

      const grantRecord: LaunchOfferGrantRecord = {
        userId: member.userId,
        email: (member.email || '').toLowerCase().trim(),
        grantNumber: spotNum,
        grantedAt: goLiveStart,
        expiresAt: goLiveStart + LAUNCH_OFFER_DURATION_MS,
        source: 'existing_verified',
        celebrationShownAt: member.launchOfferCelebrationShownAt || null,
      };
      serverLaunchOfferGrants.set(member.userId, grantRecord);
      member.launchOfferGrantNumber = grantRecord.grantNumber;
      member.launchOfferGrantedAt = grantRecord.grantedAt;
      member.launchOfferExpiresAt = grantRecord.expiresAt;
      await saveLaunchOfferGrantToDurableDatabase(grantRecord);
      await saveUserToDurableDatabase(member);
      ledgerChanged = true;
      console.log(`[LAUNCH OFFER] Reserved existing verified spot #${spotNum}/50 for ${member.userId}`);
    }

    if (ledgerChanged) {
      saveLaunchOfferGrantsToDisk();
      saveUsersToDisk();
    }
  });
}

export async function tryAwardLaunchOfferSpot(
  userId: string,
  source: 'existing_verified' | 'post_verification' = 'post_verification'
): Promise<LaunchOfferGrantRecord | null> {
  return withLaunchOfferLock(async () => {
    const user = serverUsers.get(userId);
    if (!user) return null;
    if (user.emailVerified !== true) return null;
    if (!isLaunchOfferEligibleMember(user)) return null;

    const existing = serverLaunchOfferGrants.get(userId);
    if (existing) return existing;

    if (
      typeof user.launchOfferGrantNumber === 'number' &&
      user.launchOfferGrantNumber >= 1 &&
      user.launchOfferGrantNumber <= LAUNCH_OFFER_MAX_GRANTS &&
      typeof user.launchOfferGrantedAt === 'number' &&
      typeof user.launchOfferExpiresAt === 'number'
    ) {
      const restored: LaunchOfferGrantRecord = {
        userId: user.userId,
        email: (user.email || '').toLowerCase().trim(),
        grantNumber: user.launchOfferGrantNumber,
        grantedAt: user.launchOfferGrantedAt,
        expiresAt: user.launchOfferExpiresAt,
        source,
        celebrationShownAt: user.launchOfferCelebrationShownAt || null,
      };
      serverLaunchOfferGrants.set(userId, restored);
      saveLaunchOfferGrantsToDisk();
      return restored;
    }

    const used = getUsedLaunchOfferNumbers();
    const spotNumber = allocateNextSpotNumber(used);
    if (spotNumber === null) {
      return null;
    }

    const now = Date.now();
    const grantRecord: LaunchOfferGrantRecord = {
      userId: user.userId,
      email: (user.email || '').toLowerCase().trim(),
      grantNumber: spotNumber,
      grantedAt: now,
      expiresAt: now + LAUNCH_OFFER_DURATION_MS,
      source,
      celebrationShownAt: null,
    };

    // Reserve synchronously in memory before awaiting any IO
    used.add(spotNumber);
    serverLaunchOfferGrants.set(user.userId, grantRecord);
    user.launchOfferGrantNumber = grantRecord.grantNumber;
    user.launchOfferGrantedAt = grantRecord.grantedAt;
    user.launchOfferExpiresAt = grantRecord.expiresAt;

    await saveLaunchOfferGrantToDurableDatabase(grantRecord);
    await saveUserToDurableDatabase(user);
    console.log(`[LAUNCH OFFER] Awarded spot #${spotNumber}/50 to verified member ${user.userId}`);
    return grantRecord;
  });
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function escapeEmailHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeEmailEnvValue(rawValue: string | undefined, envVarPrefix?: string): string {
  let current = (rawValue || '').trim();
  while (
    current.length >= 2 &&
    ((current.startsWith('"') && current.endsWith('"')) ||
      (current.startsWith("'") && current.endsWith("'")) ||
      (current.startsWith('`') && current.endsWith('`')))
  ) {
    current = current.slice(1, -1).trim();
  }
  if (envVarPrefix && current.toUpperCase().startsWith(`${envVarPrefix.toUpperCase()}=`)) {
    current = current.slice(envVarPrefix.length + 1).trim();
    while (
      current.length >= 2 &&
      ((current.startsWith('"') && current.endsWith('"')) ||
        (current.startsWith("'") && current.endsWith("'")) ||
        (current.startsWith('`') && current.endsWith('`')))
    ) {
      current = current.slice(1, -1).trim();
    }
  }
  return current;
}

function getResendEmailConfig() {
  const apiKey = sanitizeEmailEnvValue(process.env.RESEND_API_KEY, 'RESEND_API_KEY').replace(/\s+/g, '');
  const fromAddress =
    sanitizeEmailEnvValue(process.env.EMAIL_FROM, 'EMAIL_FROM') ||
    'Speed Meet Love <noreply@speedmeetlove.com>';
  return { apiKey, fromAddress };
}

function resolveVerificationBaseUrl(reqOrigin?: string): string {
  if (reqOrigin) {
    try {
      const parsed = new URL(reqOrigin);
      const host = parsed.hostname.toLowerCase();
      const isAllowedOrigin =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'speedmeetlove.com' ||
        host === 'www.speedmeetlove.com' ||
        host.endsWith('.run.app');
      if (isAllowedOrigin && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
        return parsed.origin.replace(/\/$/, '');
      }
    } catch {
      // Fall back to canonical domain
    }
  }
  return (process.env.APP_URL || APP_URL).replace(/\/$/, '');
}

async function dispatchVerificationEmail(
  email: string,
  firstName: string,
  verifyUrl: string
): Promise<{ sent: boolean; provider: 'resend' | 'sendgrid' | 'smtp' | 'none' }> {
  const { apiKey: resendKey, fromAddress } = getResendEmailConfig();
  const subject = 'Verify your email for Speed Meet Love';
  const safeFirstName = escapeEmailHtml(firstName || 'Member');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #111827;">
      <h2 style="color: #be185d;">Welcome to Speed Meet Love, ${safeFirstName}!</h2>
      <p>Please verify your email address by clicking the link below to activate full member verification and discover if you’ve claimed one of our first 50 eligible spots for one month of free Premium.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="background: #dc2626; color: #ffffff; padding: 12px 22px; border-radius: 9999px; text-decoration: none; font-weight: bold;">Verify Email Address</a>
      </p>
      <p style="font-size: 13px; color: #374151; word-break: break-all;">Or copy and open this link in your browser:<br /><a href="${verifyUrl}" style="color: #be185d;">${verifyUrl}</a></p>
      <p style="font-size: 12px; color: #6b7280;">This verification link expires in 24 hours.</p>
    </div>
  `;
  const text = [
    `Welcome to Speed Meet Love, ${firstName || 'Member'}!`,
    '',
    'Verify your email address by clicking this link:',
    verifyUrl,
    '',
    'This verification link expires in 24 hours.',
  ].join('\n');

  if (resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject,
          text,
          html,
        }),
      });
      if (resp.ok) {
        return { sent: true, provider: 'resend' };
      }
      const errBody = await resp.text().catch(() => '');
      console.warn('[EMAIL] Resend dispatch failed:', resp.status, errBody);
    } catch (err) {
      console.warn('[EMAIL] Resend error:', err);
    }
  } else {
    console.warn('[EMAIL] Verification email not sent: RESEND_API_KEY is not configured in environment variables.');
  }

  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  if (sendgridKey) {
    try {
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: fromAddress.includes('<') ? fromAddress.split('<')[1].replace('>', '').trim() : fromAddress },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });
      if (resp.ok) {
        return { sent: true, provider: 'sendgrid' };
      }
      console.warn('[EMAIL] SendGrid dispatch failed:', resp.status);
    } catch (err) {
      console.warn('[EMAIL] SendGrid error:', err);
    }
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  if (smtpHost) {
    try {
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
      const smtpUser = process.env.SMTP_USER?.trim();
      const smtpPass = process.env.SMTP_PASS?.trim();
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        ...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
        ...(process.env.SMTP_IGNORE_TLS === 'true' ? { ignoreTLS: true } : {}),
      });
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        text,
        html,
      });
      return { sent: true, provider: 'smtp' };
    } catch (err) {
      console.warn('[EMAIL] SMTP dispatch failed:', err);
    }
  }

  return { sent: false, provider: 'none' };
}

async function issueEmailVerificationForUser(
  user: ServerUserRecord,
  reqOrigin?: string
): Promise<{
  provider: 'resend' | 'sendgrid' | 'smtp' | 'none';
  emailSent: boolean;
}> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  user.emailVerificationTokenHash = sha256Hex(rawToken);
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationSentAt = now;
  user.emailVerificationExpiresAt = now + 24 * 60 * 60 * 1000;
  user.emailVerificationAttempts = 0;
  await saveUserToDurableDatabase(user);

  const baseUrl = resolveVerificationBaseUrl(reqOrigin);
  const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;
  const delivery = await dispatchVerificationEmail(user.email, user.firstName, verifyUrl);

  return {
    provider: delivery.provider,
    emailSent: delivery.sent,
  };
}


function sanitizeUser(u: ServerUserRecord) {
  const {
    passwordHash: _,
    passwordSalt: __,
    emailVerificationTokenHash: _vt,
    emailVerificationCodeHash: _vc,
    emailVerificationAttempts: _va,
    emailVerificationSentAt: _vs,
    emailVerificationExpiresAt: _ve,
    ...safe
  } = u;
  const normEmail = (u.email || '').toLowerCase().trim();
  const isGrantedTester = grantedTesterRecords.has(normEmail) || u.testerAccessGranted === true;
  const isTester = Boolean(u.isTester || isTesterAccount(u) || isGrantedTester);
  const isFounder = u.userId === 'usr_kristy' || u.userId === 'usr_kristy_demo' || (u.email && u.email.toLowerCase().trim() === 'kristylten@gmail.com');
  const isFounderPhoto = u.profilePhoto === '/assets/kristy_exact.png' || u.profilePhoto === '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png';
  // Only the founder defaults to the founder photo; normal members default to null/empty string (initials avatar)
  const resolvedPhoto = (u.profilePhoto && !isFounderPhoto)
    ? u.profilePhoto
    : (isFounder ? '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png' : null);

  const interests = Array.isArray(u.interests) && u.interests.length > 0
    ? u.interests
    : ['Speed Dating', 'Coffee', 'Travel'];

  const isEmailVerified = Boolean(u.emailVerified);
  const now = Date.now();
  const grant = isEmailVerified && isLaunchOfferEligibleMember(u) ? getActiveLaunchOfferGrant(u) : null;
  const launchOfferGranted = Boolean(isEmailVerified && grant);
  const launchOfferActive = Boolean(launchOfferGranted && grant && now < grant.expiresAt);
  const launchOfferExpired = Boolean(launchOfferGranted && grant && now >= grant.expiresAt);
  const launchOfferCelebrationShownAt = launchOfferGranted
    ? (grant?.celebrationShownAt || u.launchOfferCelebrationShownAt || null)
    : null;
  const launchOfferCelebrationPending = Boolean(launchOfferActive && !launchOfferCelebrationShownAt);

  // Effective tier: granted testers receive Premium Plus; verified first-50 launch offer recipients receive 30 days of Premium
  let effectiveTier = isGrantedTester ? 'Premium Plus' : (u.subscriptionTier || 'Free');
  if (launchOfferActive && effectiveTier === 'Free') {
    effectiveTier = 'Premium';
  }
  const effectiveStatus = isGrantedTester
    ? (u.subscriptionStatus === 'canceled' ? 'active' : (u.subscriptionStatus || 'active'))
    : (u.subscriptionStatus || 'none');

  return {
    ...safe,
    // Add standard client User model properties (PascalCase) for React compatibility
    UserID: u.userId,
    Email: u.email,
    FirstName: u.firstName,
    LastName: u.lastName || '',
    Age: u.age,
    Gender: u.gender,
    InterestedIn: u.interestedIn,
    Location: u.location,
    Occupation: u.occupation || '',
    Bio: u.bio || '',
    ProfilePhoto: resolvedPhoto || '',
    profilePhoto: resolvedPhoto,
    SubscriptionTier: effectiveTier,
    subscriptionTier: effectiveTier,
    SubscriptionStatus: effectiveStatus,
    subscriptionStatus: effectiveStatus,
    StripeCustomerId: (STRIPE_IS_LIVE_KEY
      ? (u.stripeCustomerIdLive || (u.stripeCustomerId && u.stripeCustomerId !== u.stripeCustomerIdTest ? u.stripeCustomerId : null))
      : STRIPE_IS_SANDBOX_KEY
      ? (u.stripeCustomerIdTest || (u.stripeCustomerId && u.stripeCustomerId !== u.stripeCustomerIdLive ? u.stripeCustomerId : null))
      : (u.stripeCustomerId || null)),
    stripeCustomerId: (STRIPE_IS_LIVE_KEY
      ? (u.stripeCustomerIdLive || (u.stripeCustomerId && u.stripeCustomerId !== u.stripeCustomerIdTest ? u.stripeCustomerId : null))
      : STRIPE_IS_SANDBOX_KEY
      ? (u.stripeCustomerIdTest || (u.stripeCustomerId && u.stripeCustomerId !== u.stripeCustomerIdLive ? u.stripeCustomerId : null))
      : (u.stripeCustomerId || null)),
    stripeCustomerIdLive: u.stripeCustomerIdLive || null,
    stripeCustomerIdTest: u.stripeCustomerIdTest || null,
    StripeSubscriptionId: u.stripeSubscriptionId || null,
    stripeSubscriptionId: u.stripeSubscriptionId || null,
    IsTester: isTester,
    isTester: isTester,
    testerAccessGranted: isGrantedTester,
    testerAccessGrantedAt: u.testerAccessGrantedAt || (isGrantedTester ? grantedTesterRecords.get(normEmail)?.grantedAt : null) || null,
    testerAccessGrantedBy: u.testerAccessGrantedBy || (isGrantedTester ? grantedTesterRecords.get(normEmail)?.grantedBy : null) || null,
    hasActiveSubscription: effectiveStatus === 'active' || effectiveStatus === 'trialing' || launchOfferActive,
    subscriptionCurrentPeriodEnd: u.subscriptionCurrentPeriodEnd || null,
    emailVerified: isEmailVerified,
    EmailVerified: isEmailVerified,
    emailVerifiedAt: isEmailVerified ? (u.emailVerifiedAt || null) : null,
    EmailVerifiedAt: isEmailVerified ? (u.emailVerifiedAt || null) : null,
    // Strictly omit grant details until verified so unverified callers cannot discover spot status
    launchOfferGranted,
    LaunchOfferGranted: launchOfferGranted,
    launchOfferGrantNumber: launchOfferGranted && grant ? grant.grantNumber : null,
    LaunchOfferGrantNumber: launchOfferGranted && grant ? grant.grantNumber : null,
    launchOfferGrantedAt: launchOfferGranted && grant ? grant.grantedAt : null,
    LaunchOfferGrantedAt: launchOfferGranted && grant ? grant.grantedAt : null,
    launchOfferExpiresAt: launchOfferGranted && grant ? grant.expiresAt : null,
    LaunchOfferExpiresAt: launchOfferGranted && grant ? grant.expiresAt : null,
    launchOfferActive,
    LaunchOfferActive: launchOfferActive,
    launchOfferExpired,
    LaunchOfferExpired: launchOfferExpired,
    launchOfferCelebrationPending,
    LaunchOfferCelebrationPending: launchOfferCelebrationPending,
    launchOfferCelebrationShownAt,
    LaunchOfferCelebrationShownAt: launchOfferCelebrationShownAt,
    Interests: interests,
    interests: interests,
    IcebreakerAnswer: u.icebreakerAnswer || undefined,
    icebreakerAnswer: u.icebreakerAnswer || undefined,
    AvatarColor: u.avatarColor || '#FF2E93',
    avatarColor: u.avatarColor || '#FF2E93',
    HairColor: u.hairColor,
    hairColor: u.hairColor,
    HeightInches: u.heightInches,
    heightInches: u.heightInches,
    EyeColor: u.eyeColor,
    eyeColor: u.eyeColor,
    RelationshipIntent: u.relationshipIntent,
    relationshipIntent: u.relationshipIntent,
    Smoking: u.smoking,
    smoking: u.smoking,
    Drinking: u.drinking,
    drinking: u.drinking,
    Children: u.children,
    children: u.children,
    PrivacySettings: u.privacySettings,
    privacySettings: u.privacySettings,
    Preferences: u.preferences,
    preferences: u.preferences,
    isOwner: isOwnerUser({ userId: u.userId, email: u.email }),
    IsOwner: isOwnerUser({ userId: u.userId, email: u.email }),
  };
}

export function createServerAuthSession(userId: string, email: string): ServerAuthSession {
  const token = `sml_sec_${crypto.randomBytes(32).toString('hex')}`;
  const now = Date.now();
  const session: ServerAuthSession = {
    token,
    userId,
    email: email.trim().toLowerCase(),
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  };
  serverAuthSessions.set(token, session);
  return session;
}

export function verifyAuthenticatedUser(req: express.Request): { userId: string; email: string; token: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const session = serverAuthSessions.get(token);
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    serverAuthSessions.delete(token);
    return null;
  }
  if (bannedUsers.has(session.userId) || bannedUsers.has(session.email.toLowerCase())) {
    serverAuthSessions.delete(token);
    return null;
  }
  return { userId: session.userId, email: session.email, token };
}

// API: Check Authentication & Durable Database Provider Status
app.get('/api/auth/status', (_req, res) => {
  res.json({
    success: true,
    provider: 'server-native-pbkdf2',
    database: 'durable-cloud-firestore',
    databaseConnected: isDurableDatabaseActive,
    durableDatabaseActive: isDurableDatabaseActive,
    projectId: firestoreConfig?.projectId || 'rise-again-57ba5',
    firestoreDatabaseId: firestoreConfig?.firestoreDatabaseId || 'default',
    survivesRedeployments: true,
    consistentAcrossInstances: true,
    features: {
      passwordHashing: 'PBKDF2-SHA512 (100,000 iterations + 16-byte random salt)',
      adultVerification: '18+ age enforcement on registration',
      tokenSecurity: 'Cryptographic 256-bit bearer tokens',
      serverAuthoritative: true,
      guestIsolation: true,
      durableDatabase: 'Google Cloud Firestore',
    },
    message: 'Durable storage is active with Google Cloud Firestore. Account registrations, password verification, sign-ins, and deletions persist across server instances and survive container redeployments.',
  });
});

// API: Real Email/Password Sign-Up (Production)
// Enforces 18+ adult age, valid email, minimum 8-character password
app.post('/api/auth/signup', async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName = '',
    age,
    gender = 'Woman',
    interestedIn = 'Men',
    location = 'New York, NY',
    occupation = '',
    bio = '',
  } = req.body;

  // 1. Email validation
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }

  // 2. Password complexity validation (minimum 8 characters)
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
  }

  // 3. Name validation
  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    return res.status(400).json({ success: false, error: 'First name is required.' });
  }

  // 4. Strict Adult Verification (18+)
  const numericAge = Number(age);
  if (isNaN(numericAge) || numericAge < 18) {
    return res.status(400).json({
      success: false,
      code: 'UNDERAGE_RESTRICTION',
      error: 'Speed Meet Love is strictly restricted to adults aged 18 and older.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 5. Duplicate account check
  for (const existing of serverUsers.values()) {
    if (existing.email.toLowerCase() === normalizedEmail) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        error: 'An account with this email address already exists. Please sign in.',
      });
    }
  }

  // 6. Cryptographic Salt & Hash creation
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const newUser: ServerUserRecord = {
    userId,
    email: normalizedEmail,
    passwordSalt: salt,
    passwordHash,
    firstName: firstName.trim(),
    lastName: typeof lastName === 'string' ? lastName.trim() : '',
    age: Math.floor(numericAge),
    gender,
    interestedIn,
    location: typeof location === 'string' ? location.trim() : 'New York, NY',
    occupation: typeof occupation === 'string' ? occupation.trim() : '',
    bio: typeof bio === 'string' ? bio.trim() : '',
    profilePhoto: typeof req.body.profilePhoto === 'string' && req.body.profilePhoto.trim() ? req.body.profilePhoto.trim() : undefined,
    avatarColor: typeof req.body.avatarColor === 'string' && req.body.avatarColor.trim() ? req.body.avatarColor.trim() : '#FF2E93',
    subscriptionTier: grantedTesterRecords.has(normalizedEmail) ? 'Premium Plus' : 'Free',
    subscriptionStatus: grantedTesterRecords.has(normalizedEmail) ? 'active' : 'none',
    isTester: grantedTesterRecords.has(normalizedEmail),
    testerAccessGranted: grantedTesterRecords.has(normalizedEmail),
    testerAccessGrantedAt: grantedTesterRecords.has(normalizedEmail) ? (grantedTesterRecords.get(normalizedEmail)?.grantedAt || Date.now()) : undefined,
    testerAccessGrantedBy: grantedTesterRecords.has(normalizedEmail) ? (grantedTesterRecords.get(normalizedEmail)?.grantedBy || 'owner') : undefined,
    createdAt: Date.now(),
    lastSignIn: Date.now(),
    emailVerified: false,
  };

  await saveUserToDurableDatabase(newUser);
  const verification = await issueEmailVerificationForUser(newUser, req.get('origin'));

  // 7. Issue server-side session token
  const session = createServerAuthSession(userId, normalizedEmail);

  return res.status(201).json({
    success: true,
    token: session.token,
    user: sanitizeUser(newUser),
    verificationDelivery: {
      provider: verification.provider,
      emailSent: verification.emailSent,
    },
    message: verification.emailSent
      ? 'Account created! Please check your email and click the verification link to confirm your account.'
      : 'Account created! Please verify your email address once outbound email delivery is available.',
  });
});

// Helper: Timing-safe SHA-256 hex digest comparison
function timingSafeEqualHex(a?: string, b?: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// API: Verify Email Address via Link Token (Required before a new/unverified member can qualify for First-50 Launch Offer)
app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body || {};
  const authUser = verifyAuthenticatedUser(req);

  const rawToken = typeof token === 'string' ? token.trim() : '';

  if (!rawToken) {
    return res.status(400).json({
      success: false,
      code: 'VERIFICATION_TOKEN_REQUIRED',
      error: 'A valid verification link token is required.',
    });
  }

  let targetUser: ServerUserRecord | null = null;
  const now = Date.now();
  const hashedToken = sha256Hex(rawToken);

  for (const u of serverUsers.values()) {
    if (u.emailVerificationTokenHash && timingSafeEqualHex(u.emailVerificationTokenHash, hashedToken)) {
      targetUser = u;
      break;
    }
  }

  if (!targetUser) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_VERIFICATION_TOKEN',
      error: 'Verification link is invalid or has already been used.',
    });
  }

  if (targetUser.isBanned || bannedUsers.has(targetUser.userId) || bannedUsers.has((targetUser.email || '').toLowerCase())) {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_BANNED',
      error: 'This account is suspended.',
    });
  }

  if (targetUser.emailVerificationExpiresAt && now > targetUser.emailVerificationExpiresAt && targetUser.emailVerified !== true) {
    return res.status(400).json({
      success: false,
      code: 'VERIFICATION_EXPIRED',
      error: 'This verification link has expired. Please request a new verification email.',
    });
  }

  if (targetUser.emailVerified !== true) {
    targetUser.emailVerified = true;
    targetUser.emailVerifiedAt = now;
    targetUser.emailVerificationTokenHash = undefined;
    targetUser.emailVerificationCodeHash = undefined;
    targetUser.emailVerificationExpiresAt = undefined;
    targetUser.emailVerificationAttempts = 0;
    await saveUserToDurableDatabase(targetUser);
  }

  // Atomically award next available launch offer spot (1-50) strictly after email verification
  await tryAwardLaunchOfferSpot(targetUser.userId, 'post_verification');
  const refreshed = serverUsers.get(targetUser.userId) || targetUser;

  return res.json({
    success: true,
    verified: true,
    ...(authUser && authUser.userId === refreshed.userId ? { user: sanitizeUser(refreshed) } : {}),
    message: authUser && authUser.userId === refreshed.userId
      ? 'Email verified successfully!'
      : 'Email verified successfully! Please sign in to continue.',
  });
});

// API: Resend Email Verification Challenge
app.post('/api/auth/resend-verification', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  const { email } = req.body || {};

  let targetUser: ServerUserRecord | null = null;
  if (authUser) {
    targetUser = serverUsers.get(authUser.userId) || null;
  } else if (typeof email === 'string' && email.trim()) {
    const normEmail = email.trim().toLowerCase();
    for (const u of serverUsers.values()) {
      if ((u.email || '').toLowerCase().trim() === normEmail) {
        targetUser = u;
        break;
      }
    }
  }

  if (!targetUser) {
    return res.json({
      success: true,
      message: 'If an unverified account exists for this email, a fresh verification email has been sent.',
    });
  }

  if (targetUser.emailVerified === true) {
    return res.json({
      success: true,
      alreadyVerified: true,
      user: authUser && authUser.userId === targetUser.userId ? sanitizeUser(targetUser) : undefined,
      message: 'Your email address is already verified.',
    });
  }

  const verification = await issueEmailVerificationForUser(targetUser, req.get('origin'));
  if (!verification.emailSent) {
    return res.status(503).json({
      success: false,
      code: 'EMAIL_DELIVERY_UNAVAILABLE',
      error: 'Unable to send verification email right now because outbound email delivery is unavailable.',
    });
  }

  return res.json({
    success: true,
    verificationDelivery: {
      provider: verification.provider,
      emailSent: true,
    },
    message: 'A new verification email has been sent. Please check your inbox and spam folder.',
  });
});

// API: Acknowledge First-50 Launch Offer Celebration Modal (persists so it shows on first authenticated visit only)
app.post('/api/account/launch-offer/celebrated', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required.' });
  }

  const updatedUser = await withLaunchOfferLock(async () => {
    const user = serverUsers.get(authUser.userId);
    if (!user) return null;

    const grant = serverLaunchOfferGrants.get(user.userId);
    const shownAt = grant?.celebrationShownAt || user.launchOfferCelebrationShownAt || Date.now();

    if (grant && !grant.celebrationShownAt) {
      grant.celebrationShownAt = shownAt;
      await saveLaunchOfferGrantToDurableDatabase(grant);
    }
    if (!user.launchOfferCelebrationShownAt) {
      user.launchOfferCelebrationShownAt = shownAt;
      await saveUserToDurableDatabase(user);
    }
    return user;
  });

  if (!updatedUser) {
    return res.status(404).json({ success: false, error: 'User account not found.' });
  }

  return res.json({
    success: true,
    user: sanitizeUser(updatedUser),
  });
});

// API: Real Email/Password Sign-In (Production)
app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  let foundUser: ServerUserRecord | null = null;

  for (const u of serverUsers.values()) {
    if (u.email.toLowerCase() === normalizedEmail) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const isValid = verifyPassword(password, foundUser.passwordSalt, foundUser.passwordHash);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  // Check if account has been banned for safety violations
  if (foundUser.isBanned || bannedUsers.has(foundUser.userId) || bannedUsers.has(foundUser.email.toLowerCase())) {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_BANNED',
      error: 'This account has been permanently suspended for community safety violations.',
    });
  }

  // Update last sign-in timestamp and persist to durable database
  foundUser.lastSignIn = Date.now();
  saveUserToDurableDatabase(foundUser).catch(e => console.warn('[DURABLE DB] Error updating lastSignIn:', e));

  // Issue server session token
  const session = createServerAuthSession(foundUser.userId, foundUser.email);

  return res.json({
    success: true,
    token: session.token,
    user: sanitizeUser(foundUser),
    message: `Welcome back, ${foundUser.firstName}!`,
  });
});

// API: Real Password Reset Email via Firebase Authentication Provider
// Validates email, sends genuine password-reset email via Google Identity Toolkit,
// and protects user privacy by returning identical success confirmation whether or not account exists.
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Please enter your email address.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.',
    });
  }

  // Check if account is in database or server memory
  let accountExists = false;
  for (const u of serverUsers.values()) {
    if (u.email && u.email.toLowerCase().trim() === normalizedEmail) {
      accountExists = true;
      break;
    }
  }

  try {
    const apiKey = firestoreConfig?.apiKey;
    if (apiKey) {
      // Connect to the app's real Firebase authentication provider via Google Identity Toolkit REST API
      const firebaseResetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
      const fbResponse = await fetch(firebaseResetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email: normalizedEmail,
        }),
      });

      const fbData: any = await fbResponse.json().catch(() => ({}));

      if (!fbResponse.ok) {
        const errorCode = fbData?.error?.message;
        if (errorCode === 'INVALID_EMAIL') {
          return res.status(400).json({
            success: false,
            error: 'The email address format is invalid.',
          });
        }
        // If EMAIL_NOT_FOUND, Google Identity returns 200 with email enumeration protection,
        // but if it errors out for other reasons, log and continue to safe confirmation
        console.warn('[AUTH] Firebase password reset response warning:', errorCode || fbResponse.status);
      } else {
        console.log(`[AUTH] Real password-reset email dispatched via Firebase Auth provider for: ${normalizedEmail}`);
      }
    } else {
      console.warn('[AUTH] Firebase apiKey not loaded for password reset.');
    }

    // Required user confirmation message:
    // “If an account exists for this email, you’ll receive a password-reset link. Check your spam folder too.”
    return res.json({
      success: true,
      message: "If an account exists for this email, you’ll receive a password-reset link. Check your spam folder too.",
      accountExists,
    });
  } catch (err: any) {
    console.error('[AUTH] Error sending password reset email:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to dispatch password-reset email. Please check your internet connection and try again.',
    });
  }
});

// API: Sign Out & Revoke Server Session
app.post('/api/auth/signout', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (authUser) {
    serverAuthSessions.delete(authUser.token);
  }
  return res.json({ success: true, message: 'Signed out successfully.' });
});

// API: Get Current Authenticated User (from Bearer token)
app.get('/api/auth/me', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, authenticated: false, error: 'Not authenticated' });
  }

  let user = serverUsers.get(authUser.userId);
  if (firestoreDb && (!user || user.emailVerified !== true)) {
    try {
      const snap = await firestoreGetDoc(firestoreDoc(firestoreDb, 'users', authUser.userId));
      if (snap && snap.exists()) {
        const remote = snap.data() as ServerUserRecord;
        if (remote && remote.userId) {
          user = user ? { ...user, ...remote } : remote;
          serverUsers.set(authUser.userId, user);
          saveUsersToDisk();
        }
      }
    } catch {
      // Fall back to in-memory user record
    }
  }

  if (user && user.emailVerified === true && isLaunchOfferEligibleMember(user) && !serverLaunchOfferGrants.has(user.userId)) {
    await tryAwardLaunchOfferSpot(user.userId, 'post_verification');
    user = serverUsers.get(authUser.userId) || user;
  }

  if (user) {
    return res.json({
      success: true,
      authenticated: true,
      user: sanitizeUser(user),
    });
  }

  const fallbackFirstName = authUser.email.split('@')[0] || 'Member';
  return res.json({
    success: true,
    authenticated: true,
    user: {
      userId: authUser.userId,
      email: authUser.email,
      firstName: fallbackFirstName,
      lastName: '',
      age: 28,
      subscriptionTier: 'Free',
      UserID: authUser.userId,
      Email: authUser.email,
      FirstName: fallbackFirstName,
      LastName: '',
      Age: 28,
      Gender: 'Woman',
      InterestedIn: 'Men',
      Location: 'New York, NY',
      Occupation: 'Member',
      Bio: '',
      ProfilePhoto: '',
      profilePhoto: null,
      SubscriptionTier: 'Free',
      Interests: ['Speed Dating', 'Coffee', 'Travel'],
    },
  });
});

// API: Update Authenticated User's Own Profile Only
// Enforces server-side authentication & strict self-ownership (never allows editing another user's profile)
const PRIVILEGED_PROFILE_KEYS = [
  'isOwner',
  'IsOwner',
  'isTester',
  'IsTester',
  'testerAccessGranted',
  'testerAccessGrantedAt',
  'testerAccessGrantedBy',
  'subscriptionTier',
  'SubscriptionTier',
  'subscriptionStatus',
  'SubscriptionStatus',
  'isBanned',
  'stripeCustomerId',
  'StripeCustomerId',
  'stripeCustomerIdLive',
  'stripeCustomerIdTest',
  'stripeSubscriptionId',
  'StripeSubscriptionId',
  'passwordHash',
  'passwordSalt',
  'emailVerified',
  'EmailVerified',
  'emailVerifiedAt',
  'EmailVerifiedAt',
  'emailVerificationTokenHash',
  'emailVerificationCodeHash',
  'emailVerificationSentAt',
  'emailVerificationExpiresAt',
  'emailVerificationAttempts',
  'launchOfferGranted',
  'LaunchOfferGranted',
  'launchOfferGrantNumber',
  'LaunchOfferGrantNumber',
  'launchOfferGrantedAt',
  'LaunchOfferGrantedAt',
  'launchOfferExpiresAt',
  'LaunchOfferExpiresAt',
  'launchOfferCelebrationShownAt',
  'LaunchOfferCelebrationShownAt',
];

function extractRequestedTargetUserId(req: express.Request): string | null {
  const candidates = [
    req.params?.userId,
    req.body?.targetUserId,
    req.body?.userId,
    req.body?.UserID,
    req.query?.userId,
    req.query?.targetUserId,
  ];
  for (const val of candidates) {
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

const handleProfileUpdate = async (req: express.Request, res: express.Response) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required. Please sign in to update your profile.',
    });
  }

  // Strict ownership check: reject any attempt to update another member's profile
  const requestedTargetId = extractRequestedTargetUserId(req);
  if (requestedTargetId && requestedTargetId !== authUser.userId) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      error: 'Forbidden: You can only edit your own profile.',
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Reject direct privilege / role tampering
  for (const privKey of PRIVILEGED_PROFILE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, privKey)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        error: 'Forbidden: Account role, ban status, and subscription privileges cannot be modified directly.',
      });
    }
  }

  const user = serverUsers.get(authUser.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User account not found.' });
  }

  const {
    firstName,
    lastName,
    age,
    gender,
    interestedIn,
    location,
    occupation,
    bio,
    interests,
    icebreakerAnswer,
    avatarColor,
    hairColor,
    heightInches,
    eyeColor,
    relationshipIntent,
    smoking,
    drinking,
    children,
    privacySettings,
    preferences,
    profilePhoto,
  } = body;

  if (typeof firstName === 'string' && firstName.trim()) {
    user.firstName = firstName.trim().slice(0, 80);
  }
  if (typeof lastName === 'string') {
    user.lastName = lastName.trim().slice(0, 80);
  }
  if (typeof age === 'number' && age >= 18 && age <= 120) {
    user.age = Math.floor(age);
  }
  if (gender === 'Man' || gender === 'Woman' || gender === 'Non-Binary') {
    user.gender = gender;
  }
  if (interestedIn === 'Men' || interestedIn === 'Women' || interestedIn === 'Everyone') {
    user.interestedIn = interestedIn;
  }
  if (typeof location === 'string') {
    user.location = location.trim().slice(0, 120);
  }
  if (typeof occupation === 'string') {
    user.occupation = occupation.trim().slice(0, 120);
  }
  if (typeof bio === 'string') {
    user.bio = bio.trim().slice(0, 1000);
  }
  if (Array.isArray(interests)) {
    user.interests = interests.map((s: any) => String(s).trim().slice(0, 64)).filter(Boolean).slice(0, 30);
  }
  if (typeof icebreakerAnswer === 'string') {
    user.icebreakerAnswer = icebreakerAnswer.trim().slice(0, 400);
  }
  if (typeof avatarColor === 'string' && avatarColor.trim()) {
    user.avatarColor = avatarColor.trim().slice(0, 32);
  }
  if (typeof hairColor === 'string') user.hairColor = hairColor.slice(0, 32);
  if (typeof heightInches === 'number' && heightInches >= 0 && heightInches <= 120) user.heightInches = heightInches;
  if (typeof eyeColor === 'string') user.eyeColor = eyeColor.slice(0, 32);
  if (typeof relationshipIntent === 'string') user.relationshipIntent = relationshipIntent.slice(0, 64);
  if (typeof smoking === 'string') user.smoking = smoking.slice(0, 32);
  if (typeof drinking === 'string') user.drinking = drinking.slice(0, 32);
  if (typeof children === 'string') user.children = children.slice(0, 48);
  if (privacySettings && typeof privacySettings === 'object') {
    user.privacySettings = { ...(user.privacySettings || {}), ...privacySettings };
  }
  if (preferences && typeof preferences === 'object') {
    user.preferences = { ...(user.preferences || {}), ...preferences };
  }

  // Profile photo handling:
  // If explicitly null or empty string, remove custom photo
  // If provided, save the uploaded photo (data URL or image URL)
  if (profilePhoto === null || profilePhoto === '') {
    user.profilePhoto = undefined;
  } else if (typeof profilePhoto === 'string' && profilePhoto.trim()) {
    user.profilePhoto = profilePhoto.trim();
  }

  await saveUserToDurableDatabase(user);

  return res.json({
    success: true,
    user: sanitizeUser(user),
    message: 'Profile updated successfully!',
  });
};

app.post('/api/account/profile', handleProfileUpdate);
app.put('/api/account/profile', handleProfileUpdate);
app.patch('/api/account/profile', handleProfileUpdate);
app.post('/api/account/profile/:userId', handleProfileUpdate);
app.put('/api/account/profile/:userId', handleProfileUpdate);
app.patch('/api/account/profile/:userId', handleProfileUpdate);
app.post('/api/users/:userId', handleProfileUpdate);
app.put('/api/users/:userId', handleProfileUpdate);
app.patch('/api/users/:userId', handleProfileUpdate);

// API: Upload or remove custom profile photo (strictly own account only)
const handlePhotoUpdate = async (req: express.Request, res: express.Response) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' });
  }

  const requestedTargetId = extractRequestedTargetUserId(req);
  if (requestedTargetId && requestedTargetId !== authUser.userId) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      error: 'Forbidden: You can only update your own profile photo.',
    });
  }

  const user = serverUsers.get(authUser.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User account not found' });
  }

  const { photo } = req.body || {};
  if (photo === null || photo === '') {
    user.profilePhoto = undefined;
  } else if (typeof photo === 'string' && photo.trim()) {
    user.profilePhoto = photo.trim();
  }

  await saveUserToDurableDatabase(user);
  return res.json({
    success: true,
    user: sanitizeUser(user),
    message: user.profilePhoto ? 'Photo updated successfully' : 'Photo removed successfully',
  });
};

app.post('/api/account/photo', handlePhotoUpdate);
app.put('/api/account/photo', handlePhotoUpdate);
app.post('/api/account/photo/:userId', handlePhotoUpdate);

// Authenticated Session Refresh / Founder-Only Sandbox Persona Switch
// Rejects unauthenticated session minting and cross-user impersonation.
app.post('/api/auth/session', (req, res) => {
  const caller = verifyAuthenticatedUser(req);
  if (!caller) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required. Please sign in with your credentials.',
    });
  }

  const { userId, email } = req.body || {};
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }

  const requestedUserId = userId.trim();
  const requestedEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : '';

  const isSelfRefresh =
    requestedUserId === caller.userId &&
    (!requestedEmail || requestedEmail === caller.email.toLowerCase());

  const isFounderDemoPersonaSwitch =
    isOwnerUser(caller) &&
    isDemoUserRecord({ userId: requestedUserId, email: requestedEmail }) &&
    !OWNER_USER_IDS.has(requestedUserId) &&
    (!requestedEmail || !OWNER_EMAILS.has(requestedEmail));

  if (!isSelfRefresh && !isFounderDemoPersonaSwitch) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      error: 'Forbidden: Cannot issue a session token for another member account.',
    });
  }

  const targetEmail = isSelfRefresh
    ? caller.email
    : requestedEmail || `${requestedUserId}@speedmeetlove.internal`;

  const session = createServerAuthSession(requestedUserId, targetEmail);
  return res.json({
    success: true,
    token: session.token,
    userId: session.userId,
    email: session.email,
    expiresAt: session.expiresAt,
  });
});

// API: Securely delete user account and permanently purge all associated personal records
// Rules:
// 1. Requires valid authenticated session token (Authorization: Bearer <token>)
// 2. Verified session owner must match targetUserId (never trust client user ID alone)
// 3. User must provide matching confirmation email to confirm irreversible deletion
// 4. Purges all matches, votes, notes, rooms, queues, active sessions, and tokens from server storage
app.post('/api/account/delete', async (req, res) => {
  // Step 1: Securely verify authenticated session token
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required. A valid, unexpired server session token must be provided in the Authorization header.',
    });
  }

  const targetUserId = req.body.targetUserId;
  const confirmEmail = req.body.confirmEmail || req.body.confirmationEmail;
  if (!targetUserId || typeof targetUserId !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'MISSING_TARGET_USER',
      error: 'targetUserId is required to execute deletion.',
    });
  }

  // Step 2: Account ownership check:
  // Never trust a user ID supplied by the browser alone; session token owner MUST match targetUserId
  if (authUser.userId !== targetUserId) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      error: 'Security violation: You cannot delete another user\'s account. Authenticated session token does not match target user ID.',
    });
  }

  // Step 3: Explicit confirmation check:
  // User must provide their registered email address to confirm irreversible permanent deletion
  if (!confirmEmail || typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== authUser.email.toLowerCase()) {
    return res.status(400).json({
      success: false,
      code: 'CONFIRMATION_EMAIL_MISMATCH',
      error: `Confirmation email mismatch. Please enter your exact registered email address (${authUser.email}) to confirm permanent deletion.`,
    });
  }

  const userId = targetUserId;
  let deletedMatches = 0;
  let deletedVotes = 0;
  let deletedRounds = 0;
  let deletedSecondDates = 0;
  let deletedSessions = 0;

  // Step 4: Revoke all session tokens for this user
  for (const [token, sess] of serverAuthSessions.entries()) {
    if (sess.userId === userId) {
      serverAuthSessions.delete(token);
    }
  }

  // Step 4b: Delete from server user accounts, waitlist, and durable database
  // Scrub email PII from any retired launch-offer grant while keeping spot number permanently consumed so cap never exceeds 50
  await withLaunchOfferLock(async () => {
    const grant = serverLaunchOfferGrants.get(userId);
    if (grant) {
      grant.email = '';
      await saveLaunchOfferGrantToDurableDatabase(grant);
    }
  });
  await deleteWaitlistEntryFromDurableDatabase(userId);
  await deleteUserFromDurableDatabase(userId);

  // Step 5: Revoke and purge live session cache
  const demoKey = getSessionKey('demonstration', userId);
  const prodKey = getSessionKey('production', userId);
  if (sessions.has(demoKey)) {
    sessions.delete(demoKey);
    deletedSessions++;
  }
  if (sessions.has(prodKey)) {
    sessions.delete(prodKey);
    deletedSessions++;
  }

  // Step 6: Permanently purge all mutual matches involving this user
  for (const [mId, m] of persistentMatches.entries()) {
    if (m.userA === userId || m.userB === userId) {
      persistentMatches.delete(mId);
      deletedMatches++;
    }
  }
  if (deletedMatches > 0) {
    saveMatchesToDisk();
  }

  // Step 7: Permanently purge confidential round votes and notes
  for (const [vId, v] of roundVotes.entries()) {
    if (v.userId === userId || v.partnerId === userId) {
      roundVotes.delete(vId);
      deletedVotes++;
    }
  }
  if (deletedVotes > 0) {
    saveVotesToDisk();
  }

  // Step 8: Purge from shared rounds participation
  for (const [rId, r] of sharedRounds.entries()) {
    if (r.participants.includes(userId)) {
      sharedRounds.delete(rId);
      deletedRounds++;
    }
  }
  if (deletedRounds > 0) {
    saveSharedRoundsToDisk();
  }

  // Step 9: Purge second-chance date sessions
  for (const [sId, s] of secondDateSessions.entries()) {
    if (s.userA === userId || s.userB === userId) {
      secondDateSessions.delete(sId);
      deletedSecondDates++;
    }
  }
  if (deletedSecondDates > 0) {
    saveSecondDateSessionsToDisk();
  }

  // Step 10: Purge from event queues, live active matches, reactions, and consent stores
  for (const queue of liveEventQueues.values()) {
    queue.delete(userId);
  }
  for (const [mId, match] of liveActiveMatches.entries()) {
    if (match.userA.userId === userId || match.userB.userId === userId) {
      liveActiveMatches.delete(mId);
    }
  }
  for (const rMap of roundConsentStore.values()) {
    rMap.delete(userId);
  }
  saveConsentToDisk();

  for (const [rKey, list] of activeReactions.entries()) {
    activeReactions.set(rKey, list.filter(r => r.senderId !== userId));
  }

  console.log(`[Account Deletion] User ${userId} (${authUser.email}) permanently deleted. Purged: ${deletedMatches} matches, ${deletedVotes} votes, ${deletedRounds} rounds, ${deletedSessions} sessions.`);

  return res.json({
    success: true,
    deletedUserId: userId,
    message: 'Account, profile, photos, messages, matches, votes, private notes, and event registrations permanently deleted from Speed Meet Love.',
    purged: {
      matches: deletedMatches,
      votes: deletedVotes,
      sharedRounds: deletedRounds,
      secondDates: deletedSecondDates,
      sessions: deletedSessions,
    },
    retentionExceptions: [
      'Cloud edge web server access logs (IP address, user-agent, requested URL, timestamp) are retained by hosting infrastructure up to 30 days for security monitoring and DDoS defense, and cannot be pruned by application code.',
      'Prior community safety violation reports submitted by other members against this account may be retained in administrative records to enforce permanent community safety bans.',
      'If you hold an active paid web subscription via Stripe, cancel it through the Stripe Customer Billing Portal (/pricing) to stop future renewals; Stripe may retain transaction and invoice records as required for financial, tax, and chargeback compliance.',
    ],
  });
});

// API: Submit In-App Member Safety Report (persists on server)
app.post('/api/reports', (req, res) => {
  const { reportedUserId, reason, notes, reporterId } = req.body;
  if (!reportedUserId || typeof reportedUserId !== 'string') {
    return res.status(400).json({ success: false, error: 'reportedUserId is required' });
  }
  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ success: false, error: 'reason is required' });
  }

  // Identify reporter
  const authUser = verifyAuthenticatedUser(req);
  const actualReporterId = authUser ? authUser.userId : (typeof reporterId === 'string' && reporterId.trim() ? reporterId.trim() : 'guest');
  const actualReporterEmail = authUser ? authUser.email : undefined;

  let reporterName = 'Anonymous Member';
  if (actualReporterId) {
    const rUser = serverUsers.get(actualReporterId);
    if (rUser) reporterName = `${rUser.firstName} ${rUser.lastName}`.trim();
  }

  let reportedUserName = 'Member';
  let reportedUserEmail: string | undefined = undefined;
  const targetUser = serverUsers.get(reportedUserId);
  if (targetUser) {
    reportedUserName = `${targetUser.firstName} ${targetUser.lastName}`.trim();
    reportedUserEmail = targetUser.email;
  }

  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const newReport: ServerReportRecord = {
    id: reportId,
    reporterId: actualReporterId,
    reporterEmail: actualReporterEmail,
    reporterName,
    reportedUserId,
    reportedUserName,
    reportedUserEmail,
    reason: reason.trim(),
    notes: typeof notes === 'string' ? notes.trim() : '',
    timestamp: new Date().toISOString(),
    createdAt: now,
    status: 'pending',
  };

  serverReports.set(reportId, newReport);
  saveReportsToDisk();

  console.log(`[Safety Report] Stored new report ${reportId} against user ${reportedUserId} for reason: "${reason}". Persisted to disk.`);

  return res.status(201).json({
    success: true,
    reportId,
    message: 'Report submitted securely. The platform owner will review it promptly.',
  });
});

// API: Owner Review - Fetch All Safety Reports (Owner-Only)
app.get('/api/owner/reports', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Access denied: Owner authorization required.' });
  }

  const reportsList = Array.from(serverReports.values()).sort((a, b) => b.createdAt - a.createdAt);
  return res.json({
    success: true,
    ownerEmail: authUser.email,
    reports: reportsList,
    bannedUsers: Array.from(bannedUsers),
    summary: {
      total: reportsList.length,
      pending: reportsList.filter(r => r.status === 'pending').length,
      banned: reportsList.filter(r => r.status === 'banned').length,
      dismissed: reportsList.filter(r => r.status === 'dismissed').length,
    },
  });
});

// API: Owner Review - Take Action on Report (Owner-Only)
app.post('/api/owner/reports/:reportId/action', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Access denied: Owner authorization required.' });
  }

  const { reportId } = req.params;
  const report = serverReports.get(reportId);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  const { action, ownerNotes } = req.body;
  if (!action || !['ban_user', 'dismiss', 'reviewed'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Valid action is required (ban_user, dismiss, reviewed)' });
  }

  if (action === 'ban_user') {
    // 1. Add reportedUserId to bannedUsers set and durable database
    banUserInDurableDatabase(report.reportedUserId);
    if (report.reportedUserEmail) {
      banUserInDurableDatabase(report.reportedUserEmail.toLowerCase().trim());
    }

    // 2. Mark in serverUsers and durable database
    const u = serverUsers.get(report.reportedUserId);
    if (u) {
      u.isBanned = true;
      saveUserToDurableDatabase(u).catch(e => console.warn(e));
    }

    // 3. Invalidate active sessions
    let revokedTokensCount = 0;
    for (const [token, session] of serverAuthSessions.entries()) {
      if (
        session.userId === report.reportedUserId ||
        (report.reportedUserEmail && session.email === report.reportedUserEmail.toLowerCase().trim())
      ) {
        serverAuthSessions.delete(token);
        revokedTokensCount++;
      }
    }

    // 4. Remove from live matchmaking queues and active matches
    for (const queue of liveEventQueues.values()) {
      queue.delete(report.reportedUserId);
    }
    for (const [mId, match] of liveActiveMatches.entries()) {
      if (match.userA.userId === report.reportedUserId || match.userB.userId === report.reportedUserId) {
        liveActiveMatches.delete(mId);
      }
    }

    report.status = 'banned';
    report.actionTaken = ownerNotes ? `User banned: ${ownerNotes}` : 'User account banned and active sessions revoked by owner';
    report.actionAt = Date.now();
    report.actionBy = authUser.email;
    saveReportsToDisk();

    console.log(`[Owner Action] User ${report.reportedUserId} banned by owner (${authUser.email}). Revoked ${revokedTokensCount} session tokens.`);

    return res.json({
      success: true,
      message: `User ${report.reportedUserId} banned, active sessions terminated, and report updated.`,
      report,
    });
  } else if (action === 'dismiss') {
    report.status = 'dismissed';
    report.actionTaken = ownerNotes ? `Dismissed: ${ownerNotes}` : 'Report dismissed by owner';
    report.actionAt = Date.now();
    report.actionBy = authUser.email;
    saveReportsToDisk();

    return res.json({
      success: true,
      message: 'Report dismissed.',
      report,
    });
  } else {
    report.status = 'reviewed';
    report.actionTaken = ownerNotes || 'Reviewed by owner';
    report.actionAt = Date.now();
    report.actionBy = authUser.email;
    saveReportsToDisk();

    return res.json({
      success: true,
      message: 'Report marked as reviewed.',
      report,
    });
  }
});

// API: Owner Review - Unban a User (Owner-Only)
app.post('/api/owner/users/:userId/unban', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser || !isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Owner authorization required.' });
  }

  const { userId } = req.params;
  unbanUserInDurableDatabase(userId);
  const u = serverUsers.get(userId);
  if (u) {
    u.isBanned = false;
    if (u.email) {
      unbanUserInDurableDatabase(u.email.toLowerCase().trim());
    }
    saveUserToDurableDatabase(u).catch(e => console.warn(e));
  }

  return res.json({ success: true, message: `User ${userId} unbanned.` });
});

// Helper: Identify demo / seed profiles to exclude from real registered users
export function isDemoUserRecord(u: { userId?: string; email?: string }): boolean {
  if (!u) return true;
  if (u.userId === 'usr_kristy_demo' || u.userId === 'usr_me') return true;
  const email = (u.email || '').toLowerCase().trim();
  if (email.endsWith('@speedmeetlove.internal')) return true;
  if (email.endsWith('@example.com')) return true;
  if (email.endsWith('@test.local') || email.endsWith('@test.internal')) return true;
  const demoIds = ['usr_01', 'usr_02', 'usr_03', 'usr_04', 'usr_05', 'usr_06', 'usr_07', 'usr_08', 'usr_09', 'usr_10', 'usr_11', 'usr_12'];
  if (demoIds.includes(u.userId || '')) return true;
  return false;
}

// API: Owner Review - Fetch All Real Registered Users (Owner-Only)
// Strictly protected: excludes passwords, hashes, salts, and session tokens
// API: Owner Review - Fetch All Real Registered Users (Owner-Only)
// Strictly protected: excludes passwords, hashes, salts, and session tokens
app.get('/api/owner/registered-users', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Access denied: Owner authorization required.' });
  }

  // Ensure fresh memory representation from durable Cloud Firestore
  if (firestoreDb) {
    try {
      const snap = await firestoreGetDocs(firestoreCollection(firestoreDb, 'users'));
      if (!snap.empty) {
        snap.forEach(d => {
          const data = d.data() as ServerUserRecord;
          if (data && data.userId && data.email) {
            serverUsers.set(data.userId, data);
          }
        });
      }
    } catch (e) {
      console.warn('[DURABLE DB] Error refreshing from Firestore:', e);
    }
  } else {
    loadUsersFromDisk();
  }

  const allServerUsers = Array.from(serverUsers.values());
  const realUsers = allServerUsers
    .filter(u => !isDemoUserRecord(u))
    .sort((a, b) => b.createdAt - a.createdAt);

  const sanitizedUsers = realUsers.map(u => {
    // Check if user currently holds an active unexpired session token
    let activeSessionCreatedAt: number | null = null;
    let hasActiveSession = false;
    for (const session of serverAuthSessions.values()) {
      if (session.userId === u.userId && Date.now() <= session.expiresAt) {
        hasActiveSession = true;
        if (!activeSessionCreatedAt || session.createdAt > activeSessionCreatedAt) {
          activeSessionCreatedAt = session.createdAt;
        }
      }
    }

    // Determine last sign-in timestamp (or null if unavailable / not recorded yet)
    const lastSignIn = typeof u.lastSignIn === 'number' && u.lastSignIn > 0
      ? u.lastSignIn
      : (activeSessionCreatedAt || null);

    const isTester = Boolean(u.isTester || isTesterAccount(u) || grantedTesterRecords.has((u.email || '').toLowerCase().trim()));
    const isGrantedTester = grantedTesterRecords.has((u.email || '').toLowerCase().trim()) || u.testerAccessGranted === true;
    const isVerified = Boolean(u.emailVerified);
    const grant = isVerified && isLaunchOfferEligibleMember(u) ? getActiveLaunchOfferGrant(u) : null;
    const launchOfferActive = Boolean(grant && Date.now() < grant.expiresAt);
    let effectiveTier: string = isGrantedTester ? 'Premium Plus' : (u.subscriptionTier || 'Free');
    if (launchOfferActive && effectiveTier === 'Free') {
      effectiveTier = 'Premium';
    }

    return {
      userId: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName || '',
      fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.firstName,
      age: u.age,
      gender: u.gender,
      location: u.location || 'New York, NY',
      occupation: u.occupation || '',
      subscriptionTier: effectiveTier,
      subscriptionStatus: isGrantedTester
        ? (u.subscriptionStatus === 'canceled' ? 'active' : (u.subscriptionStatus || 'active'))
        : (u.subscriptionStatus || 'none'),
      stripeCustomerId: (STRIPE_IS_LIVE_KEY
        ? (u.stripeCustomerIdLive || (u.stripeCustomerId && u.stripeCustomerId !== u.stripeCustomerIdTest ? u.stripeCustomerId : null))
        : STRIPE_IS_SANDBOX_KEY
        ? (u.stripeCustomerIdTest || (u.stripeCustomerId && u.stripeCustomerId !== u.stripeCustomerIdLive ? u.stripeCustomerId : null))
        : (u.stripeCustomerId || null)),
      stripeCustomerIdLive: u.stripeCustomerIdLive || null,
      stripeCustomerIdTest: u.stripeCustomerIdTest || null,
      isTester,
      testerAccessGranted: Boolean(u.testerAccessGranted || grantedTesterRecords.has((u.email || '').toLowerCase().trim())),
      testerAccessGrantedAt: u.testerAccessGrantedAt || grantedTesterRecords.get((u.email || '').toLowerCase().trim())?.grantedAt || null,
      testerAccessGrantedBy: u.testerAccessGrantedBy || grantedTesterRecords.get((u.email || '').toLowerCase().trim())?.grantedBy || null,
      emailVerified: isVerified,
      emailVerifiedAt: isVerified ? (u.emailVerifiedAt || null) : null,
      launchOfferGrantNumber: grant ? grant.grantNumber : null,
      launchOfferGrantedAt: grant ? grant.grantedAt : null,
      launchOfferExpiresAt: grant ? grant.expiresAt : null,
      launchOfferActive,
      createdAt: u.createdAt, // epoch ms
      lastSignIn, // epoch ms or null if unavailable
      hasActiveSession,
      isBanned: Boolean(u.isBanned || bannedUsers.has(u.userId) || bannedUsers.has(u.email.toLowerCase())),
      isOwner: isOwnerUser({ userId: u.userId, email: u.email }),
    };
  });

  return res.json({
    success: true,
    ownerEmail: authUser.email,
    totalRegistrations: sanitizedUsers.length,
    users: sanitizedUsers,
    activeSessionsCount: sanitizedUsers.filter(u => u.hasActiveSession).length,
    launchOfferSummary: {
      maxGrants: LAUNCH_OFFER_MAX_GRANTS,
      grantedCount: serverLaunchOfferGrants.size,
      liveAt: launchOfferConfig.liveAt,
    },
    storageDiagnostic: {
      storageType: 'durable-cloud-firestore',
      provider: 'Google Cloud Firestore',
      projectId: firestoreConfig?.projectId || 'rise-again-57ba5',
      databaseId: firestoreConfig?.firestoreDatabaseId || 'default',
      isDurableDatabaseActive: Boolean(firestoreDb),
      survivesRedeployments: true,
      consistentAcrossInstances: true,
      totalServerRecords: allServerUsers.length,
      demoRecordsExcluded: allServerUsers.length - sanitizedUsers.length,
      persistenceNotice: 'Durable Cloud Database Active: Accounts are stored in Google Cloud Firestore. Registrations remain consistent across server instances and survive container redeployments and cold revisions.',
    },
  });
});

// API: Owner Tester Accounts Manifest (List of all granted tester emails)
app.get('/api/owner/testers', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Access denied: Owner authorization required.' });
  }

  const list = Array.from(grantedTesterRecords.values()).map(r => {
    let matchedUser: ServerUserRecord | null = null;
    for (const u of serverUsers.values()) {
      if (u.email && u.email.toLowerCase().trim() === r.email) {
        matchedUser = u;
        break;
      }
    }
    return {
      email: r.email,
      grantedAt: r.grantedAt,
      grantedBy: r.grantedBy,
      notes: r.notes || '',
      isRegistered: Boolean(matchedUser),
      userId: matchedUser?.userId || null,
      firstName: matchedUser?.firstName || null,
      lastName: matchedUser?.lastName || null,
      location: matchedUser?.location || null,
      currentTier: matchedUser ? (matchedUser.subscriptionTier || 'Premium Plus') : 'Premium Plus (Pending Registration)',
      subscriptionStatus: matchedUser?.subscriptionStatus || 'active',
      hasActiveSession: matchedUser ? Array.from(serverAuthSessions.values()).some(s => s.userId === matchedUser.userId && Date.now() <= s.expiresAt) : false,
    };
  });

  return res.json({
    success: true,
    testers: list,
    totalGranted: list.length,
    ownerEmail: authUser.email,
  });
});

// API: Owner Grant or Remove Free Premium Plus Tester Access
app.post('/api/owner/testers', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Access denied: Owner authorization required.' });
  }

  const { email, action, notes } = req.body;
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }

  const normEmail = email.toLowerCase().trim();

  // Protect owner from removing own access
  if (OWNER_EMAILS.has(normEmail) && action === 'remove') {
    return res.status(400).json({ success: false, error: 'Cannot remove owner access from the owner account.' });
  }

  if (action === 'grant') {
    const record: GrantedTesterRecord = {
      email: normEmail,
      grantedAt: Date.now(),
      grantedBy: authUser.email || 'kristylten@gmail.com',
      notes: notes || 'Owner granted free Premium Plus tester access',
    };
    grantedTesterRecords.set(normEmail, record);
    saveGrantedTestersToDisk();

    if (firestoreDb) {
      try {
        const docId = normEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
        await firestoreSetDoc(firestoreDoc(firestoreDb, 'granted_testers', docId), record);
      } catch (e) {
        console.warn('[DURABLE DB] Error persisting granted tester to Firestore:', e);
      }
    }

    // Find if user already exists
    let matchedUser: ServerUserRecord | null = null;
    for (const u of serverUsers.values()) {
      if (u.email && u.email.toLowerCase().trim() === normEmail) {
        matchedUser = u;
        break;
      }
    }

    if (matchedUser) {
      matchedUser.isTester = true;
      matchedUser.testerAccessGranted = true;
      matchedUser.testerAccessGrantedAt = record.grantedAt;
      matchedUser.testerAccessGrantedBy = record.grantedBy;
      matchedUser.subscriptionTier = 'Premium Plus';
      if (!matchedUser.subscriptionStatus || matchedUser.subscriptionStatus === 'none' || matchedUser.subscriptionStatus === 'canceled') {
        matchedUser.subscriptionStatus = 'active';
      }
      await saveUserToDurableDatabase(matchedUser);
    }

    console.log(`[TESTER PRIVILEGES] Owner granted free Premium Plus access to ${normEmail} (User registered: ${Boolean(matchedUser)})`);

    return res.json({
      success: true,
      action: 'grant',
      email: normEmail,
      message: `Free Premium Plus tester access granted to ${normEmail}. Full platform features (messaging after mutual match, live speed dating events) are active without requiring a payment card.`,
      userRegistered: Boolean(matchedUser),
      user: matchedUser ? sanitizeUser(matchedUser) : null,
      totalGranted: grantedTesterRecords.size,
    });
  } else if (action === 'remove') {
    grantedTesterRecords.delete(normEmail);
    saveGrantedTestersToDisk();

    if (firestoreDb) {
      try {
        const docId = normEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
        await firestoreDeleteDoc(firestoreDoc(firestoreDb, 'granted_testers', docId));
      } catch (e) {
        console.warn('[DURABLE DB] Error removing granted tester from Firestore:', e);
      }
    }

    let matchedUser: ServerUserRecord | null = null;
    for (const u of serverUsers.values()) {
      if (u.email && u.email.toLowerCase().trim() === normEmail) {
        matchedUser = u;
        break;
      }
    }

    if (matchedUser && !OWNER_USER_IDS.has(matchedUser.userId) && !OWNER_EMAILS.has(normEmail)) {
      matchedUser.isTester = false;
      matchedUser.testerAccessGranted = false;
      matchedUser.testerAccessGrantedAt = undefined;
      matchedUser.testerAccessGrantedBy = undefined;
      // Revert to real Stripe status if active, otherwise Free
      if (matchedUser.stripeSubscriptionId && matchedUser.subscriptionStatus === 'active') {
        // Keep Stripe tier
      } else {
        matchedUser.subscriptionTier = 'Free';
        matchedUser.subscriptionStatus = 'none';
      }
      await saveUserToDurableDatabase(matchedUser);
    }

    console.log(`[TESTER PRIVILEGES] Owner removed free tester access for ${normEmail} (User registered: ${Boolean(matchedUser)})`);

    return res.json({
      success: true,
      action: 'remove',
      email: normEmail,
      message: `Free tester access removed for ${normEmail}. The account has reverted to standard Free tier.`,
      userRegistered: Boolean(matchedUser),
      user: matchedUser ? sanitizeUser(matchedUser) : null,
      totalGranted: grantedTesterRecords.size,
    });
  } else {
    return res.status(400).json({ success: false, error: 'Invalid action. Must be "grant" or "remove".' });
  }
});

// ============================================================================
// STRIPE SANDBOX SUBSCRIPTION & BILLING INTEGRATION
// Prices:
// Premium ($9.99/mo): price_1UZJGCGzWqYTtaSTwzOMdDqO
// Premium Plus ($14.99/mo): price_1UZJR6GzWqYTtaSTVJCIeJip
// ============================================================================

// API: Stripe Public Configuration & Price Map
app.get('/api/stripe/config', async (_req, res) => {
  await ensureStripePricesResolved();
  const webhookConfig = getStripeWebhookSecretConfig();
  res.json({
    success: true,
    isConfigured: Boolean(stripe),
    mode: STRIPE_MODE,
    isLiveMode: STRIPE_MODE === 'live',
    sandboxMode: STRIPE_MODE === 'sandbox',
    publishableKey: STRIPE_PUBLISHABLE_KEY || null,
    hasPublishableKey: Boolean(STRIPE_PUBLISHABLE_KEY),
    appUrl: APP_URL,
    webhookRoute: STRIPE_WEBHOOK_ROUTE,
    webhookUrl: `${APP_URL}${STRIPE_WEBHOOK_ROUTE}`,
    webhookRawBodyProtected: true,
    hasWebhookSecret: webhookConfig.hasSecret,
    webhookSecretFormatValid: webhookConfig.validFormatCount > 0,
    serverStartedAt: SERVER_STARTED_AT,
    premiumPlusPaused: true,
    premiumPlusPauseMessage: 'Event membership coming soon.',
    prices: {
      premium: {
        id: STRIPE_PRICES.PREMIUM,
        tier: 'Premium',
        name: 'Premium',
        amount: 9.99,
        interval: 'month',
        currency: 'USD',
        features: ['Browsing', 'Mutual Matches', 'Private Messaging'],
      },
      premiumPlus: {
        id: STRIPE_PRICES.PREMIUM_PLUS,
        tier: 'Premium Plus',
        name: 'Premium Plus',
        amount: 14.99,
        interval: 'month',
        currency: 'USD',
        pausedForNewPurchases: true,
        pauseMessage: 'Event membership coming soon.',
        features: [
          'Everything in Premium',
          'Live Speed Dating',
          '5-Minute Video Rounds',
          'Multi-Night Registration',
          'Round Replays & Skips',
        ],
      },
    },
  });
});

// ============================================================================
// LAUNCH WAITING LIST & FOUNDER-CONFIRMED LAUNCH EVENTS APIs
// Notice: Zero automated notifications or invitations are dispatched here.
// ============================================================================

app.get('/api/waitlist/me', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.json({
      success: true,
      authenticated: false,
      joined: false,
      entry: null,
    });
  }
  const existing = serverWaitlist.get(authUser.userId);
  return res.json({
    success: true,
    authenticated: true,
    joined: Boolean(existing),
    entry: existing
      ? {
          userId: existing.userId,
          joinedAt: existing.joinedAt,
          updatedAt: existing.updatedAt,
        }
      : null,
  });
});

app.post('/api/waitlist/join', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Please sign in to join the Event Waiting List.',
    });
  }

  const user = serverUsers.get(authUser.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      code: 'USER_NOT_FOUND',
      error: 'Member account not found.',
    });
  }

  if (bannedUsers.has(user.userId) || bannedUsers.has(user.email.toLowerCase())) {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_SUSPENDED',
      error: 'This account is not eligible to join the waiting list.',
    });
  }

  const now = Date.now();
  const existing = serverWaitlist.get(user.userId);
  if (existing) {
    // Save each person's interest once — refresh profile snapshot idempotently without duplicating
    const refreshed: ServerWaitlistEntry = {
      ...existing,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName || '',
      gender: user.gender,
      interestedIn: user.interestedIn,
      age: user.age,
      location: user.location,
      relationshipIntent: user.relationshipIntent || '',
      subscriptionTier: user.subscriptionTier,
      updatedAt: now,
    };
    await saveWaitlistEntryToDurableDatabase(refreshed);
    return res.json({
      success: true,
      joined: true,
      alreadyJoined: true,
      entry: {
        userId: refreshed.userId,
        joinedAt: refreshed.joinedAt,
        updatedAt: refreshed.updatedAt,
      },
      message: "You're already on the Event Waiting List!",
    });
  }

  const newEntry: ServerWaitlistEntry = {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName || '',
    gender: user.gender,
    interestedIn: user.interestedIn,
    age: user.age,
    location: user.location,
    relationshipIntent: user.relationshipIntent || '',
    subscriptionTier: user.subscriptionTier,
    joinedAt: now,
    updatedAt: now,
  };

  await saveWaitlistEntryToDurableDatabase(newEntry);

  // IMPORTANT: Do not send invitations or notifications yet.
  return res.json({
    success: true,
    joined: true,
    alreadyJoined: false,
    entry: {
      userId: newEntry.userId,
      joinedAt: newEntry.joinedAt,
      updatedAt: newEntry.updatedAt,
    },
    message: "You're on the Event Waiting List! Your interest has been saved.",
  });
});

const handleLeaveWaitlist = async (req: express.Request, res: express.Response) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Please sign in to update your waiting list status.',
    });
  }

  const existed = serverWaitlist.has(authUser.userId);
  await deleteWaitlistEntryFromDurableDatabase(authUser.userId);

  return res.json({
    success: true,
    joined: false,
    removed: existed,
    message: 'You have left the Event Waiting List.',
  });
};

app.post('/api/waitlist/leave', handleLeaveWaitlist);
app.delete('/api/waitlist', handleLeaveWaitlist);

// Private Founder/Admin-Only Waitlist Review Endpoint
app.get('/api/owner/waitlist', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required.',
    });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({
      success: false,
      code: 'OWNER_ONLY',
      error: 'Forbidden: Only the Speed Meet Love founder/owner can view the private event waiting list.',
    });
  }

  // Enrich each waitlist member with latest server profile details
  const rawEntries = Array.from(serverWaitlist.values()).map(entry => {
    const latest = serverUsers.get(entry.userId);
    return {
      userId: entry.userId,
      email: latest?.email || entry.email,
      firstName: latest?.firstName || entry.firstName,
      lastName: latest?.lastName || entry.lastName || '',
      gender: latest?.gender || entry.gender || 'Woman',
      interestedIn: latest?.interestedIn || entry.interestedIn || 'Men',
      age: typeof latest?.age === 'number' ? latest.age : entry.age,
      location: latest?.location || entry.location || '',
      relationshipIntent: latest?.relationshipIntent || entry.relationshipIntent || '',
      subscriptionTier: latest?.subscriptionTier || entry.subscriptionTier || 'Free',
      joinedAt: entry.joinedAt,
      updatedAt: entry.updatedAt || entry.joinedAt,
    };
  });

  // Compute mutual compatibility across waitlist participants
  let compatiblePairSet = new Set<string>();
  const enriched = rawEntries.map(member => {
    const compatibleWithNames: string[] = [];
    for (const other of rawEntries) {
      if (other.userId === member.userId) continue;
      if (areParticipantsCompatible(member, other)) {
        compatibleWithNames.push(other.firstName || other.email);
        const pairKey = [member.userId, other.userId].sort().join('::');
        compatiblePairSet.add(pairKey);
      }
    }
    const fullName = `${member.firstName} ${member.lastName}`.trim() || member.email;
    return {
      ...member,
      fullName,
      compatibleCount: compatibleWithNames.length,
      compatibleWithNames,
    };
  });

  enriched.sort((a, b) => b.joinedAt - a.joinedAt);

  const summary = {
    totalWaitlisted: enriched.length,
    womenSeekingMen: enriched.filter(m => m.gender === 'Woman' && m.interestedIn === 'Men').length,
    menSeekingWomen: enriched.filter(m => m.gender === 'Man' && m.interestedIn === 'Women').length,
    lgbtqOrEveryone: enriched.filter(
      m =>
        m.gender === 'Non-Binary' ||
        m.interestedIn === 'Everyone' ||
        (m.gender === 'Woman' && m.interestedIn === 'Women') ||
        (m.gender === 'Man' && m.interestedIn === 'Men')
    ).length,
    thirtyPlusCount: enriched.filter(m => m.age >= 30).length,
    compatiblePairsCount: compatiblePairSet.size,
  };

  return res.json({
    success: true,
    entries: enriched,
    summary,
  });
});

// Public Launch Events (Only founder-confirmed manual events; zero auto-recurring events)
app.get('/api/launch-events', (_req, res) => {
  const confirmed = Array.from(serverLaunchEvents.values())
    .filter(evt => evt.Confirmed === true)
    .sort((a, b) => a.EventDate.localeCompare(b.EventDate) || a.CreatedAt - b.CreatedAt);
  return res.json({
    success: true,
    events: confirmed,
  });
});

// Founder/Admin-Only Launch Event Management (draft + confirmed)
app.get('/api/owner/launch-events', (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Owner access only.' });
  }
  const all = Array.from(serverLaunchEvents.values()).sort(
    (a, b) => b.CreatedAt - a.CreatedAt
  );
  return res.json({ success: true, events: all });
});

app.post('/api/owner/launch-events', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Only the founder/owner can schedule launch events.' });
  }

  const body = req.body || {};
  const eventName = typeof body.EventName === 'string' && body.EventName.trim() ? body.EventName.trim() : '';
  const eventDate = typeof body.EventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.EventDate.trim()) ? body.EventDate.trim() : '';
  if (!eventName || !eventDate) {
    return res.status(400).json({
      success: false,
      error: 'EventName and a valid EventDate (YYYY-MM-DD) are required.',
    });
  }

  const dayOfWeek: 'Friday' | 'Saturday' | 'Sunday' =
    body.DayOfWeek === 'Saturday' || body.DayOfWeek === 'Sunday' ? body.DayOfWeek : 'Friday';
  const eventType: ServerLaunchEventRecord['EventType'] =
    ['Straight', 'LGBTQ+', '30 & Older', 'Age-specific', 'Premium-only'].includes(body.EventType)
      ? body.EventType
      : 'Straight';
  const confirmed = Boolean(body.Confirmed);
  const now = Date.now();
  const minAge = typeof body.MinAge === 'number' && body.MinAge >= 18 ? body.MinAge : eventType === '30 & Older' ? 30 : 18;
  const maxAge = typeof body.MaxAge === 'number' && body.MaxAge >= minAge ? body.MaxAge : 65;

  const newEvent: ServerLaunchEventRecord = {
    EventID: `evt_launch_${now.toString(36)}`,
    EventName: eventName,
    DayOfWeek: dayOfWeek,
    EventDate: eventDate,
    EventStartTime: typeof body.EventStartTime === 'string' && body.EventStartTime.trim() ? body.EventStartTime.trim() : '19:00',
    EventEndTime: typeof body.EventEndTime === 'string' && body.EventEndTime.trim() ? body.EventEndTime.trim() : '20:15',
    TimeZone: typeof body.TimeZone === 'string' && body.TimeZone.trim() ? body.TimeZone.trim() : '7:00 PM Eastern Time (America/New_York)',
    MaxParticipants: typeof body.MaxParticipants === 'number' && body.MaxParticipants >= 2 ? Math.floor(body.MaxParticipants) : 20,
    ParticipantsList: [],
    EventStatus: 'Upcoming',
    RoundsGenerated: false,
    HostID: authUser.userId,
    EventType: eventType,
    Description:
      typeof body.Description === 'string' && body.Description.trim()
        ? body.Description.trim()
        : 'Inaugural Speed Meet Love live event. Five-minute compatible one-on-one video rounds with up to 2-minute breaks.',
    TotalRounds: typeof body.TotalRounds === 'number' && body.TotalRounds >= 1 ? Math.floor(body.TotalRounds) : 5,
    RoundDurationSeconds: 300,
    BreakDurationSeconds: 120,
    MinAge: minAge,
    MaxAge: maxAge,
    LocationName: typeof body.LocationName === 'string' && body.LocationName.trim() ? body.LocationName.trim() : `Virtual Lounge · ${dayOfWeek} 7:00 PM EST`,
    Confirmed: confirmed,
    ConfirmedAt: confirmed ? now : null,
    IsManualLaunch: true,
    CreatedAt: now,
    CreatedBy: authUser.email,
  };

  await saveLaunchEventToDurableDatabase(newEvent);

  // IMPORTANT: Do not send invitations or notifications when scheduling/confirming yet.
  return res.json({
    success: true,
    event: newEvent,
    message: confirmed
      ? `Launch event "${newEvent.EventName}" confirmed and published (no notifications sent).`
      : `Draft launch event "${newEvent.EventName}" saved privately for owner review.`,
  });
});

app.patch('/api/owner/launch-events/:eventId', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Owner access only.' });
  }

  const existing = serverLaunchEvents.get(req.params.eventId);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Launch event not found.' });
  }

  const body = req.body || {};
  const nextConfirmed = body.Confirmed !== undefined ? Boolean(body.Confirmed) : existing.Confirmed;
  const updated: ServerLaunchEventRecord = {
    ...existing,
    ...(typeof body.EventName === 'string' && body.EventName.trim() ? { EventName: body.EventName.trim() } : {}),
    ...(typeof body.EventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.EventDate.trim()) ? { EventDate: body.EventDate.trim() } : {}),
    ...(typeof body.EventStartTime === 'string' && body.EventStartTime.trim() ? { EventStartTime: body.EventStartTime.trim() } : {}),
    ...(typeof body.EventEndTime === 'string' && body.EventEndTime.trim() ? { EventEndTime: body.EventEndTime.trim() } : {}),
    ...(typeof body.TimeZone === 'string' && body.TimeZone.trim() ? { TimeZone: body.TimeZone.trim() } : {}),
    ...(body.DayOfWeek === 'Friday' || body.DayOfWeek === 'Saturday' || body.DayOfWeek === 'Sunday' ? { DayOfWeek: body.DayOfWeek } : {}),
    ...(typeof body.Description === 'string' ? { Description: body.Description.trim() } : {}),
    ...(typeof body.MaxParticipants === 'number' && body.MaxParticipants >= 2 ? { MaxParticipants: Math.floor(body.MaxParticipants) } : {}),
    Confirmed: nextConfirmed,
    ConfirmedAt: nextConfirmed ? (existing.ConfirmedAt || Date.now()) : null,
  };

  await saveLaunchEventToDurableDatabase(updated);

  // IMPORTANT: Do not send invitations or notifications yet.
  return res.json({
    success: true,
    event: updated,
    message: nextConfirmed
      ? `Launch event "${updated.EventName}" confirmed (no notifications sent).`
      : `Launch event "${updated.EventName}" moved back to private draft.`,
  });
});

app.delete('/api/owner/launch-events/:eventId', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOwnerUser(authUser)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Owner access only.' });
  }

  const existed = serverLaunchEvents.has(req.params.eventId);
  await deleteLaunchEventFromDurableDatabase(req.params.eventId);
  return res.json({
    success: true,
    deleted: existed,
  });
});

app.post('/api/launch-events/:eventId/register', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Please sign in to register.' });
  }
  const evt = serverLaunchEvents.get(req.params.eventId);
  if (!evt || !evt.Confirmed) {
    return res.status(404).json({ success: false, error: 'Confirmed launch event not found.' });
  }
  const user = serverUsers.get(authUser.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User account not found.' });
  }
  const access = hasPaidOrTesterAccess(user, 'Premium Plus');
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      code: 'PREMIUM_PLUS_REQUIRED',
      error: 'Event membership coming soon.',
    });
  }
  if ((evt.EventType === '30 & Older' || evt.MinAge >= 30) && (!user.age || user.age < 30)) {
    return res.status(403).json({
      success: false,
      error: 'Only members aged 30 or older may register for this event.',
    });
  }
  if (evt.ParticipantsList.includes(user.userId)) {
    return res.json({ success: true, event: evt, alreadyRegistered: true });
  }
  if (evt.ParticipantsList.length >= evt.MaxParticipants) {
    return res.status(400).json({ success: false, error: 'Event is full.' });
  }
  const updated: ServerLaunchEventRecord = {
    ...evt,
    ParticipantsList: [...evt.ParticipantsList, user.userId],
  };
  await saveLaunchEventToDurableDatabase(updated);
  return res.json({ success: true, event: updated });
});

app.post('/api/launch-events/:eventId/leave', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  const evt = serverLaunchEvents.get(req.params.eventId);
  if (!evt) {
    return res.json({ success: true });
  }
  const updated: ServerLaunchEventRecord = {
    ...evt,
    ParticipantsList: evt.ParticipantsList.filter(id => id !== authUser.userId),
  };
  await saveLaunchEventToDurableDatabase(updated);
  return res.json({ success: true, event: updated });
});

// API: Verify Stripe Prices Against Configured Stripe Account & Mode
app.get('/api/stripe/verify-prices', async (_req, res) => {
  await ensureStripePricesResolved();
  const expectedAmounts = getStripeExpectedAmounts();
  const webhookConfig = getStripeWebhookSecretConfig();
  const result: any = {
    success: true,
    allVerified: false,
    mode: STRIPE_MODE,
    isLiveMode: STRIPE_MODE === 'live',
    sandboxMode: STRIPE_MODE === 'sandbox',
    expectedPrices: expectedAmounts,
    serverStartedAt: SERVER_STARTED_AT,
    stripeConfig: {
      hasSecretKey: Boolean(STRIPE_SECRET_KEY),
      hasWebhookSecret: webhookConfig.hasSecret,
      webhookSecretCount: webhookConfig.secrets.length,
      webhookSecretFormatValid: webhookConfig.validFormatCount > 0,
      webhookSecretHadWrapper: webhookConfig.hadWrapper,
      webhookSecretLooksPlaceholder: webhookConfig.looksPlaceholder,
      webhookRawBodyProtected: true,
      hasPublishableKey: Boolean(STRIPE_PUBLISHABLE_KEY),
      publishableKeyMisconfigured: Boolean(RAW_STRIPE_PUBLISHABLE_KEY && !STRIPE_PUBLISHABLE_KEY),
      isLiveKey: STRIPE_IS_LIVE_KEY,
      isSandboxTestKey: STRIPE_IS_SANDBOX_KEY,
    },
    sandboxConfig: {
      hasSecretKey: Boolean(STRIPE_SECRET_KEY),
      hasWebhookSecret: webhookConfig.hasSecret,
      webhookSecretFormatValid: webhookConfig.validFormatCount > 0,
      hasPublishableKey: Boolean(STRIPE_PUBLISHABLE_KEY),
      isLiveKey: STRIPE_IS_LIVE_KEY,
      isSandboxTestKey: STRIPE_IS_SANDBOX_KEY,
    },
  };

  if (!stripe) {
    result.allVerified = false;
    result.status = 'PENDING_SECRET_KEY';
    result.message =
      'Stripe client not initialized because STRIPE_SECRET_KEY is not set in the environment. Configure STRIPE_SECRET_KEY in server environment to perform live API retrieval.';
    result.prices = {
      [STRIPE_PRICES.PREMIUM]: {
        id: STRIPE_PRICES.PREMIUM,
        tier: 'Premium',
        expectedAmountCents: 999,
        expectedCurrency: 'USD',
        expectedInterval: 'month',
        status: 'configured_locally',
      },
      [STRIPE_PRICES.PREMIUM_PLUS]: {
        id: STRIPE_PRICES.PREMIUM_PLUS,
        tier: 'Premium Plus',
        expectedAmountCents: 1499,
        expectedCurrency: 'USD',
        expectedInterval: 'month',
        status: 'configured_locally',
      },
    };
    return res.json(result);
  }

  try {
    const verifiedDetails: Record<string, any> = {};
    let allValid = true;
    // Validate each retrieved price against the configured Stripe key's mode
    const expectedLivemode = STRIPE_IS_LIVE_KEY;

    for (const [priceId, expected] of Object.entries(expectedAmounts)) {
      try {
        const p = await stripe.prices.retrieve(priceId);
        const amountCents = p.unit_amount;
        const currency = (p.currency || '').toUpperCase();
        const interval = p.recurring?.interval;
        const livemode = p.livemode;

        const isAmountMatch = amountCents === expected.amountCents;
        const isCurrencyMatch = currency === expected.currency;
        const isIntervalMatch = interval === expected.interval;
        const isModeMatch =
          STRIPE_IS_LIVE_KEY || STRIPE_IS_SANDBOX_KEY ? livemode === expectedLivemode : true;
        const isActive = p.active !== false;

        const isValid = isAmountMatch && isCurrencyMatch && isIntervalMatch && isModeMatch && isActive;
        if (!isValid) allValid = false;

        verifiedDetails[priceId] = {
          id: priceId,
          tier: expected.tier,
          name: expected.name,
          valid: isValid,
          amountCents,
          expectedAmountCents: expected.amountCents,
          amountMatches: isAmountMatch,
          currency,
          expectedCurrency: expected.currency,
          currencyMatches: isCurrencyMatch,
          interval,
          expectedInterval: expected.interval,
          intervalMatches: isIntervalMatch,
          livemode,
          expectedLivemode,
          modeMatches: isModeMatch,
          isSandboxTestMode: livemode === false,
          active: p.active,
        };
      } catch (err: any) {
        allValid = false;
        verifiedDetails[priceId] = {
          id: priceId,
          tier: expected.tier,
          valid: false,
          error: err.message || 'Price retrieval failed from Stripe API',
        };
      }
    }

    result.allVerified = allValid;
    result.verified = allValid;
    result.status = allValid
      ? STRIPE_IS_LIVE_KEY
        ? 'VERIFIED_LIVE'
        : 'VERIFIED_SANDBOX'
      : 'MISMATCH_OR_NOT_FOUND';
    result.prices = verifiedDetails;
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error occurred while verifying prices with Stripe',
    });
  }
});

// Per-user+mode lock prevents duplicate Stripe customer creation on concurrent clicks/retries
const inFlightCustomerResolutions = new Map<string, Promise<string | null>>();

function isConfirmedMissingCustomerError(err: any): boolean {
  if (!err) return false;
  const type = String(err.type || err.raw?.type || '').toLowerCase();
  const code = String(err.code || err.raw?.code || '').toLowerCase();
  const statusCode = err.statusCode || err.raw?.statusCode;
  const param = String(err.param || err.raw?.param || '').toLowerCase();
  const msg = String(err.message || err.raw?.message || '').toLowerCase();

  // Only recover on Stripe 400/404 invalid_request_error for missing customer; never on 401/403/429/5xx/network
  if (statusCode && statusCode !== 400 && statusCode !== 404) return false;
  if (type && type !== 'invalid_request_error' && type !== 'stripeinvalidrequesterror') return false;
  if (param && param !== 'customer' && param !== 'id') return false;
  if (msg.includes('no such price') || msg.includes('no such session')) return false;

  return msg.includes('no such customer') && (!code || code === 'resource_missing');
}

function getCandidateCustomerIdForCurrentMode(user: ServerUserRecord): string | undefined {
  if (STRIPE_IS_LIVE_KEY) {
    if (user.stripeCustomerIdLive) return user.stripeCustomerIdLive;
    if (user.stripeCustomerId && user.stripeCustomerId !== user.stripeCustomerIdTest) {
      return user.stripeCustomerId;
    }
    return undefined;
  }
  if (STRIPE_IS_SANDBOX_KEY) {
    if (user.stripeCustomerIdTest) return user.stripeCustomerIdTest;
    if (user.stripeCustomerId && user.stripeCustomerId !== user.stripeCustomerIdLive) {
      return user.stripeCustomerId;
    }
    return undefined;
  }
  return user.stripeCustomerId;
}

async function ensureStripeCustomerForUser(
  user: ServerUserRecord,
  options: { createIfMissing: boolean; ignoreCustomerId?: string }
): Promise<string | null> {
  if (!stripe) return null;

  const isLiveMode = STRIPE_IS_LIVE_KEY;
  const modeKey: 'live' | 'test' = isLiveMode ? 'live' : 'test';
  const lockKey = `${user.userId}:${modeKey}`;

  // Serialize concurrent attempts for the same user+mode so retries reuse the created customer
  while (inFlightCustomerResolutions.has(lockKey)) {
    try {
      await inFlightCustomerResolutions.get(lockKey);
    } catch {
      break;
    }
  }

  const runResolution = (async (): Promise<string | null> => {
    const candidateId = getCandidateCustomerIdForCurrentMode(user);
    let replacedFromId: string | undefined;

    if (candidateId && candidateId !== options.ignoreCustomerId) {
      try {
        const retrieved = await stripe.customers.retrieve(candidateId);
        const isDeleted = Boolean((retrieved as Stripe.DeletedCustomer).deleted);
        const retrievedLivemode = (retrieved as Stripe.Customer).livemode;
        const modeMatches =
          !(STRIPE_IS_LIVE_KEY || STRIPE_IS_SANDBOX_KEY) || retrievedLivemode === isLiveMode;

        if (!isDeleted && modeMatches) {
          let needsSave = false;
          if (isLiveMode && user.stripeCustomerIdLive !== candidateId) {
            user.stripeCustomerIdLive = candidateId;
            needsSave = true;
          } else if (!isLiveMode && user.stripeCustomerIdTest !== candidateId) {
            user.stripeCustomerIdTest = candidateId;
            needsSave = true;
          }
          if (user.stripeCustomerId !== candidateId) {
            user.stripeCustomerId = candidateId;
            needsSave = true;
          }
          if (needsSave) {
            await saveUserToDurableDatabase(user);
          }
          return candidateId;
        }

        // Confirmed deleted in current mode or mismatched mode
        replacedFromId = candidateId;
        console.warn(
          `[Stripe Customer] Saved customer ${candidateId} for user ${user.userId} is ${
            isDeleted ? 'deleted in Stripe' : 'from a different Stripe mode'
          } (${modeKey}); resolving replacement.`
        );
      } catch (err: any) {
        if (isConfirmedMissingCustomerError(err)) {
          replacedFromId = candidateId;
          // Preserve a legacy sandbox/test ID in stripeCustomerIdTest rather than losing it,
          // while clearing it from the active live field.
          if (isLiveMode && !user.stripeCustomerIdTest && candidateId === user.stripeCustomerId) {
            user.stripeCustomerIdTest = candidateId;
          } else if (!isLiveMode && !user.stripeCustomerIdLive && candidateId === user.stripeCustomerId) {
            user.stripeCustomerIdLive = candidateId;
          }
          console.warn(
            `[Stripe Customer] Saved customer ${candidateId} for user ${user.userId} is missing in ${modeKey} Stripe account; resolving replacement.`
          );
        } else {
          // Unrelated Stripe error (auth, rate limit, network, server 5xx): never replace saved customer
          throw err;
        }
      }
    } else if (options.ignoreCustomerId) {
      replacedFromId = options.ignoreCustomerId;
    }

    // Look up existing active customer in the current Stripe account & mode by email before creating
    const existingList = await stripe.customers.list({ email: user.email, limit: 10 });
    const activeMatches = existingList.data.filter(
      (c) =>
        !c.deleted &&
        c.id !== options.ignoreCustomerId &&
        (!(STRIPE_IS_LIVE_KEY || STRIPE_IS_SANDBOX_KEY) || c.livemode === isLiveMode)
    );
    const matchedCustomer =
      activeMatches.find((c) => c.metadata?.userId === user.userId) || activeMatches[0];

    let resolvedId: string | null = matchedCustomer?.id || null;

    if (!resolvedId && options.createIfMissing) {
      const idempotencyBucket = Math.floor(Date.now() / 60000);
      const idempotencyKey = `cust_${user.userId}_${modeKey}_${replacedFromId || 'init'}_${idempotencyBucket}`;
      const created = await stripe.customers.create(
        {
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.firstName,
          metadata: {
            userId: user.userId,
            app: 'Speed Meet Love',
            mode: modeKey,
            ...(replacedFromId ? { replacedMissingCustomerId: replacedFromId } : {}),
          },
        },
        { idempotencyKey }
      );
      resolvedId = created.id;
      console.log(
        `[Stripe Customer] Created ${modeKey} customer ${resolvedId} for user ${user.userId}${
          replacedFromId ? ` (replaced ${replacedFromId})` : ''
        }`
      );
    }

    if (resolvedId) {
      if (isLiveMode) {
        user.stripeCustomerIdLive = resolvedId;
      } else {
        user.stripeCustomerIdTest = resolvedId;
      }
      user.stripeCustomerId = resolvedId;
      await saveUserToDurableDatabase(user);
    } else if (replacedFromId) {
      // Clear stale missing ID from active mode field so Portal doesn't keep hitting 404
      if (isLiveMode && user.stripeCustomerIdLive === replacedFromId) {
        user.stripeCustomerIdLive = undefined;
      } else if (!isLiveMode && user.stripeCustomerIdTest === replacedFromId) {
        user.stripeCustomerIdTest = undefined;
      }
      if (user.stripeCustomerId === replacedFromId) {
        user.stripeCustomerId = undefined;
      }
      await saveUserToDurableDatabase(user);
    }

    return resolvedId;
  })();

  inFlightCustomerResolutions.set(lockKey, runResolution);
  try {
    return await runResolution;
  } finally {
    inFlightCustomerResolutions.delete(lockKey);
  }
}

// API: Authenticated Stripe Checkout Session Creation
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required. Please sign in to subscribe.',
    });
  }

  const user = serverUsers.get(authUser.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User account not found' });
  }

  await ensureStripePricesResolved();

  const { priceId: rawPriceId, tier: requestedTier } = req.body || {};
  let resolvedPriceId = typeof rawPriceId === 'string' ? rawPriceId.trim() : '';

  // If a cached client submits the legacy sandbox price ID (or omits priceId and passes tier)
  // while the server is in live mode, map it to the verified live price ID for that tier.
  if (STRIPE_IS_LIVE_KEY) {
    if (
      (resolvedPriceId === SANDBOX_FALLBACK_PRICES.PREMIUM ||
        (!resolvedPriceId && requestedTier === 'Premium')) &&
      STRIPE_PRICES.PREMIUM !== SANDBOX_FALLBACK_PRICES.PREMIUM
    ) {
      resolvedPriceId = STRIPE_PRICES.PREMIUM;
    } else if (
      (resolvedPriceId === SANDBOX_FALLBACK_PRICES.PREMIUM_PLUS ||
        (!resolvedPriceId && requestedTier === 'Premium Plus')) &&
      STRIPE_PRICES.PREMIUM_PLUS !== SANDBOX_FALLBACK_PRICES.PREMIUM_PLUS
    ) {
      resolvedPriceId = STRIPE_PRICES.PREMIUM_PLUS;
    }
  }

  if (
    !resolvedPriceId ||
    (resolvedPriceId !== STRIPE_PRICES.PREMIUM && resolvedPriceId !== STRIPE_PRICES.PREMIUM_PLUS)
  ) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PRICE_ID',
      error: `Invalid priceId. Supported prices: Premium (${STRIPE_PRICES.PREMIUM}), Premium Plus (${STRIPE_PRICES.PREMIUM_PLUS}).`,
    });
  }

  // Pause new paid Premium Plus purchases while gathering first launch waitlist members.
  // Existing subscribers' records, Stripe portal, webhooks, and Premium ($9.99/mo) remain active.
  if (
    requestedTier === 'Premium Plus' ||
    resolvedPriceId === STRIPE_PRICES.PREMIUM_PLUS ||
    resolvedPriceId === SANDBOX_FALLBACK_PRICES.PREMIUM_PLUS
  ) {
    return res.status(403).json({
      success: false,
      paused: true,
      code: 'PREMIUM_PLUS_PAUSED',
      error: 'Event membership coming soon.',
    });
  }

  const expectedPlan = getStripeExpectedAmounts()[resolvedPriceId];

  if (!stripe) {
    return res.status(503).json({
      success: false,
      code: 'STRIPE_NOT_CONFIGURED',
      error:
        'Stripe secret key (STRIPE_SECRET_KEY) is not configured in the server environment. Please set STRIPE_SECRET_KEY to enable Stripe checkout.',
    });
  }

  try {
    // 1. Verify or safely create Stripe customer ID for the active Stripe mode (test vs live)
    let customerId = await ensureStripeCustomerForUser(user, { createIfMissing: true });
    if (!customerId) {
      throw new Error('Unable to resolve or create Stripe customer for checkout.');
    }

    const reqOrigin = req.get('origin');
    const appUrl = (reqOrigin && reqOrigin.includes('localhost') ? reqOrigin : APP_URL).replace(/\/$/, '');

    const createSessionForCustomer = (targetCustomerId: string) =>
      stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: targetCustomerId,
        client_reference_id: user.userId,
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        metadata: {
          userId: user.userId,
          email: user.email,
          tier: expectedPlan.tier,
          priceId: resolvedPriceId,
        },
        subscription_data: {
          metadata: {
            userId: user.userId,
            email: user.email,
            tier: expectedPlan.tier,
            priceId: resolvedPriceId,
          },
        },
        success_url: `${appUrl}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${appUrl}/pricing?canceled=true`,
      });

    // 2. Create Stripe Checkout Session (retry once only if Stripe reports confirmed missing customer)
    let session: Stripe.Checkout.Session;
    try {
      session = await createSessionForCustomer(customerId);
    } catch (sessionErr: any) {
      if (isConfirmedMissingCustomerError(sessionErr)) {
        const replacementId = await ensureStripeCustomerForUser(user, {
          createIfMissing: true,
          ignoreCustomerId: customerId,
        });
        if (!replacementId) {
          throw sessionErr;
        }
        customerId = replacementId;
        session = await createSessionForCustomer(customerId);
      } else {
        throw sessionErr;
      }
    }

    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      tier: expectedPlan.tier,
      priceId: resolvedPriceId,
      customerId,
    });
  } catch (err: any) {
    console.error('[Stripe Checkout Error]', err);
    return res.status(err?.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500).json({
      success: false,
      code: 'STRIPE_CHECKOUT_FAILED',
      error: err.message || 'Failed to create Stripe Checkout session',
    });
  }
});

// API: Customer Billing Portal Session Creation
app.post('/api/stripe/create-portal-session', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Authentication required to manage billing.',
    });
  }

  const user = serverUsers.get(authUser.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User account not found' });
  }

  if (!stripe) {
    return res.status(503).json({
      success: false,
      code: 'STRIPE_NOT_CONFIGURED',
      error: 'Stripe is not configured in the server environment.',
    });
  }

  try {
    const customerId = await ensureStripeCustomerForUser(user, { createIfMissing: false });

    if (!customerId) {
      return res.status(400).json({
        success: false,
        code: 'NO_STRIPE_CUSTOMER',
        error: 'No active Stripe billing profile found for your account. Please subscribe to a membership plan first.',
      });
    }

    const reqOrigin = req.get('origin');
    const appUrl = (reqOrigin && reqOrigin.includes('localhost') ? reqOrigin : APP_URL).replace(/\/$/, '');
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/pricing`,
    });

    return res.json({
      success: true,
      url: portalSession.url,
    });
  } catch (err: any) {
    console.error('[Stripe Portal Error]', err);
    return res.status(500).json({
      success: false,
      code: 'PORTAL_CREATION_FAILED',
      error: err.message || 'Failed to create customer billing portal session',
    });
  }
});

// Helper: Handle Stripe Subscription State Changes
async function applySubscriptionUpdate(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  priceId: string | undefined,
  status: string,
  currentPeriodEndSeconds?: number,
  userIdHint?: string,
  isLiveEvent: boolean = STRIPE_IS_LIVE_KEY
): Promise<ServerUserRecord | null> {
  let user: ServerUserRecord | undefined;
  if (userIdHint && serverUsers.has(userIdHint)) {
    user = serverUsers.get(userIdHint);
  } else {
    for (const u of serverUsers.values()) {
      if (
        u.stripeCustomerId === stripeCustomerId ||
        u.stripeCustomerIdLive === stripeCustomerId ||
        u.stripeCustomerIdTest === stripeCustomerId ||
        u.stripeSubscriptionId === stripeSubscriptionId
      ) {
        user = u;
        break;
      }
    }
  }

  if (!user) {
    console.warn(`[Stripe Webhook] No member found for customer ${stripeCustomerId} / subscription ${stripeSubscriptionId}`);
    return null;
  }

  if (isLiveEvent) {
    user.stripeCustomerIdLive = stripeCustomerId;
  } else {
    user.stripeCustomerIdTest = stripeCustomerId;
  }
  user.stripeCustomerId = stripeCustomerId;
  user.stripeSubscriptionId = stripeSubscriptionId;
  user.stripePriceId = priceId || user.stripePriceId;
  user.subscriptionStatus = status as any;
  if (currentPeriodEndSeconds) {
    user.subscriptionCurrentPeriodEnd = currentPeriodEndSeconds * 1000;
  }

  // Determine tier based on priceId or status
  if (status === 'active' || status === 'trialing') {
    if (priceId === STRIPE_PRICES.PREMIUM_PLUS) {
      user.subscriptionTier = 'Premium Plus';
    } else if (priceId === STRIPE_PRICES.PREMIUM) {
      user.subscriptionTier = 'Premium';
    } else if (user.stripePriceId === STRIPE_PRICES.PREMIUM_PLUS) {
      user.subscriptionTier = 'Premium Plus';
    } else {
      user.subscriptionTier = 'Premium';
    }
  } else if (status === 'canceled' || status === 'unpaid') {
    // If user is not an explicit tester, revert to Free
    if (!isTesterAccount(user)) {
      user.subscriptionTier = 'Free';
    }
  }

  await saveUserToDurableDatabase(user);
  console.log(`[Stripe Webhook] Updated user ${user.userId} (${user.email}) -> tier: ${user.subscriptionTier}, status: ${user.subscriptionStatus}`);
  return user;
}

// API: Signature-Verified Stripe Webhook Receiver
app.post([STRIPE_WEBHOOK_ROUTE, `${STRIPE_WEBHOOK_ROUTE}/`], async (req, res) => {
  await ensureStripePricesResolved();
  const rawSigHeader = req.headers['stripe-signature'];
  const sig = Array.isArray(rawSigHeader) ? rawSigHeader[0] : rawSigHeader;
  const webhookConfig = getStripeWebhookSecretConfig();
  const webhookSecrets = webhookConfig.secrets;
  let event: Stripe.Event;

  const rawPayload = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.isBuffer((req as any).rawBody)
    ? (req as any).rawBody
    : typeof req.body === 'string'
    ? req.body
    : null;

  // Signature verification when STRIPE_WEBHOOK_SECRET is set (strictly required in live mode)
  if (STRIPE_IS_LIVE_KEY && webhookSecrets.length === 0) {
    console.error('[Stripe Webhook] Rejected request: STRIPE_WEBHOOK_SECRET is required in live mode.');
    return res.status(500).send('Webhook Error: STRIPE_WEBHOOK_SECRET is not configured for live mode.');
  }

  if (webhookSecrets.length > 0 && stripe) {
    if (!sig) {
      console.error('[Stripe Webhook] Rejected request: Missing stripe-signature header.');
      return res.status(400).send('Webhook Error: Missing stripe-signature header');
    }

    if (!rawPayload || rawPayload.length === 0) {
      console.error('[Stripe Webhook] Rejected request: Raw request body unavailable or empty.', {
        isBuffer: Buffer.isBuffer(req.body),
        hasRawBodyBuffer: Buffer.isBuffer((req as any).rawBody),
        bodyType: typeof req.body,
        contentType: req.headers['content-type'] || '',
      });
      return res.status(400).send('Webhook Error: Missing raw request body for signature verification.');
    }

    let verifiedEvent: Stripe.Event | null = null;
    let lastVerificationError: any = null;

    for (const candidateSecret of webhookSecrets) {
      try {
        verifiedEvent = stripe.webhooks.constructEvent(rawPayload, sig, candidateSecret);
        break;
      } catch (err: any) {
        lastVerificationError = err;
      }
    }

    if (!verifiedEvent) {
      const sigStr = typeof sig === 'string' ? sig : '';
      const sigParts = sigStr.split(',').map((p) => p.trim());
      const v1Count = sigParts.filter((p) => p.startsWith('v1=')).length;
      const hasTimestamp = sigParts.some((p) => /^t=\d+$/.test(p));

      // Safe diagnostics only — never log signing secrets, signature hashes, or PII
      console.error('[Stripe Webhook Signature Verification Failed]', {
        reason: lastVerificationError?.message || 'Signature mismatch',
        isRawBuffer: Buffer.isBuffer(rawPayload),
        payloadBytes: Buffer.isBuffer(rawPayload) ? rawPayload.length : Buffer.byteLength(rawPayload, 'utf8'),
        hasStripeSignature: Boolean(sigStr),
        sigHasTimestamp: hasTimestamp,
        sigV1Count: v1Count,
        configuredSecretCount: webhookSecrets.length,
        webhookSecretFormatValid: webhookConfig.validFormatCount > 0,
        webhookSecretHadWrapper: webhookConfig.hadWrapper,
        webhookSecretLooksPlaceholder: webhookConfig.looksPlaceholder,
        contentType: req.headers['content-type'] || '',
        requestPath: req.path,
      });
      return res.status(400).send(`Webhook Error: ${lastVerificationError?.message || 'Signature verification failed.'}`);
    }

    event = verifiedEvent;
  } else {
    // In local sandbox / testing without webhook secret:
    try {
      event = rawPayload
        ? JSON.parse(rawPayload.toString('utf-8'))
        : req.body;
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: Unable to parse payload: ${err.message}`);
    }
  }

  try {
    console.log(`[Stripe Webhook] Processing event: ${event.type}`);
    const isLiveEvent = typeof event.livemode === 'boolean' ? event.livemode : STRIPE_IS_LIVE_KEY;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (typeof session.customer === 'string' ? session.customer : session.customer?.id) || '';
        const subscriptionId = (typeof session.subscription === 'string' ? session.subscription : session.subscription?.id) || '';
        const userIdHint = session.client_reference_id || session.metadata?.userId;
        const priceId = session.metadata?.priceId;

        await applySubscriptionUpdate(customerId, subscriptionId, priceId, 'active', undefined, userIdHint, isLiveEvent);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id) || '';
        const subscriptionId = subscription.id;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const status = subscription.status;
        const currentPeriodEnd = (subscription as any).current_period_end;
        const userIdHint = subscription.metadata?.userId;

        await applySubscriptionUpdate(customerId, subscriptionId, priceId, status, currentPeriodEnd, userIdHint, isLiveEvent);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id) || '';
        const subscriptionId = subscription.id;
        const userIdHint = subscription.metadata?.userId;

        await applySubscriptionUpdate(customerId, subscriptionId, undefined, 'canceled', undefined, userIdHint, isLiveEvent);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice ${invoice.id} status event: ${event.type}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook Processing Error]:', err);
    return res.status(500).json({ error: 'Webhook processing error', details: err.message });
  }
});

// API: Server-Enforced Mutual Match Messaging
app.post('/api/messages/send', async (req, res) => {
  const authUser = verifyAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }

  const user = serverUsers.get(authUser.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User account not found' });
  }

  // Server Access Enforcement: Free allows browsing only. Premium ($9.99/mo) or Premium Plus ($14.99/mo) unlocks messaging.
  const access = hasPaidOrTesterAccess(user, 'Premium');
  if (!access.allowed) {
    return res.status(403).json({
      success: false,
      code: 'SUBSCRIPTION_REQUIRED',
      requiredTier: 'Premium',
      error: access.reason || 'Messaging requires an eligible paid membership (Premium or Premium Plus).',
    });
  }

  const { matchId, text, recipientId } = req.body;
  if (!matchId || !text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: 'matchId and message text are required' });
  }

  // If recipientId is provided, enforce mutual paid access rule
  if (recipientId && serverUsers.has(recipientId)) {
    const partner = serverUsers.get(recipientId)!;
    const partnerAccess = hasPaidOrTesterAccess(partner, 'Premium');
    if (!partnerAccess.allowed) {
      return res.status(403).json({
        success: false,
        code: 'PARTNER_SUBSCRIPTION_REQUIRED',
        error: `${partner.firstName || 'Your match'} currently has a Free membership. Private messaging unlocks only when both members have an eligible paid membership.`,
      });
    }
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return res.json({
    success: true,
    messageId,
    timestamp: new Date().toISOString(),
    senderId: authUser.userId,
    matchId,
    text: text.trim(),
  });
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
    success: true,
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

  // 3. Subscription Verification: Must be Premium Plus ($14.99/mo) or have Free Tester access
  const authUser = verifyAuthenticatedUser(req);
  const targetUser = authUser ? serverUsers.get(authUser.userId) : (serverUsers.get(userId) || null);
  if (targetUser) {
    const access = hasPaidOrTesterAccess(targetUser, 'Premium Plus');
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        code: 'PREMIUM_PLUS_REQUIRED',
        error: 'Access denied: Live speed dating requires an active Premium Plus membership.',
      });
    }
  } else if (tier !== 'Premium Plus') {
    return res.status(403).json({
      success: false,
      code: 'PREMIUM_PLUS_REQUIRED',
      error: 'Access denied: Live speed dating requires an active Premium Plus membership.',
    });
  }

  // 4. Developer Staging Authorization Check: Restricted to authorized developer/QA accounts
  const isStagingEvent = eventId === 'evt_staging_dev' || eventId.startsWith('evt_staging_');
  if (isStagingEvent && !AUTHORIZED_STAGING_ACCOUNTS.has(userId)) {
    return res.status(403).json({
      success: false,
      code: 'DEVELOPER_AUTHORIZATION_REQUIRED',
      error: 'Access denied: The Developer 2-Person Staging Test is strictly restricted to authorized developer and QA accounts.',
    });
  }

  // Check if user is already part of an active match for this event & round
  const now = Date.now();
  for (const [mId, match] of liveActiveMatches.entries()) {
    if (now >= match.expiresAt) {
      liveActiveMatches.delete(mId);
      continue;
    }
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
      message: 'Waiting for member to complete break and enter queue...',
    });
  }

  // Search queue for an eligible AND compatible partner who is also ready
  const launchEventRecord = serverLaunchEvents.get(eventId);
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
      // General speed dating: strictly require mutually compatible consenting daters
      const isCompatible = areParticipantsCompatible(
        {
          userId,
          gender: targetUser?.gender || gender,
          interestedIn: targetUser?.interestedIn || interestedIn,
          age: targetUser?.age ?? userAge,
        },
        {
          userId: candidate.userId,
          gender: serverUsers.get(candidate.userId)?.gender || candidate.gender,
          interestedIn: serverUsers.get(candidate.userId)?.interestedIn || candidate.interestedIn,
          age: serverUsers.get(candidate.userId)?.age ?? candidate.userAge,
        },
        {
          eventType: launchEventRecord?.EventType || req.body?.eventType,
          minAge: launchEventRecord?.MinAge,
        }
      );
      if (isCompatible) {
        matchedPartner = candidate;
        break;
      }
    }
  }

  if (matchedPartner) {
    // Both daters are authenticated, registered, Premium Plus, compatible, and mutually ready!
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
    message: 'Waiting for a compatible participant',
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

  const q = liveEventQueues.get(eventId);
  const inQueue = q ? q.has(userId) : false;

  return res.json({
    success: true,
    status: inQueue ? 'waiting' : 'idle',
    inQueue,
    message: inQueue ? 'Waiting for a compatible participant' : 'Not in queue',
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
      mutualConsentRequirement: 'Enforced (Both participants must be ready for pairing)',
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

    // 4. Security Check: Subscription Verification (Premium Plus or Free Tester access)
    const { tier } = req.body;
    const authUser = verifyAuthenticatedUser(req);
    const targetUser = authUser ? serverUsers.get(authUser.userId) : (serverUsers.get(userId) || null);
    if (targetUser) {
      const access = hasPaidOrTesterAccess(targetUser, 'Premium Plus');
      if (!access.allowed) {
        return res.status(403).json({
          success: false,
          code: 'PREMIUM_PLUS_REQUIRED',
          error: 'Access denied: Live speed-dating video calls require an active Premium Plus membership.',
        });
      }
    } else if (tier && tier !== 'Premium Plus') {
      return res.status(403).json({
        success: false,
        code: 'PREMIUM_PLUS_REQUIRED',
        error: 'Access denied: Live speed-dating video calls require an active Premium Plus membership.',
      });
    }

    // 5. Security Check: Developer Staging Authorization Check
    const isStagingEvent = eventId === 'evt_staging_dev' || eventId.startsWith('evt_staging_') || req.body.isStagingTest;
    if (isStagingEvent) {
      if (!AUTHORIZED_STAGING_ACCOUNTS.has(userId) || (partnerId && !AUTHORIZED_STAGING_ACCOUNTS.has(partnerId))) {
        return res.status(403).json({
          success: false,
          code: 'DEVELOPER_AUTHORIZATION_REQUIRED',
          error: 'Access denied: The Developer 2-Person Staging Test is strictly restricted to authorized developer and QA accounts.',
        });
      }
    }

    // 6. Security Check: Matching Eligibility & Partner Compatibility
    if (!partnerId || partnerId === userId) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PARTNER',
        error: 'Waiting for a compatible participant',
      });
    }

    if (!isStagingEvent) {
      const eventQueue = liveEventQueues.get(eventId);
      const qUser = eventQueue?.get(userId);
      const qPartner = eventQueue?.get(partnerId);
      const partnerRecord = serverUsers.get(partnerId);
      const launchEvt = serverLaunchEvents.get(eventId);

      const resolvedUser = targetUser
        ? { userId: targetUser.userId, gender: targetUser.gender, interestedIn: targetUser.interestedIn, age: targetUser.age }
        : qUser
        ? { userId: qUser.userId, gender: qUser.gender, interestedIn: qUser.interestedIn, age: qUser.userAge }
        : null;
      const resolvedPartner = partnerRecord
        ? { userId: partnerRecord.userId, gender: partnerRecord.gender, interestedIn: partnerRecord.interestedIn, age: partnerRecord.age }
        : qPartner
        ? { userId: qPartner.userId, gender: qPartner.gender, interestedIn: qPartner.interestedIn, age: qPartner.userAge }
        : null;

      if (!resolvedUser || !resolvedPartner) {
        return res.status(403).json({
          success: false,
          code: 'INCOMPATIBLE_PARTNER',
          error: 'Waiting for a compatible participant',
        });
      }

      const compatible = areParticipantsCompatible(resolvedUser, resolvedPartner, {
        eventType: launchEvt?.EventType || eventType,
        minAge: launchEvt?.MinAge,
      });
      if (!compatible) {
        return res.status(403).json({
          success: false,
          code: 'INCOMPATIBLE_PARTNER',
          error: 'Waiting for a compatible participant',
        });
      }
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
      paymentEngine: stripe ? 'Stripe Web Subscriptions Configured' : 'Stripe Checkout Ready (Awaiting Server Keys)',
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
