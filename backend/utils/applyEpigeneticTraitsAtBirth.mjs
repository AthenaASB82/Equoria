/**
 * Epigenetic Trait Assignment at Birth
 *
 * This module provides functionality to assign epigenetic traits to foals at birth
 * based on mare conditions, lineage analysis, and breeding circumstances.
 */

import logger from './logger.mjs';

/**
 * Apply epigenetic traits at birth based on breeding conditions
 * @param {Object} params - Breeding parameters
 * @param {Object} params.mare - Mare object with stressLevel and other properties
 * @param {Array} params.lineage - Array of ancestor objects with discipline information
 * @param {number} params.feedQuality - Feed quality score (0-100)
 * @param {number} params.stressLevel - Mare's stress level (0-100)
 * @returns {Object} - Object with positive and negative trait arrays
 */
export function applyEpigeneticTraitsAtBirth({ mare, lineage, feedQuality, stressLevel }) {
  try {
    logger.info('[applyEpigeneticTraitsAtBirth] Starting trait assignment at birth');

    // Initialize trait arrays
    const positive = [];
    const negative = [];

    // Validate inputs
    if (!mare) {
      throw new Error('Mare object is required');
    }

    // Use provided stress level or mare's current stress level
    const currentStressLevel = stressLevel !== undefined ? stressLevel : mare.stressLevel || 50;
    const currentFeedQuality = feedQuality !== undefined ? feedQuality : 50;

    logger.info(
      `[applyEpigeneticTraitsAtBirth] Mare stress: ${currentStressLevel}, Feed quality: ${currentFeedQuality}`,
    );

    // Check for positive conditions: Low stress and premium feed
    if (currentStressLevel <= 20 && currentFeedQuality >= 80) {
      // High chance for resilient trait
      if (Math.random() < 0.75) {
        positive.push('resilient');
        logger.info(
          '[applyEpigeneticTraitsAtBirth] Applied resilient trait (low stress + premium feed)',
        );
      }

      // Good chance for people_trusting trait
      if (Math.random() < 0.6) {
        positive.push('people_trusting');
        logger.info(
          '[applyEpigeneticTraitsAtBirth] Applied people_trusting trait (low stress + premium feed)',
        );
      }
    }

    // Check for inbreeding risks
    const inbreedingAnalysis = analyzeInbreeding(lineage);
    if (inbreedingAnalysis.inbreedingDetected) {
      logger.info(
        `[applyEpigeneticTraitsAtBirth] Inbreeding detected: ${inbreedingAnalysis.severity}`,
      );

      // Risk of fragile trait
      const fragileChance =
        inbreedingAnalysis.severity === 'high'
          ? 0.8
          : inbreedingAnalysis.severity === 'moderate'
            ? 0.5
            : 0.25;
      if (Math.random() < fragileChance) {
        negative.push('fragile');
        logger.info('[applyEpigeneticTraitsAtBirth] Applied fragile trait (inbreeding)');
      }

      // Risk of reactive trait
      const reactiveChance =
        inbreedingAnalysis.severity === 'high'
          ? 0.7
          : inbreedingAnalysis.severity === 'moderate'
            ? 0.4
            : 0.2;
      if (Math.random() < reactiveChance) {
        negative.push('reactive');
        logger.info('[applyEpigeneticTraitsAtBirth] Applied reactive trait (inbreeding)');
      }

      // Risk of low_immunity trait
      const immunityChance =
        inbreedingAnalysis.severity === 'high'
          ? 0.6
          : inbreedingAnalysis.severity === 'moderate'
            ? 0.35
            : 0.15;
      if (Math.random() < immunityChance) {
        negative.push('low_immunity');
        logger.info('[applyEpigeneticTraitsAtBirth] Applied low_immunity trait (inbreeding)');
      }
    }

    // Check for discipline specialization in lineage
    const disciplineAnalysis = analyzeDisciplineSpecialization(lineage);
    if (disciplineAnalysis.hasSpecialization) {
      logger.info(
        `[applyEpigeneticTraitsAtBirth] Discipline specialization detected: ${disciplineAnalysis.discipline} (${disciplineAnalysis.count} ancestors)`,
      );

      // Assign discipline affinity trait
      const affinityTrait = `discipline_affinity_${disciplineAnalysis.discipline.toLowerCase().replace(/\s+/g, '_')}`;
      if (Math.random() < 0.7) {
        positive.push(affinityTrait);
        logger.info(`[applyEpigeneticTraitsAtBirth] Applied ${affinityTrait} trait`);
      }

      // Chance for legacy talent if 4+ ancestors share discipline
      if (disciplineAnalysis.count >= 4 && Math.random() < 0.4) {
        positive.push('legacy_talent');
        logger.info('[applyEpigeneticTraitsAtBirth] Applied legacy_talent trait (strong lineage)');
      }
    }

    // Additional stress-based trait assignments
    if (currentStressLevel >= 80) {
      // High stress can lead to negative traits
      if (Math.random() < 0.4) {
        if (!negative.includes('reactive')) {
          negative.push('nervous');
          logger.info('[applyEpigeneticTraitsAtBirth] Applied nervous trait (high mare stress)');
        }
      }
    }

    // Feed quality effects
    if (currentFeedQuality <= 30) {
      // Poor nutrition can affect immunity
      if (Math.random() < 0.3) {
        if (!negative.includes('low_immunity')) {
          negative.push('low_immunity');
          logger.info('[applyEpigeneticTraitsAtBirth] Applied low_immunity trait (poor nutrition)');
        }
      }
    }

    // Remove duplicates (shouldn't happen but safety check)
    const uniquePositive = [...new Set(positive)];
    const uniqueNegative = [...new Set(negative)];

    const result = {
      positive: uniquePositive,
      negative: uniqueNegative,
    };

    logger.info(`[applyEpigeneticTraitsAtBirth] Final traits assigned: ${JSON.stringify(result)}`);

    return result;
  } catch (error) {
    logger.error(`[applyEpigeneticTraitsAtBirth] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze lineage for inbreeding
 * @param {Array} lineage - Array of ancestor objects
 * @returns {Object} - Inbreeding analysis result
 */
function analyzeInbreeding(lineage) {
  if (!lineage || lineage.length === 0) {
    return { inbreedingDetected: false, severity: 'none', commonAncestors: [] };
  }

  // Look for common ancestors within 3 generations
  const ancestorCounts = {};
  const commonAncestors = [];

  // Count occurrences of each ancestor
  lineage.forEach(ancestor => {
    if (ancestor?.id) {
      ancestorCounts[ancestor.id] = (ancestorCounts[ancestor.id] || 0) + 1;
      if (ancestorCounts[ancestor.id] > 1 && !commonAncestors.includes(ancestor.id)) {
        commonAncestors.push(ancestor.id);
      }
    }
  });

  const inbreedingDetected = commonAncestors.length > 0;
  let severity = 'none';

  if (inbreedingDetected) {
    const maxCount = Math.max(...Object.values(ancestorCounts));
    if (maxCount >= 4) {
      severity = 'high';
    } else if (maxCount >= 3) {
      severity = 'moderate';
    } else {
      severity = 'low';
    }
  }

  return {
    inbreedingDetected,
    severity,
    commonAncestors,
    ancestorCounts,
  };
}

/**
 * Analyze lineage for discipline specialization
 * @param {Array} lineage - Array of ancestor objects with discipline information
 * @returns {Object} - Discipline specialization analysis
 */
function analyzeDisciplineSpecialization(lineage) {
  if (!lineage || lineage.length === 0) {
    return { hasSpecialization: false, discipline: null, count: 0 };
  }

  // Count disciplines from ancestors
  const disciplineCounts = {};

  lineage.forEach(ancestor => {
    if (ancestor?.discipline) {
      disciplineCounts[ancestor.discipline] = (disciplineCounts[ancestor.discipline] || 0) + 1;
    }

    // Check mostCompetedDiscipline field (primary field for discipline specialization)
    if (ancestor?.mostCompetedDiscipline) {
      disciplineCounts[ancestor.mostCompetedDiscipline] =
        (disciplineCounts[ancestor.mostCompetedDiscipline] || 0) + 1;
    }

    // Also check disciplineScores for highest scoring discipline
    if (ancestor?.disciplineScores) {
      const highestDiscipline = getHighestScoringDiscipline(ancestor.disciplineScores);
      if (highestDiscipline) {
        disciplineCounts[highestDiscipline] = (disciplineCounts[highestDiscipline] || 0) + 1;
      }
    }
  });

  // Find the most common discipline
  let mostCommonDiscipline = null;
  let maxCount = 0;

  Object.entries(disciplineCounts).forEach(([discipline, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonDiscipline = discipline;
    }
  });

  // Require at least 3 ancestors with the same discipline for specialization
  const hasSpecialization = maxCount >= 3;

  return {
    hasSpecialization,
    discipline: hasSpecialization ? mostCommonDiscipline : null,
    count: maxCount,
    disciplineBreakdown: disciplineCounts,
  };
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

  Object.entries(disciplineScores).forEach(([discipline, score]) => {
    if (typeof score === 'number' && score > highestScore) {
      highestScore = score;
      highestDiscipline = discipline;
    }
  });

  return highestDiscipline;
}

export default applyEpigeneticTraitsAtBirth;
