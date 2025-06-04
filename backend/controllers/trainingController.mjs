import {
  getLastTrainingDate,
  getHorseAge,
  logTrainingSession,
  getAnyRecentTraining,
} from '../models/trainingModel.mjs';
import { incrementDisciplineScore, getHorseById, updateHorseStat } from '../models/horseModel.mjs';
import { getUserWithHorses, addXpToUser } from '../models/userModel.mjs';
import { logXpEvent } from '../models/xpLogModel.mjs';
import { getCombinedTraitEffects } from '../utils/traitEffects.mjs';
import { checkTraitRequirements } from '../utils/competitionLogic.mjs';
import logger from '../utils/logger.mjs';

/**
 * Check if a horse is eligible to train in a specific discipline
 * @param {number} horseId - ID of the horse to check
 * @param {string} discipline - Discipline to train in
 * @returns {Object} - Eligibility result with eligible boolean and reason string
 * @throws {Error} - If validation fails or database error occurs
 */
async function canTrain(horseId, discipline) {
  try {
    // Validate input parameters
    if (horseId === undefined || horseId === null) {
      throw new Error('Horse ID is required');
    }

    if (!discipline) {
      throw new Error('Discipline is required');
    }

    // Validate horseId is a positive integer
    const parsedHorseId = parseInt(horseId, 10);
    if (isNaN(parsedHorseId) || parsedHorseId <= 0) {
      throw new Error('Horse ID must be a positive integer');
    }

    logger.info(
      `[trainingController.canTrain] Checking training eligibility for horse ${parsedHorseId} in ${discipline}`,
    );

    // Check horse age requirement (must be 3+ years old)
    const age = await getHorseAge(parsedHorseId);

    if (age === null) {
      logger.warn(`[trainingController.canTrain] Horse ${parsedHorseId} not found`);
      return {
        eligible: false,
        reason: 'Horse not found',
      };
    }

    if (age < 3) {
      logger.info(
        `[trainingController.canTrain] Horse ${parsedHorseId} is too young (${age} years old)`,
      );
      return {
        eligible: false,
        reason: 'Horse is under age',
      };
    }

    // Check trait requirements for specific disciplines (e.g., Gaited)
    if (discipline === 'Gaited') {
      const horse = await getHorseById(parsedHorseId);
      if (!horse) {
        logger.warn(
          `[trainingController.canTrain] Horse ${parsedHorseId} not found for trait check`,
        );
        return {
          eligible: false,
          reason: 'Horse not found',
        };
      }

      if (!checkTraitRequirements(horse, discipline)) {
        logger.info(
          `[trainingController.canTrain] Horse ${parsedHorseId} lacks required trait for ${discipline} training`,
        );
        return {
          eligible: false,
          reason: 'Horse must have the Gaited trait to train in Gaited discipline',
        };
      }
    }

    // Check cooldown period (7 days since last training in ANY discipline)
    const lastTrainingDate = await getAnyRecentTraining(parsedHorseId);

    if (lastTrainingDate) {
      const now = new Date();
      const diff = now - new Date(lastTrainingDate);
      const sevenDays = 1000 * 60 * 60 * 24 * 7; // 7 days in milliseconds

      if (diff < sevenDays) {
        const remainingTime = sevenDays - diff;
        const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

        logger.info(
          `[trainingController.canTrain] Horse ${parsedHorseId} still in cooldown for any training (${remainingDays} days remaining)`,
        );
        return {
          eligible: false,
          reason: 'Training cooldown active for this horse',
        };
      }
    }

    // Horse is eligible to train
    logger.info(
      `[trainingController.canTrain] Horse ${parsedHorseId} is eligible to train in ${discipline}`,
    );
    return {
      eligible: true,
      reason: null,
    };
  } catch (error) {
    logger.error(
      `[trainingController.canTrain] Error checking training eligibility: ${error.message}`,
    );
    throw new Error(`Training eligibility check failed: ${error.message}`);
  }
}

/**
 * Train a horse in a specific discipline (with eligibility validation and trait effects)
 * @param {number} horseId - ID of the horse to train
 * @param {string} discipline - Discipline to train in
 * @returns {Object} - Training result with success status, updated horse, and next eligible date
 * @throws {Error} - If validation fails or training is not allowed
 */
async function trainHorse(horseId, discipline) {
  try {
    logger.info(
      `[trainingController.trainHorse] Attempting to train horse ${horseId} in ${discipline}`,
    );

    // Check if horse is eligible to train
    const eligibilityCheck = await canTrain(horseId, discipline);

    if (!eligibilityCheck.eligible) {
      logger.warn(`[trainingController.trainHorse] Training rejected: ${eligibilityCheck.reason}`);
      return {
        success: false,
        reason: eligibilityCheck.reason,
        updatedHorse: null,
        message: `Training not allowed: ${eligibilityCheck.reason}`,
        nextEligible: null,
      };
    }

    // Get horse data with traits for effect calculations
    const horse = await getHorseById(horseId);
    if (!horse) {
      throw new Error('Horse not found');
    }

    // Get horse traits and calculate combined effects
    const traits = horse.epigenetic_modifiers || { positive: [], negative: [], hidden: [] };
    const allTraits = [...(traits.positive || []), ...(traits.negative || [])];
    const traitEffects = getCombinedTraitEffects(allTraits);

    logger.info(
      `[trainingController.trainHorse] Horse ${horseId} has traits: ${allTraits.join(', ')}`,
    );

    // Check for training-blocking traits
    if (traitEffects.statGainBlocked) {
      logger.warn('[trainingController.trainHorse] Training blocked by trait effects (burnout)');
      return {
        success: false,
        reason: 'Horse is experiencing burnout and cannot gain from training',
        updatedHorse: null,
        message: 'Training not effective: Horse is experiencing burnout',
        nextEligible: null,
      };
    }

    // Log the training session
    const trainingLog = await logTrainingSession({ horseId, discipline });

    // Calculate base discipline score increase (default +5)
    let disciplineScoreIncrease = 5;

    // Apply trait effects to training
    if (traitEffects.trainingXpModifier) {
      disciplineScoreIncrease = Math.round(
        disciplineScoreIncrease * (1 + traitEffects.trainingXpModifier),
      );
      logger.info(
        `[trainingController.trainHorse] Trait XP modifier applied: ${(traitEffects.trainingXpModifier * 100).toFixed(1)}%`,
      );
    }

    // Ensure minimum gain of 1 point
    disciplineScoreIncrease = Math.max(1, disciplineScoreIncrease);

    // Check for stat gain chance with trait effects
    let statGainOccurred = false;
    let statGainDetails = null;

    // Base stat gain chance is 15% for training
    let statGainChance = 0.15;

    // Apply trait effects to stat gain chance
    if (traitEffects.statGainChanceModifier) {
      statGainChance = Math.max(
        0,
        Math.min(1, statGainChance + traitEffects.statGainChanceModifier),
      );
      logger.info(
        `[trainingController.trainHorse] Stat gain chance modified by traits: ${(statGainChance * 100).toFixed(1)}%`,
      );
    }

    // Roll for stat gain
    if (Math.random() < statGainChance) {
      statGainOccurred = true;

      // Determine which stat to improve based on discipline
      const disciplineStatMap = {
        Racing: ['speed', 'stamina', 'focus'],
        Dressage: ['balance', 'obedience', 'flexibility'],
        'Show Jumping': ['boldness', 'balance', 'focus'],
        'Cross Country': ['stamina', 'boldness', 'balance'],
        Endurance: ['stamina', 'focus', 'balance'],
        Reining: ['obedience', 'balance', 'focus'],
        Driving: ['obedience', 'focus', 'stamina'],
        Trail: ['focus', 'balance', 'stamina'],
        Eventing: ['stamina', 'boldness', 'balance'],
      };

      const relevantStats = disciplineStatMap[discipline] || ['speed', 'stamina', 'focus'];
      const statToImprove = relevantStats[Math.floor(Math.random() * relevantStats.length)];

      // Calculate stat gain amount (base 1-3 points)
      let statGainAmount = Math.floor(Math.random() * 3) + 1;

      // Apply trait effects to stat gain amount
      if (traitEffects.baseStatBoost) {
        statGainAmount += traitEffects.baseStatBoost;
        logger.info(
          `[trainingController.trainHorse] Stat gain boosted by traits: +${traitEffects.baseStatBoost}`,
        );
      }

      statGainDetails = {
        stat: statToImprove,
        amount: statGainAmount,
        traitModified: !!(traitEffects.statGainChanceModifier || traitEffects.baseStatBoost),
      };

      // Update the horse's stat (this would need to be implemented in horseModel)
      try {
        await updateHorseStat(horseId, statToImprove, statGainAmount);
        logger.info(
          `[trainingController.trainHorse] Stat gain: ${statToImprove} +${statGainAmount}`,
        );
      } catch (error) {
        logger.error(`[trainingController.trainHorse] Failed to update stat: ${error.message}`);
        statGainOccurred = false;
        statGainDetails = null;
      }
    }

    // Update the horse's discipline score with trait-modified amount
    const updatedHorse = await incrementDisciplineScore(
      horseId,
      discipline,
      disciplineScoreIncrease,
    );

    // Calculate XP award with trait effects
    let baseXp = 5;
    if (traitEffects.trainingXpModifier) {
      baseXp = Math.round(baseXp * (1 + traitEffects.trainingXpModifier));
    }

    // Award XP to horse owner for training
    try {
      if (updatedHorse?.userId) {
        // Award XP using userModel.addXpToUser (leveling up is handled automatically)
        const xpResult = await addXpToUser(updatedHorse.userId, baseXp);

        // Log XP event for auditing
        await logXpEvent({
          userId: updatedHorse.userId,
          amount: baseXp,
          reason: `Trained horse ${updatedHorse.name} in ${discipline}`,
        });

        logger.info(
          `[trainingController.trainHorse] Awarded ${baseXp} XP to user ${updatedHorse.userId} for training${xpResult.leveledUp ? ` - LEVEL UP to ${xpResult.newLevel}!` : ''}`,
        );
      } else if (updatedHorse && !updatedHorse.userId) {
        logger.warn(
          `[trainingController.trainHorse] Horse ${updatedHorse.id} (${updatedHorse.name}) has no userId - XP cannot be awarded`,
        );
      }
    } catch (error) {
      logger.error(`[trainingController.trainHorse] Failed to award training XP: ${error.message}`);
      // Continue with training completion even if XP award fails
    }

    // Calculate next eligible training date (7 days from now, potentially modified by traits)
    const nextEligible = new Date();
    let cooldownDays = 7;

    // Some traits might affect training frequency in the future
    if (traitEffects.trainingTimeReduction) {
      cooldownDays = Math.max(
        5,
        Math.round(cooldownDays * (1 - traitEffects.trainingTimeReduction)),
      );
      logger.info(
        `[trainingController.trainHorse] Training cooldown reduced by trait effects to ${cooldownDays} days`,
      );
    }

    nextEligible.setDate(nextEligible.getDate() + cooldownDays);

    logger.info(
      `[trainingController.trainHorse] Successfully trained horse ${horseId} in ${discipline} (Log ID: ${trainingLog.id}, Score +${disciplineScoreIncrease})`,
    );

    return {
      success: true,
      updatedHorse,
      message: `Horse trained successfully in ${discipline}. +${disciplineScoreIncrease} added.${statGainOccurred ? ` Stat gain: ${statGainDetails.stat} +${statGainDetails.amount}` : ''}`,
      nextEligible: nextEligible.toISOString(),
      statGain: statGainOccurred ? statGainDetails : null,
      traitEffects: {
        appliedTraits: allTraits,
        scoreModifier: disciplineScoreIncrease - 5, // Show the trait bonus/penalty
        xpModifier: baseXp - 5, // Show the XP trait bonus/penalty
        statGainChanceModifier: traitEffects.statGainChanceModifier || 0,
        baseStatBoost: traitEffects.baseStatBoost || 0,
      },
    };
  } catch (error) {
    logger.error(`[trainingController.trainHorse] Training failed: ${error.message}`);
    throw new Error(`Training failed: ${error.message}`);
  }
}

/**
 * Get training status for a horse in a specific discipline
 * @param {number} horseId - ID of the horse to check
 * @param {string} discipline - Discipline to check
 * @returns {Object} - Training status with eligibility, last training date, and cooldown info
 * @throws {Error} - If validation fails or database error occurs
 */
async function getTrainingStatus(horseId, discipline) {
  try {
    logger.info(
      `[trainingController.getTrainingStatus] Getting training status for horse ${horseId} in ${discipline}`,
    );

    // Get eligibility check (now uses global cooldown)
    const eligibilityCheck = await canTrain(horseId, discipline);

    // Get additional status information
    const age = await getHorseAge(horseId);
    const lastTrainingDateInDiscipline = await getLastTrainingDate(horseId, discipline);
    const lastTrainingDateAny = await getAnyRecentTraining(horseId);

    let cooldownInfo = null;
    if (lastTrainingDateAny) {
      const now = new Date();
      const diff = now - new Date(lastTrainingDateAny);
      const sevenDays = 1000 * 60 * 60 * 24 * 7;

      if (diff < sevenDays) {
        const remainingTime = sevenDays - diff;
        const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
        const remainingHours = Math.ceil(remainingTime / (1000 * 60 * 60));

        cooldownInfo = {
          active: true,
          remainingDays,
          remainingHours,
          lastTrainingDate: lastTrainingDateAny,
        };
      } else {
        cooldownInfo = {
          active: false,
          remainingDays: 0,
          remainingHours: 0,
          lastTrainingDate: lastTrainingDateAny,
        };
      }
    }

    const status = {
      eligible: eligibilityCheck.eligible,
      reason: eligibilityCheck.reason,
      horseAge: age,
      lastTrainingDate: lastTrainingDateInDiscipline, // Still show discipline-specific for UI
      cooldown: cooldownInfo,
    };

    logger.info(
      `[trainingController.getTrainingStatus] Training status retrieved for horse ${horseId}: eligible=${status.eligible}`,
    );

    return status;
  } catch (error) {
    logger.error(
      `[trainingController.getTrainingStatus] Error getting training status: ${error.message}`,
    );
    throw new Error(`Training status check failed: ${error.message}`);
  }
}

/**
 * Get all horses owned by a player that are eligible for training in at least one discipline
 * @param {string} playerId - UUID of the player
 * @returns {Array} - Array of horses with their trainable disciplines
 * @throws {Error} - If validation fails or database error occurs
 */
async function getTrainableHorses(playerId) {
  try {
    // Validate input parameters
    if (!playerId) {
      throw new Error('User ID is required');
    }

    logger.info(
      `[trainingController.getTrainableHorses] Getting trainable horses for player ${playerId}`,
    );

    // Get player with their horses
    const player = await getUserWithHorses(playerId);

    if (!player) {
      logger.warn(`[trainingController.getTrainableHorses] User ${playerId} not found`);
      return [];
    }

    if (!player.horses || player.horses.length === 0) {
      logger.info(`[trainingController.getTrainableHorses] User ${playerId} has no horses`);
      return [];
    }

    // Define all available disciplines
    const baseDisciplines = ['Racing', 'Show Jumping', 'Dressage', 'Cross Country', 'Western'];

    const trainableHorses = [];

    // Check each horse for training eligibility
    for (const horse of player.horses) {
      // Skip horses under 3 years old
      if (horse.age < 3) {
        logger.debug(
          `[trainingController.getTrainableHorses] Horse ${horse.id} (${horse.name}) is too young (${horse.age} years)`,
        );
        continue;
      }

      try {
        // Check if horse has trained in ANY discipline within the last 7 days
        const lastTrainingDate = await getAnyRecentTraining(horse.id);

        let isTrainable = false;

        if (!lastTrainingDate) {
          // Horse has never trained, so it's trainable in all disciplines
          isTrainable = true;
        } else {
          // Check if 7-day cooldown has passed
          const now = new Date();
          const diff = now - new Date(lastTrainingDate);
          const sevenDays = 1000 * 60 * 60 * 24 * 7; // 7 days in milliseconds

          if (diff >= sevenDays) {
            isTrainable = true;
          }
        }

        // If horse is trainable, determine available disciplines
        if (isTrainable) {
          const availableDisciplines = [...baseDisciplines];

          // Add Gaited discipline only if horse has the Gaited trait
          if (checkTraitRequirements(horse, 'Gaited')) {
            availableDisciplines.push('Gaited');
          }

          trainableHorses.push({
            horseId: horse.id,
            name: horse.name,
            age: horse.age,
            trainableDisciplines: availableDisciplines,
          });
        }
      } catch (error) {
        logger.warn(
          `[trainingController.getTrainableHorses] Error checking training eligibility for horse ${horse.id}: ${error.message}`,
        );
        // Continue checking other horses even if one fails
      }
    }

    logger.info(
      `[trainingController.getTrainableHorses] Found ${trainableHorses.length} trainable horses for player ${playerId}`,
    );
    return trainableHorses;
  } catch (error) {
    logger.error(
      `[trainingController.getTrainableHorses] Error getting trainable horses: ${error.message}`,
    );
    throw new Error(`Failed to get trainable horses: ${error.message}`);
  }
}

/**
 * Route handler for POST /train endpoint
 * @param {Object} req - Express request object with horseId and discipline in body
 * @param {Object} res - Express response object
 */
async function trainRouteHandler(req, res) {
  try {
    const { horseId, discipline } = req.body;

    logger.info(
      `[trainingController.trainRouteHandler] Training request for horse ${horseId} in ${discipline}`,
    );

    // Call the existing trainHorse function
    const result = await trainHorse(horseId, discipline);

    if (result.success) {
      // Extract the updated score for the specific discipline
      const disciplineScores = result.updatedHorse?.disciplineScores || {};
      const updatedScore = disciplineScores[discipline] || 0;

      // Calculate actual score increase from trait effects
      const baseIncrease = 5;
      const actualIncrease = baseIncrease + (result.traitEffects?.scoreModifier || 0);

      // Format response with trait effects information
      res.json({
        success: true,
        message: `${result.updatedHorse.name} trained in ${discipline}. +${actualIncrease} added.`,
        updatedScore,
        nextEligibleDate: result.nextEligible,
        traitEffects: result.traitEffects,
      });
    } else {
      // Return failure response for ineligible training
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error(`[trainingController.trainRouteHandler] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to train horse',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
}

export { canTrain, trainHorse, getTrainingStatus, getTrainableHorses, trainRouteHandler };
