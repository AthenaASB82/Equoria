/**
 * Schema Validator Utility
 *
 * This utility validates that the database schema is compatible with the application's expectations.
 * It checks for the existence of required tables and fields, and logs warnings or throws errors
 * if the schema is incompatible.
 */

import prisma from '../db/index.mjs';
import logger from './logger.mjs';

/**
 * Required schema elements to check
 * Each entry specifies a model and fields that should exist
 */
const requiredSchemaElements = [
  {
    model: 'Horse',
    fields: ['id', 'name', 'breed', 'age', 'userId'],
  },
  {
    model: 'User',
    fields: ['id', 'email', 'username', 'firstName', 'lastName'],
  },
  {
    model: 'Foal',
    fields: [
      'id',
      'name',
      'age',
      'userId',
      'consecutiveDaysFoalCare',
      'dailyTaskRecord',
      'epigeneticModifiers',
    ],
  },
];

/**
 * Validates that the database schema is compatible with the application's expectations
 * @param {Object} options - Validation options
 * @param {boolean} options.throwOnError - Whether to throw an error if validation fails (default: false)
 * @returns {Promise<boolean>} - True if schema is valid, false otherwise
 */
export async function validateDatabaseSchema({ throwOnError = false } = {}) {
  try {
    logger.info('Validating database schema...');

    // Check database connection
    await prisma.$connect();
    logger.info('Database connection successful');

    const validationErrors = [];

    // Check each required model and its fields
    for (const { model, fields } of requiredSchemaElements) {
      try {
        // Try to query the model to see if it exists
        // We use findFirst with a limit of 0 to avoid retrieving actual data
        // eslint-disable-next-line no-await-in-loop
        await prisma[model.toLowerCase()].findFirst({
          select: fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
          take: 0,
        });

        logger.info(`✓ Model ${model} with required fields exists`);
      } catch (error) {
        // Check if the error is related to missing fields
        if (error.message.includes('Unknown field') || error.message.includes("doesn't exist")) {
          const missingField =
            error.message.match(/Unknown field [`']([^'`]+)[`']/)?.[1] || 'unknown';
          validationErrors.push(`Model ${model} is missing required field: ${missingField}`);
        } else if (error.message.includes('does not exist in the current database')) {
          validationErrors.push(`Model ${model} does not exist in the database`);
        } else {
          validationErrors.push(`Error validating model ${model}: ${error.message}`);
        }
      }
    }

    // Special check for the fields mentioned in the TODO
    try {
      await prisma.foal.findFirst({
        select: {
          consecutiveDaysFoalCare: true,
          epigeneticModifiers: true,
          dailyTaskRecord: true,
        },
        take: 0,
      });
      logger.info('✓ Foal model has all required special fields');
    } catch (error) {
      if (error.message.includes('Unknown field')) {
        const missingField =
          error.message.match(/Unknown field [`']([^'`]+)[`']/)?.[1] || 'unknown';
        validationErrors.push(`Foal model is missing special field: ${missingField}`);
      } else {
        validationErrors.push(`Error validating Foal special fields: ${error.message}`);
      }
    }

    // Log validation results
    if (validationErrors.length > 0) {
      logger.error('Database schema validation failed with the following errors:');
      validationErrors.forEach(error => logger.error(`- ${error}`));

      if (throwOnError) {
        throw new Error(`Database schema validation failed: ${validationErrors.join('; ')}`);
      }

      return false;
    }

    logger.info('Database schema validation successful');
    return true;
  } catch (error) {
    logger.error('Error during database schema validation:', error);

    if (throwOnError) {
      throw error;
    }

    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Validates the database schema and exits the process if validation fails
 * This is intended to be used during application startup
 * @returns {Promise<void>}
 */
export async function validateDatabaseSchemaOrExit() {
  try {
    const isValid = await validateDatabaseSchema({ throwOnError: false });

    if (!isValid) {
      logger.error('Exiting due to database schema validation failure');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error during database schema validation:', error);
    process.exit(1);
  }
}

export default {
  validateDatabaseSchema,
  validateDatabaseSchemaOrExit,
};
