/**
 * Trait Competition Impact System
 * Calculates trait-based bonuses and penalties for competition scoring
 */

import logger from './logger.mjs';

/**
 * Trait impact definitions for different competition disciplines
 * Each trait has discipline-specific modifiers and general effects
 */
const TRAIT_COMPETITION_EFFECTS = {
  // Positive traits
  resilient: {
    name: 'Resilient',
    type: 'positive',
    general: {
      scoreModifier: 0.03, // +3% to final score
      stressResistance: 0.15, // 15% less stress impact
      description: 'Maintains performance under pressure',
    },
    disciplines: {
      'Cross Country': { scoreModifier: 0.05, description: 'Excellent endurance for long courses' },
      Endurance: { scoreModifier: 0.06, description: 'Superior stamina for distance events' },
      Racing: { scoreModifier: 0.04, description: 'Consistent performance in competitive racing' },
    },
  },

  bold: {
    name: 'Bold',
    type: 'positive',
    general: {
      scoreModifier: 0.04, // +4% to final score
      adaptability: 0.2, // 20% better adaptation to new environments
      description: 'Confident performance in challenging situations',
    },
    disciplines: {
      'Show Jumping': { scoreModifier: 0.06, description: 'Fearless approach to obstacles' },
      'Cross Country': { scoreModifier: 0.05, description: 'Brave navigation of varied terrain' },
      Eventing: { scoreModifier: 0.05, description: 'Confident in multi-phase competitions' },
    },
  },

  intelligent: {
    name: 'Intelligent',
    type: 'positive',
    general: {
      scoreModifier: 0.03, // +3% to final score
      learningBonus: 0.25, // 25% faster skill acquisition
      description: 'Quick to understand and respond to rider cues',
    },
    disciplines: {
      Dressage: { scoreModifier: 0.06, description: 'Exceptional precision in complex movements' },
      Reining: { scoreModifier: 0.05, description: 'Masters intricate patterns quickly' },
      Eventing: { scoreModifier: 0.04, description: 'Adapts well to varied challenges' },
    },
  },

  calm: {
    name: 'Calm',
    type: 'positive',
    general: {
      scoreModifier: 0.025, // +2.5% to final score
      focusBonus: 0.2, // 20% better focus under pressure
      description: 'Maintains composure in stressful situations',
    },
    disciplines: {
      Dressage: { scoreModifier: 0.05, description: 'Perfect composure for precise movements' },
      Driving: { scoreModifier: 0.04, description: 'Steady performance in harness work' },
      Trail: { scoreModifier: 0.04, description: 'Unflappable on challenging trails' },
    },
  },

  athletic: {
    name: 'Athletic',
    type: 'positive',
    general: {
      scoreModifier: 0.05, // +5% to final score
      physicalBonus: 0.15, // 15% boost to physical performance
      description: 'Superior physical capabilities and movement quality',
    },
    disciplines: {
      Racing: { scoreModifier: 0.07, description: 'Exceptional speed and agility' },
      'Show Jumping': { scoreModifier: 0.06, description: 'Powerful and precise jumping ability' },
      'Cross Country': { scoreModifier: 0.06, description: 'Outstanding athletic performance' },
    },
  },

  trainability_boost: {
    name: 'Trainability Boost',
    type: 'positive',
    general: {
      scoreModifier: 0.04, // +4% to final score
      consistencyBonus: 0.3, // 30% more consistent performance
      description: 'Exceptional responsiveness to training and rider aids',
    },
    disciplines: {
      Dressage: { scoreModifier: 0.07, description: 'Masters complex movements with ease' },
      Reining: { scoreModifier: 0.06, description: 'Executes precise patterns flawlessly' },
      Driving: { scoreModifier: 0.05, description: 'Responds perfectly to driving cues' },
    },
  },

  legendary_bloodline: {
    name: 'Legendary Bloodline',
    type: 'positive',
    general: {
      scoreModifier: 0.08, // +8% to final score
      prestigeBonus: 0.25, // 25% bonus to all performance aspects
      description: 'Exceptional heritage provides superior competitive edge',
    },
    disciplines: {
      Racing: { scoreModifier: 0.1, description: 'Elite racing genetics' },
      Dressage: { scoreModifier: 0.1, description: 'Noble bearing and exceptional movement' },
      'Show Jumping': { scoreModifier: 0.1, description: 'Championship bloodlines show' },
    },
  },

  weather_immunity: {
    name: 'Weather Immunity',
    type: 'positive',
    general: {
      scoreModifier: 0.02, // +2% to final score
      environmentalBonus: 0.4, // 40% resistance to weather effects
      description: 'Unaffected by adverse weather conditions',
    },
    disciplines: {
      'Cross Country': { scoreModifier: 0.05, description: 'Performs consistently in all weather' },
      Endurance: { scoreModifier: 0.04, description: "Weather conditions don't affect stamina" },
      Trail: { scoreModifier: 0.03, description: 'Reliable in outdoor conditions' },
    },
  },

  night_vision: {
    name: 'Night Vision',
    type: 'positive',
    general: {
      scoreModifier: 0.015, // +1.5% to final score
      lowLightBonus: 0.5, // 50% better performance in low light
      description: 'Enhanced performance in low-light conditions',
    },
    disciplines: {
      Trail: { scoreModifier: 0.04, description: 'Confident navigation in dim conditions' },
      Endurance: { scoreModifier: 0.03, description: 'Maintains pace during dawn/dusk' },
    },
  },

  // Negative traits
  nervous: {
    name: 'Nervous',
    type: 'negative',
    general: {
      scoreModifier: -0.04, // -4% to final score
      stressPenalty: 0.25, // 25% more affected by stress
      description: 'Easily startled and stressed in competitive environments',
    },
    disciplines: {
      'Show Jumping': { scoreModifier: -0.05, description: 'Hesitant at obstacles, may refuse' },
      'Cross Country': { scoreModifier: -0.06, description: 'Spooked by unfamiliar terrain' },
      Racing: { scoreModifier: -0.05, description: 'Affected by crowd noise and excitement' },
    },
  },

  stubborn: {
    name: 'Stubborn',
    type: 'negative',
    general: {
      scoreModifier: -0.03, // -3% to final score
      responsivenessPenalty: 0.2, // 20% slower response to aids
      description: 'Resistant to rider cues and direction changes',
    },
    disciplines: {
      Dressage: { scoreModifier: -0.06, description: 'Resists precise movements and transitions' },
      Reining: { scoreModifier: -0.05, description: 'Reluctant to perform quick pattern changes' },
      Driving: { scoreModifier: -0.04, description: 'Slow to respond to driving commands' },
    },
  },

  fragile: {
    name: 'Fragile',
    type: 'negative',
    general: {
      scoreModifier: -0.035, // -3.5% to final score
      injuryRisk: 0.3, // 30% higher injury risk
      description: 'Higher risk of injury and performance inconsistency',
    },
    disciplines: {
      'Cross Country': { scoreModifier: -0.08, description: 'High risk on demanding terrain' },
      'Show Jumping': { scoreModifier: -0.06, description: 'Vulnerable to jumping strain' },
      Racing: { scoreModifier: -0.05, description: 'May not handle racing intensity' },
    },
  },

  aggressive: {
    name: 'Aggressive',
    type: 'negative',
    general: {
      scoreModifier: -0.045, // -4.5% to final score
      controlPenalty: 0.35, // 35% harder to control
      description: 'Difficult to manage and may act unpredictably',
    },
    disciplines: {
      Dressage: { scoreModifier: -0.08, description: 'Disrupts harmony and precision' },
      Driving: { scoreModifier: -0.07, description: 'Dangerous in harness work' },
      Trail: { scoreModifier: -0.06, description: 'May react aggressively to obstacles' },
    },
  },

  lazy: {
    name: 'Lazy',
    type: 'negative',
    general: {
      scoreModifier: -0.03, // -3% to final score
      motivationPenalty: 0.25, // 25% less motivated performance
      description: 'Lacks drive and requires constant encouragement',
    },
    disciplines: {
      Racing: { scoreModifier: -0.06, description: 'Lacks competitive drive' },
      Endurance: { scoreModifier: -0.05, description: 'Gives up when tired' },
      'Cross Country': { scoreModifier: -0.04, description: 'Loses motivation on long courses' },
    },
  },
};

/**
 * Calculate trait-based competition impact for a horse using the new trait effects system
 * @param {Object} horse - Horse object with epigenetic_modifiers
 * @param {string} discipline - Competition discipline
 * @param {number} baseScore - Base competition score before trait modifiers
 * @returns {Object} Trait impact results
 */
export function calculateTraitCompetitionImpact(horse, discipline, baseScore) {
  try {
    logger.debug(
      `[traitCompetitionImpact] Calculating trait impact for horse ${horse.id} in ${discipline}`,
    );

    // Initialize results
    const result = {
      totalScoreModifier: 0,
      appliedTraits: [],
      traitBonuses: [],
      traitPenalties: [],
      finalScoreAdjustment: 0,
      details: {
        positiveTraits: 0,
        negativeTraits: 0,
        disciplineSpecific: 0,
        generalEffects: 0,
      },
    };

    // Get horse traits
    const traits = horse.epigenetic_modifiers || { positive: [], negative: [], hidden: [] };
    const allVisibleTraits = [...(traits.positive || []), ...(traits.negative || [])];

    if (allVisibleTraits.length === 0) {
      logger.debug(`[traitCompetitionImpact] No visible traits found for horse ${horse.id}`);
      return result;
    }

    // Process each trait using the trait competition effects system
    allVisibleTraits.forEach(traitName => {
      const traitEffects = getTraitCompetitionEffect(traitName);
      if (!traitEffects) {
        logger.warn(`[traitCompetitionImpact] Unknown trait: ${traitName}`);
        return;
      }

      // Calculate trait impact
      let traitModifier = 0;
      let effectDescription = '';
      let isSpecialized = false;

      // Check for discipline-specific effects first
      if (traitEffects.disciplines && traitEffects.disciplines[discipline]) {
        traitModifier = traitEffects.disciplines[discipline].scoreModifier;
        effectDescription = traitEffects.disciplines[discipline].description;
        isSpecialized = true;
        result.details.disciplineSpecific += Math.abs(traitModifier);
      } else if (traitEffects.general && traitEffects.general.scoreModifier) {
        // Use general competition score modifier
        traitModifier = traitEffects.general.scoreModifier;
        effectDescription = traitEffects.general.description;
        result.details.generalEffects += Math.abs(traitModifier);
      }

      // Only process traits that have competition effects
      if (traitModifier !== 0) {
        // Determine trait type based on modifier
        const traitType = traitModifier > 0 ? 'positive' : 'negative';

        // Track trait application
        const traitApplication = {
          name: traitName,
          type: traitType,
          modifier: traitModifier,
          description: effectDescription,
          isSpecialized,
          discipline: isSpecialized ? discipline : 'general',
        };

        result.appliedTraits.push(traitApplication);

        // Categorize bonuses and penalties
        if (traitModifier > 0) {
          result.traitBonuses.push(traitApplication);
          result.details.positiveTraits++;
        } else if (traitModifier < 0) {
          result.traitPenalties.push(traitApplication);
          result.details.negativeTraits++;
        }

        // Add to total modifier
        result.totalScoreModifier += traitModifier;
      }
    });

    // Apply diminishing returns for multiple traits
    const diminishingFactor = calculateDiminishingReturns(result.appliedTraits.length);
    result.totalScoreModifier *= diminishingFactor;

    // Calculate final score adjustment
    result.finalScoreAdjustment = baseScore * result.totalScoreModifier;

    logger.info(
      `[traitCompetitionImpact] Horse ${horse.id}: ${result.appliedTraits.length} traits applied, ${(result.totalScoreModifier * 100).toFixed(1)}% modifier, ${result.finalScoreAdjustment.toFixed(1)} point adjustment`,
    );

    return result;
  } catch (error) {
    logger.error(`[traitCompetitionImpact] Error calculating trait impact: ${error.message}`);
    return {
      totalScoreModifier: 0,
      appliedTraits: [],
      traitBonuses: [],
      traitPenalties: [],
      finalScoreAdjustment: 0,
      details: { positiveTraits: 0, negativeTraits: 0, disciplineSpecific: 0, generalEffects: 0 },
    };
  }
}

/**
 * Calculate diminishing returns for multiple traits
 * Prevents trait stacking from becoming overpowered
 * @param {number} traitCount - Number of applied traits
 * @returns {number} Diminishing factor (0.5 to 1.0)
 */
function calculateDiminishingReturns(traitCount) {
  if (traitCount <= 1) {
    return 1.0;
  }
  if (traitCount === 2) {
    return 0.95;
  }
  if (traitCount === 3) {
    return 0.9;
  }
  if (traitCount === 4) {
    return 0.85;
  }
  if (traitCount >= 5) {
    return 0.8;
  }
  return 1.0;
}

/**
 * Get trait competition effects for a specific trait
 * @param {string} traitName - Name of the trait
 * @returns {Object|null} Trait effects or null if not found
 */
export function getTraitCompetitionEffect(traitName) {
  return TRAIT_COMPETITION_EFFECTS[traitName] || null;
}

/**
 * Get all available trait effects
 * @returns {Object} All trait competition effects
 */
export function getAllTraitCompetitionEffects() {
  return TRAIT_COMPETITION_EFFECTS;
}

/**
 * Check if a trait has discipline-specific effects
 * @param {string} traitName - Name of the trait
 * @param {string} discipline - Competition discipline
 * @returns {boolean} Whether trait has specific effects for this discipline
 */
export function hasSpecializedEffect(traitName, discipline) {
  const traitEffect = TRAIT_COMPETITION_EFFECTS[traitName];
  return !!(traitEffect && traitEffect.disciplines && traitEffect.disciplines[discipline]);
}
