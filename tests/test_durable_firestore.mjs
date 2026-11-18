import assert from 'node:assert';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('Testing Cloud Firestore Durable Database Integration');
  console.log('================================================================');

  // Test 1: Check /api/auth/status reports storage configuration and real Firestore verification status
  console.log('\n[Test 1] Checking /api/auth/status storage and Firestore verification state...');
  const statusRes = await fetch(`${BASE_URL}/api/auth/status`);
  const statusData = await statusRes.json();
  assert.strictEqual(statusData.database, 'durable-cloud-firestore', 'database should be durable-cloud-firestore');
  assert.strictEqual(statusData.durableDatabaseActive, true, 'Admin SDK client should be configured');
  const verifiedCloudMode = Boolean(statusData.firestoreReadVerified && statusData.firestoreWriteVerified);
  console.log(
    `✓ /api/auth/status configured=${statusData.firestoreConfigured}, readVerified=${statusData.firestoreReadVerified}, writeVerified=${statusData.firestoreWriteVerified}, backend=${statusData.activePersistenceBackend}`
  );

  // Test 2: Owner sign-in and check diagnostics
  console.log('\n[Test 2] Owner sign-in and verifying storage diagnostics...');
  const ownerSignin = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'speedmeetlove@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  const ownerData = await ownerSignin.json();
  assert(ownerSignin.ok, 'Owner sign-in must succeed');
  const ownerToken = ownerData.token;

  const usersRes = await fetch(`${BASE_URL}/api/owner/registered-users`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const usersData = await usersRes.json();
  assert(usersRes.ok, 'Owner registered-users fetch must succeed');
  assert.strictEqual(
    usersData.storageDiagnostic.storageType,
    verifiedCloudMode ? 'durable-cloud-firestore' : 'local-fallback-only'
  );
  assert.strictEqual(usersData.storageDiagnostic.isDurableDatabaseActive, true);
  assert.strictEqual(usersData.storageDiagnostic.survivesRedeployments, verifiedCloudMode);
  assert.strictEqual(usersData.storageDiagnostic.consistentAcrossInstances, verifiedCloudMode);
  console.log(
    verifiedCloudMode
      ? '✓ Storage diagnostics confirm live Cloud Firestore read & write verification'
      : `✓ Storage diagnostics accurately report fallback storage (${usersData.storageDiagnostic.activePersistenceBackend})`
  );

  // Test 3: Create a test user via signup and verify in Registered Users
  console.log('\n[Test 3] Sign up a new user and verify server persistence...');
  const testEmail = `durability.test.${Date.now()}@testdomain.org`;
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'TestPassword123!',
      firstName: 'Durable',
      lastName: 'Tester',
      age: 26,
      gender: 'Woman',
      interestedIn: 'Men',
      location: 'Phoenix, AZ'
    })
  });
  const signupData = await signupRes.json();
  assert(signupRes.ok, `Signup should succeed: ${JSON.stringify(signupData)}`);
  const testUserId = signupData.user.userId || signupData.user.id;
  const testUserToken = signupData.token;
  console.log(`✓ Created test user ${testUserId} (${testEmail})`);

  // Verify user appears in owner list
  const usersAfterSignup = await fetch(`${BASE_URL}/api/owner/registered-users`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  }).then(r => r.json());
  const foundUser = usersAfterSignup.users.find(u => u.userId === testUserId || u.id === testUserId);
  assert(foundUser, 'New user must appear in registered-users list');
  assert.strictEqual(foundUser.email, testEmail);
  console.log('✓ New user immediately reflected in registered users list');

  // Test 4: Delete the user and verify removal
  console.log('\n[Test 4] Deleting test user account and verifying removal...');
  const deleteRes = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testUserToken}`
    },
    body: JSON.stringify({ targetUserId: testUserId, confirmEmail: testEmail })
  });
  const deleteData = await deleteRes.json();
  assert(deleteRes.ok, 'Account deletion must succeed');
  assert(deleteData.success, 'Account deletion must report success');
  console.log('✓ Account deleted successfully');

  // Verify user is gone from owner list
  const usersAfterDelete = await fetch(`${BASE_URL}/api/owner/registered-users`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  }).then(r => r.json());
  const foundAfterDelete = usersAfterDelete.users.find(u => u.userId === testUserId || u.id === testUserId);
  assert(!foundAfterDelete, 'Deleted user must no longer appear in registered users list');
  console.log('✓ Deleted user removed from registered users list');

  // Test 5: Verify owner account preserved in active store
  console.log('\n[Test 5] Verifying owner account preservation...');
  assert(usersAfterDelete.users.some(u => u.isOwner && u.email === 'speedmeetlove@gmail.com'), 'Owner account must be preserved');
  console.log(
    verifiedCloudMode
      ? '✓ Verified live Cloud Firestore read/write persistence'
      : '✓ Passed using local fallback storage (.data/*.json); Cloud Firestore read/write requires running in an authorized runtime'
  );

  console.log('\n================================================================');
  console.log('STORAGE DIAGNOSTIC & PERSISTENCE CHECKS COMPLETED');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
