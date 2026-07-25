/**
 * @whiteboard/shared — the contract layer shared by the web app and the
 * realtime server. Zod schemas, RBAC, error taxonomy, constants, and domain
 * types live here so both apps validate and authorize against one source.
 */
export * from './constants';
export * from './avatars';
export * from './rbac';
export * from './errors';
export * from './schemas/index';
export * from './types/index';
