import { getStatScore } from '../utils/getStatScore.mjs';
import { getHealthModifier } from '../utils/healthBonus.mjs';
import { applyRiderModifiers } from '../utils/riderBonus.mjs';
import { calculateTraitCompetitionImpact } from '../utils/traitCompetitionImpact.mjs';
import { getCombinedTraitEffects } from '../utils/traitEffects.mjs';
import logger from '../utils/logger.mjs';

/**
 * Simulate a competition with multiple horses and return ranked results
 *
 * Final Score Formula:
 * finalScore = baseStatScore                  // 50/30/20 weighted
 *            + legacyTraitBonus              // +5 if horse trait matches discipline (legacy)
 *            + disciplineAffinityBonus       // TASK 9: +5 if horse has discipline_affinity_* trait
 *            + trainingScore                 // 0–100
 *            + tack bonuses                 // saddle + bridle
 *            + rider bonus/penalty          // % boost and reduction
 *            + healthModifier               // % adjustment based on health
 *            + traitImpactModifier          // NEW: % adjustment based on epigenetic traits
 *            + randomLuckModifier           // ±1–10% random factor
 *
 * @param {Array} horses - Array of horse objects with stats, tack, health, rider info
 * @param {Object} show - Show object with discipline and other properties
 * @returns {Array} - Sorted array of results with scores and placements
 */
function simulateCompetition(horses, show) {
  // Validate inputs
  if (!Array.isArray(horses)) {
    throw new Error('Horses must be an array');
  }

  if (!show || !show.discipline) {
    throw new Error('Show object with discipline is required');
  }

  if (horses.length === 0) {
    return [];
  }

  // Calculate scores for each horse
  const results = horses.map(horse => {
    try {
      // 1. Calculate base stat score (weighted 50/30/20)
      const baseScore = getStatScore(horse, show.discipline);

      // 2. Add legacy trait bonus (+5 if horse trait matches show discipline)
      const legacyTraitBonus = horse.trait === show.discipline ? 5 : 0;

      // 2.5. TASK 9: Add discipline affinity trait bonus (+5 if horse has matching discipline_affinity trait)
      let disciplineAffinityBonus = 0;
      const eventType = show.discipline.toLowerCase().replace(/\s+/g, '_'); // Convert "Show Jumping" to "show_jumping"
      const affinityTrait = `discipline_affinity_${eventType}`;

      if (horse.epigenetic_modifiers?.positive?.includes(affinityTrait)) {
        disciplineAffinityBonus = 5;
        logger.info(
          `[simulateCompetition] Horse ${horse.name}: Discipline affinity bonus applied for ${affinityTrait} (+5 points)`,
        );
      }

      // 3. Add training score (0-100, default to 0 if not provided)
      const trainingScore = horse.trainingScore || 0;

      // 4. Add tack bonuses (saddle + bridle)
      const saddleBonus = (horse.tack?.saddleBonus) || 0;
      const bridleBonus = (horse.tack?.bridleBonus) || 0;
      const tackBonus = saddleBonus + bridleBonus;

      // 5. Calculate subtotal before percentage modifiers
      const subtotal =
        baseScore + legacyTraitBonus + disciplineAffinityBonus + trainingScore + tackBonus;

      // 6. Apply rider modifiers (bonus and penalty as percentages)
      const riderBonusPercent = (horse.rider?.bonusPercent) || 0;
      const riderPenaltyPercent = (horse.rider?.penaltyPercent) || 0;
      const scoreAfterRider = applyRiderModifiers(subtotal, riderBonusPercent, riderPenaltyPercent);

      // 7. Apply health modifier (percentage adjustment)
      const healthModifier = getHealthModifier(horse.health || 'Good');
      const scoreAfterHealth = scoreAfterRider * (1 + healthModifier);

      // 8. Calculate stress response during competition
      let competitionStressImpact = 0;
      const baseStressLevel = horse.stress_level || 0;

      if (baseStressLevel > 0) {
        // Get trait effects for stress resistance
        const traits = horse.epigenetic_modifiers || { positive: [], negative: [], hidden: [] };
        const allTraits = [...(traits.positive || []), ...(traits.negative || [])];
        const traitEffects = getCombinedTraitEffects(allTraits);

        // Base stress impact: higher stress = lower performance
        let stressImpactPercent = baseStressLevel * 0.002; // 0.2% per stress point

        // Apply trait-based stress resistance
        if (traitEffects.competitionStressResistance) {
          stressImpactPercent *= 1 - traitEffects.competitionStressResistance;
          logger.info(
            `[simulateCompetition] Horse ${horse.name}: Stress resistance applied, ${(traitEffects.competitionStressResistance * 100).toFixed(1)}% reduction`,
          );
        }

        // Apply stress reduction from calm/resilient traits
        if (traitEffects.trainingStressReduction) {
          stressImpactPercent *= 1 - traitEffects.trainingStressReduction * 0.5; // Half effect in competition
        }

        competitionStressImpact = scoreAfterHealth * stressImpactPercent;

        if (competitionStressImpact > 0) {
          logger.info(
            `[simulateCompetition] Horse ${horse.name}: Stress impact -${competitionStressImpact.toFixed(1)} points (${baseStressLevel} stress level)`,
          );
        }
      }

      const scoreAfterStress = scoreAfterHealth - competitionStressImpact;

      // 9. NEW: Apply trait-based competition impact
      const traitImpact = calculateTraitCompetitionImpact(horse, show.discipline, scoreAfterStress);
      const scoreAfterTraits = scoreAfterStress + traitImpact.finalScoreAdjustment;

      // Log trait impact for analysis
      if (traitImpact.appliedTraits.length > 0) {
        logger.info(
          `[simulateCompetition] Horse ${horse.name}: ${traitImpact.appliedTraits.length} traits applied, ${(traitImpact.totalScoreModifier * 100).toFixed(1)}% modifier, ${traitImpact.finalScoreAdjustment.toFixed(1)} point adjustment`,
        );
      }

      // 9. Apply random luck modifier (±1–10% random factor)
      const randomLuckPercent = Math.random() * 0.18 - 0.09; // Random between -0.09 and +0.09 (-9% to +9%)
      const finalScore = scoreAfterTraits * (1 + randomLuckPercent);

      return {
        horseId: horse.id,
        name: horse.name,
        score: Math.round(finalScore * 10) / 10, // Round to 1 decimal place
        placement: null, // Will be assigned after sorting
        // NEW: Include trait impact details for analysis
        traitImpact: {
          modifier: traitImpact.totalScoreModifier,
          adjustment: Math.round(traitImpact.finalScoreAdjustment * 10) / 10,
          appliedTraits: traitImpact.appliedTraits.length,
          bonuses: traitImpact.traitBonuses.length,
          penalties: traitImpact.traitPenalties.length,
          details: traitImpact.appliedTraits.map(trait => ({
            name: trait.name,
            type: trait.type,
            modifier: Math.round(trait.modifier * 1000) / 10, // Convert to percentage with 1 decimal
            specialized: trait.isSpecialized,
            description: trait.description,
          })),
        },
        // NEW: Include stress impact details
        stressDetails: {
          baseStressLevel,
          stressImpact: Math.round(competitionStressImpact * 10) / 10,
          stressResistanceApplied: !!traitImpact.appliedTraits.some(t =>
            ['resilient', 'calm'].includes(t.traitName),
          ),
        },
      };
    } catch (error) {
      // If there's an error calculating score for a horse, give them a score of 0
      logger.warn(`Error calculating score for horse ${horse.id || 'unknown'}: ${error.message}`);
      return {
        horseId: horse.id,
        name: horse.name || 'Unknown',
        score: 0,
        placement: null,
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

  return results;
}

export { simulateCompetition };
