/**
 * Enhanced Competition Simulation with New Requirements
 * - 24 disciplines with 3 weighted stats each
 * - Horse-based level system (not user-based)
 * - Age restrictions (3-21 years old)
 * - Gaited trait requirement for Gaited competitions
 * - Stat gains for top 3 placements (10%/5%/3% chance)
 * - No earnings for 4th place
 * - Hidden scores from users
 */

import prisma from '../db/index.mjs';
import logger from '../utils/logger.mjs';
import {
  calculateCompetitionScore,
  calculatePrizeAmount,
  calculateCompetitionXP,
  calculatePlacements,
  calculateHorseLevel,
  checkAgeRequirements,
  checkTraitRequirements,
  calculateStatGain,
  getAllDisciplines,
  getDisciplineConfig,
} from '../utils/competitionLogic.mjs';

/**
 * Validate horse eligibility for competition entry
 * @param {Object} horse - Horse object
 * @param {Object} show - Show object
 * @param {Object} user - User object
 * @returns {Object} Validation result
 */
export async function validateCompetitionEntry(horse, show, user) {
  try {
    const errors = [];

    // Age requirements (3-21 years old)
    if (!checkAgeRequirements(horse)) {
      if (horse.age < 3) {
        errors.push(`Horse is too young (${horse.age} years old). Minimum age is 3 years.`);
      } else if (horse.age > 21) {
        errors.push(`Horse has retired (${horse.age} years old). Maximum age is 21 years.`);
      }
    }

    // Trait requirements (e.g., Gaited)
    if (!checkTraitRequirements(horse, show.discipline)) {
      const disciplineConfig = getDisciplineConfig(show.discipline);
      if (disciplineConfig.requiresTrait) {
        errors.push(
          `Horse must have the '${disciplineConfig.requiresTrait}' trait to compete in ${show.discipline}.`,
        );
      }
    }

    // Horse level requirements
    const horseLevel = calculateHorseLevel(horse, show.discipline);
    if (horseLevel < show.levelMin || horseLevel > show.levelMax) {
      errors.push(
        `Horse level ${horseLevel} is outside the required range (${show.levelMin}-${show.levelMax}) for this competition.`,
      );
    }

    // Health requirements
    if (horse.healthStatus !== 'Good' && horse.healthStatus !== 'Excellent') {
      errors.push(
        `Horse health status must be Good or Excellent. Current status: ${horse.healthStatus}`,
      );
    }

    // Financial requirements
    if (user.money < show.entryFee) {
      errors.push(`Insufficient funds. Entry fee: $${show.entryFee}, Available: $${user.money}`);
    }

    // Discipline score requirements (if any)
    const disciplineScore = horse.disciplineScores?.[show.discipline] || 0;
    const minDisciplineScore = 0; // Could be configurable per show
    if (disciplineScore < minDisciplineScore) {
      errors.push(
        `Horse discipline score too low. Required: ${minDisciplineScore}, Current: ${disciplineScore}`,
      );
    }

    return {
      eligible: errors.length === 0,
      errors,
      horseLevel,
      disciplineScore,
    };
  } catch (error) {
    logger.error('[enhancedCompetitionSimulation.validateCompetitionEntry] Error:', error.message);
    return {
      eligible: false,
      errors: ['Validation error occurred'],
      horseLevel: 1,
      disciplineScore: 0,
    };
  }
}

/**
 * Execute enhanced competition with all new features
 * @param {Object} show - Show object
 * @param {Array} entries - Array of {horse, user} objects
 * @returns {Object} Competition results
 */
export async function executeEnhancedCompetition(show, entries) {
  try {
    logger.info(
      `[enhancedCompetitionSimulation] Executing competition: ${show.name} (${show.discipline})`,
    );

    // Calculate scores for all entries
    const competitionEntries = entries.map(({ horse, user }) => {
      const score = calculateCompetitionScore(horse, show.discipline);
      return {
        horse,
        user,
        score,
        horseId: horse.id,
        userId: user.id,
      };
    });

    // Calculate placements
    const placedEntries = calculatePlacements(competitionEntries);

    // Process results and rewards
    const results = [];
    const statGainResults = [];

    for (const entry of placedEntries) {
      const { horse, user, score, placement } = entry;

      // Calculate prize (4th place gets nothing)
      const prizeWon = calculatePrizeAmount(show.prize, placement, entries.length);

      // Calculate XP
      const xpGained = calculateCompetitionXP(score, placement, entries.length);

      // Calculate potential stat gain for top 3
      let statGain = null;
      if (placement <= 3) {
        statGain = calculateStatGain(placement, show.discipline);
      }

      // Create competition result record
      await prisma.competitionResult.create({
        data: {
          horseId: horse.id,
          showId: show.id,
          score,
          placement: placement.toString(),
          discipline: show.discipline,
          runDate: show.runDate,
          showName: show.name,
          prizeWon,
          statGains: statGain
            ? {
                stat: statGain.stat,
                amount: statGain.amount,
                awarded: true,
              }
            : null,
        },
      });

      // Update user money and XP
      await prisma.user.update({
        where: { id: user.id },
        data: {
          money: { increment: prizeWon },
          xp: { increment: xpGained },
        },
      });

      // Apply stat gain to horse if awarded
      if (statGain) {
        const updateData = {};
        updateData[statGain.stat] = { increment: statGain.amount };

        await prisma.horse.update({
          where: { id: horse.id },
          data: updateData,
        });

        statGainResults.push({
          horseId: horse.id,
          horseName: horse.name,
          stat: statGain.stat,
          amount: statGain.amount,
          placement,
        });
      }

      // Create XP event
      await prisma.xpEvent.create({
        data: {
          userId: user.id,
          amount: xpGained,
          reason: `Competition: ${show.name} - Placement: ${placement}`,
          timestamp: new Date(),
        },
      });

      results.push({
        horseId: horse.id,
        horseName: horse.name,
        userId: user.id,
        userName: user.username,
        placement,
        // Note: Score is hidden from users in actual API responses
        score, // Only for internal processing
        prizeWon,
        xpGained,
        statGain: statGain
          ? {
              stat: statGain.stat,
              amount: statGain.amount,
            }
          : null,
      });
    }

    logger.info(
      `[enhancedCompetitionSimulation] Competition completed. ${results.length} entries processed.`,
    );

    return {
      success: true,
      showId: show.id,
      showName: show.name,
      discipline: show.discipline,
      totalEntries: entries.length,
      results: results.map(result => ({
        // Return user-facing results (no scores)
        horseId: result.horseId,
        horseName: result.horseName,
        userId: result.userId,
        userName: result.userName,
        placement: result.placement,
        prizeWon: result.prizeWon,
        xpGained: result.xpGained,
        statGain: result.statGain,
      })),
      statGains: statGainResults,
      totalPrizeDistributed: results.reduce((sum, r) => sum + r.prizeWon, 0),
      totalXPAwarded: results.reduce((sum, r) => sum + r.xpGained, 0),
    };
  } catch (error) {
    logger.error(
      '[enhancedCompetitionSimulation.executeEnhancedCompetition] Error:',
      error.message,
    );
    return {
      success: false,
      error: error.message,
      showId: show.id,
      results: [],
    };
  }
}

/**
 * Get competition eligibility summary for a horse
 * @param {Object} horse - Horse object
 * @param {string} discipline - Competition discipline
 * @returns {Object} Eligibility summary
 */
export function getCompetitionEligibilitySummary(horse, discipline) {
  try {
    const horseLevel = calculateHorseLevel(horse, discipline);
    const ageEligible = checkAgeRequirements(horse);
    const traitEligible = checkTraitRequirements(horse, discipline);
    const disciplineConfig = getDisciplineConfig(discipline);

    return {
      horseLevel,
      ageEligible,
      traitEligible,
      requiredTrait: disciplineConfig.requiresTrait || null,
      disciplineStats: disciplineConfig.stats,
      currentAge: horse.age,
      healthStatus: horse.healthStatus,
      disciplineScore: horse.disciplineScores?.[discipline] || 0,
    };
  } catch (error) {
    logger.error(
      '[enhancedCompetitionSimulation.getCompetitionEligibilitySummary] Error:',
      error.message,
    );
    return {
      horseLevel: 1,
      ageEligible: false,
      traitEligible: false,
      requiredTrait: null,
      disciplineStats: [],
      currentAge: 0,
      healthStatus: 'Unknown',
      disciplineScore: 0,
    };
  }
}

export default {
  validateCompetitionEntry,
  executeEnhancedCompetition,
  getCompetitionEligibilitySummary,
  getAllDisciplines,
  getDisciplineConfig,
};
