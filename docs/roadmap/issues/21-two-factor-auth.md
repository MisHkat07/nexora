---
title: "Two-factor authentication (TOTP + recovery codes)"
labels: [feature, security, fullstack, P2]
milestone: "M2 SaaS Core"
size: M
depends_on: [20]
---
## Tasks
- [ ] Enroll with a QR code (`otplib`), verify, generate 10 hashed recovery codes
- [ ] Login step-up when 2FA is enabled
- [ ] Organization setting: require 2FA for all members

## Acceptance criteria
- Login without a valid TOTP or recovery code fails; recovery codes work once each
