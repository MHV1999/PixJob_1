/**
 * Canonical audit action names for all authentication and identity events.
 * Using constants prevents typo-driven gaps in the audit trail.
 */
export const AuditAction = {
  // Registration & email verification
  REGISTER: 'auth.register',
  EMAIL_VERIFIED: 'auth.email.verified',

  // Login / logout
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',

  // Token lifecycle
  TOKEN_REFRESHED: 'auth.token.refresh',
  TOKEN_REUSE_DETECTED: 'auth.token.reuse_detected',

  // Password management (Sprint 2+)
  PASSWORD_CHANGED: 'auth.password.changed',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset_completed',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
