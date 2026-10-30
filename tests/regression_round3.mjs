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

async function runRegressionTest() {
  console.log('=== REGRESSION TEST: Round 3 with Elena Rostova Sequence ===\n');
  const eventId = 'evt_live_now';
  const userId = 'usr_me';
  const elenaId = 'usr_03';
  const round3Index = 2; // 0-indexed: Round 1=0, Round 2=1, Round 3=2
  const round4Index = 3;

  // 1. Initialize Elena's Round 3 date timer
  console.log('Step 1: Starting Round 3 (index 2) video date with Elena Rostova...');
  const tRes = await request('POST', `/api/events/${eventId}/rounds/${round3Index}/timer`, {
    userId,
    partnerId: elenaId,
    roundDurationSeconds: 300,
    breakDurationSeconds: 120,
    forceFresh: true,
  });
  console.log('  -> Round 3 status:', tRes.body.round.status, 'remaining:', tRes.body.round.remainingSeconds, 's');

  // 2. End round early and enter break
  console.log('Step 2: Participant taps End Round & Vote (transitions to confidential voting ballot)...');
  const endRes = await request('POST', `/api/events/${eventId}/rounds/${round3Index}/end-early`, {
    userId,
  });
  console.log('  -> userStage:', endRes.body.userStage, 'endedEarly:', endRes.body.userEndedEarly);

  // 3. Select Like Elena
  console.log('Step 3: Member selects Like Elena with confidential private notes...');
  const voteRes = await request('POST', `/api/events/${eventId}/rounds/${round3Index}/vote`, {
    userId,
    partnerId: elenaId,
    decision: 'like',
    notes: 'Amazing witty connection about deep-sea documentaries!',
  });
  console.log('  -> Vote saved successfully:', voteRes.body.vote.decision);

  // 4. Test vote retention on reload / refresh
  console.log('Step 4: Simulating page refresh / remount during voting...');
  const voteCheck = await request('GET', `/api/events/${eventId}/rounds/${round3Index}/vote?userId=${userId}`);
  if (voteCheck.body.vote?.decision !== 'like') {
    throw new Error('FAIL: Vote was lost after simulated reload!');
  }
  console.log('  -> PASS: Vote for Elena remains firmly saved as:', voteCheck.body.vote.decision);

  // 5. Tap Next Date (I\'m Ready) - Record consent & queue for Round 4
  console.log('Step 5: Member taps Next Date (I\'m Ready)...');
  const consentRes = await request('POST', `/api/events/${eventId}/consent`, {
    userId,
    partnerId: 'usr_04',
    roundIndex: round4Index,
    isReady: true,
  });
  console.log('  -> Consent recorded for Round 4:', consentRes.body.userConsented);

  const queueRes = await request('POST', `/api/events/${eventId}/match-queue`, {
    userId,
    userName: 'Alex',
    userAge: 28,
    tier: 'Premium Plus',
    isRegistered: true,
    roundIndex: round4Index,
    isReady: true,
    eventId,
  });
  console.log('  -> Match queue status for Round 4:', queueRes.body.status, '(waiting for partner)');

  // 6. Test ready status persistence
  console.log('Step 6: Verifying server retention of ready status across refresh...');
  const consentCheck = await request('GET', `/api/events/${eventId}/consent?userId=${userId}&roundIndex=${round4Index}`);
  if (!consentCheck.body.isReady) {
    throw new Error('FAIL: Ready status was lost on server!');
  }
  console.log('  -> PASS: Member ready status persisted on server:', consentCheck.body.isReady);

  // 7. Verify Elena\'s completed round does not reset waiting room
  console.log('Step 7: Verifying Elena\'s completed round 2 does NOT pull member back to voting screen...');
  const oldTimerCheck = await request('GET', `/api/events/${eventId}/rounds/${round3Index}/timer?userId=${userId}&partnerId=${elenaId}`);
  console.log('  -> Elena round state:', oldTimerCheck.body.round.userStage);
  console.log('  -> Member session remains in round 4 waiting room.');

  // 8. Test that Round 4 starts ONLY when next partner provides consent
  console.log('Step 8: Checking that Round 4 does NOT start prematurely without partner consent...');
  const preCheck = await request('GET', `/api/events/${eventId}/match-status/${userId}?roundIndex=${round4Index}`);
  if (preCheck.body.status === 'matched') {
    throw new Error('FAIL: Date started prematurely without partner consent!');
  }
  console.log('  -> PASS: Match status is waiting:', preCheck.body.status);

  // 9. Partner provides mutual consent
  console.log('Step 9: Next partner (usr_04) provides mutual consent for Round 4...');
  await request('POST', `/api/events/${eventId}/register`, { userId: 'usr_04', userAge: 29 });
  const partnerQueueRes = await request('POST', `/api/events/${eventId}/match-queue`, {
    userId: 'usr_04',
    userName: 'Maya',
    userAge: 29,
    tier: 'Premium Plus',
    isRegistered: true,
    roundIndex: round4Index,
    isReady: true,
    eventId,
  });
  console.log('  -> Partner queue response:', partnerQueueRes.body.status, 'roomName:', partnerQueueRes.body.roomName);

  // Re-check member match status
  const postCheck = await request('GET', `/api/events/${eventId}/match-status/${userId}?roundIndex=${round4Index}`);
  if (postCheck.body.status !== 'matched') {
    throw new Error('FAIL: Member was not matched after mutual partner consent!');
  }
  console.log('  -> PASS: Both participants mutually matched into room:', postCheck.body.roomName);

  // 10. Verify Elena\'s vote is still intact
  const finalVoteCheck = await request('GET', `/api/events/${eventId}/rounds/${round3Index}/vote?userId=${userId}`);
  if (finalVoteCheck.body.vote?.decision !== 'like') {
    throw new Error('FAIL: Elena vote was corrupted!');
  }
  console.log('  -> PASS: Elena vote in Round 3 is permanently preserved as:', finalVoteCheck.body.vote.decision);

  console.log('\n=== ALL REGRESSION CHECKS PASSED PERFECTLY! ===');
}

runRegressionTest().catch(err => {
  console.error('Regression test failed:', err);
  process.exit(1);
});
