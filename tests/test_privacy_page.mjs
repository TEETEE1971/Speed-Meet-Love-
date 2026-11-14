// tests/test_privacy_page.mjs
// Test that /privacy is publicly accessible without authentication, returns 200, and contains expected metadata.

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function testPrivacyPage() {
  console.log('=== TEST: Public Privacy Policy Page Verification (/privacy) ===\n');

  // 1. Direct GET request to /privacy without any auth headers or cookies
  console.log('1. Testing direct unauthenticated HTTP GET to /privacy...');
  const res = await fetch(`${BASE_URL}/privacy`);
  assert.strictEqual(res.status, 200, 'Direct GET /privacy must return HTTP 200 OK without authentication');
  
  const contentType = res.headers.get('content-type') || '';
  assert.ok(contentType.includes('text/html'), `Content-Type must be text/html, got: ${contentType}`);
  const html = await res.text();
  assert.ok(html.includes('<div id="root"></div>'), 'HTML must contain SPA root container');
  console.log('  -> PASS: /privacy successfully served over HTTP without authentication');

  // 2. Verify that existing API endpoints and regression suites continue functioning normally
  console.log('\n2. Testing that core server APIs remain operational...');
  const timeRes = await fetch(`${BASE_URL}/api/time`);
  const timeData = await timeRes.json();
  assert.strictEqual(timeData.success, true, 'Server time API operational');
  console.log(`  -> PASS: Server time response verified: ${timeData.serverTimeFormattedET}`);

  // 3. Verify that offset-timer route remains removed (404)
  console.log('\n3. Testing security hardening (offset-timer route remains 404)...');
  const removedRes = await fetch(`${BASE_URL}/api/events/evt_test/rounds/0/offset-timer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'u1' }),
  });
  assert.strictEqual(removedRes.status, 404, 'offset-timer must remain completely removed');
  console.log('  -> PASS: offset-timer endpoint confirmed 404');

  console.log('\n============================================================');
  console.log('✓ ALL PRIVACY POLICY & PUBLIC ACCESSIBILITY CHECKS PASSED!');
  console.log('============================================================\n');
}

testPrivacyPage().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
