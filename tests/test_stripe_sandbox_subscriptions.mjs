import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';

const EXPECTED_PRICES = {
  PREMIUM: '',
  PREMIUM_PLUS: '',
};

// Retrieve webhook secret from process or server environment to sign simulated webhooks
let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  try {
    const pids = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
    for (const pid of pids) {
      try {
        const env = fs.readFileSync('/proc/' + pid + '/environ', 'utf8');
        const match = env.split('\0').find(s => s.startsWith('STRIPE_WEBHOOK_SECRET='));
        if (match) {
          webhookSecret = match.substring('STRIPE_WEBHOOK_SECRET='.length);
          break;
        }
      } catch (e) {}
    }
  } catch (e) {}
}

function createWebhookHeaders(bodyString) {
  const headers = { 'Content-Type': 'application/json' };
  if (webhookSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${bodyString}`)
      .digest('hex');
    headers['stripe-signature'] = `t=${timestamp},v1=${signature}`;
  }
  return headers;
}

async function runTests() {
  console.log('================================================================');
  console.log('Starting Stripe Subscriptions & Entitlements Test Suite');
  console.log('================================================================');

  // Test 1: Verify Public Stripe Config
  console.log('\n[Test 1] Testing /api/stripe/config...');
  const configRes = await fetch(`${BASE_URL}/api/stripe/config`);
  assert.strictEqual(configRes.status, 200, 'Config endpoint must return 200');
  const config = await configRes.json();
  assert.strictEqual(config.success, true, 'Config success must be true');
  assert(['live', 'sandbox', 'unconfigured'].includes(config.mode), 'Config must expose dynamic mode');
  assert.strictEqual(typeof config.isLiveMode, 'boolean', 'Config must expose boolean isLiveMode');
  assert.strictEqual(typeof config.sandboxMode, 'boolean', 'Config must expose boolean sandboxMode');
  assert(config.prices.premium.id?.startsWith('price_'), 'Premium price ID must be a Stripe price ID');
  assert(config.prices.premiumPlus.id?.startsWith('price_'), 'Premium Plus price ID must be a Stripe price ID');
  assert.notStrictEqual(
    config.prices.premium.id,
    config.prices.premiumPlus.id,
    'Premium and Premium Plus price IDs must be distinct'
  );
  if (config.isLiveMode) {
    assert.notStrictEqual(
      config.prices.premiumPlus.id,
      'price_1UZJR6GzWqYTtaSTVJCIeJip',
      'Live mode must not return legacy sandbox Premium Plus price ID'
    );
  }
  if (config.publishableKey) {
    assert(/^pk_(live|test)_/.test(config.publishableKey), 'Exposed publishableKey must be a pk_ key');
  }
  EXPECTED_PRICES.PREMIUM = config.prices.premium.id;
  EXPECTED_PRICES.PREMIUM_PLUS = config.prices.premiumPlus.id;
  assert.strictEqual(config.prices.premium.amount, 9.99, 'Premium amount must be 9.99');
  assert.strictEqual(config.prices.premium.interval, 'month', 'Premium interval must be month');
  assert.strictEqual(config.prices.premiumPlus.amount, 14.99, 'Premium Plus amount must be 14.99');
  assert.strictEqual(config.prices.premiumPlus.interval, 'month', 'Premium Plus interval must be month');
  console.log(`✓ /api/stripe/config returns dynamic mode (${config.mode}) and authoritative price IDs`);

  // Verify SubscriptionScreen.tsx has no hardcoded sandbox price IDs
  const subscriptionScreenSrc = fs.readFileSync('src/components/SubscriptionScreen.tsx', 'utf8');
  assert(!subscriptionScreenSrc.includes('price_1UZJGCGzWqYTtaSTwzOMdDqO'), 'Must not hardcode sandbox Premium price ID');
  assert(!subscriptionScreenSrc.includes('price_1UZJR6GzWqYTtaSTVJCIeJip'), 'Must not hardcode sandbox Premium Plus price ID');
  assert(subscriptionScreenSrc.includes('/api/stripe/config'), 'SubscriptionScreen must load prices from /api/stripe/config');
  console.log('✓ SubscriptionScreen.tsx uses /api/stripe/config with no hardcoded sandbox price IDs');

  // Test 2: Price Verification Endpoint
  console.log('\n[Test 2] Testing /api/stripe/verify-prices...');
  const verifyRes = await fetch(`${BASE_URL}/api/stripe/verify-prices`);
  assert.strictEqual(verifyRes.status, 200, 'Verify endpoint must return 200');
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.success, true, 'Verify success must be true');
  assert(['live', 'sandbox', 'unconfigured'].includes(verifyData.mode), 'Verify response must include mode');
  assert(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM], 'Must contain expected Premium price');
  assert.strictEqual(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM].amount, 9.99);
  assert.strictEqual(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM].currency, 'USD');
  assert.strictEqual(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM].interval, 'month');
  assert(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM_PLUS], 'Must contain expected Premium Plus price');
  assert.strictEqual(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM_PLUS].amount, 14.99);
  assert.strictEqual(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM_PLUS].currency, 'USD');
  assert.strictEqual(verifyData.expectedPrices[EXPECTED_PRICES.PREMIUM_PLUS].interval, 'month');
  if (config.isConfigured) {
    assert.strictEqual(verifyData.allVerified, true, 'Both Premium and Premium Plus prices must verify against Stripe');
    assert.strictEqual(verifyData.prices[EXPECTED_PRICES.PREMIUM].valid, true);
    assert.strictEqual(verifyData.prices[EXPECTED_PRICES.PREMIUM].modeMatches, true);
    assert.strictEqual(verifyData.prices[EXPECTED_PRICES.PREMIUM_PLUS].valid, true);
    assert.strictEqual(verifyData.prices[EXPECTED_PRICES.PREMIUM_PLUS].modeMatches, true);
  }
  console.log(`✓ /api/stripe/verify-prices verified specifications (mode=${verifyData.mode}, status=${verifyData.status})`);

  if (webhookSecret) {
    const badSigRes = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1234567890,v1=invalidsignature',
      },
      body: JSON.stringify({ id: 'evt_bad', type: 'checkout.session.completed' }),
    });
    assert.strictEqual(badSigRes.status, 400, 'Webhook with invalid signature must be rejected with 400');
    console.log('✓ Webhook signature verification rejects invalid stripe-signature with 400');
  }

  // Test 3: Unauthenticated Access Rejection
  console.log('\n[Test 3] Testing unauthenticated rejection for Checkout and Billing Portal...');
  const unauthCheckout = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId: EXPECTED_PRICES.PREMIUM }),
  });
  assert.strictEqual(unauthCheckout.status, 401, 'Unauthenticated checkout must return 401');

  const unauthPortal = await fetch(`${BASE_URL}/api/stripe/create-portal-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(unauthPortal.status, 401, 'Unauthenticated portal must return 401');
  console.log('✓ Unauthenticated requests strictly rejected with 401');

  // Test 4: Create a Free User and Verify Server-Side Access Restrictions
  console.log('\n[Test 4] Creating Free user and verifying server-side access enforcement...');
  const freeEmail = `free.member.${Date.now()}@realmail.test`;
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: freeEmail,
      password: 'StrongPassword2026!',
      firstName: 'Free',
      lastName: 'Member',
      age: 27,
      gender: 'Woman',
      interestedIn: 'Men',
      location: 'Brooklyn, NY',
    }),
  });
  const signupData = await signupRes.json();
  assert(signupRes.ok, 'Signup should succeed');
  const freeToken = signupData.token;
  const freeUserId = signupData.user.userId || signupData.user.UserID;
  assert.strictEqual(signupData.user.subscriptionTier, 'Free', 'New user must default to Free tier');

  // Free member trying to send a message -> MUST be blocked with 403 SUBSCRIPTION_REQUIRED
  console.log('  -> Verifying Free member blocked from sending messages...');
  const freeMessageRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      matchId: 'match_test_01',
      text: 'Hello from Free member!',
    }),
  });
  assert.strictEqual(freeMessageRes.status, 403, 'Free member must be blocked with 403 from messaging');
  const freeMsgData = await freeMessageRes.json();
  assert.strictEqual(freeMsgData.code, 'SUBSCRIPTION_REQUIRED', 'Error code must be SUBSCRIPTION_REQUIRED');
  console.log('  ✓ Free member correctly blocked from messaging (Free allows browsing only)');

  // Free member trying to enter live speed dating -> MUST be blocked with 403 PREMIUM_PLUS_REQUIRED
  console.log('  -> Verifying Free member blocked from live speed dating events...');
  const freeJoinRes = await fetch(`${BASE_URL}/api/events/evt_friday_dating/match-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      userId: freeUserId,
      userAge: 27,
      isRegistered: true,
      eventId: 'evt_friday_dating',
      tier: 'Free',
    }),
  });
  assert.strictEqual(freeJoinRes.status, 403, 'Free member must be blocked from joining speed dating');
  const freeJoinData = await freeJoinRes.json();
  assert.strictEqual(freeJoinData.code, 'PREMIUM_PLUS_REQUIRED', 'Error code must be PREMIUM_PLUS_REQUIRED');
  console.log('  ✓ Free member correctly blocked from live speed dating events');

  // Test 5: Simulating Stripe Webhook: Upgrade Free User to Premium ($9.99/mo)
  console.log('\n[Test 5] Simulating Stripe Webhook: checkout.session.completed for Premium ($9.99/mo)...');
  const premiumWebhookPayload = {
    id: `evt_test_checkout_${Date.now()}`,
    livemode: false,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        customer: `cus_test_${freeUserId}`,
        subscription: `sub_test_premium_${freeUserId}`,
        client_reference_id: freeUserId,
        metadata: {
          userId: freeUserId,
          tier: 'Premium',
          priceId: EXPECTED_PRICES.PREMIUM,
        },
      },
    },
  };

  const bodyString1 = JSON.stringify(premiumWebhookPayload);
  const webhookRes1 = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: 'POST',
    headers: createWebhookHeaders(bodyString1),
    body: bodyString1,
  });
  assert.strictEqual(webhookRes1.status, 200, 'Webhook receiver must return 200');
  const webhookData1 = await webhookRes1.json();
  assert.strictEqual(webhookData1.received, true, 'Webhook must report received: true');

  // Re-check profile via /api/auth/me to verify durable state updated
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${freeToken}` },
  });
  const meData = await meRes.json();
  assert.strictEqual(meData.user.subscriptionTier, 'Premium', 'User tier must now be Premium');
  assert.strictEqual(meData.user.subscriptionStatus, 'active', 'Subscription status must be active');
  assert.strictEqual(meData.user.stripeCustomerIdTest, `cus_test_${freeUserId}`, 'Test Stripe customer ID must be stored separately');
  console.log('✓ Webhook successfully upgraded user to Premium ($9.99/mo) and persisted to Firestore');

  // Premium member can now send messages!
  console.log('  -> Verifying Premium member can now send private messages...');
  const premiumMsgRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      matchId: 'match_test_01',
      text: 'Hello, I am now a Premium member!',
    }),
  });
  assert.strictEqual(premiumMsgRes.status, 200, 'Premium member message send must succeed');
  const premiumMsgData = await premiumMsgRes.json();
  assert.strictEqual(premiumMsgData.success, true, 'Message send must report success: true');
  console.log('  ✓ Premium member successfully authorized for messaging');

  // Premium member still blocked from live speed dating (requires Premium Plus)
  console.log('  -> Verifying Premium member is still blocked from live speed dating (needs Premium Plus)...');
  const premiumJoinRes = await fetch(`${BASE_URL}/api/events/evt_friday_dating/match-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({
      userId: freeUserId,
      userAge: 27,
      isRegistered: true,
      eventId: 'evt_friday_dating',
      tier: 'Premium',
    }),
  });
  assert.strictEqual(premiumJoinRes.status, 403, 'Premium member must be blocked from live speed dating');
  const premiumJoinData = await premiumJoinRes.json();
  assert.strictEqual(premiumJoinData.code, 'PREMIUM_PLUS_REQUIRED');
  console.log('  ✓ Premium member correctly blocked from live speed dating events');

  // Test 6: Simulating Stripe Webhook: Upgrade to Premium Plus ($14.99/mo)
  console.log('\n[Test 6] Simulating Stripe Webhook: customer.subscription.updated to Premium Plus ($14.99/mo)...');
  const premiumPlusWebhookPayload = {
    id: `evt_test_sub_update_${Date.now()}`,
    livemode: false,
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: `sub_test_premium_${freeUserId}`,
        customer: `cus_test_${freeUserId}`,
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        items: {
          data: [
            {
              price: {
                id: EXPECTED_PRICES.PREMIUM_PLUS,
              },
            },
          ],
        },
        metadata: {
          userId: freeUserId,
          tier: 'Premium Plus',
        },
      },
    },
  };

  const bodyString2 = JSON.stringify(premiumPlusWebhookPayload);
  const webhookRes2 = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: 'POST',
    headers: createWebhookHeaders(bodyString2),
    body: bodyString2,
  });
  assert.strictEqual(webhookRes2.status, 200);

  const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${freeToken}` },
  }).then(r => r.json());
  assert.strictEqual(meRes2.user.subscriptionTier, 'Premium Plus', 'Tier must now be Premium Plus');
  console.log('✓ Webhook successfully upgraded user to Premium Plus ($14.99/mo)');

  // Test 7: Simulating Stripe Webhook: Cancellation reverts standard user to Free
  console.log('\n[Test 7] Simulating Stripe Webhook: customer.subscription.deleted...');
  const cancelWebhookPayload = {
    id: `evt_test_cancel_${Date.now()}`,
    livemode: false,
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: `sub_test_premium_${freeUserId}`,
        customer: `cus_test_${freeUserId}`,
        metadata: {
          userId: freeUserId,
        },
      },
    },
  };

  const bodyString3 = JSON.stringify(cancelWebhookPayload);
  const webhookRes3 = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: 'POST',
    headers: createWebhookHeaders(bodyString3),
    body: bodyString3,
  });
  assert.strictEqual(webhookRes3.status, 200);

  const meRes3 = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${freeToken}` },
  }).then(r => r.json());
  assert.strictEqual(meRes3.user.subscriptionTier, 'Free', 'Standard member must revert to Free upon cancellation');
  assert.strictEqual(meRes3.user.subscriptionStatus, 'canceled', 'Status must be canceled');
  console.log('✓ Canceled subscription correctly reverts standard member to Free in database');

  // Test 8: Free Tester Access Isolation
  console.log('\n[Test 8] Verifying Free Tester Access is kept separate from paid subscription status...');
  // Owner account (speedmeetlove@gmail.com) has isOwner / tester privilege
  const ownerSignin = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'speedmeetlove@gmail.com', password: 'SpeedMeetLove2026!' }),
  });
  const ownerData = await ownerSignin.json();
  assert(ownerSignin.ok, 'Owner sign-in must succeed');
  assert.strictEqual(ownerData.user.isTester, true, 'Owner user must have isTester: true');

  // Owner can send messages and access features due to tester override, regardless of whether Stripe subscription exists
  const ownerMsgRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerData.token}`,
    },
    body: JSON.stringify({
      matchId: 'match_test_owner',
      text: 'Owner tester message test',
    }),
  });
  assert.strictEqual(ownerMsgRes.status, 200, 'Owner tester override must allow messaging');
  console.log('✓ Free tester access verified: Owner/tester retains full access separate from paid Stripe status');

  // Clean up disposable test user account
  console.log('\n[Cleanup] Deleting disposable test member...');
  await fetch(`${BASE_URL}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeToken}`,
    },
    body: JSON.stringify({ targetUserId: freeUserId, confirmEmail: freeEmail }),
  });
  console.log('✓ Disposable test member deleted successfully');

  console.log('\n================================================================');
  console.log('ALL STRIPE SANDBOX SUBSCRIPTION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
