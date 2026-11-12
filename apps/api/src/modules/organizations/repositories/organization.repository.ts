import { pool } from '../../../database/index.js';
import type { PoolClient } from 'pg';
import type {
  OrganizationEntity,
  SafeOrganization,
  OrganizationRole,
} from '../types/organization.types.js';

export class OrganizationRepository {
  async create(
    data: {
      name: string;
      slug: string;
      description?: string | null;
      logoUrl?: string | null;
      createdBy: string;
    },
    client?: PoolClient
  ): Promise<OrganizationEntity> {
    const db = client || pool;
    const res = await db.query<OrganizationEntity>(
      `INSERT INTO app.organizations (name, slug, description, logo_url, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [data.name, data.slug, data.description || null, data.logoUrl || null, data.createdBy]
    );
    return res.rows[0];
  }

  async findById(id: string, client?: PoolClient): Promise<OrganizationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationEntity>(
      `SELECT * FROM app.organizations WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  async findBySlug(slug: string, client?: PoolClient): Promise<OrganizationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationEntity>(
      `SELECT * FROM app.organizations WHERE lower(slug) = lower($1) LIMIT 1;`,
      [slug]
    );
    return res.rows[0] || null;
  }

  async listByUser(userId: string): Promise<
    Array<
      OrganizationEntity & {
        role: OrganizationRole;
        joined_at: Date;
      }
    >
  > {
    const res = await pool.query<
      OrganizationEntity & {
        role: OrganizationRole;
        joined_at: Date;
      }
    >(
      `SELECT 
         o.*,
         m.role,
         m.joined_at
       FROM app.organizations o
       INNER JOIN app.organization_members m 
         ON o.id = m.organization_id
       WHERE m.user_id = $1
         AND m.status = 'active'
         AND o.status = 'active'
       ORDER BY m.joined_at DESC;`,
      [userId]
    );
    return res.rows;
  }

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      logoUrl?: string | null;
    },
    client?: PoolClient
  ): Promise<OrganizationEntity | null> {
    const db = client || pool;
    const updates: string[] = [];
    const values: unknown[] = [id];
    let index = 2;

    if (data.name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${index++}`);
      values.push(data.slug);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(data.description);
    }
    if (data.logoUrl !== undefined) {
      updates.push(`logo_url = $${index++}`);
      values.push(data.logoUrl);
    }

    if (updates.length === 0) {
      return this.findById(id, client);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const res = await db.query<OrganizationEntity>(
      `UPDATE app.organizations
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING *;`,
      values
    );

    return res.rows[0] || null;
  }

  async archive(id: string, client?: PoolClient): Promise<OrganizationEntity | null> {
    const db = client || pool;
    const res = await db.query<OrganizationEntity>(
      `UPDATE app.organizations
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [id]
    );
    return res.rows[0] || null;
  }

  toSafeOrganization(
    org: OrganizationEntity,
    role?: OrganizationRole,
    joinedAt?: Date
  ): SafeOrganization {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      logoUrl: org.logo_url,
      status: org.status,
      role,
      joinedAt: joinedAt ? joinedAt.toISOString() : undefined,
      createdAt: org.created_at.toISOString(),
      updatedAt: org.updated_at.toISOString(),
    };
  }
}

export const organizationRepository = new OrganizationRepository();
