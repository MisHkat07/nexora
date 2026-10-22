---
title: "In-app notification center with real-time updates"
labels: [feature, fullstack, ux, P2]
milestone: "M6 UX & AI"
size: M
depends_on: [26, 18]
---
## Tasks
- [ ] `Notification` model (user, type, payload, read) + bell dropdown in the header
- [ ] Events: invoice paid, quote accepted/viewed, task due, mention, import finished
- [ ] Real-time push via Socket.IO or SSE (authenticated, per-user rooms)
- [ ] Per-user preferences (in-app / email / off per event type)

## Acceptance criteria
- When a client pays via the portal, the owner sees a notification without refreshing
