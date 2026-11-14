// tests/test_owner_reports_and_child_safety.mjs
// Verification suite for Child Safety policy revisions and Owner Report Review & Enforcement

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('Starting Owner Reports & Child Safety Standards Test Suite');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test 1: Public /child-safety accessibility
  // -------------------------------------------------------------
  console.log('[Test 1] Testing public unauthenticated GET to /child-safety...');
  const childRes = await fetch(`${BASE_URL}/child-safety`, {
    headers: { 'Accept': 'text/html' }
  });
  assert.strictEqual(childRes.status, 200, `Expected 200 from /child-safety, got ${childRes.status}`);
  console.log('✓ /child-safety loads publicly without authentication');

  // -------------------------------------------------------------
  // Test 2: Audit ChildSafetyPage for removal of unsupported claims
  // -------------------------------------------------------------
  console.log('[Test 2] Auditing ChildSafetyPage.tsx for verified features and owner responsibilities...');
  const childSafetyFile = path.join(process.cwd(), 'src/components/ChildSafetyPage.tsx');
  const childContent = fs.readFileSync(childSafetyFile, 'utf8');

  // Verify unsupported claims were removed
  assert(!childContent.includes('safety team'), 'Must remove unsupported "safety team" claim');
  assert(!childContent.includes('hardware') && !childContent.includes('device blacklisting'), 'Must remove "hardware/device blacklisting" claim');
  assert(!childContent.includes('automatic suspension') && !childContent.includes('Immediate Suspension'), 'Must remove "automatic suspension" claim');
  assert(!childContent.includes('evidence quarantine') && !childContent.includes('administrative quarantine'), 'Must remove "evidence quarantine" claim');
  assert(!childContent.includes('immediate response times') && !childContent.includes('Immediate triage'), 'Must remove "immediate response times" claim');
  assert(!childContent.includes('actively cooperates with authorities') && !childContent.includes('existing cooperation with authorities'), 'Must remove unsupported claims of existing ongoing law enforcement partnership');

  // Verify required accurate statements are present
  assert(childContent.includes('TeeTees Creations'), 'Must identify operator TeeTees Creations');
  assert(childContent.includes('speedmeetlove@gmail.com'), 'Must provide official contact email speedmeetlove@gmail.com');
  assert(childContent.includes('CSAM') && childContent.includes('CSAE'), 'Must explicitly prohibit CSAM and CSAE');
  assert(childContent.includes('grooming') || childContent.includes('Grooming'), 'Must explicitly prohibit grooming');
  assert(childContent.includes('18+'), 'Must declare Adults-Only 18+ policy');
  assert(childContent.includes('NCMEC') || childContent.includes('CyberTipline'), 'Must state mandatory NCMEC CyberTipline reporting');
  assert(childContent.includes('reports.json') || childContent.includes('server storage'), 'Must explain server persistence of reports for owner review');
  console.log('✓ Verified: Unsupported claims removed and verified owner responsibilities documented');

  // -------------------------------------------------------------
  // Test 3: In-app report submission to server (POST /api/reports)
  // -------------------------------------------------------------
  console.log('[Test 3] Testing in-app member safety report submission to server...');
  const testTargetUserId = `usr_test_target_${Date.now()}`;
  const testReporterUserId = `usr_test_reporter_${Date.now()}`;

  const reportPayload = {
    reportedUserId: testTargetUserId,
    reporterId: testReporterUserId,
    reason: 'Child safety / Underage / CSAE',
    notes: 'Suspicious profile claiming to be underage; please investigate and take action.',
    alsoBlock: true,
  };

  const submitRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportPayload),
  });

  assert.strictEqual(submitRes.status, 201, `Expected 201 Created from POST /api/reports, got ${submitRes.status}`);
  const submitData = await submitRes.json();
  assert(submitData.success, 'Report submission should succeed');
  assert(submitData.reportId && submitData.reportId.startsWith('rep_'), 'Should return a generated reportId');
  const createdReportId = submitData.reportId;
  console.log(`✓ Report successfully accepted and stored on server: ${createdReportId}`);

  // Verify report was written to disk in reports.json
  const reportsDiskFile = path.join(process.cwd(), '.data/reports.json');
  assert(fs.existsSync(reportsDiskFile), '.data/reports.json must exist');
  const savedReportsDisk = JSON.parse(fs.readFileSync(reportsDiskFile, 'utf8'));
  const foundInDisk = savedReportsDisk.find(r => r.id === createdReportId);
  assert(foundInDisk, 'Created report must be persisted in .data/reports.json on disk');
  assert.strictEqual(foundInDisk.reportedUserId, testTargetUserId);
  assert.strictEqual(foundInDisk.status, 'pending');
  console.log('✓ Confirmed report persistence to server disk (.data/reports.json)');

  // -------------------------------------------------------------
  // Test 4: Access Control - Unauthorized users cannot review reports
  // -------------------------------------------------------------
  console.log('[Test 4] Verifying security: Non-owner accounts cannot access GET /api/owner/reports...');
  // A. No token
  const anonRes = await fetch(`${BASE_URL}/api/owner/reports`);
  assert.strictEqual(anonRes.status, 401, 'Anonymous request must return 401 Unauthorized');

  // B. Regular user session token (usr_me is not the owner)
  const regUserSessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr_me', email: 'alex.rivera@example.com' }),
  });
  const regUserData = await regUserSessionRes.json();
  const regUserToken = regUserData.token;

  const forbiddenRes = await fetch(`${BASE_URL}/api/owner/reports`, {
    headers: { Authorization: `Bearer ${regUserToken}` },
  });
  assert.strictEqual(forbiddenRes.status, 403, 'Regular member token must return 403 Forbidden');
  console.log('✓ Confirmed: Anonymous and non-owner member requests are strictly forbidden (401/403)');

  // -------------------------------------------------------------
  // Test 5: Owner Access - Owner can securely review reports
  // -------------------------------------------------------------
  console.log('[Test 5] Verifying owner access to GET /api/owner/reports with owner credentials...');
  // Obtain owner session token (kristylten@gmail.com / usr_kristy)
  const ownerSessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'usr_kristy', email: 'kristylten@gmail.com' }),
  });
  const ownerSessionData = await ownerSessionRes.json();
  const ownerToken = ownerSessionData.token;
  assert(ownerToken, 'Owner token must be issued');

  const ownerReportsRes = await fetch(`${BASE_URL}/api/owner/reports`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(ownerReportsRes.status, 200, `Expected 200 OK for owner, got ${ownerReportsRes.status}`);
  const ownerReportsData = await ownerReportsRes.json();
  assert(ownerReportsData.success, 'Owner review request must succeed');
  assert(Array.isArray(ownerReportsData.reports), 'reports must be an array');
  const foundReportInList = ownerReportsData.reports.find(r => r.id === createdReportId);
  assert(foundReportInList, 'Owner reports list must include the newly submitted report');
  assert.strictEqual(foundReportInList.status, 'pending');
  console.log(`✓ Confirmed: Owner successfully retrieved ${ownerReportsData.reports.length} persistent reports from server`);

  // -------------------------------------------------------------
  // Test 6: Owner Action - Owner bans user & terminates sessions
  // -------------------------------------------------------------
  console.log('[Test 6] Testing owner enforcement action: Banning user and revoking sessions...');
  // First, create a temporary active session for the target user to verify eviction
  const targetSessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: testTargetUserId, email: `${testTargetUserId}@example.com` }),
  });
  const targetSessionData = await targetSessionRes.json();
  const targetToken = targetSessionData.token;

  // Verify target user token works before ban
  const targetPreCheck = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${targetToken}` },
  });
  assert.strictEqual(targetPreCheck.status, 200, 'Target user session should be valid before ban');

  // Now owner takes action to ban
  const banRes = await fetch(`${BASE_URL}/api/owner/reports/${createdReportId}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      action: 'ban_user',
      ownerNotes: 'Confirmed violation of adult policy; account banned permanently.',
    }),
  });

  assert.strictEqual(banRes.status, 200, `Expected 200 OK from ban action, got ${banRes.status}`);
  const banData = await banRes.json();
  assert(banData.success, 'Ban action should report success');
  assert.strictEqual(banData.report.status, 'banned', 'Report status must be updated to banned');

  // Verify target user's session token has been revoked
  const targetPostCheck = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${targetToken}` },
  });
  assert.strictEqual(targetPostCheck.status, 401, 'Banned user session token must be revoked (401)');

  // Verify banned user is in banned_users.json on disk
  const bannedDiskFile = path.join(process.cwd(), '.data/banned_users.json');
  assert(fs.existsSync(bannedDiskFile), 'banned_users.json must exist');
  const bannedList = JSON.parse(fs.readFileSync(bannedDiskFile, 'utf8'));
  assert(bannedList.includes(testTargetUserId), 'banned_users.json must include testTargetUserId');
  console.log('✓ Confirmed: Violating user banned, session tokens purged, and status persisted');

  // -------------------------------------------------------------
  // Test 7: Owner Action - Dismiss a report
  // -------------------------------------------------------------
  console.log('[Test 7] Testing owner dismissing a non-violating report...');
  const reportPayload2 = {
    reportedUserId: 'usr_safe_user_test',
    reporterId: 'usr_reporter_2',
    reason: 'Other',
    notes: 'Member spoke too quickly during date.',
  };
  const submitRes2 = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportPayload2),
  });
  const submitData2 = await submitRes2.json();
  const reportId2 = submitData2.reportId;

  const dismissRes = await fetch(`${BASE_URL}/api/owner/reports/${reportId2}/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      action: 'dismiss',
      ownerNotes: 'Reviewed video session logs; no violation found.',
    }),
  });

  assert.strictEqual(dismissRes.status, 200, 'Dismiss action must return 200 OK');
  const dismissData = await dismissRes.json();
  assert.strictEqual(dismissData.report.status, 'dismissed');
  console.log('✓ Confirmed: Owner can dismiss reports and record owner notes on server');

  // -------------------------------------------------------------
  // Test 8: Owner Action - Unban user
  // -------------------------------------------------------------
  console.log('[Test 8] Testing owner unban endpoint...');
  const unbanRes = await fetch(`${BASE_URL}/api/owner/users/${testTargetUserId}/unban`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(unbanRes.status, 200, 'Unban request must return 200 OK');
  const updatedBannedList = JSON.parse(fs.readFileSync(bannedDiskFile, 'utf8'));
  assert(!updatedBannedList.includes(testTargetUserId), 'User must be removed from banned_users.json');
  console.log('✓ Confirmed: Owner can unban user if needed');

  console.log('\n================================================================');
  console.log('ALL OWNER REPORTS & CHILD SAFETY TESTS PASSED SUCCESSFULLY');
  console.log('================================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
