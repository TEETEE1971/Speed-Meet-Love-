import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const LIVE_BASE = 'http://localhost:3000';

function startCaptureSmtpServer() {
  const capturedEmails = new Map(); // recipient -> array of raw message bodies
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
        } else if (upper === 'RSET' || upper === 'NOOP') {
          socket.write('250 OK\r\n');
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

function extractEmailVerificationCredentials(rawMime) {
  const normalized = decodeQuotedPrintable(rawMime);
  const urlMatch = normalized.match(/https?:\/\/[^\s"'<>]+\/verify-email\?token=([a-f0-9]{64})/i);
  const codeMatch = normalized.match(/6-digit verification code in the app:\s*(?:<strong[^>]*>)?(\d{6})/i);
  return {
    verifyUrl: urlMatch?.[0] || null,
    token: urlMatch?.[1] || null,
    code: codeMatch?.[1] || null,
  };
}

async function api(base, pathname, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data, rawText: text };
}

async function waitForServer(base, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/api/auth/status`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for server at ${base}`);
}

async function run() {
  console.log('================================================================');
  console.log('First-50 Launch Offer, Real Email Delivery & Verification Suite');
  console.log('================================================================');

  // 1. Check built/served UI + live server strict zero-preview enforcement
  console.log('[Test 1] Verifying UI bundle & live server contain zero preview-inbox leaks...');
  const homeRes = await fetch(`${LIVE_BASE}/`);
  assert.equal(homeRes.status, 200, 'Live home page should respond 200');
  const distFiles = fs.existsSync(path.join(process.cwd(), 'dist/assets'))
    ? fs.readdirSync(path.join(process.cwd(), 'dist/assets')).filter(f => f.endsWith('.js'))
    : [];
  if (distFiles.length > 0) {
    const bundleContent = distFiles
      .map(f => fs.readFileSync(path.join(process.cwd(), 'dist/assets', f), 'utf-8'))
      .join('\n');
    assert.ok(!bundleContent.includes('Preview Inbox'), 'Built UI must NOT contain Preview Inbox');
    assert.ok(!bundleContent.includes('Confirm & Verify Email Now'), 'Built UI must NOT contain Confirm & Verify Email Now');
    assert.ok(!bundleContent.includes('pendingVerificationPreview'), 'Built UI must NOT reference pendingVerificationPreview');
    assert.ok(bundleContent.includes('Verify Email & Reveal Status'), 'Built UI must contain Verify Email & Reveal Status button');
    assert.ok(bundleContent.includes('Resend verification email'), 'Built UI must contain Resend verification email link');
    assert.ok(
      bundleContent.includes('Our first 50 eligible members receive one month of Premium FREE! Sign up and verify your email to discover if you’ve claimed a spot.') ||
        bundleContent.includes("Our first 50 eligible members receive one month of Premium FREE! Sign up and verify your email to discover if you\\u2019ve claimed a spot."),
      'Built UI must contain exact pre-signup offer copy'
    );
    assert.ok(
      bundleContent.includes('Congratulations! You\\u2019re #') || bundleContent.includes('Congratulations! You’re #'),
      'Built UI must contain celebration popup text'
    );
    console.log('  ✓ Live built UI confirmed free of preview-inbox bypass and retains exact copy');
  }

  // Verify live server rejects forged tokens
  const liveForged = await api(LIVE_BASE, '/api/auth/verify-email', {
    method: 'POST',
    body: { token: 'forged_live_token_0000' },
  });
  assert.equal(liveForged.status, 400);

  // 2. Spin up isolated server with real local SMTP capture sink
  console.log('[Test 2] Starting isolated test server wired to real local SMTP transport...');
  const smtp = await startCaptureSmtpServer();
  const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sml_launch_test_'));
  const isoPort = 3099;
  const ISO_BASE = `http://127.0.0.1:${isoPort}`;

  const child = spawn(path.join(process.cwd(), 'node_modules/.bin/tsx'), ['server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(isoPort),
      NODE_ENV: 'production',
      DATA_DIR_OVERRIDE: tempDataDir,
      DISABLE_FIRESTORE: 'true',
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
    console.log(`  ✓ Isolated server ready at ${ISO_BASE} (SMTP port ${smtp.port})`);

    async function signupIsoMember(idx, suffix = 'eligible') {
      const email = `launch_${suffix}_${idx}_${Date.now().toString(36)}@mailtest.org`;
      const password = 'Password123!';
      const res = await api(ISO_BASE, '/api/auth/signup', {
        method: 'POST',
        body: {
          email,
          password,
          firstName: `Member${idx}`,
          lastName: 'Test',
          age: 28,
          gender: idx % 2 === 0 ? 'Man' : 'Woman',
          interestedIn: idx % 2 === 0 ? 'Women' : 'Men',
          location: 'New York, NY',
        },
      });
      assert.equal(res.status, 201, `Signup failed for ${email}: ${JSON.stringify(res.data)}`);
      // CRITICAL: Never leak code or token in API JSON response
      assert.equal(res.data.previewVerification, undefined, 'Signup API MUST NOT expose previewVerification');
      assert.ok(!res.rawText.includes('/verify-email?token='), 'Signup API response MUST NOT contain verification URL/token');
      assert.equal(res.data.verificationDelivery?.emailSent, true, 'SMTP delivery should succeed');
      assert.equal(res.data.verificationDelivery?.provider, 'smtp');

      const sentList = smtp.capturedEmails.get(email.toLowerCase()) || [];
      assert.equal(sentList.length, 1, `Expected exactly 1 verification email delivered to ${email}`);
      const creds = extractEmailVerificationCredentials(sentList[0]);
      assert.ok(creds.token && creds.code, `Expected token & 6-digit code in email body for ${email}`);
      // Ensure code wasn't leaked in raw signup JSON response
      assert.ok(!res.rawText.includes(creds.code), 'Signup response must NEVER include the 6-digit verification code');
      assert.ok(!res.rawText.includes(creds.token), 'Signup response must NEVER include the verification token');
      return { email, password, ...res.data, creds };
    }

    // Founder & Tester exclusions
    console.log('[Test 3] Verifying Founder & Designated Tester exclusions...');
    const founderSignIn = await api(ISO_BASE, '/api/auth/signin', {
      method: 'POST',
      body: { email: 'kristylten@gmail.com', password: 'SpeedMeetLove2026!' },
    });
    assert.equal(founderSignIn.status, 200);
    const founderToken = founderSignIn.data.token;
    assert.equal(founderSignIn.data.user.LaunchOfferGranted, false);

    const testerEmail = `tester_excl_${Date.now().toString(36)}@mailtest.org`;
    const grantTesterRes = await api(ISO_BASE, '/api/owner/testers', {
      method: 'POST',
      token: founderToken,
      body: { email: testerEmail, action: 'grant', notes: 'Excluded tester' },
    });
    assert.equal(grantTesterRes.status, 200);

    const testerSignup = await signupIsoMember(0, 'tester');
    // Re-create under tester email cleanly:
    const realTesterEmail = `tester_exact_${Date.now().toString(36)}@mailtest.org`;
    await api(ISO_BASE, '/api/owner/testers', {
      method: 'POST',
      token: founderToken,
      body: { email: realTesterEmail, action: 'grant', notes: 'Excluded tester exact' },
    });
    const tsRes = await api(ISO_BASE, '/api/auth/signup', {
      method: 'POST',
      body: { email: realTesterEmail, password: 'Password123!', firstName: 'TesterExcl', age: 30, gender: 'Woman', interestedIn: 'Men' },
    });
    assert.equal(tsRes.status, 201);
    const tCreds = extractEmailVerificationCredentials((smtp.capturedEmails.get(realTesterEmail) || [])[0]);
    // Verify via link token directly without code
    const tVerify = await api(ISO_BASE, '/api/auth/verify-email', {
      method: 'POST',
      token: tsRes.data.token,
      body: { token: tCreds.token },
    });
    assert.equal(tVerify.status, 200);
    assert.equal(tVerify.data.user.EmailVerified, true);
    assert.equal(tVerify.data.user.IsTester, true);
    assert.equal(tVerify.data.user.SubscriptionTier, 'Premium Plus');
    assert.equal(tVerify.data.user.LaunchOfferGranted, false, 'Designated tester must NOT consume spot #1');
    console.log('  ✓ Founder & designated tester excluded cleanly (0/50 spots used)');

    // Member #1 security checks + unverified state + resend email + verify by link WITHOUT code
    console.log('[Test 4] Testing unverified isolation, resend email via SMTP, and direct link verification...');
    const m1 = await signupIsoMember(1);
    assert.equal(m1.user.EmailVerified, false);
    assert.equal(m1.user.LaunchOfferGranted, false);
    assert.equal(m1.user.LaunchOfferGrantNumber, null);
    assert.equal(m1.user.LaunchOfferActive, false);
    assert.equal(m1.user.SubscriptionTier, 'Free');

    // Wrong code must fail
    const badCode = await api(ISO_BASE, '/api/auth/verify-email', {
      method: 'POST',
      token: m1.token,
      body: { code: '000000' },
    });
    assert.equal(badCode.status, 400);

    // Tamper profile must return 403
    const tamperRes = await api(ISO_BASE, '/api/account/profile', {
      method: 'PUT',
      token: m1.token,
      body: { emailVerified: true, launchOfferGrantNumber: 1 },
    });
    assert.equal(tamperRes.status, 403);

    // Resend verification email sends second real email with new code/token without leaking in response
    const resendRes = await api(ISO_BASE, '/api/auth/resend-verification', {
      method: 'POST',
      token: m1.token,
      body: { email: m1.email },
    });
    assert.equal(resendRes.status, 200);
    assert.equal(resendRes.data.previewVerification, undefined, 'Resend MUST NOT expose previewVerification');
    assert.equal(resendRes.data.verificationDelivery?.emailSent, true);
    const m1Emails = smtp.capturedEmails.get(m1.email.toLowerCase()) || [];
    assert.equal(m1Emails.length, 2, 'Expected 2nd email captured by SMTP server after resend');
    const latestM1Creds = extractEmailVerificationCredentials(m1Emails[1]);
    assert.ok(latestM1Creds.token && latestM1Creds.code);
    assert.ok(!resendRes.rawText.includes(latestM1Creds.code));
    assert.ok(!resendRes.rawText.includes(latestM1Creds.token));

    // Verify directly using link token ONLY (no code submitted) AND without Bearer header (simulating external mail client click)
    const verifyLinkUnauth = await api(ISO_BASE, '/api/auth/verify-email', {
      method: 'POST',
      body: { token: latestM1Creds.token },
    });
    assert.equal(verifyLinkUnauth.status, 200);
    assert.equal(verifyLinkUnauth.data.verified, true);
    assert.equal(verifyLinkUnauth.data.user, undefined, 'Unauthenticated link click must not expose full user record in response');

    // Reusing link token must fail 400
    const reuseLink = await api(ISO_BASE, '/api/auth/verify-email', {
      method: 'POST',
      body: { token: latestM1Creds.token },
    });
    assert.equal(reuseLink.status, 400);

    // Member #1 first authenticated sign-in after link verification sees spot #1 & celebration pending
    const signIn1 = await api(ISO_BASE, '/api/auth/signin', {
      method: 'POST',
      body: { email: m1.email, password: m1.password },
    });
    assert.equal(signIn1.status, 200);
    const u1 = signIn1.data.user;
    assert.equal(u1.EmailVerified, true);
    assert.equal(u1.LaunchOfferGranted, true);
    assert.equal(u1.LaunchOfferGrantNumber, 1);
    assert.equal(u1.LaunchOfferActive, true);
    assert.equal(u1.SubscriptionTier, 'Premium');
    assert.equal(u1.LaunchOfferCelebrationPending, true);

    // Dismiss celebration on first authenticated visit
    const celebAck = await api(ISO_BASE, '/api/account/launch-offer/celebrated', {
      method: 'POST',
      token: signIn1.data.token,
    });
    assert.equal(celebAck.status, 200);
    assert.equal(celebAck.data.user.LaunchOfferCelebrationPending, false);

    // Sign out & sign back in: stays dismissed, #1 and expiresAt preserved
    await api(ISO_BASE, '/api/auth/signout', { method: 'POST', token: signIn1.data.token });
    const signIn1b = await api(ISO_BASE, '/api/auth/signin', {
      method: 'POST',
      body: { email: m1.email, password: m1.password },
    });
    assert.equal(signIn1b.data.user.LaunchOfferCelebrationPending, false);
    assert.equal(signIn1b.data.user.LaunchOfferGrantNumber, 1);
    assert.equal(signIn1b.data.user.LaunchOfferExpiresAt, u1.LaunchOfferExpiresAt);
    console.log('  ✓ Direct email link verified #1 without code; celebration shown once & persisted');

    // Note testerSignup earlier was an eligible non-tester signup that didn't match tester email, leave unverified so it doesn't take #2!
    assert.equal(testerSignup.user.EmailVerified, false);

    // 5. Concurrent bursts for #2..#50 (mixing link tokens & 6-digit codes from real SMTP emails) + #51 overflow
    console.log('[Test 5] Running 50-member concurrent verification burst via captured SMTP emails...');
    const batchMembers = [];
    for (let i = 2; i <= 51; i++) {
      batchMembers.push(await signupIsoMember(i));
    }

    const burstResults = await Promise.all(
      batchMembers.slice(0, 49).map((m, idx) =>
        api(ISO_BASE, '/api/auth/verify-email', {
          method: 'POST',
          token: m.token,
          body: idx % 2 === 0 ? { token: m.creds.token } : { code: m.creds.code, email: m.email },
        })
      )
    );

    const all50 = [u1, ...burstResults.map(r => r.data.user)];
    const uniqueNumbers = new Set(all50.map(u => u.LaunchOfferGrantNumber));
    assert.equal(uniqueNumbers.size, 50, `Expected 50 unique grant numbers, got ${uniqueNumbers.size}`);
    for (let n = 1; n <= 50; n++) {
      assert.ok(uniqueNumbers.has(n), `Missing permanent grant #${n}`);
    }

    const m51 = batchMembers[49];
    const v51 = await api(ISO_BASE, '/api/auth/verify-email', {
      method: 'POST',
      token: m51.token,
      body: { code: m51.creds.code, email: m51.email },
    });
    assert.equal(v51.status, 200);
    assert.equal(v51.data.user.EmailVerified, true);
    assert.equal(v51.data.user.LaunchOfferGranted, false);
    assert.equal(v51.data.user.SubscriptionTier, 'Free');
    console.log('  ✓ Concurrent SMTP link & code verifications awarded exact 1..50; #51 stayed Free');
  } finally {
    child.kill('SIGTERM');
    await smtp.close();
    fs.rmSync(tempDataDir, { recursive: true, force: true });
  }

  console.log('================================================================');
  console.log('ALL REAL-EMAIL VERIFICATION & LAUNCH OFFER TESTS PASSED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
