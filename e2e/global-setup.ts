// e2e/global-setup.ts
// ESM global setup for Playwright: polyfill TransformStream and web streams APIs
import 'web-streams-polyfill/polyfill';

export default async function globalSetup() {
  // No-op, just ensures polyfill is loaded before tests
}
