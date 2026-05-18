// Sets minimal env defaults so modules that eagerly call loadEnv() during
// import (e.g. logger.ts → env.ts) can succeed under `bun test`. Individual
// tests still build their own scoped env objects when they need to control
// values; this only covers the module-init validation gate.
if (!process.env.APP_SECRET) process.env.APP_SECRET = 'a'.repeat(32);
if (!process.env.BASE_URL) process.env.BASE_URL = 'http://localhost:3001';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
