// tests/test_owner_signin_flow.mjs
// Verification of Owner Sign-In, Session Persistence, User ID/Properties Casing, and Owner Authorization

import assert from 'assert';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('Starting Speed Meet Love Owner Sign-In & Session Tests');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test 1: Wrong password sign-in must fail with clear error
  // -------------------------------------------------------------
  console.log('[Test 1] Testing sign-in with incorrect password...');
  const badSignRes = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'speedmeetlove@gmail.com', password: 'WrongPassword123!' }),
  });
  assert.strictEqual(badSignRes.status, 401, `Expected 401, got ${badSignRes.status}`);
  const badData = await badSignRes.json();
  assert(!badData.success, 'Success must be false');
  assert(badData.error && badData.error.includes('Invalid email or password'), 'Must return clear error message');
  console.log('✓ Rejected invalid sign-in with clear error message');

  // -------------------------------------------------------------
  // Test 2: Successful owner sign-in (speedmeetlove@gmail.com)
  // -------------------------------------------------------------
  console.log('[Test 2] Testing owner sign-in with speedmeetlove@gmail.com...');
  const signRes = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'speedmeetlove@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  assert.strictEqual(signRes.status, 200, `Expected 200, got ${signRes.status}`);
  const signData = await signRes.json();
  assert(signData.success, 'Sign-in should be successful');
  assert(signData.token && signData.token.startsWith('sml_sec_'), 'Should issue a secure session token');
  
  // Verify dual casing compatibility (both UserID and userId must be present)
  assert.strictEqual(signData.user.UserID, 'usr_kristy', 'user.UserID must be usr_kristy for React model');
  assert.strictEqual(signData.user.userId, 'usr_kristy', 'user.userId must be usr_kristy');
  assert.strictEqual(signData.user.FirstName, 'Kristy', 'user.FirstName must be Kristy');
  assert.strictEqual(signData.user.Email, 'speedmeetlove@gmail.com', 'user.Email must be speedmeetlove@gmail.com');
  assert.strictEqual(signData.user.IsOwner, true, 'user.IsOwner must be true');
  console.log('✓ Owner sign-in succeeded; usr_kristy profile & data preserved with speedmeetlove@gmail.com');

  const ownerToken = signData.token;

  // -------------------------------------------------------------
  // Test 3: Session Persistence verification via GET /api/auth/me
  // -------------------------------------------------------------
  console.log('[Test 3] Verifying session validation via GET /api/auth/me...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(meRes.status, 200, `Expected 200, got ${meRes.status}`);
  const meData = await meRes.json();
  assert(meData.success && meData.authenticated, 'Session must be authenticated');
  assert.strictEqual(meData.user.UserID, 'usr_kristy', 'meData.user.UserID must be usr_kristy');
  assert.strictEqual(meData.user.Email, 'speedmeetlove@gmail.com', 'meData.user.Email must be speedmeetlove@gmail.com');
  assert.strictEqual(meData.user.FirstName, 'Kristy', 'meData.user.FirstName must be Kristy');
  assert.strictEqual(meData.user.IsOwner, true, 'meData.user.IsOwner must be true');
  console.log('✓ GET /api/auth/me successfully validated owner session with full User properties');

  // -------------------------------------------------------------
  // Test 4: Access to Owner Safety & Reports + Moderator Controls
  // -------------------------------------------------------------
  console.log('[Test 4] Testing access to Owner Safety & Reports and moderator controls...');
  const ownerReportsRes = await fetch(`${BASE_URL}/api/owner/reports`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(ownerReportsRes.status, 200, `Expected 200 OK for owner, got ${ownerReportsRes.status}`);
  const ownerReportsData = await ownerReportsRes.json();
  assert(ownerReportsData.success, 'Owner reports access should succeed');
  assert.strictEqual(ownerReportsData.ownerEmail, 'speedmeetlove@gmail.com');
  assert(Array.isArray(ownerReportsData.reports), 'reports must be an array');

  const activeRoundsRes = await fetch(`${BASE_URL}/api/owner/active-rounds`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(activeRoundsRes.status, 200, 'Owner must access moderator active-rounds endpoint');
  console.log(`✓ Owner session successfully authorized for Safety & Reports (${ownerReportsData.reports.length} reports) and moderator controls`);

  // -------------------------------------------------------------
  // Test 5: Legacy founder emails & non-owner members have zero owner access
  // -------------------------------------------------------------
  console.log('[Test 5] Verifying outdated founder emails & non-owners cannot access owner endpoints...');
  for (const legacyEmail of ['kristylten@gmail.com', 'kristysback411@gmail.com']) {
    const legacySignRes = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: legacyEmail, password: 'SpeedMeetLove2026!' }),
    });
    assert.strictEqual(legacySignRes.status, 401, `Outdated email ${legacyEmail} must not authenticate as founder`);
  }

  const unauthSimRes = await fetch(`${BASE_URL}/api/events/evt_test/simulate-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enable: true }),
  });
  assert.strictEqual(unauthSimRes.status, 401, 'Unauthenticated simulate-start must return 401');

  const memberSignRes = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex.rivera@example.com', password: 'SpeedMeetLove2026!' }),
  });
  assert.strictEqual(memberSignRes.status, 200);
  const memberData = await memberSignRes.json();
  assert.strictEqual(memberData.user.UserID, 'usr_me');
  assert.strictEqual(memberData.user.FirstName, 'Alex');

  const memberReportsRes = await fetch(`${BASE_URL}/api/owner/reports`, {
    headers: { Authorization: `Bearer ${memberData.token}` },
  });
  assert.strictEqual(memberReportsRes.status, 403, 'Regular member must receive 403 Forbidden on owner reports');

  const memberModRes = await fetch(`${BASE_URL}/api/owner/active-rounds`, {
    headers: { Authorization: `Bearer ${memberData.token}` },
  });
  assert.strictEqual(memberModRes.status, 403, 'Regular member must receive 403 Forbidden on moderator controls');

  const memberSimRes = await fetch(`${BASE_URL}/api/events/evt_test/simulate-start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberData.token}`,
    },
    body: JSON.stringify({ enable: true }),
  });
  assert.strictEqual(memberSimRes.status, 403, 'Regular member must receive 403 Forbidden on simulate-start');
  console.log('✓ Verified: Legacy founder emails & non-owner members strictly blocked from all owner/moderator routes');

  console.log('\n================================================================');
  console.log('ALL OWNER SIGN-IN & SESSION PERSISTENCE CHECKS PASSED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
