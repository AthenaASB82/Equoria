/**
 * Bonding Modifiers System
 * Handles trait-based modifications to bonding score changes
 * Integrates with grooming, training, and interaction systems
 */

import { getCombinedTraitEffects } from './traitEffects.mjs';
import logger from './logger.mjs';

/**
 * Base bonding change rates for different activities
 */
const BASE_BONDING_RATES = {
  grooming: {
    baseChange: 2,
    timeMultiplier: 0.5, // Per 30 minutes
    maxPerSession: 50, // Increased to allow trait bonuses
  },
  training: {
    baseChange: 1,
    successMultiplier: 1.5,
    maxPerSession: 25, // Increased to allow trait bonuses
  },
  feeding: {
    baseChange: 1,
    qualityMultiplier: 0.5,
    maxPerSession: 15, // Increased to allow trait bonuses
  },
  competition: {
    baseChange: 2,
    placementMultiplier: 1.0, // 1st = 3x, 2nd = 2x, 3rd = 1.5x
    maxPerEvent: 30, // Increased to allow trait bonuses
  },
  interaction: {
    baseChange: 1,
    durationMultiplier: 0.25, // Per 15 minutes
    maxPerSession: 20, // Increased to allow trait bonuses
  },
};

/**
 * Calculate bonding change with trait modifiers
 * @param {Object} horse - Horse object with traits
 * @param {string} activity - Type of activity (grooming, training, etc.)
 * @param {Object} activityData - Specific data about the activity
 * @returns {Object} Bonding change calculation results
 */
export function calculateBondingChange(horse, activity, activityData = {}) {
  try {
    logger.debug(
      `[bondingModifiers] Calculating bonding change for horse ${horse.id}, activity: ${activity}`,
    );

    // Get trait effects
    const traits = horse.epigenetic_modifiers || { positive: [], negative: [], hidden: [] };
    const allTraits = [...(traits.positive || []), ...(traits.negative || [])];
    const traitEffects = getCombinedTraitEffects(allTraits);

    // Get base bonding rate for activity
    const baseRate = BASE_BONDING_RATES[activity];
    if (!baseRate) {
      throw new Error(`Unknown activity type: ${activity}`);
    }

    // Calculate base bonding change
    let bondingChange = calculateBaseBondingChange(activity, activityData, baseRate);

    // Apply trait modifiers
    const originalChange = bondingChange;

    // Positive trait effects
    if (traitEffects.bondingBonus) {
      bondingChange *= 1 + traitEffects.bondingBonus;
      logger.debug(
        `[bondingModifiers] Bonding bonus applied: +${(traitEffects.bondingBonus * 100).toFixed(1)}%`,
      );
    }

    // Specific trait bonuses
    if (traitEffects.groomingBondingBonus && activity === 'grooming') {
      bondingChange *= 1 + traitEffects.groomingBondingBonus;
      logger.debug(
        `[bondingModifiers] Grooming bonding bonus applied: +${(traitEffects.groomingBondingBonus * 100).toFixed(1)}%`,
      );
    }

    if (traitEffects.trainingBondingBonus && activity === 'training') {
      bondingChange *= 1 + traitEffects.trainingBondingBonus;
      logger.debug(
        `[bondingModifiers] Training bonding bonus applied: +${(traitEffects.trainingBondingBonus * 100).toFixed(1)}%`,
      );
    }

    // Negative trait effects
    if (traitEffects.bondingPenalty) {
      bondingChange *= 1 - traitEffects.bondingPenalty;
      logger.debug(
        `[bondingModifiers] Bonding penalty applied: -${(traitEffects.bondingPenalty * 100).toFixed(1)}%`,
      );
    }

    // Note: Individual trait bonuses (social, calm, etc.) are now handled through traitEffects
    // to avoid double-application of bonuses

    // Apply activity-specific caps
    const maxCap = baseRate.maxPerSession || baseRate.maxPerEvent || 50; // Fallback to 50
    bondingChange = Math.min(bondingChange, maxCap);

    // Ensure minimum change of 0
    bondingChange = Math.max(0, bondingChange);

    // Handle NaN values
    if (isNaN(bondingChange)) {
      logger.error(
        `[bondingModifiers] Bonding change became NaN for horse ${horse.id}, activity: ${activity}`,
      );
      bondingChange = originalChange; // Fallback to original change
    }

    // Round to 1 decimal place
    bondingChange = Math.round(bondingChange * 10) / 10;

    const result = {
      originalChange: Math.round(originalChange * 10) / 10,
      modifiedChange: bondingChange,
      traitModifier: originalChange > 0 ? bondingChange / originalChange : 1,
      appliedTraits: allTraits.filter(trait => {
        const effects = getCombinedTraitEffects([trait]);
        return (
          effects.bondingBonus ||
          effects.bondingPenalty ||
          (effects.groomingBondingBonus && activity === 'grooming') ||
          (effects.trainingBondingBonus && activity === 'training')
        );
      }),
      activity,
      activityData,
    };

    logger.info(
      `[bondingModifiers] Bonding change for horse ${horse.id}: ${originalChange} -> ${bondingChange} (${((result.traitModifier - 1) * 100).toFixed(1)}% trait modifier)`,
    );

    return result;
  } catch (error) {
    logger.error(`[bondingModifiers] Error calculating bonding change: ${error.message}`);
    return {
      originalChange: 0,
      modifiedChange: 0,
      traitModifier: 1,
      appliedTraits: [],
      activity,
      error: error.message,
    };
  }
}

/**
 * Calculate base bonding change before trait modifiers
 * @param {string} activity - Activity type
 * @param {Object} activityData - Activity-specific data
 * @param {Object} baseRate - Base rate configuration
 * @returns {number} Base bonding change
 */
function calculateBaseBondingChange(activity, activityData, baseRate) {
  let change = baseRate.baseChange;

  switch (activity) {
    case 'grooming': {
      const duration = activityData.duration || 30; // minutes
      change = baseRate.baseChange + duration * baseRate.timeMultiplier;
      break;
    }

    case 'training': {
      const success = activityData.success || false;
      if (success) {
        change *= baseRate.successMultiplier;
      }
      break;
    }

    case 'feeding': {
      const quality = activityData.feedQuality || 50; // 0-100
      const qualityBonus = ((quality - 50) * baseRate.qualityMultiplier) / 50;
      change += qualityBonus;
      break;
    }

    case 'competition': {
      const { placement } = activityData;
      if (placement === '1st') {
        change *= 3;
      } else if (placement === '2nd') {
        change *= 2;
      } else if (placement === '3rd') {
        change *= 1.5;
      }
      break;
    }

    case 'interaction': {
      const interactionDuration = activityData.duration || 15; // minutes
      change = baseRate.baseChange + interactionDuration * baseRate.durationMultiplier;
      break;
    }

    default:
      // Use base change as-is
      break;
  }

  return Math.max(0, change);
}

/**
 * Apply bonding change to a horse with trait modifiers
 * @param {Object} horse - Horse object
 * @param {string} activity - Activity type
 * @param {Object} activityData - Activity-specific data
 * @returns {Object} Result of bonding change application
 */
export function applyBondingChange(horse, activity, activityData = {}) {
  try {
    const currentBondScore = horse.bond_score || 50;
    const bondingResult = calculateBondingChange(horse, activity, activityData);

    const newBondScore = Math.min(
      100,
      Math.max(0, currentBondScore + bondingResult.modifiedChange),
    );

    logger.info(
      `[bondingModifiers] Applied bonding change to horse ${horse.id}: ${currentBondScore} -> ${newBondScore} (+${bondingResult.modifiedChange})`,
    );

    return {
      success: true,
      oldBondScore: currentBondScore,
      newBondScore,
      bondingChange: bondingResult.modifiedChange,
      traitModifier: bondingResult.traitModifier,
      appliedTraits: bondingResult.appliedTraits,
      activity,
      activityData,
    };
  } catch (error) {
    logger.error(`[bondingModifiers] Error applying bonding change: ${error.message}`);
    return {
      success: false,
      error: error.message,
      oldBondScore: horse.bond_score || 50,
      newBondScore: horse.bond_score || 50,
      bondingChange: 0,
    };
  }
}

/**
 * Get bonding efficiency for a horse based on traits
 * @param {Object} horse - Horse object
 * @returns {Object} Bonding efficiency information
 */
export function getBondingEfficiency(horse) {
  const traits = horse.epigenetic_modifiers || { positive: [], negative: [], hidden: [] };
  const allTraits = [...(traits.positive || []), ...(traits.negative || [])];
  const traitEffects = getCombinedTraitEffects(allTraits);

  let efficiency = 1.0; // Base efficiency
  const modifiers = [];

  // Apply trait modifiers
  if (traitEffects.bondingBonus) {
    efficiency *= 1 + traitEffects.bondingBonus;
    modifiers.push(`Bonding bonus: +${(traitEffects.bondingBonus * 100).toFixed(1)}%`);
  }

  if (traitEffects.bondingPenalty) {
    efficiency *= 1 - traitEffects.bondingPenalty;
    modifiers.push(`Bonding penalty: -${(traitEffects.bondingPenalty * 100).toFixed(1)}%`);
  }

  // Specific trait effects
  if (allTraits.includes('social')) {
    efficiency *= 1.2;
    modifiers.push('Social trait: +20%');
  }

  if (allTraits.includes('antisocial')) {
    efficiency *= 0.7;
    modifiers.push('Antisocial trait: -30%');
  }

  if (allTraits.includes('calm')) {
    efficiency *= 1.15;
    modifiers.push('Calm trait: +15%');
  }

  if (allTraits.includes('nervous')) {
    efficiency *= 0.8;
    modifiers.push('Nervous trait: -20%');
  }

  return {
    efficiency: Math.round(efficiency * 100) / 100,
    percentageChange: Math.round((efficiency - 1) * 100),
    modifiers,
    appliedTraits: allTraits.filter(trait =>
      ['social', 'antisocial', 'calm', 'nervous'].includes(trait),
    ),
  };
}

/**
 * Simulate bonding changes over time with trait effects
 * @param {Object} horse - Horse object
 * @param {Array} activities - Array of activities over time
 * @returns {Object} Simulation results
 */
export function simulateBondingProgression(horse, activities) {
  let currentBondScore = horse.bond_score || 50;
  const progression = [];

  activities.forEach((activity, index) => {
    const result = calculateBondingChange(horse, activity.type, activity.data);
    currentBondScore = Math.min(100, Math.max(0, currentBondScore + result.modifiedChange));

    progression.push({
      day: index + 1,
      activity: activity.type,
      bondingChange: result.modifiedChange,
      bondScore: currentBondScore,
      traitModifier: result.traitModifier,
    });
  });

  return {
    initialBondScore: horse.bond_score || 50,
    finalBondScore: currentBondScore,
    totalChange: currentBondScore - (horse.bond_score || 50),
    progression,
    averageTraitModifier:
      progression.reduce((sum, p) => sum + p.traitModifier, 0) / progression.length,
  };
}
