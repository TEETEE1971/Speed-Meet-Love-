// Test Suite: Forgot Password & Real Password Reset Flow
import assert from 'assert';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';

function startCaptureSmtpServer() {
  const capturedEmails = new Map();
  const server = net.createServer(socket => {
    let stage = 'cmd';
    let recipients = [];
    let buffer = '';
    let dataBuffer = '';

    socket.write('220 localhost ESMTP Capture\r\n');

    socket.on('data', chunk => {
      const text = chunk.toString('utf8');
      if (stage === 'data') {
        dataBuffer += text;
        const endIdx = dataBuffer.indexOf('\r\n.\r\n');
        if (endIdx !== -1) {
          const msg = dataBuffer.slice(0, endIdx);
          for (const rcpt of recipients) {
            const list = capturedEmails.get(rcpt.toLowerCase()) || [];
            list.push(msg);
            capturedEmails.set(rcpt.toLowerCase(), list);
          }
          stage = 'cmd';
          buffer = dataBuffer.slice(endIdx + 5);
          dataBuffer = '';
          recipients = [];
          socket.write('250 2.0.0 OK queued\r\n');
        }
        return;
      }

      buffer += text;
      while (buffer.includes('\r\n')) {
        const idx = buffer.indexOf('\r\n');
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const upper = line.toUpperCase();
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          socket.write('250-localhost Hello\r\n250 SIZE 10485760\r\n');
        } else if (upper.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 OK\r\n');
        } else if (upper.startsWith('RCPT TO:')) {
          const match = line.match(/<([^>]+)>/);
          if (match?.[1]) recipients.push(match[1].trim());
          socket.write('250 2.1.5 OK\r\n');
        } else if (upper === 'DATA') {
          stage = 'data';
          dataBuffer = buffer;
          buffer = '';
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
          break;
        } else if (upper === 'QUIT') {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        port: addr.port,
        capturedEmails,
        close: () => new Promise(r => server.close(() => r())),
      });
    });
  });
}

function decodeQuotedPrintable(raw) {
  return raw.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function waitForServer(base, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/api/auth/status`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for server at ${base}`);
}

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

  // Test 3: Existing account real password reset request (dispatched via Resend)
  console.log('\n[Test 3] Testing password reset request for founder account (speedmeetlove@gmail.com)...');
  const resReal = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'speedmeetlove@gmail.com' }),
  });
  const dataReal = await resReal.json();
  assert.strictEqual(resReal.status, 200, `Valid reset request must return 200 OK, got ${resReal.status}: ${JSON.stringify(dataReal)}`);
  assert.strictEqual(dataReal.success, true);
  const expectedConfirmation = "If an account exists for this email, you’ll receive a password-reset link. Check your spam folder too.";
  assert.strictEqual(dataReal.message, expectedConfirmation, 'Must return the exact requested confirmation message');
  assert.strictEqual(dataReal.deliveryProvider, 'resend', 'Must dispatch password reset via live Resend email provider');
  assert.strictEqual(dataReal.token, undefined, 'Never leak raw reset token in HTTP response');
  console.log('✓ Successfully dispatched reset email via Resend for speedmeetlove@gmail.com without leaking token');

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

  // Test 5: Unified reset-password validation (invalid/short tokens rejected cleanly)
  console.log('\n[Test 5] Testing /api/auth/reset-password validation...');
  const badValidateRes = await fetch(`${BASE_URL}/api/auth/reset-password/validate?token=invalid_token_123`);
  assert.strictEqual(badValidateRes.status, 400);
  const badResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'invalid_token_123', password: 'NewValidPassword123!' }),
  });
  assert.strictEqual(badResetRes.status, 400);
  const shortPwRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'some_token', password: 'short' }),
  });
  assert.strictEqual(shortPwRes.status, 400);
  console.log('✓ Verified: Invalid reset tokens and weak passwords rejected cleanly');

  // Test 6: Verify existing founder account & sign-in functionality remain intact
  console.log('\n[Test 6] Verifying founder account sign-in with speedmeetlove@gmail.com...');
  const resSignIn = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'speedmeetlove@gmail.com',
      password: 'SpeedMeetLove2026!',
    }),
  });
  const dataSignIn = await resSignIn.json();
  assert.strictEqual(resSignIn.status, 200, 'Owner sign-in must succeed');
  assert.strictEqual(dataSignIn.success, true);
  assert.strictEqual(dataSignIn.user.isOwner, true);
  assert.strictEqual(dataSignIn.user.subscriptionTier, 'Premium Plus');
  assert(dataSignIn.token, 'Session token must be returned');
  console.log('✓ Verified: Existing founder account, profile, and owner entitlements remain intact');

  // Test 7: Full end-to-end reset cycle in isolated server (email link -> validate -> reset -> old session revoked -> old pw rejected -> new pw signs in -> token single-use)
  console.log('\n[Test 7] Running full end-to-end password-reset -> sign-in verification in isolated server...');
  const smtp = await startCaptureSmtpServer();
  const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sml_pwreset_test_'));
  const isoPort = 3098;
  const ISO_BASE = `http://127.0.0.1:${isoPort}`;

  const child = spawn(path.join(process.cwd(), 'node_modules/.bin/tsx'), ['server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(isoPort),
      NODE_ENV: 'production',
      DATA_DIR_OVERRIDE: tempDataDir,
      DISABLE_FIRESTORE: 'true',
      RESEND_API_KEY: '',
      SENDGRID_API_KEY: '',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.port),
      SMTP_SECURE: 'false',
      SMTP_IGNORE_TLS: 'true',
      EMAIL_FROM: 'Speed Meet Love <noreply@speedmeetlove.com>',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(ISO_BASE);
    const oldPassword = 'OriginalPassword2026!';
    const newPassword = 'UpdatedResetPassword2026!';
    const testEmail = 'reset.cycle@mailtest.org';

    const signupRes = await fetch(`${ISO_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: oldPassword,
        firstName: 'Reset',
        lastName: 'Tester',
        age: 30,
        gender: 'Woman',
        interestedIn: 'Men',
        location: 'Austin, TX',
      }),
    });
    assert.strictEqual(signupRes.status, 201, 'Isolated test signup must succeed');
    const signupData = await signupRes.json();
    const priorSessionToken = signupData.token;

    const forgotRes = await fetch(`${ISO_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.strictEqual(forgotRes.status, 200);
    const sentEmails = smtp.capturedEmails.get(testEmail) || [];
    const resetEmailRaw = sentEmails.find(m => m.includes('/reset-password?token='));
    assert(resetEmailRaw, 'Expected password reset email with /reset-password?token= link');
    const decoded = decodeQuotedPrintable(resetEmailRaw);
    const tokenMatch = decoded.match(/\/reset-password\?token=([a-f0-9]{64})/i);
    assert(tokenMatch?.[1], 'Expected 64-char hex reset token in email link');
    const resetToken = tokenMatch[1];

    const validateRes = await fetch(`${ISO_BASE}/api/auth/reset-password/validate?token=${resetToken}`);
    assert.strictEqual(validateRes.status, 200);
    const validateData = await validateRes.json();
    assert.strictEqual(validateData.valid, true);

    const resetConfirmRes = await fetch(`${ISO_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: newPassword }),
    });
    assert.strictEqual(resetConfirmRes.status, 200);
    const resetConfirmData = await resetConfirmRes.json();
    assert.strictEqual(resetConfirmData.success, true);

    // Old session revoked
    const oldSessCheck = await fetch(`${ISO_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${priorSessionToken}` },
    });
    assert.strictEqual(oldSessCheck.status, 401, 'Old session token must be revoked after password reset');

    // Old password rejected
    const oldPwSignIn = await fetch(`${ISO_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: oldPassword }),
    });
    assert.strictEqual(oldPwSignIn.status, 401, 'Old password must fail after reset');

    // New password signs in via same /api/auth/signin PBKDF2 system
    const newPwSignIn = await fetch(`${ISO_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newPassword }),
    });
    assert.strictEqual(newPwSignIn.status, 200, 'New password must sign in cleanly after reset');
    const newPwData = await newPwSignIn.json();
    assert(newPwData.token, 'New session token must be issued');

    // Single-use enforcement: reusing token must fail
    const reuseRes = await fetch(`${ISO_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'AnotherPassword2026!' }),
    });
    assert.strictEqual(reuseRes.status, 400, 'Reusing a consumed reset token must be rejected');
    console.log('✓ Full end-to-end reset-password -> PBKDF2 update -> session revocation -> new-password sign-in verified!');
  } finally {
    child.kill('SIGTERM');
    await smtp.close();
    fs.rmSync(tempDataDir, { recursive: true, force: true });
  }

  console.log('\n================================================================');
  console.log('ALL FORGOT PASSWORD & AUTH FLOW TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
