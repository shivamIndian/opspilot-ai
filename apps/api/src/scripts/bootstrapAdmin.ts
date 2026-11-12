import { closePool } from '../database/index.js';
import { userRepository } from '../modules/auth/repositories/user.repository.js';
import { tokenRepository } from '../modules/auth/repositories/token.repository.js';
import { logger } from '../utils/logger.js';

async function main() {
  const targetEmail = process.argv[2] || process.env.ADMIN_EMAIL;

  if (!targetEmail) {
    console.error('Usage: npx tsx src/scripts/bootstrapAdmin.ts <target-user-email>');
    console.error('Or provide ADMIN_EMAIL environment variable.');
    process.exit(1);
  }

  const normalizedEmail = targetEmail.trim().toLowerCase();
  logger.info(`Searching for target user: ${normalizedEmail}`);

  try {
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      logger.error(
        `User with email "${normalizedEmail}" not found in database. The user must register first.`
      );
      process.exit(1);
    }

    if (user.platform_role === 'platform_admin') {
      logger.info(`User "${normalizedEmail}" already holds platform_admin role.`);
      await closePool();
      return;
    }

    const updated = await userRepository.updatePlatformRole(user.id, 'platform_admin');

    if (updated) {
      await tokenRepository.logAuditEvent({
        userId: user.id,
        eventType: 'PLATFORM_ADMIN_BOOTSTRAP',
        metadata: {
          previousRole: user.platform_role,
          promotedTo: 'platform_admin',
          promotedAt: new Date().toISOString(),
        },
      });

      logger.info(`✅ Successfully promoted user "${normalizedEmail}" to platform_admin!`);
    }
  } catch (error) {
    logger.error('Failed to bootstrap platform administrator:', (error as Error).message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
