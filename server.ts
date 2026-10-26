import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

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
  isPaused: boolean;
  pausedAt: number | null;
  accumulatedPauseMs: number;
}

const sessions = new Map<string, ServerLiveSession>();

// API: Retrieve user session
app.get('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
  const session = sessions.get(userId);
  if (session) {
    res.json({ success: true, session });
  } else {
    res.json({ success: false, session: null });
  }
});

// API: Upsert user session
app.post('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
  const body = req.body as Partial<ServerLiveSession>;
  const existing = sessions.get(userId);

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
    isPaused: body.isPaused !== undefined ? body.isPaused : existing?.isPaused || false,
    pausedAt: body.pausedAt !== undefined ? body.pausedAt : existing?.pausedAt || null,
    accumulatedPauseMs: body.accumulatedPauseMs !== undefined ? body.accumulatedPauseMs : existing?.accumulatedPauseMs || 0,
  };

  sessions.set(userId, updated);
  res.json({ success: true, session: updated });
});

// API: Clear session when event is finished or user leaves
app.delete('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
  sessions.delete(userId);
  res.json({ success: true, message: `Session for user ${userId} cleared` });
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
      liveVideoEngine: 'Simulated WebRTC Preview (Requires Twilio/LiveKit/Agora in production)',
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
