process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.CORS_ORIGINS = 'http://localhost:3000';
// Keep the built frontend out of API tests
process.env.FRONTEND_DIST = '/nonexistent';
