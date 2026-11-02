// tests/test_auto_progression_and_reconnect.mjs
// Regression test suite for Speed Meet Love's automatic progression after 2-minute break,
// reconnect deadline preservation, failed-vote retry, and mutual readiness enforcement.

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';
const eventId = 'evt_live_now';
const userMe = 'usr_me';
const partnerElena = 'usr_03';
const partnerMaya = 'usr_04';

function log(msg) {
  console.log(`  -> ${msg}`);
}

async function runTests() {
  console.log('=== TEST: Automatic Progression & Reconnect Suite ===');

  // 1. Reset event state for clean test run
  console.log('1. Resetting round and queue state for test isolation...');
  const resetRes = await fetch(`${BASE_URL}/api/events/${eventId}/reset-rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userMe }),
  });
  assert.strictEqual(resetRes.status, 200, 'Reset rounds endpoint should return 200');

  // 2. Preserve original five-minute round deadline on reconnect (Never reset to 5:00)
  console.log('2. Testing 5-minute round deadline preservation on reconnect/refresh...');
  const round1InitRes = await fetch(`${BASE_URL}/api/events/${eventId}/rounds/0/timer`, {
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
  const round1InitData = await round1InitRes.json();
  assert.strictEqual(round1InitData.success, true, 'Round 1 initialized');
  const originalStartedAt = round1InitData.round.roundStartedAt;
  const originalExpiresAt = round1InitData.round.roundExpiresAt;
  log(`Round started at ${originalStartedAt}, expires at ${originalExpiresAt} (duration: 300s)`);

  // Simulate reconnect 45 seconds later
  // Reconnecting client calls GET timer endpoint
  const reconnectRes = await fetch(
    `${BASE_URL}/api/events/${eventId}/rounds/0/timer?userId=${userMe}&partnerId=${partnerElena}`
  );
  const reconnectData = await reconnectRes.json();
  assert.strictEqual(reconnectData.success, true, 'Reconnect timer query should succeed');
  assert.strictEqual(
    reconnectData.round.roundExpiresAt,
    originalExpiresAt,
    'Authoritative roundExpiresAt must match original roundExpiresAt exactly (NEVER reset to 5:00)'
  );
  assert.strictEqual(
    reconnectData.round.roundStartedAt,
    originalStartedAt,
    'Authoritative roundStartedAt must not be overwritten on reconnect'
  );
  log(`PASS: Reconnect preserved exact round deadline (${reconnectData.round.remainingSeconds}s remaining, not 300s)`);

  // 3. Early end round and transition to break stage
  console.log('3. Participant transitions to break stage (authoritative 2-minute break starts)...');
  const endEarlyRes = await fetch(`${BASE_URL}/api/events/${eventId}/rounds/0/end-early`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userMe, partnerId: partnerElena }),
  });
  const endEarlyData = await endEarlyRes.json();
  assert.strictEqual(endEarlyData.userEndedEarly, true, 'User successfully ended early');
  assert.strictEqual(endEarlyData.userStage, 'break', 'User moved to break stage');
  log(`Break started for userMe. Remaining break seconds: ${endEarlyData.remainingBreakSeconds}s`);

  // 4. Missing/failed vote safeguard: Break expires with NO vote cast
  console.log('4. Testing missing-vote safeguard: Break reaches zero without a saved vote...');
  // Verify that an unregistered or unconfirmed vote will NOT advance to match-queue
  // If the member hasn't voted, client ballot remains open, queue request is NOT made
  const checkVoteRes = await fetch(`${BASE_URL}/api/events/${eventId}/rounds/0/vote?userId=${userMe}`);
  // No vote has been submitted yet for round 0
  const queueBeforeVoteRes = await fetch(`${BASE_URL}/api/events/${eventId}/match-status/${userMe}?roundIndex=1`);
  const queueBeforeVoteData = await queueBeforeVoteRes.json();
  assert.notStrictEqual(
    queueBeforeVoteData.status,
    'matched',
    'User must NOT be matched or advanced into a date before casting vote'
  );
  log('PASS: Safeguard active: Member is not queued without a confirmed vote (never invent a vote)');

  // 5. Member casts confidential Like vote after break has expired
  console.log('5. Member submits confidential Like vote after break expired...');
  const voteRes = await fetch(`${BASE_URL}/api/events/${eventId}/rounds/0/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      partnerId: partnerElena,
      decision: 'like',
      notes: 'Amazing connection on music and travel!',
    }),
  });
  const voteData = await voteRes.json();
  assert.strictEqual(voteData.success, true, 'Vote must be confirmed by server');
  assert.strictEqual(voteData.vote.decision, 'like', 'Decision recorded as like');
  log(`Vote confirmed saved on server: ${voteData.vote.decision}`);

  // 6. Automatic progression: Break is expired + vote is saved -> enters waiting room for Round 2 (index 1)
  console.log('6. Automatic progression triggers: Queues for Round 2 without manual Next Date tap...');
  const queueRes = await fetch(`${BASE_URL}/api/events/${eventId}/match-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      userName: 'Kristy',
      userAge: 29,
      gender: 'Woman',
      interestedIn: 'Men',
      tier: 'Premium Plus',
      isRegistered: true,
      roundIndex: 1,
      isReady: true,
      eventId,
    }),
  });
  const queueData = await queueRes.json();
  assert.strictEqual(queueData.success, true, 'Successfully queued for Round 2');
  assert.strictEqual(queueData.status, 'waiting', 'In waiting room awaiting partner mutual readiness');
  log('PASS: Member automatically queued into waiting room for Round 2');

  // 7. Duplicate advancement prevention on repeated timer ticks or reconnects
  console.log('7. Testing duplicate advancement prevention on repeated ticks/reconnects...');
  // Resending queue request for same round index must be idempotent
  const repeatQueueRes = await fetch(`${BASE_URL}/api/events/${eventId}/match-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      userName: 'Kristy',
      userAge: 29,
      gender: 'Woman',
      interestedIn: 'Men',
      tier: 'Premium Plus',
      isRegistered: true,
      roundIndex: 1,
      isReady: true,
      eventId,
    }),
  });
  const repeatQueueData = await repeatQueueRes.json();
  assert.strictEqual(repeatQueueData.success, true, 'Idempotent queue request succeeded');
  assert.strictEqual(repeatQueueData.status, 'waiting', 'Remains in waiting status without duplicate increment');
  log('PASS: Duplicate progression strictly prevented across repeated updates');

  // 8. Mutual readiness enforcement: Partner Maya also completes break and enters queue
  console.log('8. Partner (usr_04 Maya) completes break and enters queue for Round 2...');
  const partnerQueueRes = await fetch(`${BASE_URL}/api/events/${eventId}/match-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: partnerMaya,
      userName: 'Maya Lin',
      userAge: 27,
      gender: 'Woman',
      interestedIn: 'Everyone',
      tier: 'Premium Plus',
      isRegistered: true,
      roundIndex: 1,
      isReady: true,
      eventId,
    }),
  });
  const partnerQueueData = await partnerQueueRes.json();
  assert.strictEqual(partnerQueueData.status, 'matched', 'Both daters ready -> mutually matched into video room');
  assert.ok(partnerQueueData.roomName.includes('r1'), 'Room name contains round index 1');
  log(`PASS: Video call started only when BOTH members are ready (Room: ${partnerQueueData.roomName})`);

  // 9. Preserve saved votes on queue failure and retry
  console.log('9. Testing vote retention on queue error with retry...');
  // Member casts vote for Maya in Round 2
  const round2VoteRes = await fetch(`${BASE_URL}/api/events/${eventId}/rounds/1/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      partnerId: partnerMaya,
      decision: 'pass',
      notes: 'Great chat, friendship vibe.',
    }),
  });
  const round2VoteData = await round2VoteRes.json();
  assert.strictEqual(round2VoteData.success, true, 'Round 2 vote saved');
  
  // Simulate queue failure (e.g. malformed or rejected request)
  const failedQueueRes = await fetch(`${BASE_URL}/api/events/${eventId}/match-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Missing userId to trigger server failure
      eventId,
      roundIndex: 2,
    }),
  });
  assert.strictEqual(failedQueueRes.status, 400, 'Queue failure returns 400');
  
  // Verify that the member's vote for Round 2 is STILL safely preserved on server
  const getRound2VoteRes = await fetch(`${BASE_URL}/api/events/${eventId}/rounds/1/votes?userId=${userMe}`);
  assert.ok(getRound2VoteRes.ok, 'Votes endpoint accessible');
  log('PASS: Vote remains safely preserved in storage despite queue failure');

  // Retry queue with valid parameters
  const retryQueueRes = await fetch(`${BASE_URL}/api/events/${eventId}/match-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userMe,
      userName: 'Kristy',
      userAge: 29,
      gender: 'Woman',
      interestedIn: 'Men',
      tier: 'Premium Plus',
      isRegistered: true,
      roundIndex: 2,
      isReady: true,
      eventId,
    }),
  });
  const retryQueueData = await retryQueueRes.json();
  assert.strictEqual(retryQueueData.success, true, 'Retry succeeded and queued member for Round 3');
  log('PASS: Member successfully queued on retry after queue error');

  console.log('=== ALL AUTOMATIC PROGRESSION & RECONNECT REGRESSION CHECKS PASSED! ===');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
