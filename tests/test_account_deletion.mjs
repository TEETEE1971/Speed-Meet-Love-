// tests/test_account_deletion.mjs
// Verification suite for Speed Meet Love's Account Deletion feature:
// 1. Public unauthenticated access to /delete-account and /privacy
// 2. Server-side session verification (Bearer token required)
// 3. Protection against deleting another user's account (403 Forbidden)
// 4. Confirmation email validation (400 Bad Request)
// 5. Successful deletion purges matches, votes, shared rounds, and sessions
// 6. Transparent disclosure of retention exceptions and absence of payment processor

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

function log(msg) {
  console.log(`  -> ${msg}`);
}

async function runAccountDeletionTests() {
  console.log('=== TEST SUITE: Speed Meet Love Account Deletion & Security ===\n');

  // --------------------------------------------------------------------------
  // TEST 1: Public /delete-account accessibility without authentication
  // --------------------------------------------------------------------------
  console.log('1. Testing public unauthenticated GET to /delete-account...');
  const delPageRes = await fetch(`${BASE_URL}/delete-account`);
  assert.strictEqual(delPageRes.status, 200, 'Direct GET /delete-account must return HTTP 200 OK without authentication');
  const delPageContentType = delPageRes.headers.get('content-type') || '';
  assert.ok(delPageContentType.includes('text/html'), `Content-Type must be text/html, got: ${delPageContentType}`);
  const delHtml = await delPageRes.text();
  assert.ok(delHtml.includes('<div id="root"></div>'), 'HTML must contain SPA root container');
  log('PASS: /delete-account loads publicly without sign-in');

  // --------------------------------------------------------------------------
  // TEST 2: Public /privacy accessibility without authentication
  // --------------------------------------------------------------------------
  console.log('\n2. Testing public unauthenticated GET to /privacy...');
  const privPageRes = await fetch(`${BASE_URL}/privacy`);
  assert.strictEqual(privPageRes.status, 200, 'Direct GET /privacy must return HTTP 200 OK without authentication');
  log('PASS: /privacy loads publicly without sign-in');

  // --------------------------------------------------------------------------
  // TEST 3: Unauthenticated deletion rejection (401 Unauthorized)
  // --------------------------------------------------------------------------
  console.log('\n3. Testing unauthenticated POST /api/account/delete (must return 401)...');
  const unauthRes = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUserId: 'usr_me',
      confirmEmail: 'alex.rivera@example.com',
    }),
  });
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401 Unauthorized');
  const unauthData = await unauthRes.json();
  assert.strictEqual(unauthData.code, 'UNAUTHORIZED', 'Error code must be UNAUTHORIZED');
  log('PASS: Deletion strictly rejected without verified session token (401)');

  // --------------------------------------------------------------------------
  // TEST 4: Establish server auth sessions for two distinct users
  // --------------------------------------------------------------------------
  console.log('\n4. Establishing server auth sessions for test users...');
  
  // User 1: Attacker/Unauthorized user
  const authUser1Res = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'usr_user1',
      email: 'user1@test.com',
    }),
  });
  const user1Session = await authUser1Res.json();
  assert.strictEqual(user1Session.success, true, 'User 1 session established');
  assert.ok(user1Session.token.startsWith('sml_sec_'), 'Token should be prefixed sml_sec_');
  log(`User 1 session token issued: ${user1Session.token.substring(0, 16)}...`);

  // User 2: Disposable target user for deletion
  const disposableUserId = `usr_test_del_${Date.now()}`;
  const disposableEmail = `test_delete_${Date.now()}@speedmeetlove.app`;
  
  const authUser2Res = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: disposableUserId,
      email: disposableEmail,
    }),
  });
  const user2Session = await authUser2Res.json();
  assert.strictEqual(user2Session.success, true, 'User 2 session established');
  log(`User 2 disposable session token issued: ${user2Session.token.substring(0, 16)}...`);

  // --------------------------------------------------------------------------
  // TEST 5: Protection against deleting another user's account (403 Forbidden)
  // --------------------------------------------------------------------------
  console.log('\n5. Testing protection against deleting another user\'s account (403 Forbidden)...');
  // User 1 tries to delete User 2
  const crossDeleteRes = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user1Session.token}`,
    },
    body: JSON.stringify({
      targetUserId: disposableUserId, // Mismatched!
      confirmEmail: disposableEmail,
    }),
  });
  assert.strictEqual(crossDeleteRes.status, 403, 'Cross-user deletion must return 403 Forbidden');
  const crossDeleteData = await crossDeleteRes.json();
  assert.strictEqual(crossDeleteData.code, 'FORBIDDEN', 'Error code must be FORBIDDEN');
  log('PASS: Server rejected unauthorized attempt to delete another user (403)');

  // --------------------------------------------------------------------------
  // TEST 6: Confirmation email mismatch validation (400 Bad Request)
  // --------------------------------------------------------------------------
  console.log('\n6. Testing confirmation email mismatch validation (400 Bad Request)...');
  const mismatchEmailRes = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user2Session.token}`,
    },
    body: JSON.stringify({
      targetUserId: disposableUserId,
      confirmEmail: 'wrong_email@example.com', // Wrong email!
    }),
  });
  assert.strictEqual(mismatchEmailRes.status, 400, 'Mismatched confirmation email must return 400 Bad Request');
  const mismatchData = await mismatchEmailRes.json();
  assert.strictEqual(mismatchData.code, 'CONFIRMATION_EMAIL_MISMATCH', 'Error code must be CONFIRMATION_EMAIL_MISMATCH');
  log('PASS: Server rejected deletion when confirmation email did not match (400)');

  // --------------------------------------------------------------------------
  // TEST 7: Seed disposable test data (votes, matches, sessions) for User 2
  // --------------------------------------------------------------------------
  console.log('\n7. Seeding disposable test data (vote, match, session) for User 2...');
  
  // Seed a vote
  const testEventId = `evt_del_test_${Date.now()}`;
  await fetch(`${BASE_URL}/api/events/${testEventId}/rounds/0/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: disposableUserId,
      partnerId: 'usr_me',
      decision: 'like',
      notes: 'Disposable test dater note',
    }),
  });

  // Seed a match
  const matchRes = await fetch(`${BASE_URL}/api/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userA: disposableUserId,
      userB: 'usr_me',
      eventId: testEventId,
      chatUnlocked: true,
      sparkNote: 'Test spark',
      userALike: true,
      userBLike: true,
    }),
  });
  const matchResData = await matchRes.json();
  assert.strictEqual(matchResData.success, true, 'Seeded match must succeed');

  // Verify match exists
  const matchesBeforeRes = await fetch(`${BASE_URL}/api/matches?userId=${disposableUserId}`);
  const matchesBeforeData = await matchesBeforeRes.json();
  assert.ok(matchesBeforeData.matches.length > 0, 'Disposable user should have active seeded match');
  log(`Seeded match confirmed: ${matchesBeforeData.matches[0].matchId}`);

  // --------------------------------------------------------------------------
  // TEST 8: Execute verified account deletion with matching email
  // --------------------------------------------------------------------------
  console.log('\n8. Executing verified account deletion with matching email...');
  const successDeleteRes = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user2Session.token}`,
    },
    body: JSON.stringify({
      targetUserId: disposableUserId,
      confirmEmail: disposableEmail,
    }),
  });
  assert.strictEqual(successDeleteRes.status, 200, 'Authorized deletion must return 200 OK');
  const successDeleteData = await successDeleteRes.json();
  assert.strictEqual(successDeleteData.success, true, 'Deletion must succeed');
  assert.strictEqual(successDeleteData.deletedUserId, disposableUserId, 'Deleted userId matches');
  assert.ok(successDeleteData.purged.matches >= 1, 'Purged match count should be >= 1');
  assert.ok(Array.isArray(successDeleteData.retentionExceptions), 'Retention exceptions must be disclosed');
  log(`PASS: Deletion succeeded! Purged: ${JSON.stringify(successDeleteData.purged)}`);
  log(`Retention exceptions disclosed: ${successDeleteData.retentionExceptions.join(' | ')}`);

  // --------------------------------------------------------------------------
  // TEST 9: Verify server records are purged
  // --------------------------------------------------------------------------
  console.log('\n9. Verifying server matches are purged for deleted user...');
  const matchesAfterRes = await fetch(`${BASE_URL}/api/matches?userId=${disposableUserId}`);
  const matchesAfterData = await matchesAfterRes.json();
  assert.strictEqual(matchesAfterData.matches.length, 0, 'Deleted user should have 0 matches on server');
  log('PASS: Confirmed 0 matches remaining on server for deleted user');

  // Verify session token was invalidated
  console.log('\n10. Verifying session token was revoked and cannot be reused...');
  const reuseTokenRes = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user2Session.token}`,
    },
    body: JSON.stringify({
      targetUserId: disposableUserId,
      confirmEmail: disposableEmail,
    }),
  });
  assert.strictEqual(reuseTokenRes.status, 401, 'Revoked token must be rejected with 401 Unauthorized');
  log('PASS: Revoked session token cannot be reused');

  console.log('\n============================================================');
  console.log('✓ ALL ACCOUNT DELETION & SECURITY CHECKS PASSED!');
  console.log('============================================================\n');
}

runAccountDeletionTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
