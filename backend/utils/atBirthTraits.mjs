/**
 * At-Birth Trait Application System
 * Applies epigenetic traits to newborn horses based on breeding conditions
 */

import logger from './logger.mjs';
import prisma from '../db/index.mjs';

/**
 * At-birth trait definitions based on breeding conditions
 */
const AT_BIRTH_TRAITS = {
  // Positive traits from good breeding conditions
  positive: {
    hardy: {
      name: 'Hardy',
      description: 'Strong constitution from excellent mare care',
      conditions: {
        mareStressMax: 20,
        feedQualityMin: 80,
      },
      probability: 0.25,
    },
    well_bred: {
      name: 'Well Bred',
      description: 'Benefits from careful breeding selection',
      conditions: {
        mareStressMax: 30,
        feedQualityMin: 70,
        noInbreeding: true,
      },
      probability: 0.2,
    },
    specialized_lineage: {
      name: 'Specialized Lineage',
      description: 'Genetic advantage in family discipline specialty',
      conditions: {
        disciplineSpecialization: true,
        mareStressMax: 40,
      },
      probability: 0.3,
    },
    premium_care: {
      name: 'Premium Care',
      description: 'Exceptional prenatal care benefits',
      conditions: {
        mareStressMax: 10,
        feedQualityMin: 90,
      },
      probability: 0.15,
    },
  },

  // Negative traits from poor breeding conditions
  negative: {
    weak_constitution: {
      name: 'Weak Constitution',
      description: 'Poor health from inadequate mare care',
      conditions: {
        mareStressMin: 70,
        feedQualityMax: 40,
      },
      probability: 0.35,
    },
    inbred: {
      name: 'Inbred',
      description: 'Genetic complications from close breeding',
      conditions: {
        inbreedingDetected: true,
      },
      probability: 0.6,
    },
    stressed_lineage: {
      name: 'Stressed Lineage',
      description: 'Inherited stress sensitivity',
      conditions: {
        mareStressMin: 60,
      },
      probability: 0.25,
    },
    poor_nutrition: {
      name: 'Poor Nutrition',
      description: 'Developmental issues from inadequate feeding',
      conditions: {
        feedQualityMax: 30,
      },
      probability: 0.4,
    },
  },
};

/**
 * Analyze lineage for discipline specialization
 * @param {number} sireId - Sire's ID
 * @param {number} damId - Dam's ID
 * @returns {Object} - Lineage analysis results
 */
async function analyzeLineage(sireId, damId) {
  try {
    logger.info(
      `[atBirthTraits.analyzeLineage] Analyzing lineage for sire ${sireId} and dam ${damId}`,
    );

    // Get ancestors up to 3 generations
    const ancestors = await getAncestors([sireId, damId], 3);

    // Analyze discipline specialization
    const disciplineCount = {};
    let totalCompetitions = 0;

    for (const ancestor of ancestors) {
      // Get competition results for this ancestor
      const results = await prisma.competitionResult.findMany({
        where: { horseId: ancestor.id },
        select: { discipline: true, placement: true },
      });

      for (const result of results) {
        if (!disciplineCount[result.discipline]) {
          disciplineCount[result.discipline] = { total: 0, wins: 0 };
        }
        disciplineCount[result.discipline].total++;
        if (result.placement === '1st') {
          disciplineCount[result.discipline].wins++;
        }
        totalCompetitions++;
      }
    }

    // Determine if there's a specialized discipline
    let specializedDiscipline = null;
    let maxSpecialization = 0;

    for (const [discipline, stats] of Object.entries(disciplineCount)) {
      const specialization = stats.total / totalCompetitions;
      if (specialization > 0.6 && specialization > maxSpecialization) {
        maxSpecialization = specialization;
        specializedDiscipline = discipline;
      }
    }

    logger.info(
      `[atBirthTraits.analyzeLineage] Found ${ancestors.length} ancestors, ${totalCompetitions} competitions`,
    );
    if (specializedDiscipline) {
      logger.info(
        `[atBirthTraits.analyzeLineage] Specialized discipline detected: ${specializedDiscipline} (${(maxSpecialization * 100).toFixed(1)}%)`,
      );
    }

    return {
      ancestors,
      disciplineSpecialization: specializedDiscipline !== null,
      specializedDiscipline,
      specializationStrength: maxSpecialization,
      totalCompetitions,
    };
  } catch (error) {
    logger.error(`[atBirthTraits.analyzeLineage] Error: ${error.message}`);
    return {
      ancestors: [],
      disciplineSpecialization: false,
      specializedDiscipline: null,
      specializationStrength: 0,
      totalCompetitions: 0,
    };
  }
}

/**
 * Detect inbreeding within 3 generations
 * @param {number} sireId - Sire's ID
 * @param {number} damId - Dam's ID
 * @returns {Object} - Inbreeding detection results
 */
async function detectInbreeding(sireId, damId) {
  try {
    logger.info(
      `[atBirthTraits.detectInbreeding] Checking for inbreeding between sire ${sireId} and dam ${damId}`,
    );

    // Get ancestors for both parents up to 3 generations
    const sireAncestors = await getAncestors([sireId], 3);
    const damAncestors = await getAncestors([damId], 3);

    // Create sets of ancestor IDs for comparison
    const sireAncestorIds = new Set(sireAncestors.map(a => a.id));
    const damAncestorIds = new Set(damAncestors.map(a => a.id));

    // Find common ancestors
    const commonAncestors = [];
    for (const ancestorId of sireAncestorIds) {
      if (damAncestorIds.has(ancestorId)) {
        const ancestor =
          sireAncestors.find(a => a.id === ancestorId) ||
          damAncestors.find(a => a.id === ancestorId);
        commonAncestors.push(ancestor);
      }
    }

    const inbreedingDetected = commonAncestors.length > 0;
    const inbreedingCoefficient =
      commonAncestors.length / Math.max(sireAncestors.length, damAncestors.length);

    logger.info(
      `[atBirthTraits.detectInbreeding] Inbreeding ${inbreedingDetected ? 'detected' : 'not detected'}`,
    );
    if (inbreedingDetected) {
      logger.info(
        `[atBirthTraits.detectInbreeding] Common ancestors: ${commonAncestors.map(a => a.name).join(', ')}`,
      );
    }

    return {
      inbreedingDetected,
      commonAncestors,
      inbreedingCoefficient,
      sireAncestorCount: sireAncestors.length,
      damAncestorCount: damAncestors.length,
    };
  } catch (error) {
    logger.error(`[atBirthTraits.detectInbreeding] Error: ${error.message}`);
    return {
      inbreedingDetected: false,
      commonAncestors: [],
      inbreedingCoefficient: 0,
      sireAncestorCount: 0,
      damAncestorCount: 0,
    };
  }
}

/**
 * Get ancestors up to specified generations
 * @param {number[]} horseIds - Starting horse IDs
 * @param {number} generations - Number of generations to trace back
 * @returns {Array} - Array of ancestor horse objects
 */
async function getAncestors(horseIds, generations) {
  if (generations <= 0 || horseIds.length === 0) {
    return [];
  }

  try {
    // Get immediate parents
    const horses = await prisma.horse.findMany({
      where: { id: { in: horseIds } },
      select: {
        id: true,
        name: true,
        sireId: true,
        damId: true,
      },
    });

    const ancestors = [];
    const nextGeneration = [];

    for (const horse of horses) {
      if (horse.sireId) {
        nextGeneration.push(horse.sireId);
      }
      if (horse.damId) {
        nextGeneration.push(horse.damId);
      }
    }

    // Get parent horses
    if (nextGeneration.length > 0) {
      const parents = await prisma.horse.findMany({
        where: { id: { in: nextGeneration } },
        select: {
          id: true,
          name: true,
          sireId: true,
          damId: true,
        },
      });

      ancestors.push(...parents);

      // Recursively get further generations
      const furtherAncestors = await getAncestors(nextGeneration, generations - 1);
      ancestors.push(...furtherAncestors);
    }

    // Remove duplicates
    const uniqueAncestors = ancestors.filter(
      (ancestor, index, self) => index === self.findIndex(a => a.id === ancestor.id),
    );

    return uniqueAncestors;
  } catch (error) {
    logger.error(`[atBirthTraits.getAncestors] Error: ${error.message}`);
    return [];
  }
}

/**
 * Assess mare's feed quality (placeholder - would integrate with feeding system)
 * @param {number} mareId - Mare's ID
 * @returns {number} - Feed quality score (0-100)
 */
async function assessFeedQuality(mareId) {
  try {
    // TODO: Integrate with actual feeding system when implemented
    // For now, return a simulated feed quality based on mare's health status

    const mare = await prisma.horse.findUnique({
      where: { id: mareId },
      select: { healthStatus: true, totalEarnings: true },
    });

    if (!mare) {
      logger.warn(`[atBirthTraits.assessFeedQuality] Mare ${mareId} not found`);
      return 50; // Default average quality
    }

    // Simulate feed quality based on health status and earnings (proxy for care quality)
    let feedQuality = 50; // Base quality

    switch (mare.healthStatus) {
      case 'Excellent':
        feedQuality = 85;
        break;
      case 'Good':
        feedQuality = 70;
        break;
      case 'Fair':
        feedQuality = 55;
        break;
      case 'Poor':
        feedQuality = 30;
        break;
      default:
        feedQuality = 50;
    }

    // Adjust based on earnings (higher earnings = better care)
    const earnings = mare.totalEarnings || 0;
    if (earnings > 100000) {
      feedQuality += 15;
    } else if (earnings > 50000) {
      feedQuality += 10;
    } else if (earnings > 10000) {
      feedQuality += 5;
    }

    // Cap at 100
    feedQuality = Math.min(feedQuality, 100);

    logger.info(`[atBirthTraits.assessFeedQuality] Mare ${mareId} feed quality: ${feedQuality}`);
    return feedQuality;
  } catch (error) {
    logger.error(`[atBirthTraits.assessFeedQuality] Error: ${error.message}`);
    return 50; // Default on error
  }
}

/**
 * Main function to apply epigenetic traits at birth
 * @param {Object} breedingData - Breeding information
 * @param {number} breedingData.sireId - Sire's ID
 * @param {number} breedingData.damId - Dam's ID
 * @param {number} [breedingData.mareStress] - Mare's stress level (0-100)
 * @param {number} [breedingData.feedQuality] - Feed quality override (0-100)
 * @returns {Object} - Epigenetic traits to apply { positive: [], negative: [], hidden: [] }
 */
async function applyEpigeneticTraitsAtBirth(breedingData) {
  try {
    const { sireId, damId, mareStress, feedQuality } = breedingData;

    logger.info(
      `[atBirthTraits.applyEpigeneticTraitsAtBirth] Applying at-birth traits for sire ${sireId} and dam ${damId}`,
    );

    // Validate required parameters
    if (!sireId || !damId) {
      throw new Error('Both sireId and damId are required');
    }

    // Get mare's current stress level
    const mare = await prisma.horse.findUnique({
      where: { id: damId },
      select: { stressLevel: true, bondScore: true, healthStatus: true },
    });

    if (!mare) {
      throw new Error(`Mare with ID ${damId} not found`);
    }

    const currentMareStress = mareStress !== undefined ? mareStress : mare.stressLevel || 50;
    const currentFeedQuality =
      feedQuality !== undefined ? feedQuality : await assessFeedQuality(damId);

    logger.info(
      `[atBirthTraits.applyEpigeneticTraitsAtBirth] Mare stress: ${currentMareStress}, Feed quality: ${currentFeedQuality}`,
    );

    // Analyze lineage for specialization
    const lineageAnalysis = await analyzeLineage(sireId, damId);

    // Detect inbreeding
    const inbreedingAnalysis = await detectInbreeding(sireId, damId);

    // Prepare breeding conditions
    const conditions = {
      mareStress: currentMareStress,
      feedQuality: currentFeedQuality,
      disciplineSpecialization: lineageAnalysis.disciplineSpecialization,
      inbreedingDetected: inbreedingAnalysis.inbreedingDetected,
      noInbreeding: !inbreedingAnalysis.inbreedingDetected,
    };

    logger.info(
      `[atBirthTraits.applyEpigeneticTraitsAtBirth] Breeding conditions: ${JSON.stringify(conditions)}`,
    );

    // Evaluate traits
    const appliedTraits = { positive: [], negative: [], hidden: [] };

    // Check positive traits
    for (const [traitKey, traitDef] of Object.entries(AT_BIRTH_TRAITS.positive)) {
      if (evaluateTraitConditions(traitDef.conditions, conditions)) {
        if (Math.random() < traitDef.probability) {
          appliedTraits.positive.push(traitKey);
          logger.info(
            `[atBirthTraits.applyEpigeneticTraitsAtBirth] Applied positive trait: ${traitKey}`,
          );
        }
      }
    }

    // Check negative traits
    for (const [traitKey, traitDef] of Object.entries(AT_BIRTH_TRAITS.negative)) {
      if (evaluateTraitConditions(traitDef.conditions, conditions)) {
        if (Math.random() < traitDef.probability) {
          appliedTraits.negative.push(traitKey);
          logger.info(
            `[atBirthTraits.applyEpigeneticTraitsAtBirth] Applied negative trait: ${traitKey}`,
          );
        }
      }
    }

    // Some traits might be hidden at birth (rare cases)
    const totalTraits = appliedTraits.positive.length + appliedTraits.negative.length;
    if (totalTraits > 2 && Math.random() < 0.3) {
      // Move one trait to hidden
      const allTraits = [...appliedTraits.positive, ...appliedTraits.negative];
      const randomIndex = Math.floor(Math.random() * allTraits.length);
      const hiddenTrait = allTraits[randomIndex];

      if (appliedTraits.positive.includes(hiddenTrait)) {
        appliedTraits.positive = appliedTraits.positive.filter(t => t !== hiddenTrait);
      } else {
        appliedTraits.negative = appliedTraits.negative.filter(t => t !== hiddenTrait);
      }

      appliedTraits.hidden.push(hiddenTrait);
      logger.info(
        `[atBirthTraits.applyEpigeneticTraitsAtBirth] Moved trait to hidden: ${hiddenTrait}`,
      );
    }

    logger.info(
      `[atBirthTraits.applyEpigeneticTraitsAtBirth] Final traits: ${JSON.stringify(appliedTraits)}`,
    );

    return {
      traits: appliedTraits,
      breedingAnalysis: {
        lineage: lineageAnalysis,
        inbreeding: inbreedingAnalysis,
        conditions,
      },
    };
  } catch (error) {
    logger.error(`[atBirthTraits.applyEpigeneticTraitsAtBirth] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Evaluate if trait conditions are met
 * @param {Object} traitConditions - Trait condition requirements
 * @param {Object} actualConditions - Actual breeding conditions
 * @returns {boolean} - Whether conditions are met
 */
function evaluateTraitConditions(traitConditions, actualConditions) {
  for (const [condition, requirement] of Object.entries(traitConditions)) {
    switch (condition) {
      case 'mareStressMax':
        if (actualConditions.mareStress > requirement) {
          return false;
        }
        break;
      case 'mareStressMin':
        if (actualConditions.mareStress < requirement) {
          return false;
        }
        break;
      case 'feedQualityMin':
        if (actualConditions.feedQuality < requirement) {
          return false;
        }
        break;
      case 'feedQualityMax':
        if (actualConditions.feedQuality > requirement) {
          return false;
        }
        break;
      case 'disciplineSpecialization':
        if (actualConditions.disciplineSpecialization !== requirement) {
          return false;
        }
        break;
      case 'inbreedingDetected':
        if (actualConditions.inbreedingDetected !== requirement) {
          return false;
        }
        break;
      case 'noInbreeding':
        if (actualConditions.noInbreeding !== requirement) {
          return false;
        }
        break;
      default:
        logger.warn(`[atBirthTraits.evaluateTraitConditions] Unknown condition: ${condition}`);
    }
  }
  return true;
}

/**
 * Check lineage for discipline affinity
 * @param {Array} ancestors - Array of ancestor objects with discipline preferences
 * @returns {Object} - Affinity result { affinity: boolean, discipline?: string, count?: number }
 */
function checkLineageForDisciplineAffinity(ancestors) {
  try {
    logger.info(
      `[atBirthTraits.checkLineageForDisciplineAffinity] Analyzing ${ancestors.length} ancestors for discipline affinity`,
    );

    if (!ancestors || ancestors.length === 0) {
      logger.info('[atBirthTraits.checkLineageForDisciplineAffinity] No ancestors provided');
      return { affinity: false };
    }

    // Count discipline preferences from ancestors
    const disciplineCount = {};
    let totalAncestorsWithDisciplines = 0;

    for (const ancestor of ancestors) {
      // Check if ancestor has a preferred discipline
      let preferredDiscipline = null;

      // Method 1: Check if ancestor has a discipline field
      if (ancestor.discipline) {
        preferredDiscipline = ancestor.discipline;
      }
      // Method 2: Check if ancestor has competition history to determine preference
      else if (ancestor.competitionHistory) {
        preferredDiscipline = getMostCommonDisciplineFromHistory(ancestor.competitionHistory);
      }
      // Method 3: Check if ancestor has discipline scores to determine preference
      else if (ancestor.disciplineScores) {
        preferredDiscipline = getHighestScoringDiscipline(ancestor.disciplineScores);
      }

      if (preferredDiscipline) {
        disciplineCount[preferredDiscipline] = (disciplineCount[preferredDiscipline] || 0) + 1;
        totalAncestorsWithDisciplines++;
        logger.info(
          `[atBirthTraits.checkLineageForDisciplineAffinity] Ancestor ${ancestor.name || ancestor.id} prefers ${preferredDiscipline}`,
        );
      }
    }

    logger.info(
      `[atBirthTraits.checkLineageForDisciplineAffinity] Discipline counts: ${JSON.stringify(disciplineCount)}`,
    );

    // Find the most common discipline
    let mostCommonDiscipline = null;
    let maxCount = 0;

    for (const [discipline, count] of Object.entries(disciplineCount)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonDiscipline = discipline;
      }
    }

    // Check if 3 or more ancestors share the same discipline
    const hasAffinity = maxCount >= 3;

    const result = {
      affinity: hasAffinity,
      discipline: hasAffinity ? mostCommonDiscipline : null,
      count: maxCount,
      totalAnalyzed: ancestors.length,
      totalWithDisciplines: totalAncestorsWithDisciplines,
      disciplineBreakdown: disciplineCount,
    };

    logger.info(
      `[atBirthTraits.checkLineageForDisciplineAffinity] Result: ${JSON.stringify(result)}`,
    );

    return result;
  } catch (error) {
    logger.error(`[atBirthTraits.checkLineageForDisciplineAffinity] Error: ${error.message}`);
    return { affinity: false, error: error.message };
  }
}

/**
 * Get the most common discipline from competition history
 * @param {Array} competitionHistory - Array of competition results
 * @returns {string|null} - Most common discipline or null
 */
function getMostCommonDisciplineFromHistory(competitionHistory) {
  if (!competitionHistory || competitionHistory.length === 0) {
    return null;
  }

  const disciplineCount = {};
  for (const competition of competitionHistory) {
    if (competition.discipline) {
      disciplineCount[competition.discipline] = (disciplineCount[competition.discipline] || 0) + 1;
    }
  }

  let mostCommon = null;
  let maxCount = 0;
  for (const [discipline, count] of Object.entries(disciplineCount)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = discipline;
    }
  }

  return mostCommon;
}

/**
 * Get the highest scoring discipline from discipline scores
 * @param {Object} disciplineScores - Object with discipline scores
 * @returns {string|null} - Highest scoring discipline or null
 */
function getHighestScoringDiscipline(disciplineScores) {
  if (!disciplineScores || typeof disciplineScores !== 'object') {
    return null;
  }

  let highestDiscipline = null;
  let highestScore = -1;

  for (const [discipline, score] of Object.entries(disciplineScores)) {
    if (typeof score === 'number' && score > highestScore) {
      highestScore = score;
      highestDiscipline = discipline;
    }
  }

  return highestDiscipline;
}

export {
  AT_BIRTH_TRAITS,
  analyzeLineage,
  detectInbreeding,
  getAncestors,
  assessFeedQuality,
  applyEpigeneticTraitsAtBirth,
  evaluateTraitConditions,
  checkLineageForDisciplineAffinity,
  getMostCommonDisciplineFromHistory,
  getHighestScoringDiscipline,
};
