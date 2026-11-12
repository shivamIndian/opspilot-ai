import { pool } from '../../../database/index.js';
import type { PoolClient } from 'pg';
import type { OrganizationAuditLogEntity } from '../types/organization.types.js';

export class OrganizationAuditRepository {
  async logEvent(
    data: {
      organizationId: string;
      actorUserId?: string | null;
      action: string;
      targetType?: string | null;
      targetId?: string | null;
      metadata?: Record<string, unknown>;
    },
    client?: PoolClient
  ): Promise<OrganizationAuditLogEntity> {
    const db = client || pool;
    const res = await db.query<OrganizationAuditLogEntity>(
      `INSERT INTO app.organization_audit_logs 
       (organization_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        data.organizationId,
        data.actorUserId || null,
        data.action,
        data.targetType || null,
        data.targetId || null,
        JSON.stringify(data.metadata || {}),
      ]
    );
    return res.rows[0];
  }

  async listByOrganization(
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<OrganizationAuditLogEntity[]> {
    const res = await pool.query<OrganizationAuditLogEntity>(
      `SELECT * FROM app.organization_audit_logs 
       WHERE organization_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3;`,
      [organizationId, limit, offset]
    );
    return res.rows;
  }
}

export const organizationAuditRepository = new OrganizationAuditRepository();
