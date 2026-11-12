import { pool } from '../../../database/index.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { memberRepository } from '../repositories/member.repository.js';
import { organizationAuditRepository } from '../repositories/organization-audit.repository.js';
import { slugify } from '../validators/organization.schema.js';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../validators/organization.schema.js';
import type { SafeOrganization } from '../types/organization.types.js';

export class OrganizationService {
  /**
   * Atomically creates an organization and provisions the creator as the active owner.
   */
  async createOrganization(
    userId: string,
    input: CreateOrganizationInput
  ): Promise<SafeOrganization> {
    const slug = input.slug ? input.slug.toLowerCase().trim() : slugify(input.name);

    if (!slug || slug.length < 2) {
      throw new Error('INVALID_ORGANIZATION_SLUG');
    }

    const existingSlug = await organizationRepository.findBySlug(slug);
    if (existingSlug) {
      throw new Error('SLUG_ALREADY_EXISTS');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // 1. Create Organization record
      const org = await organizationRepository.create(
        {
          name: input.name,
          slug,
          description: input.description,
          createdBy: userId,
        },
        client
      );

      // 2. Assign creator as the active owner
      await memberRepository.create(
        {
          organizationId: org.id,
          userId,
          role: 'owner',
          status: 'active',
        },
        client
      );

      // 3. Log audit record
      await organizationAuditRepository.logEvent(
        {
          organizationId: org.id,
          actorUserId: userId,
          action: 'organization.created',
          targetType: 'organization',
          targetId: org.id,
          metadata: { name: org.name, slug: org.slug },
        },
        client
      );

      await client.query('COMMIT;');

      return organizationRepository.toSafeOrganization(org, 'owner', org.created_at);
    } catch (error) {
      await client.query('ROLLBACK;');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lists all organizations where the requesting user holds an active membership.
   */
  async listUserOrganizations(userId: string): Promise<SafeOrganization[]> {
    const rows = await organizationRepository.listByUser(userId);
    return rows.map(r => organizationRepository.toSafeOrganization(r, r.role, r.joined_at));
  }

  /**
   * Retrieves single organization details ensuring caller is an active member.
   */
  async getOrganizationDetails(organizationId: string, userId: string): Promise<SafeOrganization> {
    const membership = await memberRepository.findByOrgAndUser(organizationId, userId);
    if (!membership || membership.status !== 'active') {
      throw new Error('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    }

    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    if (org.status === 'archived') {
      throw new Error('ORGANIZATION_ARCHIVED');
    }

    return organizationRepository.toSafeOrganization(org, membership.role, membership.joined_at);
  }

  /**
   * Updates organization settings.
   */
  async updateOrganization(
    organizationId: string,
    actorUserId: string,
    input: UpdateOrganizationInput
  ): Promise<SafeOrganization> {
    const existing = await organizationRepository.findById(organizationId);
    if (!existing) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    if (existing.status === 'archived') {
      throw new Error('ORGANIZATION_ARCHIVED');
    }

    if (input.slug && input.slug.toLowerCase() !== existing.slug.toLowerCase()) {
      const slugConflict = await organizationRepository.findBySlug(input.slug);
      if (slugConflict && slugConflict.id !== organizationId) {
        throw new Error('SLUG_ALREADY_EXISTS');
      }
    }

    const updated = await organizationRepository.update(organizationId, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoUrl: input.logo_url,
    });

    if (!updated) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId,
      action: 'organization.updated',
      targetType: 'organization',
      targetId: organizationId,
      metadata: { ...input },
    });

    return organizationRepository.toSafeOrganization(updated);
  }

  /**
   * Soft-archives an organization. Only owner can execute this.
   */
  async archiveOrganization(organizationId: string, actorUserId: string): Promise<void> {
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }

    await organizationRepository.archive(organizationId);

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId,
      action: 'organization.archived',
      targetType: 'organization',
      targetId: organizationId,
    });
  }
}

export const organizationService = new OrganizationService();
