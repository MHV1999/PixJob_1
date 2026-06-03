import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { AuditActionType } from './audit.constants';

export interface AuditLogData {
  userId?: string;
  action: AuditActionType | string;
  /**
   * The resource type being acted upon, e.g. "User", "Session".
   * Renamed from "subject" to "entityType" for clarity (FIX 4).
   */
  entityType?: string;
  /** UUID or identifier of the specific resource */
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  /** Arbitrary structured metadata — must be JSON-serialisable */
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist an audit log record.
   * Throws on failure — use this when audit must succeed (e.g. compliance).
   */
  async log(data: AuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        subject: data.entityType ?? null,
        subjectId: data.entityId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  /**
   * Fire-and-forget audit log.
   *
   * FIX 4 requirement: audit logging must NEVER break the main business flow.
   * Errors are swallowed and logged at WARN level so the calling use-case
   * continues regardless of database availability or schema issues.
   */
  logSafe(data: AuditLogData): void {
    this.log(data).catch((err: unknown) => {
      this.logger.warn(
        `Audit log write failed for action "${data.action}" (user: ${data.userId ?? 'anonymous'})`,
        err instanceof Error ? err.message : String(err),
      );
    });
  }
}
