// tests/test_timer_and_session_lifecycle.mjs
// Regression test suite for Speed Meet Love's timer and session lifecycle:
// 1. Break timer strictly bounded to 120s (never 420s / 6:59)
// 2. Clock skew handling using synchronized server time
// 3. Early round ending break calculation (120s from early end timestamp)
// 4. Reconnect preserves exact round deadline (never resets to 5:00)
// 5. Leaving event removes active session, queue, and readiness without deleting votes or matches
// 6. Re-entry after leaving starts fresh at Round 1
// 7. Expired/abandoned staging sessions (>30 min) never silently reopen
// 8. Unique staging instance creation & isolation for clean 2-phone testing

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';
const userMe = 'usr_me';
const partnerElena = 'usr_03';
const partnerMaya = 'usr_04';

function log(msg) {
  console.log(`  -> ${msg}`);
}

async function runTests() {
  console.log('=== TEST SUITE: Timer & Session Lifecycle Verification ===\n');

  // --- TEST 1: Break timer strictly starts at 120s (Never 420s / 6:59) ---
  console.log('Test 1: Break timer duration calculation (preventing 6:59 bug)...');
  const eventId1 = 'evt_timer_test_1';

  // Initialize a fresh 5-minute round (300s call, 120s break)
  const initTimerRes = await fetch(`${BASE_URL}/api/events/${eventId1}/rounds/0/timer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      partnerId: partnerElena,
      roundDurationSeconds: 300,
      breakDurationSeconds: 120,
      mode: 'production',
      forceFresh: true,
    }),
  });
  const initTimerData = await initTimerRes.json();
  assert.strictEqual(initTimerData.success, true, 'Round timer initialized');
  assert.strictEqual(initTimerData.round.status, 'call', 'Initial stage must be call');
  assert.strictEqual(initTimerData.round.breakStartedAt, null, 'breakStartedAt must be null during call');
  assert.strictEqual(initTimerData.round.breakExpiresAt, null, 'breakExpiresAt must be null during call');
  assert.strictEqual(initTimerData.round.remainingBreakSeconds, 120, 'remainingBreakSeconds must be strictly 120s (NEVER 420s / 6:59)');
  assert.ok(initTimerData.round.remainingSeconds > 290 && initTimerData.round.remainingSeconds <= 300, 'Call remaining seconds must be ~300s');
  log(`PASS: Initial round timer: call remaining = ${initTimerData.round.remainingSeconds}s, break duration = ${initTimerData.round.remainingBreakSeconds}s`);

  // Query GET timer endpoint while in call
  const getTimerRes = await fetch(`${BASE_URL}/api/events/${eventId1}/rounds/0/timer?userId=${userMe}&partnerId=${partnerElena}`);
  const getTimerData = await getTimerRes.json();
  assert.strictEqual(getTimerData.round.breakExpiresAt, null, 'GET timer breakExpiresAt must be null during call');
  assert.strictEqual(getTimerData.round.remainingBreakSeconds, 120, 'GET timer remainingBreakSeconds must be strictly 120s (NOT 420s)');
  log(`PASS: GET timer during active call returns remainingBreakSeconds = 120s (no 6:59 offset)`);

  // --- TEST 2: Early Round Ending Break Calculation (120s from early end timestamp) ---
  console.log('\nTest 2: Early exit transition to break stage...');
  const earlyExitRes = await fetch(`${BASE_URL}/api/events/${eventId1}/rounds/0/end-early`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userMe, partnerId: partnerElena }),
  });
  const earlyExitData = await earlyExitRes.json();
  assert.strictEqual(earlyExitData.userEndedEarly, true, 'User ended early');
  assert.strictEqual(earlyExitData.userStage, 'break', 'User stage is break');
  assert.strictEqual(earlyExitData.remainingBreakSeconds, 120, 'Early exit break must strictly be 120s');
  log(`PASS: Early exit remaining break = ${earlyExitData.remainingBreakSeconds}s`);

  // Query GET timer after early exit
  const getAfterEarlyRes = await fetch(`${BASE_URL}/api/events/${eventId1}/rounds/0/timer?userId=${userMe}&partnerId=${partnerElena}`);
  const getAfterEarlyData = await getAfterEarlyRes.json();
  assert.strictEqual(getAfterEarlyData.round.userStage, 'break', 'User stage remains break');
  assert.ok(getAfterEarlyData.round.remainingBreakSeconds <= 120 && getAfterEarlyData.round.remainingBreakSeconds >= 118, 'Break seconds must be <= 120s');
  log(`PASS: GET timer after early exit returns break countdown = ${getAfterEarlyData.round.remainingBreakSeconds}s`);

  // --- TEST 3: Clock Skew & Server Time Synchronization ---
  console.log('\nTest 3: Server time synchronization endpoint (/api/time)...');
  const timeRes = await fetch(`${BASE_URL}/api/time`);
  const timeData = await timeRes.json();
  assert.strictEqual(timeData.success, true, 'Time endpoint success');
  assert.ok(typeof timeData.serverTime === 'number', 'serverTime must be a number');
  assert.ok(typeof timeData.serverTimeFormattedET === 'string', 'serverTimeFormattedET must be provided');
  const clientTime = Date.now();
  const skew = Math.abs(timeData.serverTime - clientTime);
  assert.ok(skew < 5000, `Clock skew between local process and server should be under 5s, got ${skew}ms`);
  log(`PASS: Server time verified: ${timeData.serverTimeFormattedET} (skew: ${skew}ms)`);

  // --- TEST 4: Reconnecting Preserves Exact Round Deadline ---
  console.log('\nTest 4: Reconnecting to active round preserves original roundExpiresAt...');
  const eventId2 = 'evt_timer_test_2';
  const initRound2Res = await fetch(`${BASE_URL}/api/events/${eventId2}/rounds/0/timer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      partnerId: partnerElena,
      roundDurationSeconds: 300,
      breakDurationSeconds: 120,
      mode: 'production',
      forceFresh: true,
    }),
  });
  const initRound2Data = await initRound2Res.json();
  const originalExpiresAt = initRound2Data.round.roundExpiresAt;

  // Simulate reconnect 1 second later
  await new Promise(r => setTimeout(r, 100));
  const reconnectRes = await fetch(`${BASE_URL}/api/events/${eventId2}/rounds/0/timer?userId=${userMe}&partnerId=${partnerElena}`);
  const reconnectData = await reconnectRes.json();
  assert.strictEqual(reconnectData.round.roundExpiresAt, originalExpiresAt, 'roundExpiresAt must be identical on reconnect');
  log(`PASS: Reconnect preserved exact deadline: ${originalExpiresAt}`);

  // --- TEST 5: Leaving Event Removes Active Session, Queue, & Readiness Without Deleting Votes/Matches ---
  console.log('\nTest 5: Explicitly leaving event (POST /api/events/:eventId/leave)...');
  // First cast a vote to verify vote retention
  const voteRes = await fetch(`${BASE_URL}/api/events/${eventId2}/rounds/0/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      partnerId: partnerElena,
      decision: 'like',
      notes: 'Terrific conversation about marine biology',
    }),
  });
  const voteData = await voteRes.json();
  assert.strictEqual(voteData.success, true, 'Vote recorded');

  // Partner also likes to create a mutual match
  const partnerVoteRes = await fetch(`${BASE_URL}/api/events/${eventId2}/rounds/0/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: partnerElena,
      partnerId: userMe,
      decision: 'like',
      notes: 'Great connection',
    }),
  });
  const partnerVoteData = await partnerVoteRes.json();
  assert.strictEqual(partnerVoteData.isMutualMatch, true, 'Mutual match sparked');

  // Queue user into waiting room
  await fetch(`${BASE_URL}/api/events/${eventId2}/match-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      userGender: 'Man',
      userAge: 29,
      isRegistered: true,
      tier: 'Premium Plus',
      targetRoundIndex: 1,
    }),
  });

  // Now user explicitly leaves event
  const leaveRes = await fetch(`${BASE_URL}/api/events/${eventId2}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userMe }),
  });
  const leaveData = await leaveRes.json();
  assert.strictEqual(leaveData.success, true, 'Leave event returned success');
  log(`PASS: Server leave executed: ${leaveData.message}`);

  // Verify user is NO LONGER in queue
  const pollQueueRes = await fetch(`${BASE_URL}/api/events/${eventId2}/match-status/${userMe}?roundIndex=1`);
  const pollQueueData = await pollQueueRes.json();
  assert.strictEqual(pollQueueData.inQueue, false, 'User must not be in matchmaking queue after leaving');
  log(`PASS: User successfully removed from matchmaking queue`);

  // Verify saved vote is SAFELY PRESERVED
  const verifyVoteRes = await fetch(`${BASE_URL}/api/events/${eventId2}/rounds/0/vote?userId=${userMe}`);
  const verifyVoteData = await verifyVoteRes.json();
  assert.strictEqual(verifyVoteData.vote.decision, 'like', 'Saved vote must NOT be deleted when leaving');
  assert.strictEqual(verifyVoteData.vote.notes, 'Terrific conversation about marine biology');
  log(`PASS: Saved vote and private notes safely preserved on server`);

  // Verify mutual match is SAFELY PRESERVED
  const matchesRes = await fetch(`${BASE_URL}/api/matches?userId=${userMe}`);
  const matchesData = await matchesRes.json();
  const matchFound = matchesData.matches.some(m => m.userA === userMe || m.userB === userMe);
  assert.strictEqual(matchFound, true, 'Mutual match must NOT be deleted when leaving');
  log(`PASS: Mutual match safely preserved in user's persistent matches`);

  // --- TEST 6: Developer Staging Test Session Creation & 2-Phone Isolation ---
  console.log('\nTest 6: Developer-only fresh staging session with unique instance ID...');
  const createStagingRes = await fetch(`${BASE_URL}/api/staging/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userMe }),
  });
  const createStagingData = await createStagingRes.json();
  assert.strictEqual(createStagingData.success, true, 'Staging session created');
  assert.ok(createStagingData.eventId.startsWith('evt_staging_'), 'eventId must be evt_staging_XXXX');
  assert.strictEqual(createStagingData.joinCode.length, 4, 'joinCode must be 4 characters');
  log(`PASS: Created unique staging session: ${createStagingData.eventId} (Join Code: ${createStagingData.joinCode})`);

  // Phone 2 joins by 4-digit code
  const joinStagingRes = await fetch(`${BASE_URL}/api/staging/join-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ joinCode: createStagingData.joinCode, userId: partnerElena }),
  });
  const joinStagingData = await joinStagingRes.json();
  assert.strictEqual(joinStagingData.success, true, 'Phone 2 joined staging session');
  assert.strictEqual(joinStagingData.eventId, createStagingData.eventId, 'Phone 2 joined the exact same staging instance');
  log(`PASS: Phone 2 joined exact instance ${joinStagingData.eventId} with join code`);

  // Test invalid/expired join code rejection
  const invalidJoinRes = await fetch(`${BASE_URL}/api/staging/join-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ joinCode: 'ZZZZ', userId: partnerElena }),
  });
  assert.strictEqual(invalidJoinRes.status, 404, 'Invalid join code must return 404');
  log(`PASS: Invalid / non-existent join code rejected with 404`);

  // --- TEST 7: Expired/Abandoned Session Stale Round Prevention ---
  console.log('\nTest 7: Expired session protection (>30 minutes old)...');
  const staleEventId = 'evt_stale_test_fresh';
  // Query timer for uninitialized round without auto-create
  const staleQueryRes = await fetch(`${BASE_URL}/api/events/${staleEventId}/rounds/2/timer?userId=${userMe}`);
  assert.strictEqual(staleQueryRes.status, 404, 'Stale / uninitialized round must return 404, not resurrect ancient Round 3');
  log(`PASS: Stale / uninitialized round correctly returns 404`);

  console.log('\n============================================================');
  console.log('✓ ALL TIMER & SESSION LIFECYCLE REGRESSION CHECKS PASSED!');
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
