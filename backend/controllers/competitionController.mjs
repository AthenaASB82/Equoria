import { getHorseById } from '../models/horseModel.mjs';
import { saveResult, getResultsByShow } from '../models/resultModel.mjs';
import { addXpToUser } from '../models/userModel.mjs';
import { logXpEvent } from '../models/xpLogModel.mjs';
import { awardCompetitionXp } from '../models/horseXpModel.mjs';
import { calculateCompetitionScore } from '../utils/competitionLogic.mjs';
import { isHorseEligibleForShow } from '../utils/isHorseEligible.mjs';
import {
  calculatePrizeDistribution,
  calculateStatGains,
  calculateEntryFees,
  hasValidRider,
} from '../utils/competitionRewards.mjs';
import { updateHorseRewards } from '../utils/horseUpdates.mjs';
import { transferEntryFees } from '../utils/userUpdates.mjs';
import logger from '../utils/logger.mjs';

/**
 * Helper function to detect trait bonuses for a horse in a specific discipline
 * @param {Object} horse - Horse object with epigenetic_modifiers
 * @param {string} discipline - Competition discipline
 * @returns {Object} Trait bonus information
 */
function detectTraitBonuses(horse, discipline) {
  const result = {
    hasTraitBonus: false,
    traitBonusAmount: 0,
    appliedTraits: [],
    bonusDescription: '',
  };

  // Check for discipline affinity traits
  if (horse.epigenetic_modifiers?.positive) {
    const disciplineKey = discipline.toLowerCase().replace(/\s+/g, '_');
    const affinityTrait = `discipline_affinity_${disciplineKey}`;

    if (horse.epigenetic_modifiers.positive.includes(affinityTrait)) {
      result.hasTraitBonus = true;
      result.traitBonusAmount = 5;
      result.appliedTraits.push(affinityTrait);
      result.bonusDescription = `+5 trait match bonus applied (${affinityTrait})`;
    }
  }

  return result;
}

/**
 * Enhanced competition scoring using the new calculateCompetitionScore function
 * @param {Array} horses - Array of horse objects
 * @param {Object} show - Show object with discipline
 * @returns {Array} Sorted array of results with detailed scoring information
 */
function runEnhancedCompetition(horses, show) {
  logger.info(
    `[runEnhancedCompetition] Starting enhanced competition for ${horses.length} horses in ${show.discipline}`,
  );

  // Calculate scores for each horse using the new scoring system
  const results = horses.map(horse => {
    try {
      // Use the new calculateCompetitionScore function
      const finalScore = calculateCompetitionScore(horse, show.discipline);

      // Detect trait bonuses for transparency
      const traitInfo = detectTraitBonuses(horse, show.discipline);

      // Create detailed result object
      const result = {
        horseId: horse.id,
        name: horse.name,
        score: finalScore,
        placement: null, // Will be assigned after sorting
        discipline: show.discipline,

        // Enhanced scoring details for transparency
        scoringDetails: {
          finalScore,
          traitBonus: traitInfo.traitBonusAmount,
          hasTraitAdvantage: traitInfo.hasTraitBonus,
          appliedTraits: traitInfo.appliedTraits,
          bonusDescription: traitInfo.bonusDescription,

          // Base stats used in calculation
          baseStats: {
            speed: horse.speed || 0,
            stamina: horse.stamina || 0,
            focus: horse.focus || 0,
            precision: horse.precision || 0,
            agility: horse.agility || 0,
            coordination: horse.coordination || 0,
            boldness: horse.boldness || 0,
            balance: horse.balance || 0,
          },

          // Additional factors
          stressLevel: horse.stress_level || 0,
          health: horse.health || 'Good',
          tackBonuses: {
            saddle: horse.tack?.saddleBonus || 0,
            bridle: horse.tack?.bridleBonus || 0,
          },
        },
      };

      logger.info(
        `[runEnhancedCompetition] Horse ${horse.name}: Score ${finalScore}${traitInfo.bonusDescription ? `, ${traitInfo.bonusDescription}` : ''}`,
      );

      return result;
    } catch (error) {
      logger.error(
        `[runEnhancedCompetition] Error calculating score for horse ${horse.id}: ${error.message}`,
      );
      return {
        horseId: horse.id,
        name: horse.name || 'Unknown',
        score: 0,
        placement: null,
        discipline: show.discipline,
        scoringDetails: {
          finalScore: 0,
          error: error.message,
        },
      };
    }
  });

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  // Assign placements to top 3
  const placements = ['1st', '2nd', '3rd'];
  results.forEach((result, index) => {
    if (index < 3) {
      result.placement = placements[index];
    }
  });

  logger.info(
    `[runEnhancedCompetition] Competition completed. Winner: ${results[0]?.name} with score ${results[0]?.score}`,
  );

  return results;
}

/**
 * Enter horses into a show and run the competition with enhanced features
 * @param {Array} horseIds - Array of horse IDs to enter
 * @param {Object} show - Show object with competition details
 * @returns {Object} - Competition results with summary
 */
async function enterAndRunShow(horseIds, show) {
  // Validate inputs (outside try-catch to preserve original error messages)
  if (!horseIds) {
    throw new Error('Horse IDs array is required');
  }
  if (!Array.isArray(horseIds)) {
    throw new Error('Horse IDs must be an array');
  }
  if (horseIds.length === 0) {
    throw new Error('At least one horse ID is required');
  }
  if (!show) {
    throw new Error('Show object is required');
  }

  try {
    logger.info(
      `[competitionController.enterAndRunShow] Starting enhanced competition for show ${show.id} with ${horseIds.length} horses`,
    );

    // Step 1: Fetch horse data and validate riders
    const horses = [];
    const failedFetches = [];

    for (const horseId of horseIds) {
      try {
        const horse = await getHorseById(horseId);
        if (horse) {
          // NEW: Check if horse has a valid rider (required for competition)
          if (!hasValidRider(horse)) {
            failedFetches.push({ horseId, reason: 'Horse must have a rider to compete' });
            continue;
          }
          horses.push(horse);
        } else {
          failedFetches.push({ horseId, reason: 'Horse not found' });
        }
      } catch (error) {
        failedFetches.push({ horseId, reason: error.message });
      }
    }

    // Step 2: Get existing results to check for duplicate entries
    const existingResults = await getResultsByShow(show.id);
    const previousEntries = existingResults.map(result => result.horseId);

    // Step 3: Filter out horses that are not eligible or already entered
    const validHorses = [];

    for (const horse of horses) {
      // Check if horse already entered this show
      if (previousEntries.includes(horse.id)) {
        logger.info(
          `[competitionController.enterAndRunShow] Horse ${horse.id} (${horse.name}) already entered this show, skipping`,
        );
        continue;
      }

      // Check eligibility
      if (!isHorseEligibleForShow(horse, show, previousEntries)) {
        logger.info(
          `[competitionController.enterAndRunShow] Horse ${horse.id} (${horse.name}) is not eligible for this show, skipping`,
        );
        continue;
      }

      validHorses.push(horse);
    }

    // Calculate total skipped (includes failed fetches)
    const totalSkipped = horseIds.length - validHorses.length;

    // Step 4: Check if we have any valid horses
    if (validHorses.length === 0) {
      logger.warn(
        '[competitionController.enterAndRunShow] No valid horses available for competition',
      );
      return {
        success: false,
        message: 'No valid horses available for competition',
        results: [],
        failedFetches,
        summary: {
          totalEntries: horseIds.length,
          validEntries: 0,
          skippedEntries: totalSkipped,
          topThree: [],
          entryFeesCollected: 0,
          prizesAwarded: 0,
        },
      };
    }

    // Step 5: NEW - Transfer entry fees to host user
    let entryFeesTransferred = 0;
    if (show.hostUserId && show.entryFee > 0) {
      // Renamed hostuser to hostUserId
      try {
        const totalFees = calculateEntryFees(show.entryFee, validHorses.length);
        await transferEntryFees(show.hostUserId, show.entryFee, validHorses.length); // Renamed hostuser to hostUserId
        entryFeesTransferred = totalFees;
        logger.info(
          `[competitionController.enterAndRunShow] Transferred $${totalFees} in entry fees to host user ${show.hostUserId}`,
        ); // Renamed hostuser to hostUserId
      } catch (error) {
        logger.error(
          `[competitionController.enterAndRunShow] Failed to transfer entry fees: ${error.message}`,
        );
        // Continue with competition even if fee transfer fails
      }
    }

    // Step 6: Run the enhanced competition with trait scoring
    let simulationResults;
    try {
      simulationResults = runEnhancedCompetition(validHorses, show);
      logger.info(
        `[competitionController.enterAndRunShow] Enhanced competition completed with ${simulationResults.length} results`,
      );
    } catch (error) {
      logger.error(
        `[competitionController.enterAndRunShow] Enhanced competition failed: ${error.message}`,
      );
      throw new Error(`Enhanced competition error: ${error.message}`);
    }

    // Step 7: NEW - Calculate prize distribution and stat gains
    const prizeDistribution = calculatePrizeDistribution(show.prize);
    const prizeMap = {
      '1st': prizeDistribution.first,
      '2nd': prizeDistribution.second,
      '3rd': prizeDistribution.third,
    };

    let totalPrizesAwarded = 0;

    // Step 8: Save results and update horse rewards
    const savedResults = [];
    const xpEvents = []; // Track XP awards for summary
    try {
      for (const simResult of simulationResults) {
        // Calculate prize and stat gains for winners
        const prizeWon = prizeMap[simResult.placement] || 0;
        const statGains = simResult.placement
          ? calculateStatGains(simResult.placement, show.discipline)
          : null;

        // Save competition result with enhanced trait scoring data
        const resultData = {
          horseId: simResult.horseId,
          showId: show.id,
          score: simResult.score,
          placement: simResult.placement,
          discipline: show.discipline,
          runDate: show.runDate,
          showName: show.name,
          prizeWon,
          statGains,

          // NEW: Enhanced scoring details for transparency
          scoringDetails: simResult.scoringDetails || {},
          traitBonus: simResult.scoringDetails?.traitBonus || 0,
          hasTraitAdvantage: simResult.scoringDetails?.hasTraitAdvantage || false,
          bonusDescription: simResult.scoringDetails?.bonusDescription || '',
          appliedTraits: simResult.scoringDetails?.appliedTraits || [],
        };

        const savedResult = await saveResult(resultData);
        savedResults.push(savedResult);

        // NEW: Update horse earnings and stats if they won prizes
        if (prizeWon > 0) {
          try {
            await updateHorseRewards(simResult.horseId, prizeWon, statGains);
            totalPrizesAwarded += prizeWon;
            logger.info(
              `[competitionController.enterAndRunShow] Updated horse ${simResult.horseId} with $${prizeWon} prize${statGains ? ` and +1 ${statGains.stat}` : ''}`,
            );
          } catch (error) {
            logger.error(
              `[competitionController.enterAndRunShow] Failed to update horse rewards for ${simResult.horseId}: ${error.message}`,
            );
            // Continue with other horses even if one update fails
          }
        }

        // NEW: Award XP to horse owner and horse based on placement
        if (simResult.placement) {
          try {
            // Get horse to find owner
            const horse = await getHorseById(simResult.horseId);
            if (horse?.userId) {
              let userXpAmount = 0;
              switch (simResult.placement) {
                case '1st':
                  userXpAmount = 20;
                  break;
                case '2nd':
                  userXpAmount = 15;
                  break;
                case '3rd':
                  userXpAmount = 10;
                  break;
              }

              if (userXpAmount > 0) {
                // Award XP to user using userModel.addXpToUser
                const userXpResult = await addXpToUser(horse.userId, userXpAmount);

                // Log user XP event for auditing
                await logXpEvent({
                  userId: horse.userId,
                  amount: userXpAmount,
                  reason: `${simResult.placement} place with horse ${horse.name} in ${show.discipline}`,
                });

                // Track user XP event for summary
                const xpEventData = {
                  userId: horse.userId,
                  horseId: horse.id,
                  horseName: horse.name,
                  placement: simResult.placement,
                  xpAwarded: userXpAmount,
                  leveledUp: userXpResult.leveledUp,
                  newLevel: userXpResult.currentLevel,
                  levelsGained: userXpResult.levelsGained || 0,
                };
                xpEvents.push(xpEventData);

                logger.info(
                  `[competitionController.enterAndRunShow] Awarded ${userXpAmount} XP to user ${horse.userId} for ${simResult.placement} place${userXpResult.leveledUp ? ` - LEVEL UP to ${userXpResult.currentLevel}!` : ''}`,
                );
              }

              // NEW: Award Horse XP for competition participation
              try {
                const horseXpResult = await awardCompetitionXp(
                  simResult.horseId,
                  simResult.placement,
                  show.discipline,
                );

                if (horseXpResult.success) {
                  logger.info(
                    `[competitionController.enterAndRunShow] Awarded ${horseXpResult.xpAwarded} Horse XP to ${horse.name} for ${simResult.placement} place${horseXpResult.statPointsGained > 0 ? ` - Gained ${horseXpResult.statPointsGained} stat points!` : ''}`,
                  );
                } else {
                  logger.warn(
                    `[competitionController.enterAndRunShow] Failed to award Horse XP to ${horse.name}: ${horseXpResult.error}`,
                  );
                }
              } catch (horseXpError) {
                logger.error(
                  `[competitionController.enterAndRunShow] Error awarding Horse XP to ${horse.name}: ${horseXpError.message}`,
                );
                // Continue with other horses even if horse XP award fails
              }
            }
          } catch (error) {
            logger.error(
              `[competitionController.enterAndRunShow] Failed to award XP for horse ${simResult.horseId}: ${error.message}`,
            );
            // Continue with other horses even if XP award fails
          }
        }
      }
      logger.info(
        `[competitionController.enterAndRunShow] Successfully saved ${savedResults.length} competition results`,
      );
    } catch (error) {
      logger.error(
        `[competitionController.enterAndRunShow] Failed to save results: ${error.message}`,
      );
      throw new Error(`Failed to save competition results: ${error.message}`);
    }

    // Step 9: Extract top three for summary with trait information
    const topThree = simulationResults
      .filter(result => result.placement !== null)
      .slice(0, 3)
      .map(result => ({
        horseId: result.horseId,
        name: result.name,
        score: result.score,
        placement: result.placement,
        prizeWon: prizeMap[result.placement] || 0,

        // NEW: Include trait bonus information for transparency
        traitBonus: result.scoringDetails?.traitBonus || 0,
        hasTraitAdvantage: result.scoringDetails?.hasTraitAdvantage || false,
        bonusDescription: result.scoringDetails?.bonusDescription || '',
        appliedTraits: result.scoringDetails?.appliedTraits || [],
      }));

    // Step 10: Calculate trait statistics for summary
    const traitStats = {
      horsesWithTraitAdvantage: simulationResults.filter(r => r.scoringDetails?.hasTraitAdvantage)
        .length,
      totalTraitBonuses: simulationResults.reduce(
        (sum, r) => sum + (r.scoringDetails?.traitBonus || 0),
        0,
      ),
      averageTraitBonus: 0,
      mostCommonTraits: {},
    };

    // Calculate average trait bonus for horses that have traits
    const horsesWithTraits = simulationResults.filter(r => r.scoringDetails?.hasTraitAdvantage);
    if (horsesWithTraits.length > 0) {
      traitStats.averageTraitBonus = traitStats.totalTraitBonuses / horsesWithTraits.length;
    }

    // Count trait occurrences
    simulationResults.forEach(result => {
      if (result.scoringDetails?.appliedTraits) {
        result.scoringDetails.appliedTraits.forEach(trait => {
          traitStats.mostCommonTraits[trait] = (traitStats.mostCommonTraits[trait] || 0) + 1;
        });
      }
    });

    // Step 11: Return enhanced results with comprehensive summary
    const response = {
      success: true,
      message: 'Competition completed successfully with enhanced trait scoring',
      results: savedResults,
      failedFetches,
      summary: {
        totalEntries: horseIds.length,
        validEntries: validHorses.length,
        skippedEntries: totalSkipped,
        topThree,
        entryFeesCollected: entryFeesTransferred,
        prizesAwarded: totalPrizesAwarded,
        prizeDistribution,

        // NEW: XP Events tracking (as requested in task)
        xpEvents,
        totalXpAwarded: xpEvents.reduce((sum, event) => sum + event.xpAwarded, 0),
        usersLeveledUp: xpEvents.filter(event => event.leveledUp).length, // Renamed UsersLeveledUp to usersLeveledUp

        // NEW: Trait scoring statistics
        traitStatistics: traitStats,
        discipline: show.discipline,
        scoringMethod: 'Enhanced trait-based scoring with calculateCompetitionScore()',
      },
    };

    logger.info(
      `[competitionController.enterAndRunShow] Enhanced competition completed: ${validHorses.length} valid entries, $${totalPrizesAwarded} in prizes, $${entryFeesTransferred} in fees`,
    );
    return response;
  } catch (error) {
    logger.error('[competitionController.enterAndRunShow] Error: %o', error);
    throw new Error(`Database error in enterAndRunShow: ${error.message}`);
  }
}

export { enterAndRunShow };
