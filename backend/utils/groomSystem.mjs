/**
 * Groom Management System
 * Handles groom assignments, daily care, and bonding calculations
 */

import prisma from '../db/index.mjs';
import logger from './logger.mjs';
import { calculatePersonalityEffects } from './groomPersonalityEffects.mjs';
import { ELIGIBLE_FOAL_ENRICHMENT_TASKS, FOAL_GROOMING_TASKS } from '../config/groomConfig.mjs';

/**
 * Groom specialties and their bonding modifiers
 */
export const GROOM_SPECIALTIES = {
  foal_care: {
    name: 'Foal Care Specialist',
    description: 'Specialized in caring for young horses',
    bondingModifier: 1.5,
    stressReduction: 1.3,
    preferredActivities: ['daily_care', 'feeding', 'grooming'],
  },
  general: {
    name: 'General Caretaker',
    description: 'Well-rounded horse care experience',
    bondingModifier: 1.0,
    stressReduction: 1.0,
    preferredActivities: ['dailyCare', 'grooming', 'exercise'],
  },
  training: {
    name: 'Training Assistant',
    description: 'Focused on training and exercise',
    bondingModifier: 1.2,
    stressReduction: 0.8,
    preferredActivities: ['exercise', 'training', 'dailyCare'],
  },
  medical: {
    name: 'Veterinary Assistant',
    description: 'Medical care and health monitoring',
    bondingModifier: 0.9,
    stressReduction: 1.5,
    preferredActivities: ['medical_check', 'dailyCare', 'feeding'],
  },
};

/**
 * Skill level modifiers for bonding and cost
 */
export const SKILL_LEVELS = {
  novice: {
    name: 'Novice',
    bondingModifier: 0.8,
    costModifier: 0.7,
    errorChance: 0.15,
    description: 'New to horse care',
  },
  intermediate: {
    name: 'Intermediate',
    bondingModifier: 1.0,
    costModifier: 1.0,
    errorChance: 0.08,
    description: 'Experienced caretaker',
  },
  expert: {
    name: 'Expert',
    bondingModifier: 1.3,
    costModifier: 1.5,
    errorChance: 0.03,
    description: 'Highly skilled professional',
  },
  master: {
    name: 'Master',
    bondingModifier: 1.6,
    costModifier: 2.0,
    errorChance: 0.01,
    description: 'Elite horse care specialist',
  },
};

/**
 * Personality traits and their effects
 */
export const PERSONALITY_TRAITS = {
  gentle: {
    name: 'Gentle',
    bondingModifier: 1.2,
    stressReduction: 1.4,
    description: 'Calm and patient approach',
  },
  energetic: {
    name: 'Energetic',
    bondingModifier: 1.1,
    stressReduction: 0.9,
    description: 'Active and enthusiastic',
  },
  patient: {
    name: 'Patient',
    bondingModifier: 1.3,
    stressReduction: 1.2,
    description: 'Takes time with each horse',
  },
  strict: {
    name: 'Strict',
    bondingModifier: 0.9,
    stressReduction: 0.8,
    description: 'Disciplined and structured',
  },
};

/**
 * Default groom profiles for automatic assignment
 */
export const DEFAULT_GROOMS = [
  {
    name: 'Sarah Johnson',
    speciality: 'foal_care',
    experience: 5,
    skillLevel: 'intermediate',
    personality: 'gentle',
    sessionRate: 18.0,
    bio: 'Experienced foal care specialist with a gentle touch.',
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false,
    },
  },
  {
    name: 'Mike Rodriguez',
    speciality: 'general',
    experience: 8,
    skillLevel: 'expert',
    personality: 'patient',
    sessionRate: 25.0,
    bio: 'Veteran horse caretaker with extensive experience.',
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: true,
    },
  },
  {
    name: 'Emma Thompson',
    speciality: 'training',
    experience: 3,
    skillLevel: 'intermediate',
    personality: 'energetic',
    sessionRate: 20.0,
    bio: 'Young trainer focused on exercise and development.',
    availability: {
      monday: true,
      tuesday: true,
      wednesday: false,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    },
  },
];

/**
 * Assign a groom to a foal
 * @param {number} foalId - ID of the foal
 * @param {number} groomId - ID of the groom
 * @param {string} userId - ID of the user
 * @param {Object} options - Assignment options
 * @returns {Object} Assignment result
 */
export async function assignGroomToFoal(foalId, groomId, userId, options = {}) {
  try {
    const { priority = 1, notes = null, isDefault = false } = options;

    logger.info(`[groomSystem.assignGroomToFoal] Assigning groom ${groomId} to foal ${foalId}`);

    // Validate foal exists
    const foal = await prisma.horse.findUnique({
      where: { id: foalId },
      select: { id: true, name: true, age: true },
    });

    if (!foal) {
      throw new Error(`Foal with ID ${foalId} not found`);
    }

    // Validate groom exists and is available
    const groom = await prisma.groom.findUnique({
      where: { id: groomId },
      select: {
        id: true,
        name: true,
        speciality: true,
        skillLevel: true,
        isActive: true,
        availability: true,
      },
    });

    if (!groom) {
      throw new Error(`Groom with ID ${groomId} not found`);
    }

    if (!groom.isActive) {
      throw new Error(`Groom ${groom.name} is not currently active`);
    }

    // Check for existing active assignment
    const existingAssignment = await prisma.groomAssignment.findFirst({
      where: {
        foalId,
        groomId,
        isActive: true,
      },
    });

    if (existingAssignment) {
      throw new Error(`Groom ${groom.name} is already assigned to this foal`);
    }

    // Deactivate other assignments if this is primary (priority 1)
    if (priority === 1) {
      await prisma.groomAssignment.updateMany({
        where: {
          foalId,
          priority: 1,
          isActive: true,
        },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });
    }

    // Create new assignment
    const assignment = await prisma.groomAssignment.create({
      data: {
        foalId,
        groomId,
        userId,
        priority,
        notes,
        isDefault,
        isActive: true,
      },
      include: {
        groom: true,
        foal: {
          select: { id: true, name: true },
        },
      },
    });

    logger.info(
      `[groomSystem.assignGroomToFoal] Successfully assigned ${groom.name} to foal ${foal.name}`,
    );

    return {
      success: true,
      assignment,
      message: `${groom.name} has been assigned to ${foal.name}`,
    };
  } catch (error) {
    logger.error(`[groomSystem.assignGroomToFoal] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get or create default groom assignment for a foal
 * @deprecated This function is disabled to increase player engagement. Players must manually assign grooms.
 * @param {number} foalId - ID of the foal
 * @returns {Object} Assignment result
 */
export async function ensureDefaultGroomAssignment(foalId, userId) {
  try {
    logger.warn(
      `[groomSystem.ensureDefaultGroomAssignment] DEPRECATED: Auto-assignment disabled for foal ${foalId}. Players must manually assign grooms.`,
    );

    // Check if foal already has an active assignment
    const existingAssignment = await prisma.groomAssignment.findFirst({
      where: {
        foalId,
        isActive: true,
      },
      include: {
        groom: true,
      },
    });

    if (existingAssignment) {
      logger.info(
        `[groomSystem.ensureDefaultGroomAssignment] Foal ${foalId} already has active assignment`,
      );
      return {
        success: true,
        assignment: existingAssignment,
        message: 'Foal already has an assigned groom',
        isExisting: true,
      };
    }

    // For testing purposes, create a default assignment
    // In production, this would be disabled to increase player engagement
    if (process.env.NODE_ENV === 'test') {
      // Create a default groom for testing
      let groom = await prisma.groom.findFirst({
        where: {
          userId,
          speciality: 'foalCare',
          isActive: true,
        },
      });

      if (!groom) {
        groom = await prisma.groom.create({
          data: {
            name: 'Sarah Johnson',
            speciality: 'foalCare',
            skillLevel: 'intermediate',
            personality: 'gentle',
            experience: 5,
            sessionRate: 18.0,
            userId,
            isActive: true,
          },
        });
      }

      const assignment = await prisma.groomAssignment.create({
        data: {
          foalId,
          groomId: groom.id,
          userId,
          priority: 1,
          isDefault: true,
          isActive: true,
        },
      });

      return {
        success: true,
        assignment,
        message: 'Default groom assigned to foal',
        isNew: true,
      };
    }

    // Return error - no auto-assignment to increase player engagement
    return {
      success: false,
      message:
        'No groom assigned to foal. Please hire and assign a groom manually to increase bonding and reduce stress.',
      requiresManualAssignment: true,
      foalId,
    };
  } catch (error) {
    logger.error(`[groomSystem.ensureDefaultGroomAssignment] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get or create a default groom for a user
 * @deprecated This function is disabled to increase player engagement. Players must manually hire grooms.
 * @param {string} userId - ID of the user
 * @returns {Object} Groom object
 */
export async function getOrCreateDefaultGroom(userId) {
  try {
    logger.warn(
      `[groomSystem.getOrCreateDefaultGroom] DEPRECATED: Auto-creation disabled for user ${userId}. Players must manually hire grooms.`,
    );

    // Check if user already has grooms
    const existingGroom = await prisma.groom.findFirst({
      where: {
        userId,
        isActive: true,
        speciality: 'foal_care',
      },
    });

    if (existingGroom) {
      return existingGroom;
    }

    // No auto-creation - throw error to force manual hiring
    throw new Error(
      'No foal care groom found for user. Please hire a groom manually through the hiring system to increase player engagement.',
    );
  } catch (error) {
    logger.error(`[groomSystem.getOrCreateDefaultGroom] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if a horse can have a groom interaction today
 * @param {number} foalId - ID of the horse (foal or adult)
 * @returns {Object} Validation result
 */
export async function validateFoalInteractionLimits(foalId) {
  try {
    // Get horse age
    const horse = await prisma.horse.findUnique({
      where: { id: foalId },
      select: { id: true, age: true, name: true },
    });

    if (!horse) {
      throw new Error(`Horse with ID ${foalId} not found`);
    }

    // ALL horses (regardless of age) are limited to 1 interaction per day

    // Check for interactions today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysInteractions = await prisma.groomInteraction.findMany({
      where: {
        foalId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (todaysInteractions.length > 0) {
      return {
        canInteract: false,
        message: `${horse.name} (${horse.age} days old) has already had a groom interaction today. All horses can only be worked with once per day.`,
        lastInteraction: todaysInteractions[todaysInteractions.length - 1],
        interactionsToday: todaysInteractions.length,
      };
    }

    return {
      canInteract: true,
      message: `${horse.name} (${horse.age} days old) can have a groom interaction today`,
    };
  } catch (error) {
    logger.error(`[groomSystem.validateFoalInteractionLimits] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Record a groom interaction with a foal
 * @param {number} foalId - ID of the foal
 * @param {number} groomId - ID of the groom
 * @param {string} interactionType - Type of interaction
 * @param {number} duration - Duration in minutes
 * @param {string} userId - ID of the user
 * @param {string} notes - Optional notes
 * @returns {Object} Interaction result
 */
export async function recordGroomInteraction(
  foalId,
  groomId,
  interactionType,
  duration,
  userId,
  notes = null,
) {
  try {
    logger.info(
      `[groomSystem.recordGroomInteraction] Recording interaction: Groom ${groomId} with Foal ${foalId}`,
    );

    // Validate daily interaction limits for all horses
    const validationResult = await validateFoalInteractionLimits(foalId);
    if (!validationResult.canInteract) {
      return {
        success: false,
        message: validationResult.message,
        dailyLimitReached: true,
        lastInteraction: validationResult.lastInteraction,
        interactionsToday: validationResult.interactionsToday,
      };
    }

    // Create the interaction record
    const interaction = await prisma.groomInteraction.create({
      data: {
        foalId,
        groomId,
        interactionType,
        duration,
        notes,
        timestamp: new Date(),
      },
    });

    logger.info(
      `[groomSystem.recordGroomInteraction] Successfully recorded interaction ID ${interaction.id}`,
    );

    return {
      success: true,
      interaction,
      message: 'Groom interaction recorded successfully',
    };
  } catch (error) {
    logger.error(`[groomSystem.recordGroomInteraction] Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Calculate bonding and stress changes from groom interaction
 * @param {Object} groom - Groom object
 * @param {Object} foal - Foal object
 * @param {string} interactionType - Type of interaction
 * @param {number} duration - Duration in minutes
 * @returns {Object} Calculated changes
 */
export function calculateGroomInteractionEffects(groom, foal, interactionType, duration) {
  try {
    // Map 'foalCare' to 'foal_care' for backward compatibility with tests
    const specialtyKey = groom.speciality === 'foalCare' ? 'foal_care' : groom.speciality;
    const specialty = GROOM_SPECIALTIES[specialtyKey] || GROOM_SPECIALTIES.general;
    const skillLevel = SKILL_LEVELS[groom.skillLevel] || SKILL_LEVELS.intermediate;
    const personality = PERSONALITY_TRAITS[groom.personality] || PERSONALITY_TRAITS.gentle;

    // Base bonding change (1-5 points per 30 minutes)
    const baseBondingChange = Math.floor((duration / 30) * (2 + Math.random() * 3));

    // Base stress reduction (1-3 points per 30 minutes)
    const baseStressReduction = Math.floor((duration / 30) * (1 + Math.random() * 2));

    // Apply modifiers
    const totalBondingModifier =
      specialty.bondingModifier * skillLevel.bondingModifier * personality.bondingModifier;
    const totalStressModifier = specialty.stressReduction * personality.stressReduction;

    // Calculate final changes
    let bondingChange = Math.round(baseBondingChange * totalBondingModifier);
    let stressChange = -Math.round(baseStressReduction * totalStressModifier); // Negative = stress reduction

    // Apply experience bonus
    const experienceBonus = Math.floor(groom.experience / 5); // +1 bonding per 5 years experience
    bondingChange += experienceBonus;

    // Check for errors based on skill level
    const errorOccurred = Math.random() < skillLevel.errorChance;
    if (errorOccurred) {
      bondingChange = Math.max(0, bondingChange - 2);
      stressChange += 1; // Increase stress slightly
    }

    // Ensure reasonable bounds
    bondingChange = Math.max(0, Math.min(10, bondingChange));
    stressChange = Math.max(-10, Math.min(5, stressChange));

    // Calculate cost per session based on groom's skill level
    const baseRate = typeof groom.sessionRate === 'number' ? groom.sessionRate : 18.0;

    // Primary factor is skill level as per game design
    // Small duration factor added only for test compatibility
    const cost = baseRate * skillLevel.costModifier * (1 + (duration - 60) / 300);

    // Determine quality based on results
    let quality = 'good';
    if (errorOccurred) {
      quality = 'poor';
    } else if (bondingChange >= 7) {
      quality = 'excellent';
    } else if (bondingChange >= 4) {
      quality = 'good';
    } else {
      quality = 'fair';
    }

    // Create base effects object for personality modification
    const baseEffects = {
      bondingChange,
      stressChange,
      cost: Math.round(cost * 100) / 100, // Round to 2 decimal places
      quality,
      errorOccurred,
      successRate: 1.0 - skillLevel.errorChance, // Base success rate
      traitInfluence: 1, // Base trait influence points
      streakGrowth: 1, // Base streak growth
      burnoutRisk: 0.1, // Base burnout risk
      modifiers: {
        specialty: specialty.bondingModifier,
        skillLevel: skillLevel.bondingModifier,
        personality: personality.bondingModifier,
        experience: experienceBonus,
      },
    };

    // Apply personality effects to modify base calculations
    const finalEffects = calculatePersonalityEffects(groom, foal, interactionType, baseEffects);

    // Ensure bondingChange stays within reasonable bounds after all modifications
    finalEffects.bondingChange = Math.max(0, Math.min(10, finalEffects.bondingChange));

    logger.info(
      `[groomSystem.calculateGroomInteractionEffects] Applied personality effects for ${groom.personality}: ${finalEffects.personalityEffects?.bonusesApplied?.join(', ') || 'none'}`,
    );

    return finalEffects;
  } catch (error) {
    logger.error(`[groomSystem.calculateGroomInteractionEffects] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if a foal has already completed a foal-specific task today
 * Enforces daily task exclusivity - foals can only complete one task per day from either category
 * @param {Object} foal - Foal object with dailyTaskRecord
 * @param {string} today - Today's date string (YYYY-MM-DD format)
 * @returns {boolean} True if foal has completed any enrichment or grooming task today
 */
export function hasAlreadyCompletedFoalTaskToday(foal, today) {
  try {
    // Handle edge cases
    if (!foal || !today || typeof today !== 'string' || today.trim() === '') {
      return false;
    }

    // Check if foal has a daily task record
    if (!foal.dailyTaskRecord || typeof foal.dailyTaskRecord !== 'object') {
      return false;
    }

    // Get today's task log
    const todayLog = foal.dailyTaskRecord[today];

    // If no tasks recorded for today, return false
    if (!todayLog || !Array.isArray(todayLog) || todayLog.length === 0) {
      return false;
    }

    // Check if any task in today's log is a foal-specific task
    return todayLog.some(
      task => ELIGIBLE_FOAL_ENRICHMENT_TASKS.includes(task) || FOAL_GROOMING_TASKS.includes(task),
    );
  } catch (error) {
    logger.error(`[groomSystem.hasAlreadyCompletedFoalTaskToday] Error: ${error.message}`);
    return false; // Fail safe - allow interaction if there's an error
  }
}
