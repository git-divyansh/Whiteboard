import 'server-only';

import { type AuditAction, Prisma, prisma } from '@whiteboard/db';

/**
 * Append-only audit logging (Guideline #16). Records permission-sensitive
 * actions — member invites, role changes, sharing. Never log secrets, tokens,
 * passwords, or full personal data: reference subjects by id + role only.
 *
 * Failures are swallowed (logged server-side) so auditing can never break the
 * user-facing action.
 */
export async function writeAudit(input: {
  actorId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: input.ip,
      },
    });
  } catch (error) {
    console.error('[audit] failed to write log entry:', error);
  }
}
