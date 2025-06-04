/**
 * Epigenetic Traits Calculation System
 * Determines offspring traits based on parent genetics and environmental factors
 */

// Seeded random number generator for deterministic testing
class SeededRandom {
  constructor(seed) {
    this.seed = seed || Math.floor(Math.random() * 1000000);
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Trait definitions and their properties
const TRAIT_DEFINITIONS = {
  // Positive traits - Common
  resilient: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['fragile'],
    description: 'Less likely to be affected by stress.',
    category: 'epigenetic',
  },
  bold: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['nervous'],
    description: 'Shows courage in challenging situations.',
    category: 'epigenetic',
  },
  intelligent: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['lazy'],
    description: 'Learns faster and retains training better.',
    category: 'epigenetic',
  },
  athletic: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['fragile', 'lazy'],
    description: 'Enhanced physical performance and stamina.',
    category: 'epigenetic',
  },
  calm: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['nervous', 'aggressive'],
    description: 'Maintains composure in stressful situations.',
    category: 'epigenetic',
  },

  // Positive traits - Epigenetic (from foal development)
  confident: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['nervous'],
    description: 'This horse is brave in new situations.',
    category: 'epigenetic',
  },
  bonded: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['aggressive'],
    description: 'Forms deeper trust with specific handlers.',
    category: 'bond',
  },

  // Positive traits - Situational (from specific training)
  presentation_boosted: {
    type: 'positive',
    rarity: 'common',
    conflicts: [],
    description: 'Scores higher in appearance-based events.',
    category: 'situational',
  },
  show_calm: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['nervous'],
    description: 'Remains composed during competitions and shows.',
    category: 'situational',
  },
  crowd_ready: {
    type: 'positive',
    rarity: 'common',
    conflicts: ['nervous'],
    description: 'Comfortable performing in front of large audiences.',
    category: 'situational',
  },

  // Positive traits - Rare
  trainability_boost: {
    type: 'positive',
    rarity: 'rare',
    conflicts: ['stubborn'],
    description: 'Exceptional learning ability and training response.',
    category: 'epigenetic',
  },

  // Negative traits
  nervous: {
    type: 'negative',
    rarity: 'common',
    conflicts: ['bold', 'calm', 'confident', 'show_calm', 'crowd_ready'],
    description: 'Easily startled and stressed by new situations.',
    category: 'epigenetic',
  },
  stubborn: {
    type: 'negative',
    rarity: 'common',
    conflicts: ['trainability_boost'],
    description: 'Resistant to training and new commands.',
    category: 'epigenetic',
  },
  fragile: {
    type: 'negative',
    rarity: 'common',
    conflicts: ['resilient', 'athletic'],
    description: 'More susceptible to injury and stress.',
    category: 'epigenetic',
  },
  aggressive: {
    type: 'negative',
    rarity: 'common',
    conflicts: ['calm', 'bonded'],
    description: 'Difficult to handle and may show hostility.',
    category: 'epigenetic',
  },
  lazy: {
    type: 'negative',
    rarity: 'common',
    conflicts: ['intelligent', 'athletic'],
    description: 'Low motivation and energy for training.',
    category: 'epigenetic',
  },

  // Rare traits (usually hidden)
  legendary_bloodline: {
    type: 'positive',
    rarity: 'legendary',
    conflicts: [],
    description: 'Exceptional heritage with legendary performance potential.',
    category: 'epigenetic',
  },
  weather_immunity: {
    type: 'positive',
    rarity: 'rare',
    conflicts: [],
    description: 'Unaffected by weather conditions during events.',
    category: 'epigenetic',
  },
  fire_resistance: {
    type: 'positive',
    rarity: 'rare',
    conflicts: [],
    description: 'Enhanced tolerance to heat and fire-related stress.',
    category: 'epigenetic',
  },
  water_phobia: {
    type: 'negative',
    rarity: 'rare',
    conflicts: [],
    description: 'Extreme fear of water and water-related activities.',
    category: 'epigenetic',
  },
  night_vision: {
    type: 'positive',
    rarity: 'rare',
    conflicts: [],
    description: 'Enhanced performance during night events.',
    category: 'epigenetic',
  },
};

// Environmental trait pools that can emerge based on conditions
const ENVIRONMENTAL_TRAITS = {
  positive: ['resilient', 'calm', 'intelligent', 'confident', 'bonded'],
  negative: ['nervous', 'fragile', 'lazy'],
  rare: ['weather_immunity', 'night_vision', 'legendary_bloodline'],
  situational: ['presentation_boosted', 'show_calm', 'crowd_ready'],
};

/**
 * Validates input parameters for trait calculation
 * @param {Object} params - Breeding parameters
 * @throws {Error} If validation fails
 */
function validateInput(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('Missing required breeding parameters');
  }

  const { damTraits, sireTraits, damBondScore, damStressLevel } = params;

  // Check required parameters
  if (
    damTraits === undefined ||
    sireTraits === undefined ||
    damBondScore === undefined ||
    damStressLevel === undefined
  ) {
    throw new Error('Missing required breeding parameters');
  }

  // Validate trait arrays
  if (!Array.isArray(damTraits) || !Array.isArray(sireTraits)) {
    throw new Error('Parent traits must be arrays');
  }

  // Validate numeric values
  if (typeof damBondScore !== 'number' || typeof damStressLevel !== 'number') {
    throw new Error('Bond scores and stress levels must be numbers');
  }

  // Validate ranges
  if (damBondScore < 0 || damBondScore > 100 || damStressLevel < 0 || damStressLevel > 100) {
    throw new Error('Bond scores must be between 0-100, stress levels between 0-100');
  }
}

/**
 * Calculates inheritance probability for a trait based on environmental factors
 * @param {string} trait - Trait to calculate probability for
 * @param {number} bondScore - Dam bonding score (0-100)
 * @param {number} stressLevel - Dam stress level (0-100)
 * @returns {number} Probability (0-1)
 */
function calculateInheritanceProbability(trait, bondScore, stressLevel) {
  const traitDef = TRAIT_DEFINITIONS[trait];
  if (!traitDef) {
    return 0.3;
  } // Default for unknown traits

  let baseProbability = 0.4; // Base 40% chance

  // Adjust for trait rarity
  switch (traitDef.rarity) {
    case 'common':
      baseProbability = 0.5;
      break;
    case 'rare':
      baseProbability = 0.15;
      break;
    case 'legendary':
      baseProbability = 0.05;
      break;
  }

  // Environmental modifiers
  if (traitDef.type === 'positive') {
    // High bonding increases positive trait probability
    baseProbability += (bondScore - 50) * 0.004; // +/-20% max
    // High stress decreases positive trait probability
    baseProbability -= (stressLevel - 50) * 0.003; // +/-15% max
  } else if (traitDef.type === 'negative') {
    // High bonding decreases negative trait probability
    baseProbability -= (bondScore - 50) * 0.003; // +/-15% max
    // High stress increases negative trait probability
    baseProbability += (stressLevel - 50) * 0.004; // +/-20% max
  }

  // Ensure probability stays within bounds
  return Math.max(0, Math.min(1, baseProbability));
}

/**
 * Determines if traits conflict with each other
 * @param {string} trait1 - First trait
 * @param {string} trait2 - Second trait
 * @returns {boolean} True if traits conflict
 */
function traitsConflict(trait1, trait2) {
  const def1 = TRAIT_DEFINITIONS[trait1];
  const def2 = TRAIT_DEFINITIONS[trait2];

  if (!def1 || !def2) {
    return false;
  }

  return def1.conflicts.includes(trait2) || def2.conflicts.includes(trait1);
}

/**
 * Removes conflicting traits from a trait list
 * @param {string[]} traits - List of traits to check
 * @returns {string[]} Filtered trait list without conflicts
 */
function removeConflictingTraits(traits) {
  const filtered = [];

  for (const trait of traits) {
    const hasConflict = filtered.some(existingTrait => traitsConflict(trait, existingTrait));
    if (!hasConflict) {
      filtered.push(trait);
    }
  }

  return filtered;
}

/**
 * Generates environmental traits based on breeding conditions
 * @param {number} bondScore - Dam bonding score
 * @param {number} stressLevel - Dam stress level
 * @param {SeededRandom} rng - Random number generator
 * @returns {Object} Generated environmental traits
 */
function generateEnvironmentalTraits(bondScore, stressLevel, rng) {
  const traits = { positive: [], negative: [], rare: [] };

  // Calculate environmental trait generation probability
  const environmentalFactor = (bondScore - stressLevel) / 100; // -1 to 1

  // Positive environmental traits (more likely with good conditions)
  if (environmentalFactor > 0.2 && rng.next() < 0.3) {
    const positivePool = ENVIRONMENTAL_TRAITS.positive;
    const randomTrait = positivePool[Math.floor(rng.next() * positivePool.length)];
    traits.positive.push(randomTrait);
  }

  // Negative environmental traits (more likely with poor conditions)
  if (environmentalFactor < -0.2 && rng.next() < 0.6) {
    const negativePool = ENVIRONMENTAL_TRAITS.negative;
    const randomTrait = negativePool[Math.floor(rng.next() * negativePool.length)];
    traits.negative.push(randomTrait);
  }

  // Additional negative trait generation for very high stress
  if (stressLevel > 80 && rng.next() < 0.3) {
    const negativePool = ENVIRONMENTAL_TRAITS.negative;
    const randomTrait = negativePool[Math.floor(rng.next() * negativePool.length)];
    if (!traits.negative.includes(randomTrait)) {
      traits.negative.push(randomTrait);
    }
  }

  // Rare traits (very low probability, slightly higher with excellent conditions)
  const rareProbability = environmentalFactor > 0.5 ? 0.08 : 0.03;
  if (rng.next() < rareProbability) {
    const rarePool = ENVIRONMENTAL_TRAITS.rare;
    const randomTrait = rarePool[Math.floor(rng.next() * rarePool.length)];
    traits.rare.push(randomTrait);
  }

  return traits;
}

/**
 * Determines trait visibility (positive, negative, or hidden)
 * @param {string} trait - Trait to categorize
 * @param {number} bondScore - Dam bonding score
 * @param {number} stressLevel - Dam stress level
 * @param {SeededRandom} rng - Random number generator
 * @returns {string} 'positive', 'negative', or 'hidden'
 */
function determineTraitVisibility(trait, bondScore, stressLevel, rng) {
  const traitDef = TRAIT_DEFINITIONS[trait];
  if (!traitDef) {
    return 'positive';
  } // Default for unknown traits

  // Rare and legendary traits are usually hidden
  if (traitDef.rarity === 'rare' && rng.next() < 0.7) {
    return 'hidden';
  }
  if (traitDef.rarity === 'legendary' && rng.next() < 0.9) {
    return 'hidden';
  }

  // Environmental factors affect visibility
  const visibilityFactor = (bondScore - stressLevel) / 200; // -0.5 to 0.5

  // Poor conditions increase chance of traits being hidden
  if (visibilityFactor < -0.2 && rng.next() < 0.3) {
    return 'hidden';
  }

  // Return trait's natural type
  return traitDef.type;
}

/**
 * Main function to calculate epigenetic traits for offspring
 * @param {Object} params - Breeding parameters
 * @param {string[]} params.damTraits - Dam's traits
 * @param {string[]} params.sireTraits - Sire's traits
 * @param {number} params.damBondScore - Dam's bonding score (0-100)
 * @param {number} params.damStressLevel - Dam's stress level (0-100)
 * @param {number} [params.seed] - Optional seed for deterministic results
 * @returns {Object} Offspring traits { positive: [], negative: [], hidden: [] }
 */
export function calculateEpigeneticTraits(params) {
  // Validate input
  validateInput(params);

  const { damTraits, sireTraits, damBondScore, damStressLevel, seed } = params;

  // Initialize random number generator
  const rng = new SeededRandom(seed);

  // Collect all potential inherited traits
  const allParentTraits = [...new Set([...damTraits, ...sireTraits])];
  const inheritedTraits = [];

  // Process each parent trait for inheritance
  for (const trait of allParentTraits) {
    const probability = calculateInheritanceProbability(trait, damBondScore, damStressLevel);

    if (rng.next() < probability) {
      inheritedTraits.push(trait);
    }
  }

  // Generate environmental traits
  const environmentalTraits = generateEnvironmentalTraits(damBondScore, damStressLevel, rng);

  // Combine all potential traits
  const allPotentialTraits = [
    ...inheritedTraits,
    ...environmentalTraits.positive,
    ...environmentalTraits.negative,
    ...environmentalTraits.rare,
  ];

  // Remove conflicting traits
  const finalTraits = removeConflictingTraits(allPotentialTraits);

  // Categorize traits by visibility
  const result = { positive: [], negative: [], hidden: [] };

  for (const trait of finalTraits) {
    const visibility = determineTraitVisibility(trait, damBondScore, damStressLevel, rng);

    if (visibility === 'hidden') {
      result.hidden.push(trait);
    } else if (visibility === 'positive') {
      result.positive.push(trait);
    } else if (visibility === 'negative') {
      result.negative.push(trait);
    }
  }

  // Remove duplicates and sort for consistency
  result.positive = [...new Set(result.positive)].sort();
  result.negative = [...new Set(result.negative)].sort();
  result.hidden = [...new Set(result.hidden)].sort();

  return result;
}

/**
 * Get trait definition for a specific trait
 * @param {string} trait - Trait name
 * @returns {Object|null} Trait definition or null if not found
 */
export function getTraitDefinition(trait) {
  return TRAIT_DEFINITIONS[trait] || null;
}

/**
 * Get all available traits by type
 * @param {string} type - 'positive', 'negative', or 'all'
 * @returns {string[]} Array of trait names
 */
export function getTraitsByType(type = 'all') {
  const traits = Object.keys(TRAIT_DEFINITIONS);

  if (type === 'all') {
    return traits;
  }

  return traits.filter(trait => TRAIT_DEFINITIONS[trait].type === type);
}

/**
 * Get all available traits by category
 * @param {string} category - 'epigenetic', 'bond', 'situational', or 'all'
 * @returns {string[]} Array of trait names
 */
export function getTraitsByCategory(category = 'all') {
  const traits = Object.keys(TRAIT_DEFINITIONS);

  if (category === 'all') {
    return traits;
  }

  return traits.filter(trait => TRAIT_DEFINITIONS[trait].category === category);
}

/**
 * Get trait metadata including description and category
 * @param {string} trait - Trait name
 * @returns {Object|null} Trait metadata or null if not found
 */
export function getTraitMetadata(trait) {
  const definition = TRAIT_DEFINITIONS[trait];
  if (!definition) {
    return null;
  }

  return {
    name: trait,
    type: definition.type,
    category: definition.category,
    description: definition.description,
    rarity: definition.rarity,
    conflicts: [...definition.conflicts],
  };
}

/**
 * Check if two traits conflict with each other
 * @param {string} trait1 - First trait
 * @param {string} trait2 - Second trait
 * @returns {boolean} True if traits conflict
 */
export function checkTraitConflict(trait1, trait2) {
  return traitsConflict(trait1, trait2);
}
