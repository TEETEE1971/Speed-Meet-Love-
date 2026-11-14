import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('Starting Owner Tester Privileges & Entitlements Test Suite');
  console.log('================================================================');

  // Step 1: Sign in Owner
  console.log('\n[Step 1] Owner sign-in (kristylten@gmail.com)...');
  const ownerSignin = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kristylten@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  const ownerData = await ownerSignin.json();
  assert(ownerSignin.ok && ownerData.success, 'Owner sign-in must succeed');
  const ownerToken = ownerData.token;
  console.log('  ✓ Owner signed in successfully');

  // Step 2: Create a standard non-owner member (Free tier)
  console.log('\n[Step 2] Creating standard non-owner user...');
  const testEmail = `tester.member.${Date.now()}@realmail.test`;
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'StandardPassword123!',
      firstName: 'Regular',
      lastName: 'User',
      age: 27,
      gender: 'Man',
      interestedIn: 'Women',
      location: 'Brooklyn, NY',
    }),
  });
  const signupData = await signupRes.json();
  assert(signupRes.ok && signupData.success, 'Standard signup must succeed');
  const userToken = signupData.token;
  const userId = signupData.user.userId || signupData.user.UserID;
  assert.strictEqual(signupData.user.subscriptionTier, 'Free', 'New user must start on Free tier');
  assert.strictEqual(signupData.user.isTester, false, 'New user must not be a tester');
  console.log(`  ✓ Regular user created: ${userId} (${testEmail}) on Free tier`);

  // Step 3: Verify unauthenticated and non-owner access rejection
  console.log('\n[Step 3] Verifying authorization boundaries for tester endpoints...');
  // Unauthenticated
  const unauthGet = await fetch(`${BASE_URL}/api/owner/testers`);
  assert.strictEqual(unauthGet.status, 401, 'Unauthenticated GET /api/owner/testers must return 401');

  const unauthPost = await fetch(`${BASE_URL}/api/owner/testers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, action: 'grant' }),
  });
  assert.strictEqual(unauthPost.status, 401, 'Unauthenticated POST /api/owner/testers must return 401');

  // Non-owner member
  const nonOwnerGet = await fetch(`${BASE_URL}/api/owner/testers`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.strictEqual(nonOwnerGet.status, 403, 'Non-owner GET /api/owner/testers must return 403 Forbidden');

  const nonOwnerPost = await fetch(`${BASE_URL}/api/owner/testers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ email: testEmail, action: 'grant' }),
  });
  assert.strictEqual(nonOwnerPost.status, 403, 'Non-owner POST /api/owner/testers must return 403 Forbidden');
  console.log('  ✓ Tester endpoints strictly protected: 401 for anonymous, 403 for standard members');

  // Step 4: Verify server blocks Free member from messaging & live speed dating
  console.log('\n[Step 4] Verifying server enforces Free tier limits before tester grant...');
  const msgBlockRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      matchId: 'match_test_01',
      text: 'Hello from free user',
      recipientId: 'usr_kristy',
    }),
  });
  assert.strictEqual(msgBlockRes.status, 403, 'Free member must be blocked from messaging');
  const msgBlockData = await msgBlockRes.json();
  assert.strictEqual(msgBlockData.code, 'SUBSCRIPTION_REQUIRED');

  const eventBlockRes = await fetch(`${BASE_URL}/api/events/evt_friday_dating/match-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      userId,
      userAge: 27,
      isRegistered: true,
      eventId: 'evt_friday_dating',
      tier: 'Free',
    }),
  });
  assert.strictEqual(eventBlockRes.status, 403, 'Free member must be blocked from live speed-dating events');
  const eventBlockData = await eventBlockRes.json();
  assert.strictEqual(eventBlockData.code, 'PREMIUM_PLUS_REQUIRED');
  console.log('  ✓ Free user confirmed blocked from messaging and live events');

  // Step 5: Owner grants Free Premium Plus tester access via email
  console.log('\n[Step 5] Owner grants Free Premium Plus tester access via email...');
  const grantRes = await fetch(`${BASE_URL}/api/owner/testers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      email: testEmail,
      action: 'grant',
      notes: 'Testing beta features',
    }),
  });
  const grantData = await grantRes.json();
  assert(grantRes.ok && grantData.success, 'Grant request must succeed');
  assert.strictEqual(grantData.action, 'grant');
  assert.strictEqual(grantData.userRegistered, true);
  assert.strictEqual(grantData.user.subscriptionTier, 'Premium Plus');
  assert.strictEqual(grantData.user.isTester, true);
  assert.strictEqual(grantData.user.testerAccessGranted, true);
  console.log('  ✓ Tester access successfully granted: user upgraded to Premium Plus without Stripe card');

  // Step 6: Verify user now has full Premium Plus features on server
  console.log('\n[Step 6] Verifying user can now access messaging and live events on server...');
  // Verify /api/auth/me returns updated tier and tester status
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const meData = await meRes.json();
  assert(meRes.ok && meData.success);
  assert.strictEqual(meData.user.SubscriptionTier, 'Premium Plus');
  assert.strictEqual(meData.user.IsTester, true);

  // Verify messaging to partner who also has access (usr_kristy has owner/tester access)
  const msgAllowRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      matchId: 'match_test_01',
      text: 'Hello from tester with free Premium Plus!',
      recipientId: 'usr_kristy',
    }),
  });
  assert(msgAllowRes.ok, `Tester messaging must succeed: ${msgAllowRes.status}`);
  console.log('  ✓ Messaging permitted after mutual match for granted tester');

  // Verify live speed dating admission
  const eventAllowRes = await fetch(`${BASE_URL}/api/events/evt_friday_dating/match-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      userId,
      userAge: 27,
      isRegistered: true,
      eventId: 'evt_friday_dating',
      tier: 'Premium Plus',
    }),
  });
  assert(eventAllowRes.ok, `Tester event admission must succeed: ${eventAllowRes.status}`);
  console.log('  ✓ Live speed-dating event admission permitted for granted tester');

  // Step 7: Verify Owner Manifest includes granted tester
  console.log('\n[Step 7] Checking Owner Testers Manifest (/api/owner/testers)...');
  const manifestRes = await fetch(`${BASE_URL}/api/owner/testers`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const manifestData = await manifestRes.json();
  assert(manifestRes.ok && manifestData.success);
  const foundTester = manifestData.testers.find(t => t.email === testEmail);
  assert(foundTester, 'Granted tester must be present in owner testers list');
  assert.strictEqual(foundTester.isRegistered, true);
  assert.strictEqual(foundTester.userId, userId);
  console.log('  ✓ Owner testers manifest accurately displays granted tester');

  // Step 8: Pre-authorization test: Grant tester access BEFORE account signs up
  console.log('\n[Step 8] Testing Pre-Authorization: Granting access before signup...');
  const futureTesterEmail = `future.tester.${Date.now()}@realmail.test`;
  const preGrantRes = await fetch(`${BASE_URL}/api/owner/testers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      email: futureTesterEmail,
      action: 'grant',
      notes: 'Pre-registered tester',
    }),
  });
  const preGrantData = await preGrantRes.json();
  assert(preGrantRes.ok && preGrantData.success);
  assert.strictEqual(preGrantData.userRegistered, false, 'User not registered yet');

  // Now the user signs up
  const futureSignupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: futureTesterEmail,
      password: 'PreAuthorized123!',
      firstName: 'Future',
      lastName: 'Tester',
      age: 29,
      gender: 'Woman',
      interestedIn: 'Men',
      location: 'Miami, FL',
    }),
  });
  const futureSignupData = await futureSignupRes.json();
  assert(futureSignupRes.ok && futureSignupData.success);
  assert.strictEqual(futureSignupData.user.subscriptionTier, 'Premium Plus');
  assert.strictEqual(futureSignupData.user.isTester, true);
  assert.strictEqual(futureSignupData.user.testerAccessGranted, true);
  console.log('  ✓ Pre-authorized tester immediately receives Premium Plus upon registration');

  // Step 9: Owner removes tester access
  console.log('\n[Step 9] Owner removes tester access for first user...');
  const removeRes = await fetch(`${BASE_URL}/api/owner/testers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      email: testEmail,
      action: 'remove',
    }),
  });
  const removeData = await removeRes.json();
  assert(removeRes.ok && removeData.success);
  assert.strictEqual(removeData.action, 'remove');
  assert.strictEqual(removeData.user.subscriptionTier, 'Free');
  assert.strictEqual(removeData.user.isTester, false);

  // Verify access is revoked on server
  const revokedMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const revokedMeData = await revokedMeRes.json();
  assert.strictEqual(revokedMeData.user.SubscriptionTier, 'Free');
  assert.strictEqual(revokedMeData.user.IsTester, false);

  const revokedEventRes = await fetch(`${BASE_URL}/api/events/evt_friday_dating/match-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      userId,
      userAge: 27,
      isRegistered: true,
      eventId: 'evt_friday_dating',
      tier: 'Free',
    }),
  });
  assert.strictEqual(revokedEventRes.status, 403, 'Revoked tester must be blocked again');
  console.log('  ✓ Tester access successfully revoked: user reverted to Free and blocked from live events');

  // Step 10: Verify owner cannot remove own access
  console.log('\n[Step 10] Testing owner self-removal protection...');
  const ownerProtectRes = await fetch(`${BASE_URL}/api/owner/testers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      email: 'kristylten@gmail.com',
      action: 'remove',
    }),
  });
  assert.strictEqual(ownerProtectRes.status, 400, 'Owner self-removal must be rejected');
  console.log('  ✓ Owner account protected against accidental privilege revocation');

  // Cleanup: Delete disposable test accounts
  console.log('\n[Cleanup] Deleting disposable test accounts...');
  await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ targetUserId: userId, confirmEmail: testEmail }),
  });
  await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${futureSignupData.token}` },
    body: JSON.stringify({ targetUserId: futureSignupData.user.userId, confirmEmail: futureTesterEmail }),
  });
  // Clean up futureTesterEmail from granted list
  await fetch(`${BASE_URL}/api/owner/testers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ email: futureTesterEmail, action: 'remove' }),
  });
  console.log('  ✓ Disposable accounts cleaned up successfully');

  console.log('\n================================================================');
  console.log('ALL OWNER TESTER PRIVILEGE TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
