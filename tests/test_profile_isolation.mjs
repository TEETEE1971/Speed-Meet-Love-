import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('Starting Account Profile Isolation & State Verification Test');
  console.log('================================================================');

  // --------------------------------------------------------------------------
  // Test 1: Verify Existing Affected Accounts (Cory Howard & Cory Tennant) Repair
  // --------------------------------------------------------------------------
  console.log('\n[Test 1] Checking existing accounts repair (Cory Howard & Cory Tennant)...');
  const ownerSignin = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kristylten@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  const ownerData = await ownerSignin.json();
  assert(
    ownerData.user.ProfilePhoto === '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png' ||
    ownerData.user.ProfilePhoto === '/assets/kristy_exact.png',
    "Founder Kristy MUST retain her founder photo"
  );
  console.log('  ✓ Founder Kristy retains her founder photo');

  // Check Cory Howard and Cory Tennant via server users
  const regUsersRes = await fetch(`${BASE_URL}/api/owner/registered-users`, {
    headers: { Authorization: `Bearer ${ownerData.token}` },
  });
  const regUsersData = await regUsersRes.json();
  assert(regUsersData.success, 'Owner registered users endpoint must succeed');

  const coryHoward = regUsersData.users.find(u => u.email === 'tootiefukinfruity@gmail.com');
  if (coryHoward) {
    console.log(`  -> Found registered account: ${coryHoward.firstName} ${coryHoward.lastName} (${coryHoward.email})`);
    // Verify sanitized profilePhoto is cleared (null or empty string) and NOT /assets/kristy_exact.png
    assert.notStrictEqual(coryHoward.profilePhoto, '/assets/kristy_exact.png', "Cory Howard must NOT have the founder photo");
    console.log('  ✓ Verified: Cory Howard does NOT have the founder photo');
  }

  const coryTennant = regUsersData.users.find(u => u.email === 'corysux71@gmail.com');
  if (coryTennant) {
    console.log(`  -> Found registered account: ${coryTennant.firstName} ${coryTennant.lastName} (${coryTennant.email})`);
    assert.notStrictEqual(coryTennant.profilePhoto, '/assets/kristy_exact.png', "Cory Tennant must NOT have the founder photo");
    console.log('  ✓ Verified: Cory Tennant does NOT have the founder photo');
  }

  // --------------------------------------------------------------------------
  // Test 2: Register Account A (Alpha User) and Verify Clean Profile
  // --------------------------------------------------------------------------
  console.log('\n[Test 2] Registering Account A (Alpha User)...');
  const emailA = `tester.alpha.${Date.now()}@speedmeetlove.internal`;
  const signupResA = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      password: 'StrongAlphaPassword2026!',
      firstName: 'Alpha',
      lastName: 'User',
      age: 29,
      gender: 'Woman',
      interestedIn: 'Men',
      location: 'Chicago, IL',
      occupation: 'Design Director',
      bio: 'Lover of modern architecture and great espresso.',
    }),
  });
  const dataA = await signupResA.json();
  assert.strictEqual(signupResA.status, 201, 'Account A signup must return 201');
  const tokenA = dataA.token;
  const userA = dataA.user;

  console.log(`  -> Account A created: ${userA.FirstName} ${userA.LastName} (${userA.UserID})`);
  assert.strictEqual(userA.FirstName, 'Alpha');
  assert.strictEqual(userA.LastName, 'User');
  assert.strictEqual(userA.Location, 'Chicago, IL');
  assert.strictEqual(userA.Occupation, 'Design Director');
  // Photo MUST be empty string / null (NOT founder photo)
  assert.notStrictEqual(userA.ProfilePhoto, '/assets/kristy_exact.png', "New Account A must NOT have founder photo");
  assert(!userA.ProfilePhoto, "New Account A without uploaded photo must have empty ProfilePhoto for initials avatar");
  console.log('  ✓ Account A has neutral/empty photo (shows initials "AU" avatar)');

  // --------------------------------------------------------------------------
  // Test 3: Edit Account A Profile & Verify Durable Server Persistence
  // --------------------------------------------------------------------------
  console.log('\n[Test 3] Editing Account A profile & verifying persistence...');
  const editResA = await fetch(`${BASE_URL}/api/account/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      bio: 'Updated bio: Traveling, running along Lake Michigan, and jazz vinyl.',
      occupation: 'Principal Architect',
      location: 'Lincoln Park, Chicago',
      avatarColor: '#3B82F6',
      interests: ['Architecture', 'Jazz', 'Running'],
    }),
  });
  const editDataA = await editResA.json();
  assert(editDataA.success, 'Profile edit must succeed');
  assert.strictEqual(editDataA.user.Bio, 'Updated bio: Traveling, running along Lake Michigan, and jazz vinyl.');
  assert.strictEqual(editDataA.user.Occupation, 'Principal Architect');
  assert.strictEqual(editDataA.user.AvatarColor, '#3B82F6');

  // Refresh Account A session via /api/auth/me (simulate browser refresh)
  const refreshResA = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const refreshDataA = await refreshResA.json();
  assert.strictEqual(refreshDataA.user.Bio, 'Updated bio: Traveling, running along Lake Michigan, and jazz vinyl.');
  assert.strictEqual(refreshDataA.user.Occupation, 'Principal Architect');
  assert.strictEqual(refreshDataA.user.Location, 'Lincoln Park, Chicago');
  assert.strictEqual(refreshDataA.user.AvatarColor, '#3B82F6');
  console.log('  ✓ Account A edits durably saved on server and reloaded on session refresh');

  // --------------------------------------------------------------------------
  // Test 4: Sign Out Account A
  // --------------------------------------------------------------------------
  console.log('\n[Test 4] Signing out Account A...');
  const signoutResA = await fetch(`${BASE_URL}/api/auth/signout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(signoutResA.ok, 'Signout must succeed');
  const meAfterSignoutA = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(meAfterSignoutA.status, 401, 'Token must be revoked after sign out');
  console.log('  ✓ Account A signed out and session token invalidated');

  // --------------------------------------------------------------------------
  // Test 5: Register Account B (Beta Member) with Custom Uploaded Photo
  // --------------------------------------------------------------------------
  console.log('\n[Test 5] Registering Account B (Beta Member)...');
  const emailB = `tester.beta.${Date.now()}@speedmeetlove.internal`;
  const signupResB = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailB,
      password: 'StrongBetaPassword2026!',
      firstName: 'Beta',
      lastName: 'Member',
      age: 32,
      gender: 'Man',
      interestedIn: 'Women',
      location: 'Austin, TX',
      occupation: 'Robotics Engineer',
      bio: 'Building autonomous rovers and making smoked brisket.',
    }),
  });
  const dataB = await signupResB.json();
  assert.strictEqual(signupResB.status, 201, 'Account B signup must return 201');
  const tokenB = dataB.token;
  const userB = dataB.user;

  console.log(`  -> Account B created: ${userB.FirstName} ${userB.LastName} (${userB.UserID})`);
  assert.notStrictEqual(userB.UserID, userA.UserID, 'Account IDs must be distinct');
  assert.strictEqual(userB.FirstName, 'Beta');
  assert.strictEqual(userB.LastName, 'Member');
  assert.strictEqual(userB.Location, 'Austin, TX');
  assert.strictEqual(userB.Occupation, 'Robotics Engineer');

  // Account B uploads a custom profile photo (data URL)
  console.log('  -> Account B uploads custom photo...');
  const customPhotoB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const photoResB = await fetch(`${BASE_URL}/api/account/photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ photo: customPhotoB }),
  });
  const photoDataB = await photoResB.json();
  assert(photoDataB.success, 'Photo upload must succeed');
  assert.strictEqual(photoDataB.user.ProfilePhoto, customPhotoB, 'Account B must have its custom photo');
  console.log('  ✓ Account B custom photo uploaded and saved');

  // --------------------------------------------------------------------------
  // Test 6: Cross-Account Isolation Verification
  // --------------------------------------------------------------------------
  console.log('\n[Test 6] Verifying Cross-Account Isolation between Account A and Account B...');
  
  // Re-signin to Account A
  const signinA2 = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: 'StrongAlphaPassword2026!' }),
  });
  const dataA2 = await signinA2.json();
  assert(dataA2.success, 'Account A signin must succeed');
  const userA2 = dataA2.user;

  // Confirm Account A profile is completely isolated:
  assert.strictEqual(userA2.UserID, userA.UserID);
  assert.strictEqual(userA2.FirstName, 'Alpha');
  assert.strictEqual(userA2.LastName, 'User');
  assert.strictEqual(userA2.Location, 'Lincoln Park, Chicago');
  assert.strictEqual(userA2.Occupation, 'Principal Architect');
  assert.strictEqual(userA2.AvatarColor, '#3B82F6');
  // Account A must NOT have Account B's photo or founder's photo!
  assert.notStrictEqual(userA2.ProfilePhoto, customPhotoB, 'Account A must NOT have Account B custom photo');
  assert.notStrictEqual(userA2.ProfilePhoto, '/assets/kristy_exact.png', 'Account A must NOT have founder photo');
  assert(!userA2.ProfilePhoto, 'Account A must retain initials avatar');
  console.log('  ✓ Account A retains its distinct name, location, occupation, and initials avatar');

  // Re-signin to Account B
  const signinB2 = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password: 'StrongBetaPassword2026!' }),
  });
  const dataB2 = await signinB2.json();
  assert(dataB2.success, 'Account B signin must succeed');
  const userB2 = dataB2.user;

  // Confirm Account B profile is completely isolated:
  assert.strictEqual(userB2.UserID, userB.UserID);
  assert.strictEqual(userB2.FirstName, 'Beta');
  assert.strictEqual(userB2.LastName, 'Member');
  assert.strictEqual(userB2.Location, 'Austin, TX');
  assert.strictEqual(userB2.Occupation, 'Robotics Engineer');
  assert.strictEqual(userB2.ProfilePhoto, customPhotoB, 'Account B must retain its uploaded custom photo');
  console.log('  ✓ Account B retains its distinct name, location, occupation, and custom uploaded photo');

  // --------------------------------------------------------------------------
  // Test 7: Verify Founder Profile Isolation
  // --------------------------------------------------------------------------
  console.log('\n[Test 7] Verifying Founder Profile Isolation...');
  const kristySignin = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kristylten@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  const kristyData = await kristySignin.json();
  assert(
    kristyData.user.ProfilePhoto === '/assets/aistudio/Screenshot_20261109-051148_Facebook_4fd2d1a3.png' ||
    kristyData.user.ProfilePhoto === '/assets/kristy_exact.png',
    'Founder Kristy must have the founder picture'
  );
  assert.strictEqual(kristyData.user.isOwner, true);
  console.log('  ✓ Founder Kristy profile isolated: retains founder photo and owner privileges');

  // --------------------------------------------------------------------------
  // Cleanup: Delete disposable test accounts A and B
  // --------------------------------------------------------------------------
  console.log('\n[Cleanup] Deleting disposable test accounts...');
  const delA = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataA2.token}` },
    body: JSON.stringify({ targetUserId: userA.UserID, confirmEmail: emailA }),
  });
  const delAJson = await delA.json();
  assert(delAJson.success, 'Cleanup Account A must succeed');

  const delB = await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dataB2.token}` },
    body: JSON.stringify({ targetUserId: userB.UserID, confirmEmail: emailB }),
  });
  const delBJson = await delB.json();
  assert(delBJson.success, 'Cleanup Account B must succeed');
  console.log('  ✓ Disposable test accounts cleaned up successfully');

  console.log('\n================================================================');
  console.log('ALL ACCOUNT PROFILE ISOLATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('\nTest suite failed:', err);
  process.exit(1);
});
