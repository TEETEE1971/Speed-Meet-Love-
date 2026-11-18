// tests/test_live_event_safety.mjs
// End-to-end verification of Live Event Safety Controls, Real Call Disconnect,
// Moderator Active-Round Removal, Urgent Report Flagging, and 18+ Age Check Enforcement.

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('Starting Speed Meet Love Live-Event Safety & 18+ Age Check Suite');
  console.log('================================================================\n');

  const suffix = Date.now();
  const testEventId = `evt_safety_test_${suffix}`;
  const testRoundIndex = 0;

  // -------------------------------------------------------------
  // 1. Obtain Owner and Member auth tokens via /api/auth/signin
  // -------------------------------------------------------------
  console.log('[Test 1] Signing in Owner and regular Member accounts...');
  const ownerSessionRes = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'speedmeetlove@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  const ownerSessionData = await ownerSessionRes.json();
  assert(ownerSessionData.success && ownerSessionData.token, `Owner sign-in must succeed: ${JSON.stringify(ownerSessionData)}`);
  const ownerToken = ownerSessionData.token;

  const memberSessionRes = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex.rivera@example.com', password: 'SpeedMeetLove2026!' }),
  });
  const memberSessionData = await memberSessionRes.json();
  assert(memberSessionData.success && memberSessionData.token, `Member sign-in must succeed: ${JSON.stringify(memberSessionData)}`);
  const memberToken = memberSessionData.token;
  console.log('✓ Owner and Member authenticated');

  // -------------------------------------------------------------
  // 2. Start an active round timer & test live-round Urgent Reporting
  // -------------------------------------------------------------
  console.log('[Test 2] Initializing active round timer and submitting urgent live-video report...');
  const startTimerRes = await fetch(`${BASE_URL}/api/events/${testEventId}/rounds/${testRoundIndex}/timer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_me',
      partnerId: 'usr_02',
      roundDurationSeconds: 300,
      breakDurationSeconds: 120,
      mode: 'demonstration',
    }),
  });
  assert.strictEqual(startTimerRes.status, 200, 'Round timer start must succeed');

  const reportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
    body: JSON.stringify({
      reportedUserId: 'usr_02',
      reporterId: 'usr_me',
      reason: 'Sexually explicit content or solicitation',
      notes: 'Participant made an explicit sexual solicitation during Round 1.',
      alsoBlock: true,
      source: 'live_video_round',
      eventId: testEventId,
      eventName: 'Friday Singles Night (Test)',
      roundIndex: testRoundIndex,
      roundNumber: 1,
      roundId: `${testEventId}_r0_usr_02_usr_me`,
      participants: [
        { userId: 'usr_me', name: 'Alex Rivera', role: 'reporter' },
        { userId: 'usr_02', name: 'Jordan Lee', role: 'reported' },
      ],
      callEndedOnReport: true,
    }),
  });
  assert.strictEqual(reportRes.status, 201, `Expected 201 Created, got ${reportRes.status}`);
  const reportData = await reportRes.json();
  assert.strictEqual(reportData.success, true);
  assert.strictEqual(reportData.urgent, true, 'Live video round explicit report must be marked urgent');
  assert(reportData.notificationDispatch?.inAppFlagged === true, 'Urgent report must be flagged in-app');
  assert.strictEqual(reportData.report.eventId, testEventId);
  assert.strictEqual(reportData.report.roundNumber, 1);
  assert.strictEqual(reportData.report.callEndedOnReport, true);
  assert(Array.isArray(reportData.report.participants) && reportData.report.participants.length === 2);
  console.log(`✓ Urgent live-video report persisted (${reportData.reportId}), inAppFlagged=${reportData.notificationDispatch.inAppFlagged}`);

  // -------------------------------------------------------------
  // 3. Test Real Call Disconnect Endpoint (/end-call)
  // -------------------------------------------------------------
  console.log('[Test 3] Verifying POST /api/events/:eventId/rounds/:roundIndex/end-call disconnects session...');
  const endCallRes = await fetch(`${BASE_URL}/api/events/${testEventId}/rounds/${testRoundIndex}/end-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_me',
      partnerId: 'usr_02',
      reason: 'reported_partner',
    }),
  });
  assert.strictEqual(endCallRes.status, 200);
  const endCallData = await endCallRes.json();
  assert.strictEqual(endCallData.success, true);
  assert.strictEqual(endCallData.userStage, 'break');

  const timerAfterEndRes = await fetch(
    `${BASE_URL}/api/events/${testEventId}/rounds/${testRoundIndex}/timer?userId=usr_me`
  );
  const timerAfterEnd = await timerAfterEndRes.json();
  assert.strictEqual(timerAfterEnd.round?.userStage, 'break', 'Server timer must advance user stage to break after end-call');
  console.log('✓ end-call cleanly transitioned active call state on server');

  // -------------------------------------------------------------
  // 4. Verify Moderator-Only Security on Active Round Endpoints
  // -------------------------------------------------------------
  console.log('[Test 4] Enforcing Moderator/Owner-Only authorization (401/403)...');
  assert.strictEqual((await fetch(`${BASE_URL}/api/owner/active-rounds`)).status, 401);
  assert.strictEqual(
    (await fetch(`${BASE_URL}/api/owner/active-rounds`, { headers: { Authorization: `Bearer ${memberToken}` } })).status,
    403
  );
  assert.strictEqual(
    (await fetch(`${BASE_URL}/api/owner/reports/urgent-status`, { headers: { Authorization: `Bearer ${memberToken}` } })).status,
    403
  );
  assert.strictEqual(
    (
      await fetch(`${BASE_URL}/api/owner/active-rounds/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ userId: 'usr_02', eventId: testEventId, roundIndex: testRoundIndex }),
      })
    ).status,
    403
  );
  console.log('✓ Non-owner and anonymous requests strictly blocked (401/403)');

  // -------------------------------------------------------------
  // 5. Moderator Lists Active Rounds & Removes Member from Active Round
  // -------------------------------------------------------------
  console.log('[Test 5] Testing Moderator Active Round inspection and member removal...');
  const urgentStatusRes = await fetch(`${BASE_URL}/api/owner/reports/urgent-status`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(urgentStatusRes.status, 200);
  const urgentStatusData = await urgentStatusRes.json();
  assert(urgentStatusData.urgentPendingCount >= 1, 'Owner urgent-status must count urgent pending report');

  const activeRoundsRes = await fetch(`${BASE_URL}/api/owner/active-rounds`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(activeRoundsRes.status, 200);
  const activeRoundsData = await activeRoundsRes.json();
  assert(activeRoundsData.activeRounds.some(r => r.eventId === testEventId), 'Test round must be listed for moderator');

  const removeRes = await fetch(`${BASE_URL}/api/owner/active-rounds/remove-member`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      userId: 'usr_02',
      eventId: testEventId,
      roundIndex: testRoundIndex,
      reportId: reportData.reportId,
      reason: 'Removed during urgent explicit-content report review',
    }),
  });
  assert.strictEqual(removeRes.status, 200);
  const removeData = await removeRes.json();
  assert.strictEqual(removeData.success, true);
  assert.strictEqual(removeData.serverActions.tokenAccessBlocked, true);

  // Confirm removed member timer immediately receives moderator removal signal
  const removedTimerRes = await fetch(
    `${BASE_URL}/api/events/${testEventId}/rounds/${testRoundIndex}/timer?userId=usr_02`
  );
  const removedTimer = await removedTimerRes.json();
  assert.strictEqual(removedTimer.round?.userRemovedByModerator, true, 'Removed participant poll must detect moderator removal');
  assert.strictEqual(removedTimer.round?.userStage, 'removed');

  // Confirm /api/livekit/token blocks removed participant from rejoining that round
  const blockedTokenRes = await fetch(`${BASE_URL}/api/livekit/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_02',
      userName: 'Jordan',
      userAge: 28,
      tier: 'Premium Plus',
      eventId: testEventId,
      partnerId: 'usr_me',
      roundIndex: testRoundIndex,
      mode: 'demonstration',
    }),
  });
  assert.strictEqual(blockedTokenRes.status, 403);
  const blockedTokenData = await blockedTokenRes.json();
  assert.strictEqual(blockedTokenData.code, 'MODERATOR_REMOVED');

  // Confirm /api/events/:eventId/match-queue blocks removed participant
  const blockedQueueRes = await fetch(`${BASE_URL}/api/events/${testEventId}/match-queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_02',
      userAge: 28,
      isRegistered: true,
      roundIndex: testRoundIndex,
      userConfirmed: true,
    }),
  });
  assert.strictEqual(blockedQueueRes.status, 403);
  const blockedQueueData = await blockedQueueRes.json();
  assert.strictEqual(blockedQueueData.code, 'MODERATOR_REMOVED');
  console.log('✓ Moderator removal blocked round tokens, match queue, and signaled client disconnect');

  // -------------------------------------------------------------
  // 6. Verify 18+ Age Check Enforcement on Signup & LiveKit Token Gateway
  // -------------------------------------------------------------
  console.log('[Test 6] Testing 18+ Age Check Fail (<18) and Pass (18+) on server...');
  const underageEmail = `underage_${suffix}@example.com`;
  const underageSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Young',
      lastName: 'User',
      email: underageEmail,
      password: 'Password123!',
      age: 17,
      gender: 'Woman',
      interestedIn: 'Men',
      location: 'New York, NY',
    }),
  });
  assert.strictEqual(underageSignupRes.status, 400, 'Signup with age 17 must be rejected with 400');
  const underageSignupData = await underageSignupRes.json();
  assert.strictEqual(underageSignupData.code, 'UNDERAGE_RESTRICTION');

  const underageTokenRes = await fetch(`${BASE_URL}/api/livekit/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_me',
      userName: 'Alex',
      userAge: 17,
      tier: 'Premium Plus',
      eventId: testEventId,
      partnerId: 'usr_03',
      roundIndex: 1,
      mode: 'demonstration',
    }),
  });
  assert.strictEqual(underageTokenRes.status, 403, 'LiveKit token with age < 18 must be blocked');
  const underageTokenData = await underageTokenRes.json();
  assert.strictEqual(underageTokenData.code, 'ADULT_VERIFICATION_FAILED');

  const adultEmail = `adult_pass_${suffix}@example.com`;
  const adultSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Adult',
      lastName: 'Tester',
      email: adultEmail,
      password: 'Password123!',
      age: 26,
      gender: 'Man',
      interestedIn: 'Women',
      location: 'New York, NY',
    }),
  });
  assert.strictEqual(adultSignupRes.status, 201, `Adult signup age 26 expected 201, got ${adultSignupRes.status}`);
  const adultSignupData = await adultSignupRes.json();
  assert.strictEqual(adultSignupData.success, true);

  // Clean up test account cleanly
  await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adultSignupData.token}`,
    },
    body: JSON.stringify({ userId: adultSignupData.user.UserID }),
  });
  console.log('✓ 18+ age check passed for 26yo and strictly blocked for 17yo across signup & LiveKit token');

  // Clean up test event records from .data files so test data does not clutter owner dashboard
  try {
    const reportsFile = path.join(process.cwd(), '.data/reports.json');
    if (fs.existsSync(reportsFile)) {
      const rList = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
      fs.writeFileSync(
        reportsFile,
        JSON.stringify(
          rList.filter(r => r.id !== reportData.reportId && !(r.eventId && r.eventId.startsWith('evt_safety_test_'))),
          null,
          2
        )
      );
    }
    const removalsFile = path.join(process.cwd(), '.data/round_removals.json');
    if (fs.existsSync(removalsFile)) {
      const remList = JSON.parse(fs.readFileSync(removalsFile, 'utf8'));
      fs.writeFileSync(
        removalsFile,
        JSON.stringify(remList.filter(r => !(r.eventId && r.eventId.startsWith('evt_safety_test_'))), null, 2)
      );
    }
    const roundsFile = path.join(process.cwd(), '.data/shared_rounds.json');
    if (fs.existsSync(roundsFile)) {
      const roundList = JSON.parse(fs.readFileSync(roundsFile, 'utf8'));
      fs.writeFileSync(
        roundsFile,
        JSON.stringify(roundList.filter(r => !(r.eventId && r.eventId.startsWith('evt_safety_test_'))), null, 2)
      );
    }
  } catch (e) {}

  console.log('\n================================================================');
  console.log('ALL LIVE-EVENT SAFETY & 18+ AGE CHECK TESTS PASSED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
