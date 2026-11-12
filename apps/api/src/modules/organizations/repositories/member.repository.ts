import { pool } from '../../../database/index.js';
import type { PoolClient } from 'pg';
import type {
  OrganizationMemberEntity,
  OrganizationMemberWithUser,
  OrganizationRole,
  MembershipStatus,
} from '../types/organization.types.js';

export class MemberRepository {
  async create(
    data: {
      organizationId: string;
      userId: string;
      role: OrganizationRole;
      status?: MembershipStatus;
    },
    client?: PoolClient
  ): Promise<OrganizationMemberEntity> {
    const db = client || pool;
    const res = await db.query<OrganizationMemberEntity>(
      `INSERT INTO app.organization_members (organization_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, user_id) 
       DO UPDATE SET 
         role = EXCLUDED.role, 
         status = EXCLUDED.status, 
         updated_at = CURRENT_TIMESTAMP
       RETURNING *;`,
      [data.organizationId, data.userId, data.role, data.status || 'active']
    );
    return res.rows[0];
  }

  async findByOrgAndUser(
    organizationId: string,
    userId: string,
    client?: PoolClient
  ): Promise<OrganizationMemberEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationMemberEntity>(
      `SELECT * FROM app.organization_members 
       WHERE organization_id = $1 AND user_id = $2 
       LIMIT 1;`,
      [organizationId, userId]
    );
    return res.rows[0] || null;
  }

  async findById(
    memberId: string,
    organizationId: string,
    client?: PoolClient
  ): Promise<OrganizationMemberEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationMemberEntity>(
      `SELECT * FROM app.organization_members 
       WHERE id = $1 AND organization_id = $2 
       LIMIT 1;`,
      [memberId, organizationId]
    );
    return res.rows[0] || null;
  }

  async findActiveOwner(
    organizationId: string,
    client?: PoolClient
  ): Promise<OrganizationMemberEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationMemberEntity>(
      `SELECT * FROM app.organization_members 
       WHERE organization_id = $1 AND role = 'owner' AND status = 'active' 
       LIMIT 1;`,
      [organizationId]
    );
    return res.rows[0] || null;
  }

  async listByOrganization(
    organizationId: string,
    options: {
      search?: string;
      role?: OrganizationRole;
      status?: MembershipStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<OrganizationMemberWithUser[]> {
    const conditions: string[] = ['m.organization_id = $1'];
    const values: unknown[] = [organizationId];
    let index = 2;

    if (options.role) {
      conditions.push(`m.role = $${index++}`);
      values.push(options.role);
    }

    if (options.status) {
      conditions.push(`m.status = $${index++}`);
      values.push(options.status);
    } else {
      // Default to active members if not specified
      conditions.push(`m.status != 'removed'`);
    }

    if (options.search) {
      conditions.push(`(u.name ILIKE $${index} OR u.email ILIKE $${index})`);
      values.push(`%${options.search}%`);
      index++;
    }

    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const offset = Math.max(options.offset || 0, 0);

    values.push(limit);
    const limitIdx = index++;
    values.push(offset);
    const offsetIdx = index++;

    const query = `
      SELECT 
        m.id AS "membershipId",
        m.user_id AS "userId",
        u.name,
        u.email,
        m.role,
        m.status,
        m.joined_at AS "joinedAt"
      FROM app.organization_members m
      INNER JOIN app.users u ON m.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE m.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          ELSE 3 
        END,
        m.joined_at ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const res = await pool.query<{
      membershipId: string;
      userId: string;
      name: string;
      email: string;
      role: OrganizationRole;
      status: MembershipStatus;
      joinedAt: Date;
    }>(query, values);

    return res.rows.map(row => ({
      membershipId: row.membershipId,
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      joinedAt: row.joinedAt.toISOString(),
    }));
  }

  async countByOrganization(
    organizationId: string,
    options: {
      search?: string;
      role?: OrganizationRole;
      status?: MembershipStatus;
    }
  ): Promise<number> {
    const conditions: string[] = ['m.organization_id = $1'];
    const values: unknown[] = [organizationId];
    let index = 2;

    if (options.role) {
      conditions.push(`m.role = $${index++}`);
      values.push(options.role);
    }

    if (options.status) {
      conditions.push(`m.status = $${index++}`);
      values.push(options.status);
    } else {
      conditions.push(`m.status != 'removed'`);
    }

    if (options.search) {
      conditions.push(`(u.name ILIKE $${index} OR u.email ILIKE $${index})`);
      values.push(`%${options.search}%`);
      index++;
    }

    const query = `
      SELECT COUNT(*)::int AS total
      FROM app.organization_members m
      INNER JOIN app.users u ON m.user_id = u.id
      WHERE ${conditions.join(' AND ')};
    `;

    const res = await pool.query<{ total: number }>(query, values);
    return res.rows[0]?.total || 0;
  }

  async updateRole(
    memberId: string,
    organizationId: string,
    newRole: OrganizationRole,
    client?: PoolClient
  ): Promise<OrganizationMemberEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationMemberEntity>(
      `UPDATE app.organization_members 
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3
       RETURNING *;`,
      [newRole, memberId, organizationId]
    );
    return res.rows[0] || null;
  }

  async updateStatus(
    memberId: string,
    organizationId: string,
    status: MembershipStatus,
    client?: PoolClient
  ): Promise<OrganizationMemberEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationMemberEntity>(
      `UPDATE app.organization_members 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3
       RETURNING *;`,
      [status, memberId, organizationId]
    );
    return res.rows[0] || null;
  }

  async transferOwnershipTx(
    organizationId: string,
    currentOwnerUserId: string,
    newOwnerUserId: string
  ): Promise<{
    previousOwner: OrganizationMemberEntity;
    newOwner: OrganizationMemberEntity;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Lock and fetch current owner
      const curRes = await client.query<OrganizationMemberEntity>(
        `SELECT * FROM app.organization_members 
         WHERE organization_id = $1 AND user_id = $2 
         FOR UPDATE;`,
        [organizationId, currentOwnerUserId]
      );
      const currentOwner = curRes.rows[0];

      if (!currentOwner || currentOwner.role !== 'owner' || currentOwner.status !== 'active') {
        throw new Error('ONLY_CURRENT_ACTIVE_OWNER_CAN_TRANSFER');
      }

      // 2. Lock and fetch target new owner
      const targetRes = await client.query<OrganizationMemberEntity>(
        `SELECT * FROM app.organization_members 
         WHERE organization_id = $1 AND user_id = $2 
         FOR UPDATE;`,
        [organizationId, newOwnerUserId]
      );
      const targetMember = targetRes.rows[0];

      if (!targetMember) {
        throw new Error('TARGET_USER_NOT_ORGANIZATION_MEMBER');
      }

      if (targetMember.status !== 'active') {
        throw new Error('TARGET_MEMBER_NOT_ACTIVE');
      }

      if (targetMember.user_id === currentOwnerUserId) {
        throw new Error('CANNOT_TRANSFER_TO_SELF');
      }

      // 3. Demote current owner to admin
      const demotedRes = await client.query<OrganizationMemberEntity>(
        `UPDATE app.organization_members 
         SET role = 'admin', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *;`,
        [currentOwner.id]
      );

      // 4. Promote target member to owner
      const promotedRes = await client.query<OrganizationMemberEntity>(
        `UPDATE app.organization_members 
         SET role = 'owner', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *;`,
        [targetMember.id]
      );

      await client.query('COMMIT;');

      return {
        previousOwner: demotedRes.rows[0],
        newOwner: promotedRes.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK;');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const memberRepository = new MemberRepository();
