---
title: "Team members: invite, manage, deactivate users"
labels: [feature, fullstack, saas, P0]
milestone: "M2 SaaS Core"
size: M
depends_on: [15, 19]
---
## Why
`Admin.role` is `enum: ['owner']`; each company has only one user.

## Tasks
- [ ] Rename/extend `Admin` → `User` (keep the collection or migrate it) with `organizationId` and `role`
- [ ] Invite flow: owner/admin enters an email + role → signed invite link → accept and set a password
- [ ] Settings → Team page: list, change role, resend invite, deactivate (also kills sessions)
- [ ] Seat count shown, for future plan limits (#50)

## Acceptance criteria
- An invited user joins the right organization with the assigned role
- A deactivated user's tokens stop working immediately
