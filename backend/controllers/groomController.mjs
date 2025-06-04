/**
 * Groom Management Controller
 * Handles groom assignments, interactions, and management operations
 */

// Maximum number of grooms a user can hire
const MAX_GROOMS_PER_USER = 10;

// Base hiring cost for grooms (modified by skill level)
const BASE_HIRING_COST = 500;

import {
  assignGroomToFoal,
  calculateGroomInteractionEffects,
  validateFoalInteractionLimits,
  GROOM_SPECIALTIES,
  SKILL_LEVELS,
  PERSONALITY_TRAITS,
  DEFAULT_GROOMS,
} from '../utils/groomSystem.mjs';
import {
  validateGroomingEligibility,
  updateTaskLog,
  updateStreakTracking,
  checkTaskMutualExclusivity as _checkTaskMutualExclusivity,
} from '../utils/groomBondingSystem.mjs';
import prisma from '../db/index.mjs';
import logger from '../utils/logger.mjs';
// import { ensureDefaultGroomAssignment } from '../services/groomService'; // TODO: Implement when needed

/**
 * POST /api/grooms/assign
 * Assign a groom to a foal
 */
export async function assignGroom(req, res) {
  try {
    const { foalId, groomId, priority = 1, notes } = req.body;
    const userId = req.user?.id || '83970fb4-f086-46b3-9e76-ae71720d2918'; // TODO: Get from auth

    logger.info(`[groomController.assignGroom] Assigning groom ${groomId} to foal ${foalId}`);

    // Validate required fields
    if (!foalId || !groomId) {
      return res.status(400).json({
        success: false,
        message: 'foalId and groomId are required',
        data: null,
      });
    }

    // Ownership check: Only the owner can assign a groom
    const foal = await prisma.horse.findUnique({
      where: { id: foalId },
      select: { id: true, userId: true },
    });
    if (!foal) {
      return res.status(404).json({
        success: false,
        message: 'Foal not found',
        data: null,
      });
    }
    if (foal.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not own this horse',
        data: null,
      });
    }

    const result = await assignGroomToFoal(foalId, groomId, userId, {
      priority,
      notes,
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.assignment,
    });
    return null;
  } catch (error) {
    logger.error(`[groomController.assignGroom] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign groom',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
    return null;
  }
}

/**
 * POST /api/grooms/ensure-default/:foalId
 * Ensure a foal has a default groom assignment
 */
export async function ensureDefaultAssignment(req, res) {
  try {
    const { foalId } = req.params;
    const userId = req.user?.id || 'default-user'; // TODO: Get from auth

    const parsedFoalId = parseInt(foalId, 10);
    if (isNaN(parsedFoalId) || parsedFoalId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid foal ID. Must be a positive integer.',
        data: null,
      });
    }

    logger.info(
      `[groomController.ensureDefaultAssignment] Ensuring default assignment for foal ${parsedFoalId}`,
    );

    // TODO: Implement ensureDefaultGroomAssignment service
    const result = { success: false, message: 'Service not implemented yet' };
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        assignment: result.assignment,
        isNew: result.isNew || false,
        isExisting: result.isExisting || false,
      },
    });
  } catch (error) {
    logger.error(`[groomController.ensureDefaultAssignment] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to ensure default assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /api/grooms/assignments/:foalId
 * Get all assignments for a foal
 */
export async function getFoalAssignments(req, res) {
  try {
    const { foalId } = req.params;

    const parsedFoalId = parseInt(foalId, 10);
    if (isNaN(parsedFoalId) || parsedFoalId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid foal ID. Must be a positive integer.',
        data: null,
      });
    }

    logger.info(
      `[groomController.getFoalAssignments] Getting assignments for foal ${parsedFoalId}`,
    );

    const assignments = await prisma.groomAssignment.findMany({
      where: { foalId: parsedFoalId },
      include: {
        groom: true,
        foal: {
          select: { id: true, name: true, bondScore: true, stressLevel: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${assignments.length} assignments for foal`,
      data: {
        foalId: parsedFoalId,
        assignments,
        activeAssignments: assignments.filter(a => a.isActive),
        totalAssignments: assignments.length,
      },
    });
    return null;
  } catch (error) {
    logger.error(`[groomController.getFoalAssignments] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve foal assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
    return null;
  }
}

/**
 * POST /api/grooms/interact
 * Record a groom interaction with a foal
 */
export async function recordInteraction(req, res) {
  try {
    const { foalId, groomId, interactionType, duration, notes, assignmentId } = req.body;

    logger.info(
      `[groomController.recordInteraction] Recording ${interactionType} interaction for foal ${foalId}`,
    );

    // Validate required fields
    if (!foalId || !groomId || !interactionType || !duration) {
      return res.status(400).json({
        success: false,
        message: 'foalId, groomId, interactionType, and duration are required',
        data: null,
      });
    }

    // Validate daily interaction limits for all horses
    const validationResult = await validateFoalInteractionLimits(foalId);
    if (!validationResult.canInteract) {
      return res.status(400).json({
        success: false,
        message: validationResult.message,
        data: {
          dailyLimitReached: true,
          lastInteraction: validationResult.lastInteraction,
          interactionsToday: validationResult.interactionsToday,
        },
      });
    }

    // Get groom and foal data
    const [groom, foal] = await Promise.all([
      prisma.groom.findUnique({ where: { id: groomId } }),
      prisma.horse.findUnique({
        where: { id: foalId },
        select: {
          id: true,
          name: true,
          age: true,
          bondScore: true,
          stressLevel: true,
          taskLog: true,
          lastGroomed: true,
        },
      }),
    ]);
    if (!groom) {
      return res.status(404).json({
        success: false,
        message: 'Groom not found',
        data: null,
      });
    }
    if (!foal) {
      return res.status(404).json({
        success: false,
        message: 'Horse not found',
        data: null,
      });
    }

    // Validate task eligibility based on age and task type
    const eligibilityResult = await validateGroomingEligibility(foal, interactionType);
    if (!eligibilityResult.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibilityResult.reason,
        data: {
          eligibleTasks: eligibilityResult.eligibleTasks,
          ageGroup: eligibilityResult.ageGroup,
          horseAge: foal.age,
        },
      });
    }

    // Check for task mutual exclusivity (enrichment vs grooming same day)
    // Get today's date in YYYY-MM-DD format for task log checking
    const today = new Date().toISOString().split('T')[0];

    // Check if foal has already completed a task today
    let existingTaskToday = null;
    if (foal.taskLog?.[today]?.length > 0) {
      existingTaskToday = foal.taskLog?.[today]?.[0]; // Get the first task completed today
    }

    // Check for task mutual exclusivity
    const checkTaskMutualExclusivity = _checkTaskMutualExclusivity; // Rename imported function
    const mutualExclusivityResult = checkTaskMutualExclusivity(existingTaskToday, interactionType);
    if (!mutualExclusivityResult.allowed) {
      return res.status(400).json({
        success: false,
        message: mutualExclusivityResult.reason,
        data: {
          conflict: true,
          existingTask: existingTaskToday,
          existingCategory: mutualExclusivityResult.existingCategory,
          newCategory: mutualExclusivityResult.newCategory,
        },
      });
    }

    // Calculate interaction effects
    const effects = calculateGroomInteractionEffects(groom, foal, interactionType, duration);

    // Update task log
    const taskLogUpdate = updateTaskLog(foal.taskLog, interactionType);

    // Update streak tracking
    const currentDate = new Date();
    const streakUpdate = updateStreakTracking(
      foal.lastGroomed ? new Date(foal.lastGroomed) : null,
      currentDate,
      0, // TODO: Get actual consecutive days from database
    );

    // Record the interaction
    const interaction = await prisma.groomInteraction.create({
      data: {
        foalId,
        groomId,
        assignmentId,
        interactionType,
        duration,
        bondingChange: effects.bondingChange,
        stressChange: effects.stressChange,
        quality: effects.quality,
        cost: effects.cost,
        notes,
      },
    });

    // Update foal's bond score, stress level, task log, and streak tracking
    const newBondScore = Math.max(0, Math.min(100, (foal.bondScore || 50) + effects.bondingChange));
    const newStressLevel = Math.max(
      0,
      Math.min(100, (foal.stressLevel || 0) + effects.stressChange),
    );

    await prisma.horse.update({
      where: { id: foalId },
      data: {
        bondScore: newBondScore,
        stressLevel: newStressLevel,
        taskLog: taskLogUpdate.taskLog,
        lastGroomed: streakUpdate.lastGroomed,
      },
    });

    logger.info(
      `[groomController.recordInteraction] Interaction recorded: ${effects.bondingChange} bonding, ${effects.stressChange} stress`,
      `[groomController.recordInteraction] Interaction recorded: ${effects.bondingChange} bonding, ${effects.stressChange} stress, task: ${interactionType} (count: ${taskLogUpdate.taskCount})`,
    );

    // Log personality effects if applied
    if (effects.personalityEffects && effects.personalityEffects.bonusesApplied.length > 0) {
      logger.info(
        `[groomController.recordInteraction] Personality effects applied (${groom.personality}): ${effects.personalityEffects.bonusesApplied.join(', ')} - ${effects.personalityEffects.description}`,
      );
    }

    res.status(200).json({
      success: true,
      message: `${interactionType} interaction completed successfully`,
      data: {
        interaction,
        effects,
        foalUpdates: {
          previousBondScore: foal.bondScore,
          newBondScore,
          previousStressLevel: foal.stressLevel,
          newStressLevel,
          bondingChange: effects.bondingChange,
          stressChange: effects.stressChange,
        },
        taskLogging: {
          taskType: eligibilityResult.taskType,
          taskCount: taskLogUpdate.taskCount,
          totalTasks: taskLogUpdate.totalTasks,
          updatedTaskLog: taskLogUpdate.taskLog,
        },
        streakTracking: {
          consecutiveDays: streakUpdate.consecutiveDays,
          bonusEligible: streakUpdate.bonusEligible,
          streakBroken: streakUpdate.streakBroken,
          lastGroomed: streakUpdate.lastGroomed,
        },
      },
    });
    return null;
  } catch (error) {
    logger.error(`[groomController.recordInteraction] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to record interaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
    return null;
  }
}

/**
 * GET /api/grooms/user/:userId
 * Get all grooms for a user
 */
export async function getUserGrooms(req, res) {
  try {
    const { userId } = req.params;

    logger.info(`[groomController.getUserGrooms] Getting grooms for user ${userId}`);

    const grooms = await prisma.groom.findMany({
      where: { userId },
      include: {
        groomAssignments: {
          where: { isActive: true },
          include: {
            foal: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            groomAssignments: true,
            groomInteractions: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { skillLevel: 'desc' }, { experience: 'desc' }],
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${grooms.length} grooms for user`,
      userId,
      grooms,
      activeGrooms: grooms.filter(g => g.isActive),
      totalGrooms: grooms.length,
    });
  } catch (error) {
    logger.error(`[groomController.getUserGrooms] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user grooms',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * POST /api/grooms/hire
 * Hire a new groom for a user
 */
export async function hireGroom(req, res) {
  try {
    const {
      name,
      speciality,
      experience,
      skill_level,
      personality,
      session_rate,
      bio,
      availability,
    } = req.body;
    const userId = req.user?.id || '83970fb4-f086-46b3-9e76-ae71720d2918'; // TODO: Get from auth

    logger.info(`[groomController.hireGroom] Hiring new groom ${name} for user ${userId}`);

    // Validate required fields
    if (!name || !speciality || !skill_level || !personality) {
      return res.status(400).json({
        success: false,
        message: 'name, speciality, skill_level, and personality are required',
        data: null,
      });
    }

    // Validate speciality
    if (!GROOM_SPECIALTIES[speciality]) {
      return res.status(400).json({
        success: false,
        message: `Invalid speciality. Must be one of: ${Object.keys(GROOM_SPECIALTIES).join(', ')}`,
        data: null,
      });
    }

    // Validate skill level
    if (!SKILL_LEVELS[skill_level]) {
      return res.status(400).json({
        success: false,
        message: `Invalid skill level. Must be one of: ${Object.keys(SKILL_LEVELS).join(', ')}`,
        data: null,
      });
    }

    // Validate personality
    if (!PERSONALITY_TRAITS[personality]) {
      return res.status(400).json({
        success: false,
        message: `Invalid personality. Must be one of: ${Object.keys(PERSONALITY_TRAITS).join(', ')}`,
        data: null,
      });
    }

    // Check if user has reached the maximum number of grooms
    const userGroomCount = await prisma.groom.count({
      where: { userId },
    });

    if (userGroomCount >= MAX_GROOMS_PER_USER) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum limit of ${MAX_GROOMS_PER_USER} grooms. Please release a groom before hiring a new one.`,
        data: {
          currentCount: userGroomCount,
          maxAllowed: MAX_GROOMS_PER_USER,
        },
      });
    }

    // Calculate hiring cost based on skill level
    const skillLevelCostModifier = SKILL_LEVELS[skill_level].costModifier;
    const hiringCost = Math.round(BASE_HIRING_COST * skillLevelCostModifier);

    // Check if user has enough funds
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { money: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
    }

    if (user.money < hiringCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds to hire this groom. You need ${hiringCost} coins, but only have ${user.money}.`,
        data: {
          requiredFunds: hiringCost,
          availableFunds: user.money,
          deficit: hiringCost - user.money,
        },
      });
    }

    // Create the groom and deduct funds in a transaction
    const result = await prisma.$transaction(async prismaTx => {
      // Create the groom
      const groom = await prismaTx.groom.create({
        data: {
          name,
          speciality,
          experience: experience || 1,
          skillLevel: skill_level,
          personality,
          sessionRate: session_rate || SKILL_LEVELS[skill_level].costModifier * 15.0,
          bio,
          availability: availability || {},
          userId,
          hiringCost, // Store the hiring cost for record keeping
        },
      });

      // Deduct funds from user
      await prismaTx.user.update({
        where: { id: userId },
        data: {
          money: {
            decrement: hiringCost,
          },
        },
      });

      return { groom, hiringCost };
    });

    logger.info(
      `[groomController.hireGroom] Successfully hired groom ${result.groom.name} (ID: ${result.groom.id}) for ${result.hiringCost} coins`,
    );

    res.status(201).json({
      success: true,
      message: `Successfully hired ${result.groom.name} for ${result.hiringCost} coins`,
      data: {
        groom: result.groom,
        hiringCost: result.hiringCost,
        remainingFunds: user.money - result.hiringCost,
      },
    });
  } catch (error) {
    logger.error(`[groomController.hireGroom] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to hire groom',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
  return null;
}

/**
 * GET /api/grooms/definitions
 * Get groom system definitions (specialties, skill levels, personalities)
 */
export async function getGroomDefinitions(_req, res) {
  try {
    logger.info('[groomController.getGroomDefinitions] Getting groom system definitions');

    res.status(200).json({
      success: true,
      message: 'Retrieved groom system definitions',
      data: {
        specialties: GROOM_SPECIALTIES,
        skillLevels: SKILL_LEVELS,
        personalities: PERSONALITY_TRAITS,
        defaultGrooms: DEFAULT_GROOMS,
      },
    });
  } catch (error) {
    logger.error(`[groomController.getGroomDefinitions] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve definitions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

/**
 * DELETE /api/grooms/test/cleanup
 * Clean up test data (for testing only)
 */
export async function cleanupTestData(_req, res) {
  try {
    logger.info('[groomController.cleanupTestData] Cleaning up test data');

    // Delete all groom interactions
    const deletedInteractions = await prisma.groomInteraction.deleteMany({});
    logger.info(
      `[groomController.cleanupTestData] Deleted ${deletedInteractions.count} interactions`,
    );

    // Delete all groom assignments
    const deletedAssignments = await prisma.groomAssignment.deleteMany({});
    logger.info(
      `[groomController.cleanupTestData] Deleted ${deletedAssignments.count} assignments`,
    );

    res.status(200).json({
      success: true,
      message: 'Test data cleaned up successfully',
      data: {
        deletedInteractions: deletedInteractions.count,
        deletedAssignments: deletedAssignments.count,
      },
    });
  } catch (error) {
    logger.error(`[groomController.cleanupTestData] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup test data',
      error: error.message,
    });
  }
}
