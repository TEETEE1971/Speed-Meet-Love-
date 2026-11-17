# Speed Meet Love Security Specification (Phase 0)

## 1. Data Invariants
1. **Profile Ownership**: A member's account document (`/users/{userId}`) belongs strictly to `request.auth.uid == userId` (or the verified founder/admin `kristylten@gmail.com` with `email_verified == true`). No regular member may read, list, create, update, or delete another member's `/users/{otherId}` document.
2. **RBAC & Billing Field Immutability**: Regular members may only edit non-privileged dating profile fields (`firstName`, `lastName`, `age`, `gender`, `interestedIn`, `location`, `occupation`, `bio`, `interests`, `icebreakerAnswer`, `avatarColor`, `hairColor`, `heightInches`, `eyeColor`, `relationshipIntent`, `smoking`, `drinking`, `children`, `privacySettings`, `preferences`, `profilePhoto`, `lastSignIn`). A member cannot self-assign `isTester`, `testerAccessGranted`, `isBanned`, `subscriptionTier`, `subscriptionStatus`, `stripeCustomerId*`, or alter `userId`, `email`, or `createdAt`.
3. **Founder/Admin Isolation**: Founder-only collections (`/banned_users`, `/granted_testers`, `/reports` moderation review, `/launch_events` creation/editing/deletion, `/event_waitlist` full list) require verified founder identity (`request.auth != null && request.auth.token.email_verified == true && request.auth.token.email == 'kristylten@gmail.com'`).
4. **Input & Resource Bounds**: All document IDs are strictly regex-validated (`^[a-zA-Z0-9_\\-]+$` or safe email doc key) and bounded; all string and array fields enforce explicit type and `.size()` limits.
5. **Backend Ownership Enforcement**: Express endpoints (`POST/PUT/PATCH /api/account/profile`, `POST/PUT /api/account/photo`, `PUT/PATCH/POST /api/users/:userId`, `POST /api/account/delete`) derive identity strictly from `verifyAuthenticatedUser(req)` and reject cross-user modification attempts with HTTP `403 FORBIDDEN`. `/api/auth/session` rejects unauthenticated token minting (`401`) and cross-user impersonation (`403`).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED / HTTP 401 or 403)
1. Unauthenticated read or write on `/users/usr_marcus`.
2. Regular member A (`usr_alpha`) attempting `update` on `/users/usr_marcus` `bio` or `location`.
3. Regular member A (`usr_alpha`) attempting `get` or `list` on `/users` to scrape PII/hashes.
4. Regular member A attempting self-promotion via `update` on `/users/usr_alpha` with `{ isTester: true, subscriptionTier: 'Premium Plus' }`.
5. Regular member A attempting `create` on `/users/usr_alpha` with `{ subscriptionTier: 'Premium Plus', isBanned: false, isTester: true }`.
6. Regular member A attempting shadow-field injection (`{ bio: 'hi', isAdmin: true }`) on `/users/usr_alpha`.
7. Attacker with unverified email matching founder (`email: 'kristylten@gmail.com'`, `email_verified: false`) attempting `/users/usr_marcus` write or `/granted_testers` write.
8. Regular member attempting `create` / `delete` on `/granted_testers/{emailDocId}` or `/banned_users/{id}`.
9. Regular member attempting `list` or `update` on `/reports/{reportId}` or `/event_waitlist`.
10. Regular member attempting `create` on `/event_waitlist/usr_marcus` with `userId: 'usr_marcus'`.
11. Regular member attempting `create` or `update` on `/launch_events/{eventId}`.
12. Resource poisoning: injecting >128-char malformed document ID (`../../admin`) or oversized string (`bio` > 1000 chars) on `/users/{userId}`.
