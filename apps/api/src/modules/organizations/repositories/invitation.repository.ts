import { pool } from '../../../database/index.js';
import type { PoolClient } from 'pg';
import type {
  OrganizationInvitationEntity,
  SafeOrganizationInvitation,
  InvitationRole,
  InvitationStatus,
} from '../types/organization.types.js';

export class InvitationRepository {
  async create(
    data: {
      organizationId: string;
      email: string;
      role: InvitationRole;
      tokenHash: string;
      invitedBy: string;
      expiresAt: Date;
    },
    client?: PoolClient
  ): Promise<OrganizationInvitationEntity> {
    const db = client || pool;
    const res = await db.query<OrganizationInvitationEntity>(
      `INSERT INTO app.organization_invitations 
       (organization_id, email, role, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        data.organizationId,
        data.email.toLowerCase().trim(),
        data.role,
        data.tokenHash,
        data.invitedBy,
        data.expiresAt,
      ]
    );
    return res.rows[0];
  }

  async findById(
    invitationId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<OrganizationInvitationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationInvitationEntity>(
      `SELECT * FROM app.organization_invitations 
       WHERE id = $1 AND organization_id = $2 
       LIMIT 1;`,
      [invitationId, organizationId]
    );
    return res.rows[0] || null;
  }

  async findByTokenHash(
    tokenHash: string,
    client?: PoolClient
  ): Promise<OrganizationInvitationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationInvitationEntity>(
      `SELECT * FROM app.organization_invitations 
       WHERE token_hash = $1 
       LIMIT 1;`,
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  async findPendingByOrgAndEmail(
    organizationId: string,
    email: string,
    client?: PoolClient
  ): Promise<OrganizationInvitationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationInvitationEntity>(
      `SELECT * FROM app.organization_invitations 
       WHERE organization_id = $1 
         AND lower(email) = lower($2) 
         AND status = 'pending' 
       LIMIT 1;`,
      [organizationId, email.trim()]
    );
    return res.rows[0] || null;
  }

  async listByOrganization(
    organizationId: string,
    options: {
      status?: InvitationStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<SafeOrganizationInvitation[]> {
    const conditions: string[] = ['i.organization_id = $1'];
    const values: unknown[] = [organizationId];
    let index = 2;

    if (options.status) {
      conditions.push(`i.status = $${index++}`);
      values.push(options.status);
    }

    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const offset = Math.max(options.offset || 0, 0);

    values.push(limit);
    const limitIdx = index++;
    values.push(offset);
    const offsetIdx = index++;

    const query = `
      SELECT 
        i.id,
        i.organization_id AS "organizationId",
        i.email,
        i.role,
        i.invited_by AS "invitedBy",
        u.name AS "invitedByName",
        i.status,
        i.expires_at AS "expiresAt",
        i.created_at AS "createdAt"
      FROM app.organization_invitations i
      INNER JOIN app.users u ON i.invited_by = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY i.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const res = await pool.query<{
      id: string;
      organizationId: string;
      email: string;
      role: InvitationRole;
      invitedBy: string;
      invitedByName: string;
      status: InvitationStatus;
      expiresAt: Date;
      createdAt: Date;
    }>(query, values);

    return res.rows.map(row => ({
      id: row.id,
      organizationId: row.organizationId,
      email: row.email,
      role: row.role,
      invitedBy: row.invitedBy,
      invitedByName: row.invitedByName,
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async countByOrganization(
    organizationId: string,
    options: { status?: InvitationStatus }
  ): Promise<number> {
    const conditions: string[] = ['organization_id = $1'];
    const values: unknown[] = [organizationId];

    if (options.status) {
      conditions.push('status = $2');
      values.push(options.status);
    }

    const query = `
      SELECT COUNT(*)::int AS total
      FROM app.organization_invitations
      WHERE ${conditions.join(' AND ')};
    `;

    const res = await pool.query<{ total: number }>(query, values);
    return res.rows[0]?.total || 0;
  }

  async updateToken(
    invitationId: string,
    organizationId: string,
    tokenHash: string,
    expiresAt: Date,
    client?: PoolClient
  ): Promise<OrganizationInvitationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationInvitationEntity>(
      `UPDATE app.organization_invitations 
       SET token_hash = $1, expires_at = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND organization_id = $4
       RETURNING *;`,
      [tokenHash, expiresAt, invitationId, organizationId]
    );
    return res.rows[0] || null;
  }

  async revoke(
    invitationId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<OrganizationInvitationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationInvitationEntity>(
      `UPDATE app.organization_invitations 
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND status = 'pending'
       RETURNING *;`,
      [invitationId, organizationId]
    );
    return res.rows[0] || null;
  }

  async markAccepted(
    invitationId: string,
    client?: PoolClient
  ): Promise<OrganizationInvitationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationInvitationEntity>(
      `UPDATE app.organization_invitations 
       SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING *;`,
      [invitationId]
    );
    return res.rows[0] || null;
  }
}

export const invitationRepository = new InvitationRepository();
