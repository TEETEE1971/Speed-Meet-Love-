import http from 'http';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      res => {
        let buf = '';
        res.on('data', chunk => (buf += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: buf });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runFiveRoundFlowTest() {
  console.log('=== TEST: Five-Round Progression (Round 3 -> Round 4 -> Round 5 -> Results) ===\n');

  const eventId = 'evt_live_now';
  const userId = 'usr_me';

  // 1. Reset event staging state
  console.log('1. Resetting test rounds state for clean testing...');
  await request('POST', `/api/events/${eventId}/reset-rounds`, { userId });

  // 2. Simulate Round 3 (index 2) with Elena
  console.log('2. Starting Round 3 (index 2) with Elena (usr_03)...');
  const r3 = await request('POST', `/api/events/${eventId}/rounds/2/timer`, {
    userId,
    partnerId: 'usr_03',
    roundDurationSeconds: 300,
    breakDurationSeconds: 120,
    forceFresh: true,
  });
  if (r3.body.round.status !== 'call') {
    throw new Error('FAIL: Round 3 did not start as call');
  }
  console.log('  -> Round 3 started in status: call');

  // 3. End Round 3 early and vote
  console.log('3. Member ends Round 3 early and submits confidential Like vote...');
  await request('POST', `/api/events/${eventId}/rounds/2/end-early`, { userId, partnerId: 'usr_03' });
  const vote3 = await request('POST', `/api/events/${eventId}/rounds/2/vote`, {
    userId,
    partnerId: 'usr_03',
    decision: 'like',
    notes: 'Elena was delightful!',
  });
  if (!vote3.body.success || vote3.body.vote?.decision !== 'like') {
    throw new Error('FAIL: Round 3 vote failed to record');
  }
  console.log('  -> Round 3 vote confirmed by server:', vote3.body.vote.decision);

  // 4. Tap Next Date -> Queue for Round 4 (index 3)
  console.log('4. Member taps Next Date -> Queues for Round 4 (index 3)...');
  const consent4 = await request('POST', `/api/events/${eventId}/consent`, {
    userId,
    partnerId: 'usr_04',
    roundIndex: 3,
    isReady: true,
  });
  if (!consent4.body.userConsented) {
    throw new Error('FAIL: Round 4 consent failed');
  }

  const q4 = await request('POST', `/api/events/${eventId}/match-queue`, {
    userId,
    userName: 'Alex',
    userAge: 29,
    gender: 'Man',
    interestedIn: 'Women',
    tier: 'Premium Plus',
    isRegistered: true,
    roundIndex: 3,
    isReady: true,
    eventId,
  });
  console.log('  -> Waiting in Round 4 queue, status:', q4.body.status);

  // 5. Partner (usr_04 Maya) provides consent for Round 4
  console.log('5. Partner (usr_04 Maya) joins match queue for Round 4...');
  const q4Partner = await request('POST', `/api/events/${eventId}/match-queue`, {
    userId: 'usr_04',
    userName: 'Maya',
    userAge: 30,
    gender: 'Woman',
    interestedIn: 'Men',
    tier: 'Premium Plus',
    isRegistered: true,
    roundIndex: 3,
    isReady: true,
    eventId,
  });
  if (q4Partner.body.status !== 'matched') {
    throw new Error('FAIL: Round 4 mutual matching did not occur');
  }
  console.log('  -> SUCCESS: Matched into Round 4 room:', q4Partner.body.roomName);

  // 6. Round 4 date runs, member ends Round 4 and votes
  console.log('6. Member ends Round 4 and votes on Maya...');
  await request('POST', `/api/events/${eventId}/rounds/3/end-early`, { userId, partnerId: 'usr_04' });
  const vote4 = await request('POST', `/api/events/${eventId}/rounds/3/vote`, {
    userId,
    partnerId: 'usr_04',
    decision: 'like',
    notes: 'Maya is hilarious and warm.',
  });
  if (!vote4.body.success) {
    throw new Error('FAIL: Round 4 vote failed');
  }
  console.log('  -> Round 4 vote confirmed by server:', vote4.body.vote.decision);

  // 7. Member taps Next Date -> Queues for Round 5 (index 4)
  console.log('7. Member taps Next Date -> Queues for Round 5 (index 4)...');
  const consent5 = await request('POST', `/api/events/${eventId}/consent`, {
    userId,
    partnerId: 'usr_05',
    roundIndex: 4,
    isReady: true,
  });
  if (!consent5.body.userConsented) {
    throw new Error('FAIL: Round 5 consent failed');
  }

  const q5 = await request('POST', `/api/events/${eventId}/match-queue`, {
    userId,
    userName: 'Alex',
    userAge: 29,
    gender: 'Man',
    interestedIn: 'Women',
    tier: 'Premium Plus',
    isRegistered: true,
    roundIndex: 4,
    isReady: true,
    eventId,
  });
  console.log('  -> Waiting in Round 5 queue, status:', q5.body.status);

  // 8. Partner (usr_05 Chloe) joins Round 5
  console.log('8. Partner (usr_05 Chloe) provides consent for Round 5...');
  const q5Partner = await request('POST', `/api/events/${eventId}/match-queue`, {
    userId: 'usr_05',
    userName: 'Chloe',
    userAge: 27,
    gender: 'Woman',
    interestedIn: 'Men',
    tier: 'Premium Plus',
    isRegistered: true,
    roundIndex: 4,
    isReady: true,
    eventId,
  });
  if (q5Partner.body.status !== 'matched') {
    throw new Error('FAIL: Round 5 mutual matching did not occur');
  }
  console.log('  -> SUCCESS: Matched into Round 5 room:', q5Partner.body.roomName);

  // 9. Member ends Round 5 and votes
  console.log('9. Member ends Round 5 and votes on Chloe...');
  await request('POST', `/api/events/${eventId}/rounds/4/end-early`, { userId, partnerId: 'usr_05' });
  const vote5 = await request('POST', `/api/events/${eventId}/rounds/4/vote`, {
    userId,
    partnerId: 'usr_05',
    decision: 'pass',
    notes: 'Good conversation, friendly vibe.',
  });
  if (!vote5.body.success) {
    throw new Error('FAIL: Round 5 vote failed');
  }
  console.log('  -> Round 5 vote confirmed by server:', vote5.body.vote.decision);

  // 10. Verify all 5 round votes remain intact and preserved
  console.log('10. Verifying votes for Round 3, Round 4, Round 5 are all intact...');
  const v3Check = await request('GET', `/api/events/${eventId}/rounds/2/vote?userId=${userId}`);
  const v4Check = await request('GET', `/api/events/${eventId}/rounds/3/vote?userId=${userId}`);
  const v5Check = await request('GET', `/api/events/${eventId}/rounds/4/vote?userId=${userId}`);

  if (v3Check.body.vote?.decision !== 'like' || v4Check.body.vote?.decision !== 'like' || v5Check.body.vote?.decision !== 'pass') {
    throw new Error('FAIL: Votes were not properly preserved across 5 rounds!');
  }
  console.log('  -> Round 3 (Elena):', v3Check.body.vote.decision);
  console.log('  -> Round 4 (Maya):', v4Check.body.vote.decision);
  console.log('  -> Round 5 (Chloe):', v5Check.body.vote.decision);

  // 11. Verify Production Mode NEVER invents participants
  console.log('11. Testing production mode participant enforcement (never invent participants)...');
  const unregQueue = await request('POST', `/api/events/${eventId}/match-queue`, {
    userId: 'usr_unregistered_ghost',
    userName: 'Ghost User',
    userAge: 25,
    tier: 'Premium Plus',
    isRegistered: false, // NOT REGISTERED!
    roundIndex: 0,
    isReady: true,
  });
  if (unregQueue.status !== 403 || unregQueue.body.code !== 'NOT_REGISTERED') {
    throw new Error('FAIL: Server allowed unregistered user into matchmaking queue!');
  }
  console.log('  -> PASS: Server rejected unregistered user with 403 NOT_REGISTERED');

  console.log('\n=== ALL FIVE-ROUND FLOW TESTS PASSED FLAWLESSLY! ===');
}

runFiveRoundFlowTest().catch(err => {
  console.error('Five-Round Flow test failed:', err);
  process.exit(1);
});
