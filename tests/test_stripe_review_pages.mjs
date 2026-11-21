// tests/test_stripe_review_pages.mjs
// Verifies all Stripe-required public pages, direct URL refresh routing, footer links,
// removal of private DB tools from public footer, and factual policy disclosures.

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const PUBLIC_ROUTES = [
  { path: '/terms', view: 'terms', title: 'Terms' },
  { path: '/acceptable-use', view: 'acceptable_use', title: 'Acceptable Use' },
  { path: '/contact', view: 'contact', title: 'Contact' },
  { path: '/pricing', view: 'pricing', title: 'Pricing' },
  { path: '/law-enforcement', view: 'law_enforcement', title: 'Law-Enforcement' },
  { path: '/privacy', view: 'privacy', title: 'Privacy Policy' },
  { path: '/refund-policy', view: 'refund_policy', title: 'Refund' },
  { path: '/child-safety', view: 'child_safety', title: 'Child Safety' },
  { path: '/delete-account', view: 'delete_account', title: 'Delete Account' },
];

async function testDirectPublicRoutes() {
  console.log('[1] Testing unauthenticated direct HTTP GET (simulating refresh) for all 9 public URLs...');
  for (const r of PUBLIC_ROUTES) {
    const res = await fetch(`${BASE_URL}${r.path}`, {
      headers: { Accept: 'text/html' },
    });
    assert.strictEqual(res.status, 200, `Expected HTTP 200 for GET ${r.path}, got ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    assert.ok(ct.includes('text/html'), `Expected text/html for ${r.path}, got ${ct}`);
    const html = await res.text();
    assert.ok(html.includes('<div id="root"></div>'), `Expected SPA root in HTML for ${r.path}`);
    console.log(`  ✓ GET ${r.path} -> 200 OK (SPA HTML)`);
  }
}

function testClientRoutingAndFooter() {
  console.log('\n[2] Verifying AppContext direct-URL routing and App.tsx footer cleanup...');
  const ctx = fs.readFileSync(path.join(process.cwd(), 'src/context/AppContext.tsx'), 'utf8');
  for (const r of PUBLIC_ROUTES) {
    assert.ok(ctx.includes(`${r.view}: '${r.path}'`), `AppContext PUBLIC_VIEW_PATHS must map ${r.view} -> ${r.path}`);
  }
  assert.ok(ctx.includes('getViewFromPathname(window.location.pathname)'), 'AppContext must resolve initial state from pathname before localStorage');
  assert.ok(ctx.includes('window.history.pushState(null, \'\', targetPath)'), 'AppContext setCurrentView must push public URL path');

  const app = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const footerMatch = app.match(/<footer[\s\S]*?<\/footer>/);
  assert.ok(footerMatch, 'App.tsx must render footer');
  const footerHtml = footerMatch[0];

  assert.ok(!footerHtml.includes('Inspect Relational Tables'), 'Footer must NOT expose Inspect Relational Tables');
  assert.ok(!footerHtml.includes("setCurrentView('tables')"), 'Footer must NOT link to relational tables');

  for (const r of PUBLIC_ROUTES) {
    assert.ok(footerHtml.includes(`href="${r.path}"`), `Footer must include real href="${r.path}"`);
    assert.ok(footerHtml.includes(`setCurrentView('${r.view}')`), `Footer must navigate to view '${r.view}'`);
    assert.ok(app.includes(`currentView === '${r.view}'`), `App.tsx must mount view '${r.view}' without AuthGate`);
  }
  console.log('  ✓ All 9 public URLs mapped in AppContext, mounted publicly in App.tsx, and linked cleanly in footer');
  console.log('  ✓ Private "Inspect Relational Tables" removed from public footer');
}

function testPolicyContentAndNoStaleContradictions() {
  console.log('\n[3] Verifying required prohibitions and absence of stale payment contradictions...');
  const terms = fs.readFileSync(path.join(process.cwd(), 'src/components/TermsPage.tsx'), 'utf8');
  const aup = fs.readFileSync(path.join(process.cwd(), 'src/components/AcceptableUsePage.tsx'), 'utf8');

  const requiredTopics = [
    /human trafficking/i,
    /sexual exploitation/i,
    /aiding, encouraging, or facilitating abuse/i,
    /under (the age of )?18|minors/i,
    /harassment/i,
    /scams?/i,
    /impersonat/i,
    /illegal content/i,
    /Sexually explicit content and sexual solicitation are prohibited across Speed Meet Love, including in profiles, private messages, and live video dates, even when everyone involved consents\./,
    /Sexual violence, including sexual assault, is strictly prohibited\./,
    /does not continuously monitor live video or automatically scan it/i,
  ];

  for (const regex of requiredTopics) {
    assert.ok(regex.test(terms), `TermsPage.tsx missing required rule matching ${regex}`);
    assert.ok(regex.test(aup), `AcceptableUsePage.tsx missing required rule matching ${regex}`);
  }
  console.log('  ✓ Terms & Acceptable Use Policy include all required prohibitions verbatim');

  const filesToCheck = [
    'src/components/PrivacyPolicy.tsx',
    'src/components/DeleteAccountPage.tsx',
    'src/components/ProfileSetup.tsx',
    'src/components/LiveRoundScreen.tsx',
    'server.ts',
  ];
  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
    assert.ok(!/no connected payment processor/i.test(content), `${rel} still contains stale "no connected payment processor" text`);
    assert.ok(!/Rise Again app/i.test(content), `${rel} still contains stale "Rise Again app" reference`);
  }
  console.log('  ✓ Stale "no payment processor" and "Rise Again" contradictions cleared across frontend & server');
}

async function testServerApisPreserved() {
  console.log('\n[4] Verifying Stripe config, system status, and time APIs remain intact...');
  const cfgRes = await fetch(`${BASE_URL}/api/stripe/config`);
  assert.strictEqual(cfgRes.status, 200);
  const cfg = await cfgRes.json();
  assert.strictEqual(cfg.prices.premium.amount, 9.99);
  assert.strictEqual(cfg.prices.premiumPlus.amount, 14.99);
  assert.strictEqual(cfg.appUrl, 'https://speedmeetlove.com');
  assert.strictEqual(cfg.webhookRoute, '/api/stripe/webhook');

  const statusRes = await fetch(`${BASE_URL}/api/system-status`);
  assert.strictEqual(statusRes.status, 200);
  const status = await statusRes.json();
  assert.ok(!/no connected payment processor/i.test(status.architecture.paymentEngine), 'system-status paymentEngine must reflect Stripe');
  console.log('  ✓ /api/stripe/config ($9.99, $14.99, https://speedmeetlove.com) and /api/system-status verified');
}

async function run() {
  await testDirectPublicRoutes();
  testClientRoutingAndFooter();
  testPolicyContentAndNoStaleContradictions();
  await testServerApisPreserved();
  console.log('\n✅ ALL STRIPE REVIEW READINESS VERIFICATION CHECKS PASSED!');
}

run().catch((err) => {
  console.error('\n❌ STRIPE REVIEW TEST FAILED:', err);
  process.exit(1);
});
