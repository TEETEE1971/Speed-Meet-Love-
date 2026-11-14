// Test Suite: Forgot Password & Real Password Reset Flow
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('Starting Forgot Password & Auth Flow Test Suite');
  console.log('================================================================');

  // Test 1: Empty or missing email validation
  console.log('\n[Test 1] Testing validation with missing/empty email...');
  const resEmpty = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '' }),
  });
  const dataEmpty = await resEmpty.json();
  assert.strictEqual(resEmpty.status, 400, 'Empty email must return 400 Bad Request');
  assert.strictEqual(dataEmpty.success, false);
  assert(dataEmpty.error.includes('Please enter your email address'), 'Error message must prompt for email');
  console.log('✓ Correctly rejected empty email with 400 Bad Request');

  // Test 2: Invalid email format validation
  console.log('\n[Test 2] Testing validation with invalid email format...');
  const resInvalid = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  const dataInvalid = await resInvalid.json();
  assert.strictEqual(resInvalid.status, 400, 'Invalid email format must return 400');
  assert.strictEqual(dataInvalid.success, false);
  assert(dataInvalid.error.includes('Please enter a valid email address'), 'Error message must inform of invalid format');
  console.log('✓ Correctly rejected invalid email format with 400 Bad Request');

  // Test 3: Existing account real password reset request
  console.log('\n[Test 3] Testing password reset request for existing account (kristylten@gmail.com)...');
  const resReal = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kristylten@gmail.com' }),
  });
  const dataReal = await resReal.json();
  assert.strictEqual(resReal.status, 200, 'Valid reset request must return 200 OK');
  assert.strictEqual(dataReal.success, true);
  const expectedConfirmation = "If an account exists for this email, you’ll receive a password-reset link. Check your spam folder too.";
  assert.strictEqual(dataReal.message, expectedConfirmation, 'Must return the exact requested confirmation message');
  console.log('✓ Successfully processed reset email for existing account with exact confirmation message');

  // Test 4: Privacy protection / Non-existent account returns identical safe confirmation
  console.log('\n[Test 4] Testing privacy protection for non-existent account...');
  const resNonExistent = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'unknown.user.9827364@nonexistent-domain.xyz' }),
  });
  const dataNonExistent = await resNonExistent.json();
  assert.strictEqual(resNonExistent.status, 200, 'Non-existent email must also return 200 OK to prevent enumeration');
  assert.strictEqual(dataNonExistent.success, true);
  assert.strictEqual(dataNonExistent.message, expectedConfirmation, 'Must return the exact same confirmation message');
  console.log('✓ Successfully verified privacy protection / enumeration prevention with matching confirmation');

  // Test 5: Verify existing accounts and sign-in functionality are fully preserved
  console.log('\n[Test 5] Verifying existing accounts, profiles, and password verification remain intact...');
  const resSignIn = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kristylten@gmail.com',
      password: 'SpeedMeetLove2026!',
    }),
  });
  const dataSignIn = await resSignIn.json();
  assert.strictEqual(resSignIn.status, 200, 'Owner sign-in must succeed');
  assert.strictEqual(dataSignIn.success, true);
  assert.strictEqual(dataSignIn.user.isOwner, true);
  assert.strictEqual(dataSignIn.user.subscriptionTier, 'Premium Plus');
  assert(dataSignIn.token, 'Session token must be returned');
  console.log('✓ Verified: Existing accounts, profiles, and owner entitlements remain intact');

  console.log('\n================================================================');
  console.log('ALL FORGOT PASSWORD & AUTH FLOW TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
