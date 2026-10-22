---
title: "Secure sessions: short-lived access token + httpOnly refresh cookie"
labels: [security, fullstack, P1]
milestone: "M2 SaaS Core"
size: M
depends_on: [2]
---
## Why
The JWT is kept by the frontend and sent as a Bearer header, with a list of `loggedSessions` stored on `AdminPassword`. If a script injected into the page (XSS) can read the token, it can steal the session, and the session list grows without bound.

## Tasks
- [ ] 15-minute access token (kept in memory) + rotating refresh token in an `httpOnly; Secure; SameSite=Lax` cookie
- [ ] A `Session` collection (device, IP, lastUsed) with a TTL index; reuse detection revokes the whole token chain
- [ ] Axios interceptor in the frontend refreshes silently on 401
- [ ] Profile → Security: list active sessions, "log out everywhere"
- [ ] Password change/reset revokes all sessions

## Acceptance criteria
- No token in `localStorage`; an idle session expires as configured
