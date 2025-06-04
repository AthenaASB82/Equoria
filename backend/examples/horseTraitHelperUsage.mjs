/**
 * TASK 7: Example Usage of Instance-Style Helper Methods
 *
 * This file demonstrates how to use the new instance-style helper methods
 * for trait management in training and competition systems.
 */

import {
  hasTrait,
  getPositiveTraitsArray,
  getNegativeTraitsArray,
  addTrait,
} from '../models/horseModel.mjs';

/**
 * Example: Training System Integration
 * Shows how traits can be used to modify training outcomes
 */
async function exampleTrainingWithTraits(horseId) {
  try {
    console.log(`\n=== Training Session for Horse ${horseId} ===`);

    // Check if horse has specific traits that affect training
    const hasResilient = await hasTrait(horseId, 'resilient');
    const hasNervous = await hasTrait(horseId, 'nervous');
    const hasBold = await hasTrait(horseId, 'bold');

    console.log('Horse traits check:');
    console.log(`- Resilient: ${hasResilient}`);
    console.log(`- Nervous: ${hasNervous}`);
    console.log(`- Bold: ${hasBold}`);

    // Get all positive and negative traits
    const positiveTraits = await getPositiveTraitsArray(horseId);
    const negativeTraits = await getNegativeTraitsArray(horseId);

    console.log('\nAll traits:');
    console.log(`- Positive: ${positiveTraits.join(', ') || 'None'}`);
    console.log(`- Negative: ${negativeTraits.join(', ') || 'None'}`);

    // Calculate training modifiers based on traits
    let trainingBonus = 0;
    let stressReduction = 0;

    // Positive trait effects
    if (hasResilient) {
      trainingBonus += 10; // 10% bonus to training effectiveness
      stressReduction += 5; // Reduces stress by 5 points
      console.log('+ Resilient trait: +10% training bonus, -5 stress');
    }

    if (hasBold) {
      trainingBonus += 5; // 5% bonus for bold horses
      console.log('+ Bold trait: +5% training bonus');
    }

    // Negative trait effects
    if (hasNervous) {
      trainingBonus -= 15; // 15% penalty for nervous horses
      console.log('- Nervous trait: -15% training penalty');
    }

    console.log('\nFinal training modifiers:');
    console.log(`- Training effectiveness: ${trainingBonus > 0 ? '+' : ''}${trainingBonus}%`);
    console.log(`- Stress reduction: ${stressReduction} points`);

    return {
      trainingBonus,
      stressReduction,
      positiveTraits,
      negativeTraits,
    };
  } catch (error) {
    console.error(`Error in training session: ${error.message}`);
    throw error;
  }
}

/**
 * Example: Competition System Integration
 * Shows how traits can affect competition performance
 */
async function exampleCompetitionWithTraits(horseId, competitionType) {
  try {
    console.log(`\n=== Competition: ${competitionType} for Horse ${horseId} ===`);

    // Get all traits
    const positiveTraits = await getPositiveTraitsArray(horseId);
    const negativeTraits = await getNegativeTraitsArray(horseId);

    console.log('Horse entering competition with:');
    console.log(`- Positive traits: ${positiveTraits.join(', ') || 'None'}`);
    console.log(`- Negative traits: ${negativeTraits.join(', ') || 'None'}`);

    // Competition-specific trait effects
    let performanceModifier = 0;
    let confidenceBoost = 0;

    // Check for competition-relevant traits
    const hasBold = await hasTrait(horseId, 'bold');
    const hasSpooky = await hasTrait(horseId, 'spooky');
    const hasResilient = await hasTrait(horseId, 'resilient');
    const hasNervous = await hasTrait(horseId, 'nervous');

    // Apply trait effects based on competition type
    if (competitionType === 'Show Jumping') {
      if (hasBold) {
        performanceModifier += 15; // Bold horses excel at jumping
        confidenceBoost += 10;
        console.log('+ Bold trait in Show Jumping: +15% performance, +10 confidence');
      }
      if (hasSpooky) {
        performanceModifier -= 20; // Spooky horses struggle with jumps
        console.log('- Spooky trait in Show Jumping: -20% performance');
      }
    } else if (competitionType === 'Dressage') {
      if (hasResilient) {
        performanceModifier += 10; // Resilient horses handle pressure well
        console.log('+ Resilient trait in Dressage: +10% performance');
      }
      if (hasNervous) {
        performanceModifier -= 12; // Nervous horses struggle with precision
        console.log('- Nervous trait in Dressage: -12% performance');
      }
    }

    console.log('\nCompetition results:');
    console.log(
      `- Performance modifier: ${performanceModifier > 0 ? '+' : ''}${performanceModifier}%`,
    );
    console.log(`- Confidence boost: +${confidenceBoost} points`);

    return {
      performanceModifier,
      confidenceBoost,
      competitionType,
    };
  } catch (error) {
    console.error(`Error in competition: ${error.message}`);
    throw error;
  }
}

/**
 * Example: Dynamic Trait Addition
 * Shows how traits can be added based on game events
 */
async function exampleAddTraitBasedOnEvent(horseId, eventType) {
  try {
    console.log(`\n=== Event: ${eventType} for Horse ${horseId} ===`);

    let traitToAdd = null;
    let category = null;

    // Determine trait based on event
    switch (eventType) {
      case 'successful_difficult_training':
        traitToAdd = 'resilient';
        category = 'positive';
        console.log('Horse completed difficult training successfully!');
        break;

      case 'traumatic_accident':
        traitToAdd = 'nervous';
        category = 'negative';
        console.log('Horse experienced a traumatic accident.');
        break;

      case 'major_competition_win':
        traitToAdd = 'bold';
        category = 'positive';
        console.log('Horse won a major competition!');
        break;

      case 'repeated_spooking':
        traitToAdd = 'spooky';
        category = 'negative';
        console.log('Horse has been spooking repeatedly.');
        break;

      default:
        console.log(`No trait changes for event: ${eventType}`);
        return null;
    }

    if (traitToAdd) {
      // Check if horse already has this trait
      const alreadyHasTrait = await hasTrait(horseId, traitToAdd);

      if (alreadyHasTrait) {
        console.log(`Horse already has the '${traitToAdd}' trait. No change needed.`);
        return null;
      }

      // Add the trait
      console.log(`Adding '${traitToAdd}' trait to '${category}' category...`);
      const updatedHorse = await addTrait(horseId, traitToAdd, category);

      console.log(`Successfully added '${traitToAdd}' trait!`);

      // Show updated traits
      const positiveTraits = await getPositiveTraitsArray(horseId);
      const negativeTraits = await getNegativeTraitsArray(horseId);

      console.log('Updated traits:');
      console.log(`- Positive: ${positiveTraits.join(', ') || 'None'}`);
      console.log(`- Negative: ${negativeTraits.join(', ') || 'None'}`);

      return {
        addedTrait: traitToAdd,
        category,
        updatedHorse,
      };
    }
  } catch (error) {
    console.error(`Error adding trait: ${error.message}`);
    throw error;
  }
}

/**
 * Example: Complete Trait Management Workflow
 * Shows a complete workflow using all helper methods
 */
async function exampleCompleteWorkflow(horseId) {
  try {
    console.log(`\n=== Complete Trait Management Workflow for Horse ${horseId} ===`);

    // 1. Check current traits
    console.log('\n1. Current trait status:');
    const positiveTraits = await getPositiveTraitsArray(horseId);
    const negativeTraits = await getNegativeTraitsArray(horseId);

    console.log(`- Positive traits: ${positiveTraits.join(', ') || 'None'}`);
    console.log(`- Negative traits: ${negativeTraits.join(', ') || 'None'}`);

    // 2. Check for specific traits
    console.log('\n2. Checking for specific traits:');
    const importantTraits = ['resilient', 'bold', 'nervous', 'spooky', 'people_trusting'];

    for (const trait of importantTraits) {
      const hasTrait_ = await hasTrait(horseId, trait);
      console.log(`- ${trait}: ${hasTrait_ ? '✓' : '✗'}`);
    }

    // 3. Simulate training session
    console.log('\n3. Training session simulation:');
    const trainingResults = await exampleTrainingWithTraits(horseId);

    // 4. Simulate competition
    console.log('\n4. Competition simulation:');
    const competitionResults = await exampleCompetitionWithTraits(horseId, 'Show Jumping');

    // 5. Simulate event-based trait addition
    console.log('\n5. Event-based trait modification:');
    const eventResults = await exampleAddTraitBasedOnEvent(
      horseId,
      'successful_difficult_training',
    );

    return {
      initialTraits: { positiveTraits, negativeTraits },
      trainingResults,
      competitionResults,
      eventResults,
    };
  } catch (error) {
    console.error(`Error in complete workflow: ${error.message}`);
    throw error;
  }
}

// Export examples for use in other modules
export {
  exampleTrainingWithTraits,
  exampleCompetitionWithTraits,
  exampleAddTraitBasedOnEvent,
  exampleCompleteWorkflow,
};

// Example usage (uncomment to run):
// exampleCompleteWorkflow(1).catch(console.error);
