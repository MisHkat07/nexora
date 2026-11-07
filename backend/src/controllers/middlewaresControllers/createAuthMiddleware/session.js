/**
 * Older callers imported session helpers from here. New sessions are created in src/auth/sessions.js
 * (short-lived access token plus an httpOnly refresh cookie).
 */
module.exports = require('@/auth/sessions');
