import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import dataSource from '../data-source';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { env } from '../../config/env';

const logger = new Logger('AdminSeed');

async function seedAdmin() {
  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(User);
    const existingAdmin = await userRepository.findOne({
      where: { role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      logger.log('An admin account already exists. Skipping admin seed.');
      return;
    }

    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    const admin = userRepository.create({
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
    });

    await userRepository.save(admin);
    logger.log(`Admin account created for ${env.ADMIN_EMAIL}.`);
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((error: unknown) => {
  logger.error('Failed to seed the admin account.', error);
  process.exitCode = 1;
});
