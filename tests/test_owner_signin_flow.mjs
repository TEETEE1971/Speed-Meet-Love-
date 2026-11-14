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
    body: JSON.stringify({ email: 'kristylten@gmail.com', password: 'WrongPassword123!' }),
  });
  assert.strictEqual(badSignRes.status, 401, `Expected 401, got ${badSignRes.status}`);
  const badData = await badSignRes.json();
  assert(!badData.success, 'Success must be false');
  assert(badData.error && badData.error.includes('Invalid email or password'), 'Must return clear error message');
  console.log('✓ Rejected invalid sign-in with clear error message');

  // -------------------------------------------------------------
  // Test 2: Successful owner sign-in (kristylten@gmail.com)
  // -------------------------------------------------------------
  console.log('[Test 2] Testing owner sign-in with kristylten@gmail.com...');
  const signRes = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kristylten@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  assert.strictEqual(signRes.status, 200, `Expected 200, got ${signRes.status}`);
  const signData = await signRes.json();
  assert(signData.success, 'Sign-in should be successful');
  assert(signData.token && signData.token.startsWith('sml_sec_'), 'Should issue a secure session token');
  
  // Verify dual casing compatibility (both UserID and userId must be present)
  assert.strictEqual(signData.user.UserID, 'usr_kristy', 'user.UserID must be usr_kristy for React model');
  assert.strictEqual(signData.user.userId, 'usr_kristy', 'user.userId must be usr_kristy');
  assert.strictEqual(signData.user.FirstName, 'Kristy', 'user.FirstName must be Kristy');
  assert.strictEqual(signData.user.Email, 'kristylten@gmail.com', 'user.Email must be kristylten@gmail.com');
  console.log('✓ Owner sign-in succeeded; token issued and user model has both UserID and userId');

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
  assert.strictEqual(meData.user.Email, 'kristylten@gmail.com', 'meData.user.Email must be kristylten@gmail.com');
  assert.strictEqual(meData.user.FirstName, 'Kristy', 'meData.user.FirstName must be Kristy');
  console.log('✓ GET /api/auth/me successfully validated owner session with full User properties');

  // -------------------------------------------------------------
  // Test 4: Access to Owner Safety & Reports with owner token
  // -------------------------------------------------------------
  console.log('[Test 4] Testing access to Owner Safety & Reports with owner session...');
  const ownerReportsRes = await fetch(`${BASE_URL}/api/owner/reports`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(ownerReportsRes.status, 200, `Expected 200 OK for owner, got ${ownerReportsRes.status}`);
  const ownerReportsData = await ownerReportsRes.json();
  assert(ownerReportsData.success, 'Owner reports access should succeed');
  assert.strictEqual(ownerReportsData.ownerEmail, 'kristylten@gmail.com');
  assert(Array.isArray(ownerReportsData.reports), 'reports must be an array');
  console.log(`✓ Owner session successfully authorized for Owner Safety & Reports (${ownerReportsData.reports.length} reports)`);

  // -------------------------------------------------------------
  // Test 5: Verify non-owner account does not have owner access
  // -------------------------------------------------------------
  console.log('[Test 5] Testing non-owner member cannot access Owner Safety & Reports...');
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
  console.log('✓ Non-owner member authenticated, but strictly forbidden from Owner Safety & Reports (403)');

  console.log('\n================================================================');
  console.log('ALL OWNER SIGN-IN & SESSION PERSISTENCE CHECKS PASSED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
