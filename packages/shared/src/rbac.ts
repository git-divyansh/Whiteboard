/**
 * Role-Based Access Control (Security Guideline #2).
 *
 * This is the single, authoritative permission model. Both the web API and the
 * realtime server import `can()` — never re-implement authorization inline.
 *
 * The security session will call `can()` at every trust boundary:
 *   - every API route handler (after authentication)
 *   - every board-mutating realtime event
 *   - share-link and invitation flows
 *
 * Design intent: adding a permission or role here propagates everywhere without
 * touching call sites, so the model stays forwards-compatible.
 */

/** Roles, ordered from most to least privileged. Mirrors the Prisma `Role` enum. */
export const ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER', 'GUEST'] as const;
export type Role = (typeof ROLES)[number];

/** Numeric rank for quick "at least this role" comparisons. Higher = more power. */
export const ROLE_RANK: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 80,
  EDITOR: 60,
  VIEWER: 40,
  GUEST: 20,
};

/** Discrete actions guarded across the product. Extend as features land. */
export const PERMISSIONS = [
  // Board lifecycle
  'board:view',
  'board:edit',
  'board:delete',
  'board:export',
  // Content
  'shape:create',
  'shape:update',
  'shape:delete',
  // Collaboration / sharing
  'board:share',
  'board:invite',
  'member:manage',
  'role:assign',
  // Workspace / org
  'workspace:manage',
  'workspace:billing',
  // Audit
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Capability matrix. Each role maps to the set of permissions it holds.
 * Higher roles are supersets of lower ones by convention, but the matrix is
 * explicit so exceptions (e.g. Guests can view but not export) stay obvious.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  OWNER: new Set(PERMISSIONS),
  ADMIN: new Set<Permission>([
    'board:view',
    'board:edit',
    'board:delete',
    'board:export',
    'shape:create',
    'shape:update',
    'shape:delete',
    'board:share',
    'board:invite',
    'member:manage',
    'role:assign',
    'workspace:manage',
    'audit:read',
  ]),
  EDITOR: new Set<Permission>([
    'board:view',
    'board:edit',
    'board:export',
    'shape:create',
    'shape:update',
    'shape:delete',
    'board:invite',
  ]),
  VIEWER: new Set<Permission>(['board:view', 'board:export']),
  GUEST: new Set<Permission>(['board:view']),
};

/** True when `role` holds `permission`. The one function all callers should use. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** True when `role` is at least as privileged as `minimum`. */
export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Narrowing type guard for untrusted role strings (e.g. from a DB row or token). */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Workspace roles (Sprint 4). Distinct from board roles: workspaces use a
// coarser, collaborative-by-default model. Owner/Admin inherit full/high access
// to every board; Member collaborates by default; Viewer is read-only. No
// Guest/Editor at the workspace level.
// ---------------------------------------------------------------------------

/** Workspace roles, most to least privileged. Mirrors the Prisma `WorkspaceRole` enum. */
export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  OWNER: 100,
  ADMIN: 80,
  MEMBER: 60,
  VIEWER: 40,
};

/** Default board role a workspace member gets on a board with no explicit grant. */
export const WORKSPACE_TO_BOARD_ROLE: Record<WorkspaceRole, Role> = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'EDITOR',
  VIEWER: 'VIEWER',
};

/** Roles an Owner/Admin may assign to a member (Owner is transferred, not assigned). */
export const ASSIGNABLE_WORKSPACE_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'] as const;

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === 'string' && (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function hasWorkspaceRoleAtLeast(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return WORKSPACE_ROLE_RANK[role] >= WORKSPACE_ROLE_RANK[minimum];
}

/** Owner/Admin can manage the workspace (invite, change roles, remove members). */
export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/** Owner/Admin/Member can create boards; Viewer cannot. */
export function canCreateBoardInWorkspace(role: WorkspaceRole): boolean {
  return hasWorkspaceRoleAtLeast(role, 'MEMBER');
}

/**
 * Resolve a user's *effective* board role from three inputs, applying the
 * Sprint 4 rules in order:
 *   1. Board creator is always Owner (no explicit collaborator row needed).
 *   2. Workspace Owner/Admin inherit and are never downgraded per board.
 *   3. An explicit board grant overrides the workspace default.
 *   4. Otherwise fall back to the workspace default (Member→Editor, Viewer→Viewer).
 *   5. No membership and no grant → no access (null).
 *
 * Pure so both the API authz resolver and the dashboard can use it identically.
 */
export function effectiveBoardRole(input: {
  isCreator: boolean;
  workspaceRole: WorkspaceRole | null;
  boardGrant: Role | null;
}): Role | null {
  if (input.isCreator) return 'OWNER';
  if (input.workspaceRole === 'OWNER') return 'OWNER';
  if (input.workspaceRole === 'ADMIN') return 'ADMIN';
  if (input.boardGrant) return input.boardGrant;
  if (input.workspaceRole) return WORKSPACE_TO_BOARD_ROLE[input.workspaceRole];
  return null;
}
