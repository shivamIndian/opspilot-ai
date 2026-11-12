import { closePool } from '../database/index.js';
import { organizationService } from '../modules/organizations/services/organization.service.js';
import { userRepository } from '../modules/auth/repositories/user.repository.js';
import { logger } from '../utils/logger.js';

async function main() {
  const email = process.argv[2] || '333sshivam333@gmail.com';
  const user = await userRepository.findByEmail(email);
  if (!user) {
    logger.error(`User with email "${email}" not found.`);
    process.exit(1);
  }

  const existing = await organizationService.listUserOrganizations(user.id);
  if (existing.length > 0) {
    logger.info(`User already belongs to: ${existing.map(o => o.name).join(', ')}`);
    await closePool();
    return;
  }

  const org = await organizationService.createOrganization(user.id, {
    name: 'Acme Support Operations',
    slug: 'acme-support',
    description: 'Enterprise Support Operations and AI Agent Workspace',
  });

  logger.info(`✅ Successfully created organization "${org.name}" (ID: ${org.id}) for user "${email}"!`);
  await closePool();
}

main().catch(err => {
  console.error('Failed to create organization:', err);
  process.exit(1);
});
