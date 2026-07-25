/**
 * @whiteboard/auth — authentication layer, wrapping Auth.js v5.
 *
 * Import boundaries matter:
 *   - `@whiteboard/auth`            → Node runtime (adapter, credentials, hashing)
 *   - `@whiteboard/auth/edge`       → edge-safe base config for middleware
 *   - `@whiteboard/auth/realtime-token` → sign/verify handshake tokens
 *   - `@whiteboard/auth/password`   → pluggable password hasher
 */
export { baseAuthConfig } from './base-config';
export { createAuthConfig } from './node-config';
export { buildOAuthProviders } from './providers';
export { buildCredentialsProvider } from './credentials';
export * from './password';
export * from './realtime-token';
