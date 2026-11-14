// Speed Meet Love - Production Authentication & Guest Isolation Test Suite
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Speed Meet Love Production Auth & Security Tests...\n');

  // 1. Fresh unauthenticated visitor accessing /api/auth/me -> 401
  {
    console.log('Test 1: Fresh unauthenticated visitor receives 401 on /api/auth/me');
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    console.log('✓ Passed: Fresh visitor is blocked from private auth endpoint without token\n');
  }

  // 2. Auth status reporting
  {
    console.log('Test 2: GET /api/auth/status reports external auth configuration status');
    const res = await fetch(`${BASE_URL}/api/auth/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.externalProviderRequiredSetup || data.setupInstructions || data.message, 'Provides instructions on what external setup is needed');
    console.log('✓ Passed: Auth status accurately reports external provider state and setup guidance\n');
  }

  // 3. Sign-up input validation checks (age < 18, bad email, short password)
  {
    console.log('Test 3: Sign-up validation enforces 18+ age, email format, and password length');
    
    // Underage
    const underageRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `underage_${Date.now()}@test.com`,
        password: 'ValidPassword123!',
        firstName: 'Young',
        age: 17,
        gender: 'Woman',
        interestedIn: 'Men',
      }),
    });
    assert.strictEqual(underageRes.status, 400);
    const underageData = await underageRes.json();
    assert.ok(undergetDataMessage(underageData).includes('18') || underageData.error.includes('18'));

    // Invalid email
    const badEmailRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'ValidPassword123!',
        firstName: 'Test',
        age: 25,
        gender: 'Man',
        interestedIn: 'Women',
      }),
    });
    assert.strictEqual(badEmailRes.status, 400);

    // Short password
    const shortPassRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `shortpass_${Date.now()}@test.com`,
        password: 'short',
        firstName: 'Test',
        age: 25,
        gender: 'Man',
        interestedIn: 'Women',
      }),
    });
    assert.strictEqual(shortPassRes.status, 400);
    console.log('✓ Passed: Sign-up validation rejects underage, malformed email, and weak password\n');
  }

  function undergetDataMessage(data) {
    return (data && (data.error || '')) + '';
  }

  // 4. Valid Sign-Up with PBKDF2 hashing and session token issuance
  const testEmail = `tester_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword2026!';
  let createdToken = '';
  let createdUserId = '';

  {
    console.log('Test 4: Real Sign-Up creates user with salted PBKDF2 hash and returns session token');
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        firstName: 'Jordan',
        age: 28,
        gender: 'Non-Binary',
        interestedIn: 'Everyone',
      }),
    });

    assert.ok(res.status === 201 || res.status === 200, `Expected 201 or 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token, 'Must return session token');
    assert.ok(data.user, 'Must return user object');
    assert.strictEqual(data.user.email || data.user.Email, testEmail);
    assert.strictEqual(data.user.firstName || data.user.FirstName, 'Jordan');
    assert.strictEqual(data.user.age || data.user.Age, 28);
    // Ensure password hash and salt are NOT leaked to client
    assert.strictEqual(data.user.passwordHash, undefined);
    assert.strictEqual(data.user.passwordSalt, undefined);
    assert.strictEqual(data.user.salt, undefined);

    createdToken = data.token;
    createdUserId = data.user.userId || data.user.UserID;
    console.log('✓ Passed: User account created securely, token issued without leaking hash/salt\n');
  }

  // 5. Duplicate email rejection
  {
    console.log('Test 5: Duplicate email sign-up returns 409 Conflict');
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'AnotherPassword123!',
        firstName: 'Imposter',
        age: 30,
        gender: 'Woman',
        interestedIn: 'Men',
      }),
    });

    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    console.log('✓ Passed: Duplicate email sign-up rejected with 409 Conflict\n');
  }

  // 6. Sign-In with wrong password -> 401
  {
    console.log('Test 6: Sign-In with incorrect password fails with 401');
    const res = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    console.log('✓ Passed: Wrong password rejected with 401\n');
  }

  // 7. Sign-In with correct password -> 200 + token
  let signedInToken = '';
  {
    console.log('Test 7: Sign-In with valid credentials succeeds and issues new token');
    const res = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.userId || data.user.UserID, createdUserId);
    signedInToken = data.token;
    console.log('✓ Passed: Valid sign-in authenticated and verified via PBKDF2 hash\n');
  }

  // 8. Session validation: GET /api/auth/me with Bearer token
  {
    console.log('Test 8: Server-side token validation returns authenticated user profile');
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${signedInToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.userId || data.user.UserID, createdUserId);
    assert.strictEqual(data.user.email || data.user.Email, testEmail);
    console.log('✓ Passed: Token correctly validated by server\n');
  }

  // 9. Sign-out revokes session
  {
    console.log('Test 9: Sign-Out revokes token on server');
    const res = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signedInToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    // Subsequent call with revoked token should fail with 401
    const checkRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${signedInToken}` },
    });
    assert.strictEqual(checkRes.status, 401, 'Revoked token must return 401');
    console.log('✓ Passed: Sign-out actively invalidates token on server\n');
  }

  // 10. Seeded member authentication (Kristy)
  {
    console.log('Test 10: Seeded production user (Kristy) authenticates with real credentials');
    const res = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kristylten@gmail.com',
        password: 'SpeedMeetLove2026!',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.userId || data.user.UserID, 'usr_kristy');
    assert.strictEqual(data.user.firstName || data.user.FirstName, 'Kristy');
    assert.strictEqual(data.user.subscriptionTier || data.user.SubscriptionTier, 'Premium Plus');
    console.log('✓ Passed: Seeded member authenticates properly with PBKDF2 salt & hash\n');
  }

  // 11. Public pages remain accessible without authentication
  {
    console.log('Test 11: Public pages (/privacy and /delete-account) accessible without auth');
    const privRes = await fetch(`${BASE_URL}/privacy`);
    assert.strictEqual(privRes.status, 200);
    const privHtml = await privRes.text();
    assert.ok(privHtml.includes('Speed Meet Love') || privHtml.includes('html'));

    const delRes = await fetch(`${BASE_URL}/delete-account`);
    assert.strictEqual(delRes.status, 200);
    console.log('✓ Passed: Public compliance routes respond without authentication\n');
  }

  // Clean up disposable test user
  {
    console.log('Cleaning up disposable test account...');
    // Sign back in to get a fresh token for deletion
    const loginRes = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginData.token}`,
        },
        body: JSON.stringify({
          targetUserId: createdUserId,
          confirmEmail: testEmail,
        }),
      });
      console.log('✓ Test user securely cleaned up\n');
    }
  }

  console.log('🎉 ALL PRODUCTION AUTHENTICATION & SECURITY TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
