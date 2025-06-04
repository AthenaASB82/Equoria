/**
 * At-Birth Traits System Examples
 * Demonstrates how traits are applied during horse creation based on breeding conditions
 */

import { applyEpigeneticTraitsAtBirth, AT_BIRTH_TRAITS } from '../utils/atBirthTraits.mjs';
import { createHorse } from '../models/horseModel.mjs';

console.log('🐎 At-Birth Traits System Examples\n');

// Example 1: Optimal Breeding Conditions
console.log('📈 Example 1: Optimal Breeding Conditions');
console.log('Low mare stress, high feed quality, no inbreeding');

async function optimalBreedingExample() {
  try {
    const breedingData = {
      sireId: 1,
      damId: 2,
      mareStress: 10, // Very low stress
      feedQuality: 95, // Excellent feed quality
    };

    const result = await applyEpigeneticTraitsAtBirth(breedingData);

    console.log('Breeding Analysis:');
    console.log(`- Mare Stress: ${result.breedingAnalysis.conditions.mareStress}`);
    console.log(`- Feed Quality: ${result.breedingAnalysis.conditions.feedQuality}`);
    console.log(`- Inbreeding Detected: ${result.breedingAnalysis.inbreeding.inbreedingDetected}`);
    console.log(
      `- Discipline Specialization: ${result.breedingAnalysis.lineage.disciplineSpecialization}`,
    );

    console.log('\nApplied Traits:');
    console.log(`- Positive: ${result.traits.positive.join(', ') || 'None'}`);
    console.log(`- Negative: ${result.traits.negative.join(', ') || 'None'}`);
    console.log(`- Hidden: ${result.traits.hidden.join(', ') || 'None'}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Example 2: Poor Breeding Conditions
console.log('\n📉 Example 2: Poor Breeding Conditions');
console.log('High mare stress, poor feed quality');

async function poorBreedingExample() {
  try {
    const breedingData = {
      sireId: 3,
      damId: 4,
      mareStress: 85, // Very high stress
      feedQuality: 25, // Poor feed quality
    };

    const result = await applyEpigeneticTraitsAtBirth(breedingData);

    console.log('Breeding Analysis:');
    console.log(`- Mare Stress: ${result.breedingAnalysis.conditions.mareStress}`);
    console.log(`- Feed Quality: ${result.breedingAnalysis.conditions.feedQuality}`);

    console.log('\nApplied Traits:');
    console.log(`- Positive: ${result.traits.positive.join(', ') || 'None'}`);
    console.log(`- Negative: ${result.traits.negative.join(', ') || 'None'}`);
    console.log(`- Hidden: ${result.traits.hidden.join(', ') || 'None'}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Example 3: Horse Creation with At-Birth Traits
console.log('\n🏇 Example 3: Horse Creation with At-Birth Traits');
console.log('Creating a newborn foal with automatic trait application');

async function horseCreationExample() {
  try {
    const horseData = {
      name: 'Starlight Foal',
      age: 0, // Newborn
      breedId: 1,
      sire_id: 5, // Has parents - triggers at-birth traits
      dam_id: 6,
      mareStress: 20, // Good conditions
      feedQuality: 80,
      sex: 'filly',
      health_status: 'Excellent',
    };

    console.log('Creating horse with data:');
    console.log(`- Name: ${horseData.name}`);
    console.log(`- Age: ${horseData.age} (newborn)`);
    console.log(`- Sire ID: ${horseData.sire_id}`);
    console.log(`- Dam ID: ${horseData.dam_id}`);
    console.log(`- Mare Stress: ${horseData.mareStress}`);
    console.log(`- Feed Quality: ${horseData.feedQuality}`);

    const horse = await createHorse(horseData);

    console.log('\nCreated horse with traits:');
    console.log(`- Horse ID: ${horse.id}`);
    console.log(`- Positive Traits: ${horse.epigenetic_modifiers.positive.join(', ') || 'None'}`);
    console.log(`- Negative Traits: ${horse.epigenetic_modifiers.negative.join(', ') || 'None'}`);
    console.log(`- Hidden Traits: ${horse.epigenetic_modifiers.hidden.join(', ') || 'None'}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Example 4: Trait Definitions Overview
console.log('\n📋 Example 4: Available At-Birth Traits');

function showTraitDefinitions() {
  console.log('\nPositive Traits:');
  Object.entries(AT_BIRTH_TRAITS.positive).forEach(([traitKey, trait]) => {
    console.log(`- ${trait.name} (${traitKey}): ${trait.description}`);
    console.log(`  Probability: ${(trait.probability * 100).toFixed(0)}%`);
    console.log(`  Conditions: ${JSON.stringify(trait.conditions)}`);
  });

  console.log('\nNegative Traits:');
  Object.entries(AT_BIRTH_TRAITS.negative).forEach(([traitKey, trait]) => {
    console.log(`- ${trait.name} (${traitKey}): ${trait.description}`);
    console.log(`  Probability: ${(trait.probability * 100).toFixed(0)}%`);
    console.log(`  Conditions: ${JSON.stringify(trait.conditions)}`);
  });
}

// Example 5: Condition Testing
console.log('\n🧪 Example 5: Condition Testing');
console.log('Testing different breeding scenarios');

function testBreedingScenarios() {
  const scenarios = [
    {
      name: 'Premium Care',
      conditions: { mareStress: 5, feedQuality: 95, inbreedingDetected: false },
      expectedTraits: ['hardy', 'premium_care', 'well_bred'],
    },
    {
      name: 'Inbred Line',
      conditions: { mareStress: 30, feedQuality: 60, inbreedingDetected: true },
      expectedTraits: ['inbred'],
    },
    {
      name: 'Stressed Mare',
      conditions: { mareStress: 75, feedQuality: 45, inbreedingDetected: false },
      expectedTraits: ['stressed_lineage', 'weak_constitution'],
    },
    {
      name: 'Poor Nutrition',
      conditions: { mareStress: 40, feedQuality: 20, inbreedingDetected: false },
      expectedTraits: ['poor_nutrition'],
    },
  ];

  scenarios.forEach(scenario => {
    console.log(`\n${scenario.name}:`);
    console.log(`- Conditions: ${JSON.stringify(scenario.conditions)}`);
    console.log(`- Likely Traits: ${scenario.expectedTraits.join(', ')}`);

    // Test which traits would be eligible
    const eligibleTraits = [];

    Object.entries(AT_BIRTH_TRAITS.positive).forEach(([key, trait]) => {
      if (evaluateConditions(trait.conditions, scenario.conditions)) {
        eligibleTraits.push(`${key} (${(trait.probability * 100).toFixed(0)}%)`);
      }
    });

    Object.entries(AT_BIRTH_TRAITS.negative).forEach(([key, trait]) => {
      if (evaluateConditions(trait.conditions, scenario.conditions)) {
        eligibleTraits.push(`${key} (${(trait.probability * 100).toFixed(0)}%)`);
      }
    });

    console.log(`- Eligible Traits: ${eligibleTraits.join(', ') || 'None'}`);
  });
}

// Helper function to evaluate conditions (simplified version)
function evaluateConditions(traitConditions, actualConditions) {
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
      case 'inbreedingDetected':
        if (actualConditions.inbreedingDetected !== requirement) {
          return false;
        }
        break;
      case 'noInbreeding':
        if (actualConditions.inbreedingDetected === requirement) {
          return false;
        }
        break;
    }
  }
  return true;
}

// Run examples
async function runExamples() {
  try {
    await optimalBreedingExample();
    await poorBreedingExample();
    await horseCreationExample();
    showTraitDefinitions();
    testBreedingScenarios();

    console.log('\n✅ All examples completed successfully!');
    console.log('\n📝 Key Takeaways:');
    console.log(
      '- At-birth traits are automatically applied to newborn horses (age 0) with parents',
    );
    console.log('- Mare stress and feed quality significantly impact trait probability');
    console.log('- Inbreeding detection prevents genetic complications');
    console.log('- Lineage analysis can provide specialized discipline advantages');
    console.log('- Traits can be positive, negative, or hidden at birth');
  } catch (error) {
    console.error('Error running examples:', error.message);
  }
}

// Export for use in other files
export {
  optimalBreedingExample,
  poorBreedingExample,
  horseCreationExample,
  showTraitDefinitions,
  testBreedingScenarios,
  runExamples,
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}
