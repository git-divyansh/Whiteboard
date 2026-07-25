import { defineRoute, json } from '@/server/api/handler';

// Liveness probe. Intentionally unauthenticated and cheap.
export const GET = defineRoute({}, () => json({ status: 'ok', timestamp: Date.now() }));
