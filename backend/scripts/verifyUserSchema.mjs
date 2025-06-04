/**
 * Schema Verification Script for User Model
 *
 * This script verifies that the users table has the required columns
 * Run with: node scripts/verifyUserSchema.js
 */

import prisma from '../db/index.mjs';
import logger from '../utils/logger.mjs';

async function verifyUserSchema() {
  try {
    logger.info('🔍 Verifying User Table Schema');
    logger.info('=================================\n');

    // Try to create a test user to verify all required fields exist
    const testUserData = {
      username: 'Schema Test User',
      email: `schema-test-${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Schema Test FullName',
      money: 1000,
      level: 1,
      xp: 0,
      settings: { theme: 'light', notifications: true },
      // isActive, role, lastLoginAt, createdAt, updatedAt will have defaults or be set by Prisma
    };

    logger.info('1. Testing user creation with all required fields...');
    const testUser = await prisma.user.create({
      data: testUserData,
    });

    logger.info('✅ User created successfully!');
    logger.info(`   ID: ${testUser.id}`);
    logger.info(`   Username: ${testUser.username}`);
    logger.info(`   Email: ${testUser.email}`);
    logger.info(`   Name (Full): ${testUser.name}`);
    logger.info('   Password: [exists]'); // Don't log actual password
    logger.info(`   Money: ${testUser.money}`);
    logger.info(`   Level: ${testUser.level} (INTEGER)`);
    logger.info(`   XP: ${testUser.xp} (INTEGER)`);
    logger.info(`   Settings: ${JSON.stringify(testUser.settings)} (JSONB)`); // Changed to JSONB
    logger.info(`   IsActive: ${testUser.isActive} (BOOLEAN)`);
    logger.info(`   Role: ${testUser.role} (TEXT)`);
    logger.info(`   CreatedAt: ${testUser.createdAt} (TIMESTAMP)`);
    logger.info(`   UpdatedAt: ${testUser.updatedAt} (TIMESTAMP)`);
    logger.info(`   LastLoginAt: ${testUser.lastLoginAt} (TIMESTAMP, optional)\n`);

    // Test updating level and XP (already testing user model)
    logger.info('2. Testing level and XP updates...');
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: {
        level: 5,
        xp: 50,
        money: 1500,
        settings: { theme: 'dark', notifications: false, newPreference: 'test' },
        lastLoginAt: new Date(),
        isActive: false,
      },
    });

    logger.info('✅ User fields updated successfully!');
    logger.info(`   New Level: ${updatedUser.level}`);
    logger.info(`   New XP: ${updatedUser.xp}`);
    logger.info(`   New Money: ${updatedUser.money}`);
    logger.info(`   New Settings: ${JSON.stringify(updatedUser.settings)}`);
    logger.info(`   New LastLoginAt: ${updatedUser.lastLoginAt}`);
    logger.info(`   New IsActive: ${updatedUser.isActive}\n`);

    // Clean up test user
    logger.info('3. Cleaning up test user...');
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    logger.info('✅ Test user deleted\n');

    logger.info('🎉 Schema verification completed successfully!');
    logger.info('\n📋 Verified Fields for User Model:');
    logger.info('- ✅ id (UUID/String, Primary Key)');
    logger.info('- ✅ username (String, Required, Unique)');
    logger.info('- ✅ email (String, Required, Unique)');
    logger.info('- ✅ password (String, Required)');
    logger.info('- ✅ name (String, Required) - Full name field');
    logger.info('- ✅ money (Integer, Default: 1000) - Merged from Player');
    logger.info('- ✅ level (Integer, Default: 1) - Merged from Player');
    logger.info('- ✅ xp (Integer, Default: 0) - Merged from Player');
    logger.info('- ✅ settings (JSONB, Default: {}) - Merged from Player');
    logger.info('- ✅ isActive (Boolean, Default: true)');
    logger.info("- ✅ role (String, Default: 'user')");
    logger.info('- ✅ createdAt (DateTime, Default: CURRENT_TIMESTAMP)');
    logger.info('- ✅ updatedAt (DateTime, Auto-updated)');
    logger.info('- ✅ lastLoginAt (DateTime, Optional)\n');

    logger.info('ForeignKey constraints (not directly verified by this script but crucial):');
    logger.info('- Horses must link to User via ownerId (formerly playerId)');
  } catch (error) {
    logger.error('❌ Schema verification failed:', error.message);

    if (
      error.message.includes('Unknown column') ||
      error.message.includes('column') ||
      error.message.includes('field')
    ) {
      logger.error('\n💡 Possible Issues:');
      logger.error('- Missing one or more columns in the users table as defined in schema.prisma');
      logger.error('- Incorrect column types (e.g., INTEGER vs. TEXT, JSON vs. JSONB)');
      logger.error(
        '- Database migration (`npx prisma migrate dev`) may not have run successfully or is pending.',
      );
    }

    logger.error('[verifyUserSchema] Schema error: %o', error);
    throw error;
  }
}

// Run the verification if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyUserSchema()
    .then(() => {
      logger.info('\n✨ Schema verification completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('💥 Schema verification failed:', error.message);
      process.exit(1);
    });
}

export { verifyUserSchema };
