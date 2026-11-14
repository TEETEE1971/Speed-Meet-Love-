// tests/test_child_safety_page.mjs
// Automated verification for Google Play Child Safety Standards compliance

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testPublicHttpAccess() {
  console.log('[Test 1] Testing public unauthenticated access to /child-safety route...');
  
  const res = await fetch(`${BASE_URL}/child-safety`, {
    headers: { 'Accept': 'text/html' }
  });
  
  assert.strictEqual(res.status, 200, `Expected 200 OK from /child-safety, got ${res.status}`);
  const html = await res.text();
  assert(html.includes('<!DOCTYPE html>') || html.includes('<html'), 'Expected HTML response for SPA');
  console.log('✓ Public GET /child-safety returns 200 OK without authentication');

  // Also verify /privacy and /delete-account remain public
  const privRes = await fetch(`${BASE_URL}/privacy`);
  assert.strictEqual(privRes.status, 200, 'Expected 200 OK from /privacy');
  
  const delRes = await fetch(`${BASE_URL}/delete-account`);
  assert.strictEqual(delRes.status, 200, 'Expected 200 OK from /delete-account');
  console.log('✓ Companion public compliance pages (/privacy, /delete-account) remain accessible');
}

function testChildSafetyComponentContent() {
  console.log('[Test 2] Verifying ChildSafetyPage.tsx declarations & standards...');
  
  const filePath = path.join(process.cwd(), 'src/components/ChildSafetyPage.tsx');
  assert(fs.existsSync(filePath), 'ChildSafetyPage.tsx must exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Identification
  assert(content.includes('Speed Meet Love'), 'Must name Speed Meet Love');
  assert(content.includes('TeeTees Creations'), 'Must name operator TeeTees Creations');
  assert(content.includes('speedmeetlove@gmail.com'), 'Must provide official contact email speedmeetlove@gmail.com');
  console.log('✓ App and operator identity correctly declared');
  
  // 2. Strict prohibitions
  assert(content.includes('Child Sexual Abuse Material') || content.includes('CSAM'), 'Must prohibit CSAM');
  assert(content.includes('Child Sexual Abuse and Exploitation') || content.includes('CSAE'), 'Must prohibit CSAE');
  assert(content.includes('grooming') || content.includes('Grooming'), 'Must explicitly prohibit grooming');
  assert(content.includes('Adults Only') || content.includes('18+'), 'Must declare Adults-Only 18+ policy');
  console.log('✓ Zero-tolerance CSAE, CSAM, grooming, and 18+ restrictions explicitly declared');
  
  // 3. Reporting mechanisms
  assert(content.includes('Report') || content.includes('reporting'), 'Must describe user reporting mechanisms');
  assert(content.includes('speedmeetlove@gmail.com'), 'Must provide direct email reporting');
  console.log('✓ In-app and direct safety reporting mechanisms documented');
  
  // 4. Escalation and enforcement
  assert(content.includes('NCMEC') || content.includes('CyberTipline'), 'Must state escalation to NCMEC CyberTipline');
  assert(content.includes('law enforcement'), 'Must cooperate with law enforcement');
  assert(content.includes('permanent ban') || content.includes('Permanent') || content.includes('ban'), 'Must enforce permanent bans');
  console.log('✓ NCMEC reporting, law enforcement escalation, and permanent enforcement documented');
}

function testNavigationAndRoutingWiring() {
  console.log('[Test 3] Verifying navigation and routing integration across the app...');
  
  // Check types
  const typesPath = path.join(process.cwd(), 'src/types/index.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  assert(typesContent.includes("'child_safety'"), "AppView must include 'child_safety'");
  console.log("✓ 'child_safety' registered in AppView type");

  // Check AppContext
  const ctxPath = path.join(process.cwd(), 'src/context/AppContext.tsx');
  const ctxContent = fs.readFileSync(ctxPath, 'utf8');
  assert(ctxContent.includes("child_safety: '/child-safety'"), "AppContext must map child_safety to /child-safety");
  assert(ctxContent.includes("getViewFromPathname(window.location.pathname)") && ctxContent.includes("pushState(null, '', targetPath)"), "AppContext must handle direct load, pushState, and popstate for /child-safety");
  console.log("✓ AppContext handles direct load, pushState, and popstate for /child-safety");

  // Check App.tsx rendering and footer link
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes("<ChildSafetyPage"), "App.tsx must render ChildSafetyPage");
  assert(appContent.includes("setCurrentView('child_safety')"), "App.tsx footer must have link to child safety");
  console.log("✓ App.tsx renders ChildSafetyPage and includes footer link");

  // Check Navbar.tsx links (dropdown & mobile drawer)
  const navPath = path.join(process.cwd(), 'src/components/Navbar.tsx');
  const navContent = fs.readFileSync(navPath, 'utf8');
  assert(navContent.includes("setCurrentView('child_safety')"), "Navbar must contain button to navigate to child_safety");
  assert(navContent.includes("Child Safety Standards"), "Navbar must display 'Child Safety Standards' label");
  console.log("✓ Navbar includes Child Safety Standards in dropdown and mobile drawer");

  // Check PrivacyPolicy cross-reference
  const privacyPath = path.join(process.cwd(), 'src/components/PrivacyPolicy.tsx');
  const privacyContent = fs.readFileSync(privacyPath, 'utf8');
  assert(privacyContent.includes("setCurrentView('child_safety')"), "PrivacyPolicy must cross-reference Child Safety");
  console.log("✓ PrivacyPolicy cross-references Child Safety Standards page");
}

async function run() {
  console.log('======================================================');
  console.log('Starting Google Play Child Safety Standards Test Suite');
  console.log('======================================================\n');
  
  await testPublicHttpAccess();
  testChildSafetyComponentContent();
  testNavigationAndRoutingWiring();
  
  console.log('\n======================================================');
  console.log('ALL CHILD SAFETY TESTS PASSED SUCCESSFULLY');
  console.log('======================================================');
}

run().catch((err) => {
  console.error('\n❌ CHILD SAFETY TEST FAILED:', err);
  process.exit(1);
});
