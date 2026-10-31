import http from 'http';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE SECOND-CHANCE DATE & NOTIFICATION TEST SUITE ---');

  // Test 1: VAPID Public Key Endpoint
  console.log('1. Checking VAPID public key availability...');
  const vapidRes = await makeRequest('/api/push/vapid-public-key');
  if (vapidRes.status !== 200 || !vapidRes.data.publicKey) {
    throw new Error('Failed to retrieve VAPID public key: ' + JSON.stringify(vapidRes));
  }
  console.log('✓ VAPID public key generated & retrieved successfully:', vapidRes.data.publicKey.substring(0, 20) + '...');

  // Test 2: Register Web Push Subscription for Member B (usr_03)
  console.log('2. Registering simulated Web Push subscription for Member B (usr_03)...');
  const fakeSub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/fake-test-subscription-token-for-usr-03',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVlJxLs0',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };
  const subRes = await makeRequest('/api/push/subscribe', 'POST', {
    userId: 'usr_03',
    subscription: fakeSub,
  });
  if (subRes.status !== 200 || !subRes.data.success) {
    throw new Error('Failed to register push subscription: ' + JSON.stringify(subRes));
  }
  console.log('✓ Push subscription registered for usr_03.');

  const testEventId = `evt_test_${Date.now()}`;

  // Test 3: Member A (usr_me) requests 10-minute Second-Chance Date with Member B (usr_03)
  console.log('3. Member A (usr_me) requests 10-minute Second-Chance Date with Member B (usr_03)...');
  const reqRes = await makeRequest('/api/second-date/request', 'POST', {
    userA: 'usr_me',
    userB: 'usr_03',
    eventId: testEventId,
  });
  if (reqRes.status !== 200 || !reqRes.data.session) {
    throw new Error('Failed to create second date request: ' + JSON.stringify(reqRes));
  }
  const sessionId = reqRes.data.session.sessionId;
  console.log('✓ Second-chance date invitation created. Session ID:', sessionId);
  console.log('  Status:', reqRes.data.session.status);
  console.log('  UserA Consent:', reqRes.data.session.userAConsent);
  console.log('  UserB Consent:', reqRes.data.session.userBConsent);

  // Test 4: Prevent Duplicate Invitations
  console.log('4. Testing duplicate invitation prevention...');
  const dupRes = await makeRequest('/api/second-date/request', 'POST', {
    userA: 'usr_me',
    userB: 'usr_03',
    eventId: testEventId,
  });
  if (dupRes.status !== 409 || dupRes.data.code !== 'INVITATION_ALREADY_PENDING') {
    throw new Error('Duplicate invitation was not properly rejected with 409: ' + JSON.stringify(dupRes));
  }
  console.log('✓ Duplicate invitation successfully rejected (409 INVITATION_ALREADY_PENDING).');

  // Test 5: Verify Invitation Preserved on Server for Member B
  console.log('5. Querying pending invitations for Member B (usr_03) simulating return to app...');
  const invRes = await makeRequest('/api/second-date/invitations?userId=usr_03');
  if (invRes.status !== 200 || !Array.isArray(invRes.data.invitations)) {
    throw new Error('Failed to fetch invitations for usr_03: ' + JSON.stringify(invRes));
  }
  const pendingForB = invRes.data.invitations.find(i => i.sessionId === sessionId);
  if (!pendingForB) {
    throw new Error('Session ID not found in usr_03 pending invitations!');
  }
  console.log('✓ Invitation preserved on server and found in Member B query:', pendingForB.sessionId);

  // Test 6: Verify Video Call CANNOT Start with Only One Person's Consent
  console.log('6. Verifying video call CANNOT start with only one person\'s consent...');
  const startPrematureRes = await makeRequest('/api/second-date/start', 'POST', {
    sessionId,
    userId: 'usr_me',
  });
  if (startPrematureRes.status !== 403 || startPrematureRes.data.code !== 'MUTUAL_CONSENT_REQUIRED') {
    throw new Error('Premature start was not rejected with 403 MUTUAL_CONSENT_REQUIRED: ' + JSON.stringify(startPrematureRes));
  }
  console.log('✓ Strict mutual consent enforced: Video call blocked until BOTH participants agree (403 MUTUAL_CONSENT_REQUIRED).');

  // Test 7: Member B Declines Quietly Without Disclosing Private Reasons
  console.log('7. Testing decline without exposing private reasons...');
  const declineRes = await makeRequest('/api/second-date/respond', 'POST', {
    sessionId,
    userId: 'usr_03',
    action: 'decline',
  });
  if (declineRes.status !== 200 || declineRes.data.session.status !== 'declined') {
    throw new Error('Failed to decline invitation: ' + JSON.stringify(declineRes));
  }
  if (declineRes.data.session.privateReason !== undefined) {
    throw new Error('Private reason was exposed in declined response!');
  }
  console.log('✓ Quiet decline succeeded without disclosing private reasons.');

  // Test 8: Re-testing new request and Mutual Acceptance
  console.log('8. Creating new second-chance date request and testing mutual acceptance...');
  const newReqRes = await makeRequest('/api/second-date/request', 'POST', {
    userA: 'usr_me',
    userB: 'usr_03',
    eventId: testEventId + '_round2',
  });
  if (newReqRes.status !== 200) {
    throw new Error('Failed to create new second-chance request: ' + JSON.stringify(newReqRes));
  }
  const newSessionId = newReqRes.data.session.sessionId;

  // Member B accepts
  console.log('9. Member B (usr_03) accepts the invitation...');
  const acceptRes = await makeRequest('/api/second-date/respond', 'POST', {
    sessionId: newSessionId,
    userId: 'usr_03',
    action: 'accept',
  });
  if (acceptRes.status !== 200 || acceptRes.data.session.status !== 'ready_to_start') {
    throw new Error('Acceptance failed or did not set status to ready_to_start: ' + JSON.stringify(acceptRes));
  }
  console.log('✓ Member B accepted. Session status updated to ready_to_start.');
  console.log('  userAConsent:', acceptRes.data.session.userAConsent);
  console.log('  userBConsent:', acceptRes.data.session.userBConsent);

  // Test 10: Start video call when BOTH have consented
  console.log('10. Starting 10-minute video date now that BOTH have consented...');
  const startSuccessRes = await makeRequest('/api/second-date/start', 'POST', {
    sessionId: newSessionId,
    userId: 'usr_me',
  });
  if (startSuccessRes.status !== 200 || startSuccessRes.data.session.status !== 'active') {
    throw new Error('Failed to start video date after mutual consent: ' + JSON.stringify(startSuccessRes));
  }
  console.log('✓ 10-minute video date started successfully!');
  console.log('  Room Name:', startSuccessRes.data.session.roomName);
  console.log('  10-min Duration:', (startSuccessRes.data.session.expiresAt - startSuccessRes.data.session.startedAt) / 1000, 'seconds');
  console.log('  LiveKit Token generated for caller:', Boolean(startSuccessRes.data.token));

  console.log('\n--- ALL SECOND-CHANCE DATE & NOTIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
