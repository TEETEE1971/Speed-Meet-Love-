import assert from 'node:assert';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/status`);
      if (res.ok) return;
    } catch {
      // Wait for server startup
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not become ready in time');
}

async function runTests() {
  console.log('================================================================');
  console.log('Profile Permissions, Ownership & Security Rules Verification');
  console.log('================================================================');

  await waitForServer();

  // 1. Unauthenticated checks
  console.log('\n[Test 1] Unauthenticated direct profile update & session minting rejected...');
  const unauthProfile = await fetch(`${BASE_URL}/api/account/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bio: 'Unauthenticated overwrite' }),
  });
  assert.strictEqual(unauthProfile.status, 401, 'Unauthenticated POST /api/account/profile must return 401');

  const unauthRestUser = await fetch(`${BASE_URL}/api/users/usr_04`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bio: 'Unauthenticated Marcus overwrite' }),
  });
  assert.strictEqual(unauthRestUser.status, 401, 'Unauthenticated PUT /api/users/usr_04 must return 401');

  const unauthSession = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr_kristy', email: 'speedmeetlove@gmail.com' }),
  });
  assert.strictEqual(unauthSession.status, 401, 'Unauthenticated POST /api/auth/session must return 401');
  console.log('  ✓ Unauthenticated requests return 401');

  // 2. Register Member A and Member B
  console.log('\n[Test 2] Creating two regular member accounts (Member A & Member B)...');
  const ts = Date.now();
  const emailA = `perm.member.a.${ts}@testdomain.org`;
  const emailB = `perm.member.b.${ts}@testdomain.org`;

  const signupA = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      password: 'PasswordMemberA2026!',
      firstName: 'Regular',
      lastName: 'MemberA',
      age: 29,
      gender: 'Woman',
      interestedIn: 'Men',
      location: 'Austin, TX',
      bio: 'Original Bio A',
    }),
  });
  assert.strictEqual(signupA.status, 201, 'Member A signup must succeed');
  const dataA = await signupA.json();
  const tokenA = dataA.token;
  const userIdA = dataA.user.UserID;

  const signupB = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailB,
      password: 'PasswordMemberB2026!',
      firstName: 'Marcus',
      lastName: 'MemberB',
      age: 32,
      gender: 'Man',
      interestedIn: 'Women',
      location: 'Seattle, WA',
      bio: 'Original Marcus Bio',
    }),
  });
  assert.strictEqual(signupB.status, 201, 'Member B signup must succeed');
  const dataB = await signupB.json();
  const tokenB = dataB.token;
  const userIdB = dataB.user.UserID;
  console.log(`  ✓ Created Member A (${userIdA}) and Member B (${userIdB})`);

  // 3. Regular Member A CANNOT update Member B or usr_04 via direct requests
  console.log('\n[Test 3] Blocking cross-user profile updates from Member A...');
  const attackPayloads = [
    { url: `${BASE_URL}/api/account/profile`, method: 'POST', body: { targetUserId: userIdB, bio: 'Hacked B' } },
    { url: `${BASE_URL}/api/account/profile`, method: 'PUT', body: { userId: 'usr_04', bio: 'Hacked Marcus' } },
    { url: `${BASE_URL}/api/account/profile`, method: 'PATCH', body: { UserID: userIdB, location: 'Hacked City' } },
    { url: `${BASE_URL}/api/account/profile/${userIdB}`, method: 'PUT', body: { bio: 'Hacked param' } },
    { url: `${BASE_URL}/api/users/${userIdB}`, method: 'PATCH', body: { bio: 'Hacked REST user' } },
    { url: `${BASE_URL}/api/users/usr_04`, method: 'PUT', body: { bio: 'Hacked Marcus REST' } },
    { url: `${BASE_URL}/api/account/profile?userId=${userIdB}`, method: 'POST', body: { bio: 'Hacked query' } },
    { url: `${BASE_URL}/api/account/photo`, method: 'POST', body: { targetUserId: userIdB, photo: 'https://evil.example/a.png' } },
  ];

  for (const attack of attackPayloads) {
    const res = await fetch(attack.url, {
      method: attack.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify(attack.body),
    });
    assert.strictEqual(res.status, 403, `Expected 403 for ${attack.method} ${attack.url}, got ${res.status}`);
  }

  // Confirm Member B's profile is completely unchanged
  const meBCheck = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then(r => r.json());
  assert.strictEqual(meBCheck.user.Bio, 'Original Marcus Bio', 'Member B bio must remain untouched');
  assert.strictEqual(meBCheck.user.Location, 'Seattle, WA', 'Member B location must remain untouched');
  console.log('  ✓ All 8 cross-user update attempts returned 403 Forbidden and left Member B untouched');

  // 4. Regular Member A CANNOT escalate privileges or impersonate founder/members
  console.log('\n[Test 4] Blocking privilege escalation and founder route access for Member A...');
  const privEscRes = await fetch(`${BASE_URL}/api/account/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ isOwner: true, isTester: true, subscriptionTier: 'Premium Plus' }),
  });
  assert.strictEqual(privEscRes.status, 403, 'Privilege escalation attempt must return 403');

  const impersonateRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ userId: 'usr_kristy', email: 'speedmeetlove@gmail.com' }),
  });
  assert.strictEqual(impersonateRes.status, 403, 'Member A impersonating founder session must return 403');

  for (const ownerEndpoint of [
    '/api/owner/reports',
    '/api/owner/registered-users',
    '/api/owner/testers',
    '/api/owner/waitlist',
    '/api/owner/launch-events',
  ]) {
    const ownerCheck = await fetch(`${BASE_URL}${ownerEndpoint}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(ownerCheck.status, 403, `Member A access to ${ownerEndpoint} must return 403`);
  }
  console.log('  ✓ Privilege escalation, impersonation, and all /api/owner/* endpoints returned 403 for regular member');

  // 5. Regular Member A CAN edit their OWN profile
  console.log('\n[Test 5] Verifying regular Member A can still edit their own profile...');
  const selfUpdateRes = await fetch(`${BASE_URL}/api/account/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      location: 'Denver, CO',
      occupation: 'Product Researcher',
      bio: 'Updated my own bio cleanly!',
      interests: ['Hiking', 'Espresso'],
    }),
  });
  assert.strictEqual(selfUpdateRes.status, 200, 'Self profile edit must return 200');
  const selfUpdateJson = await selfUpdateRes.json();
  assert.strictEqual(selfUpdateJson.success, true);
  assert.strictEqual(selfUpdateJson.user.Location, 'Denver, CO');
  assert.strictEqual(selfUpdateJson.user.Occupation, 'Product Researcher');
  assert.strictEqual(selfUpdateJson.user.Bio, 'Updated my own bio cleanly!');

  const selfRestUpdate = await fetch(`${BASE_URL}/api/users/${userIdA}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ location: 'Boulder, CO' }),
  });
  assert.strictEqual(selfRestUpdate.status, 200, 'Self update via /api/users/:ownId must succeed');

  const meACheck = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then(r => r.json());
  assert.strictEqual(meACheck.user.Location, 'Boulder, CO');
  assert.strictEqual(meACheck.user.Bio, 'Updated my own bio cleanly!');
  console.log('  ✓ Member A self-profile updates succeeded and persisted');

  // 6. Verified Founder controls remain authorized for verified founder role
  console.log('\n[Test 6] Verifying founder-only controls work for verified founder role...');
  const founderSignin = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'speedmeetlove@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  assert.strictEqual(founderSignin.status, 200, 'Founder sign-in must succeed');
  const founderData = await founderSignin.json();
  assert.strictEqual(founderData.user.isOwner, true);
  const founderToken = founderData.token;

  for (const ownerEndpoint of [
    '/api/owner/reports',
    '/api/owner/registered-users',
    '/api/owner/testers',
    '/api/owner/waitlist',
    '/api/owner/launch-events',
  ]) {
    const res = await fetch(`${BASE_URL}${ownerEndpoint}`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    assert.strictEqual(res.status, 200, `Verified founder access to ${ownerEndpoint} must succeed`);
  }
  console.log('  ✓ Verified founder retains access to all /api/owner/* controls');

  // 7. Direct Cloud Firestore REST security rules enforcement check
  console.log('\n[Test 7] Verifying live Cloud Firestore security rules reject unauthenticated reads/writes...');
  const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const dbPath = `projects/${fbConfig.projectId}/databases/${fbConfig.firestoreDatabaseId}/documents/users/usr_kristy`;
  const fsGetRes = await fetch(`https://firestore.googleapis.com/v1/${dbPath}?key=${fbConfig.apiKey}`);
  assert.strictEqual(fsGetRes.status, 403, `Direct unauthenticated Firestore GET /users/usr_kristy must be 403, got ${fsGetRes.status}`);

  const fsPatchRes = await fetch(`https://firestore.googleapis.com/v1/${dbPath}?updateMask.fieldPaths=bio&key=${fbConfig.apiKey}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { bio: { stringValue: 'Direct Firestore overwrite attempt' } } }),
  });
  assert.strictEqual(fsPatchRes.status, 403, `Direct unauthenticated Firestore PATCH /users/usr_kristy must be 403, got ${fsPatchRes.status}`);
  console.log('  ✓ Live Firestore rules rejected unauthenticated direct GET & PATCH with 403 PERMISSION_DENIED');

  // 8. Cleanup disposable accounts
  console.log('\n[Cleanup] Removing disposable test accounts...');
  const delA = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ targetUserId: userIdA, confirmEmail: emailA }),
  });
  assert.strictEqual(delA.status, 200);
  const delB = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ targetUserId: userIdB, confirmEmail: emailB }),
  });
  assert.strictEqual(delB.status, 200);
  console.log('  ✓ Disposable accounts deleted cleanly');

  console.log('\n================================================================');
  console.log('ALL PROFILE PERMISSIONS & SECURITY TESTS PASSED!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('\nSecurity test failed:', err);
  process.exit(1);
});
