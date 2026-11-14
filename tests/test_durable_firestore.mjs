import assert from 'node:assert';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('Testing Cloud Firestore Durable Database Integration');
  console.log('================================================================');

  // Test 1: Check /api/auth/status reports durable database
  console.log('\n[Test 1] Checking /api/auth/status reports durable Cloud Firestore...');
  const statusRes = await fetch(`${BASE_URL}/api/auth/status`);
  const statusData = await statusRes.json();
  assert.strictEqual(statusData.database, 'durable-cloud-firestore', 'database should be durable-cloud-firestore');
  assert.strictEqual(statusData.durableDatabaseActive, true, 'durableDatabaseActive should be true');
  console.log('✓ /api/auth/status confirms durable Cloud Firestore is active');

  // Test 2: Owner sign-in and check diagnostics
  console.log('\n[Test 2] Owner sign-in and verifying storage diagnostics...');
  const ownerSignin = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kristylten@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  const ownerData = await ownerSignin.json();
  assert(ownerSignin.ok, 'Owner sign-in must succeed');
  const ownerToken = ownerData.token;

  const usersRes = await fetch(`${BASE_URL}/api/owner/registered-users`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const usersData = await usersRes.json();
  assert(usersRes.ok, 'Owner registered-users fetch must succeed');
  assert.strictEqual(usersData.storageDiagnostic.storageType, 'durable-cloud-firestore');
  assert.strictEqual(usersData.storageDiagnostic.isDurableDatabaseActive, true);
  assert.strictEqual(usersData.storageDiagnostic.survivesRedeployments, true);
  assert.strictEqual(usersData.storageDiagnostic.consistentAcrossInstances, true);
  console.log('✓ Storage diagnostics confirm durable Firestore with persistence guarantee across container rebuilds');

  // Test 3: Create a test user via signup and verify in Firestore and Registered Users
  console.log('\n[Test 3] Sign up a new user and verify real-time durable persistence...');
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
  console.log('\n[Test 4] Deleting test user account and verifying durable deletion...');
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
  console.log('✓ Deleted user completely removed from durable database');

  // Test 5: Verify preserved accounts in durable database (or backup file if present)
  console.log('\n[Test 5] Verifying durable storage accounts are intact and preserved...');
  const backupExists = fs.existsSync('.data/users_backup_pre_migration.json');
  if (backupExists) {
    const backupContent = JSON.parse(fs.readFileSync('.data/users_backup_pre_migration.json', 'utf8'));
    const backupList = Array.isArray(backupContent) ? backupContent : Object.values(backupContent);
    assert(backupList.some(u => u.userId === 'usr_kristy'), 'Pre-migration backup must contain usr_kristy');
    console.log('✓ Pre-migration backup verified with accounts preserved');
  } else {
    // Durable Firestore is the primary store; verify owner account is safely preserved
    assert(usersAfterDelete.users.some(u => u.isOwner && u.email === 'kristylten@gmail.com'), 'Owner account must be preserved in durable store');
    console.log('✓ Durable Cloud Firestore accounts confirmed preserved without requiring local JSON files');
  }

  console.log('\n================================================================');
  console.log('ALL DURABLE DATABASE CHECKS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
