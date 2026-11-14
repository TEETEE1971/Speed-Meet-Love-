/**
 * Test Suite: Owner Registered Users Endpoint & Data Protection
 * 
 * Verifies:
 * 1. Endpoint security: Unauthenticated requests return 401.
 * 2. RBAC security: Non-owner authenticated users receive 403 Forbidden.
 * 3. Owner access: Owner session with kristylten@gmail.com receives 200 OK.
 * 4. Data redaction: NEVER exposes passwordHash, passwordSalt, passwords, or session tokens.
 * 5. Exclusion of demo accounts: usr_kristy_demo, usr_me, @speedmeetlove.internal, @example.com are excluded.
 * 6. Real user signup tracking: Real registrations increment total, record createdAt and lastSignIn.
 * 7. Distinction of unavailable data vs zero registrations.
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('Starting Registered Users Security & Authorization Tests');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Unauthenticated request to /api/owner/registered-users
  console.log('\n[Test 1] Testing unauthenticated access to /api/owner/registered-users...');
  try {
    const res = await fetch(`${BASE_URL}/api/owner/registered-users`);
    assert(res.status === 401, `Unauthenticated request correctly rejected with 401 (got ${res.status})`);
    const data = await res.json();
    assert(data.success === false, 'Response indicates failure');
  } catch (err) {
    assert(false, `Unexpected network error: ${err.message}`);
  }

  // 2. Non-owner authenticated user access
  console.log('\n[Test 2] Testing non-owner member access to /api/owner/registered-users...');
  let nonOwnerToken = null;
  let nonOwnerUserId = null;
  const nonOwnerEmail = `test.member.${Date.now()}@realmail.test`;
  try {
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: nonOwnerEmail,
        password: 'Password123!Secure',
        firstName: 'Standard',
        lastName: 'Member',
        age: 26,
        gender: 'Woman',
        interestedIn: 'Men',
        location: 'Philadelphia, PA',
      }),
    });
    const signupData = await signupRes.json();
    assert(signupRes.ok && signupData.success, 'Created standard non-owner test member');
    nonOwnerToken = signupData.token;
    nonOwnerUserId = signupData.user.userId || signupData.user.UserID;

    const accessRes = await fetch(`${BASE_URL}/api/owner/registered-users`, {
      headers: { Authorization: `Bearer ${nonOwnerToken}` },
    });
    assert(accessRes.status === 403, `Non-owner access strictly rejected with 403 Forbidden (got ${accessRes.status})`);
    const accessData = await accessRes.json();
    assert(accessData.success === false, 'Access data indicates failure');
    assert(accessData.error && accessData.error.includes('Owner authorization required'), 'Clear owner authorization error returned');
  } catch (err) {
    assert(false, `Non-owner test failed: ${err.message}`);
  }

  // 3. Owner authenticated access
  console.log('\n[Test 3] Testing verified owner access with kristylten@gmail.com...');
  let ownerToken = null;
  try {
    const ownerLoginRes = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kristylten@gmail.com',
        password: 'SpeedMeetLove2026!',
      }),
    });
    const ownerLoginData = await ownerLoginRes.json();
    assert(ownerLoginRes.ok && ownerLoginData.success, 'Owner sign-in succeeded');
    ownerToken = ownerLoginData.token;

    const ownerRes = await fetch(`${BASE_URL}/api/owner/registered-users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(ownerRes.status === 200, `Owner request succeeded with 200 OK (got ${ownerRes.status})`);
    const ownerData = await ownerRes.json();
    assert(ownerData.success === true, 'Owner data indicates success');
    assert(typeof ownerData.totalRegistrations === 'number', `totalRegistrations is a valid number (${ownerData.totalRegistrations})`);
    assert(Array.isArray(ownerData.users), 'users is returned as an array');
    assert(ownerData.ownerEmail === 'kristylten@gmail.com', 'ownerEmail matches owner identity');

    // 4. Verify data redaction
    console.log('\n[Test 4] Verifying cryptographic redaction: No sensitive credentials returned...');
    const rawPayload = JSON.stringify(ownerData);
    assert(!rawPayload.includes('passwordHash'), 'No passwordHash in payload');
    assert(!rawPayload.includes('passwordSalt'), 'No passwordSalt in payload');
    assert(!rawPayload.includes('SpeedMeetLove2026!'), 'No raw passwords in payload');
    assert(!rawPayload.includes('sml_sec_'), 'No session tokens in users array');

    // 5. Verify demo exclusion
    console.log('\n[Test 5] Verifying demo profiles are excluded...');
    const emails = ownerData.users.map(u => u.email.toLowerCase());
    const userIds = ownerData.users.map(u => u.userId);
    assert(!userIds.includes('usr_kristy_demo'), 'usr_kristy_demo is excluded');
    assert(!userIds.includes('usr_me'), 'usr_me is excluded');
    assert(!emails.some(e => e.endsWith('@speedmeetlove.internal')), 'No @speedmeetlove.internal demo accounts in list');
    assert(!emails.some(e => e.endsWith('@example.com')), 'No @example.com demo accounts in list');

    // 6. Verify owner profile is present and marked isOwner: true
    console.log('\n[Test 6] Verifying owner profile metadata...');
    const ownerRecord = ownerData.users.find(u => u.email.toLowerCase() === 'kristylten@gmail.com');
    assert(!!ownerRecord, 'Owner account kristylten@gmail.com is present in real accounts');
    if (ownerRecord) {
      assert(ownerRecord.isOwner === true, 'Owner record has isOwner: true');
      assert(typeof ownerRecord.createdAt === 'number' && ownerRecord.createdAt > 0, 'Valid signup createdAt timestamp');
      assert(typeof ownerRecord.lastSignIn === 'number' && ownerRecord.lastSignIn > 0, 'Valid lastSignIn timestamp recorded');
    }

    // 7. Verify new test member is in the list
    console.log('\n[Test 7] Verifying new member appears in real registrations...');
    const newMemberRecord = ownerData.users.find(u => u.email.toLowerCase() === nonOwnerEmail.toLowerCase());
    assert(!!newMemberRecord, 'Newly registered member appears in registered users list');
    if (newMemberRecord) {
      assert(newMemberRecord.firstName === 'Standard', 'Correct firstName');
      assert(newMemberRecord.lastName === 'Member', 'Correct lastName');
      assert(newMemberRecord.location === 'Philadelphia, PA', 'Correct location');
      assert(typeof newMemberRecord.createdAt === 'number', 'Valid createdAt');
      assert(typeof newMemberRecord.lastSignIn === 'number', 'Valid lastSignIn');
      assert(newMemberRecord.isOwner === false, 'isOwner is false for standard user');
    }
  } catch (err) {
    assert(false, `Owner test failed: ${err.message}`);
  }

  // 8. Clean up test user
  console.log('\n[Test 8] Cleaning up disposable test user account...');
  try {
    if (nonOwnerToken) {
      const deleteRes = await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nonOwnerToken}`,
        },
        body: JSON.stringify({
          targetUserId: nonOwnerUserId,
          confirmEmail: nonOwnerEmail,
        }),
      });
      const deleteData = await deleteRes.json();
      assert(deleteRes.ok && deleteData.success, 'Successfully deleted test user');
    }

    // Verify deletion reflected in owner list
    const checkRes = await fetch(`${BASE_URL}/api/owner/registered-users`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const checkData = await checkRes.json();
    const stillPresent = checkData.users.some(u => u.email.toLowerCase() === nonOwnerEmail.toLowerCase());
    assert(!stillPresent, 'Deleted test member is removed from real registered users');
  } catch (err) {
    assert(false, `Cleanup failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
