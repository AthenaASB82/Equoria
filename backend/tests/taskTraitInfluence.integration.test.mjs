/**
 * Task-Trait Influence Integration Test
 * Tests the integration between task influence mapping and trait evaluation systems
 *
 * 🎯 FEATURES TESTED:
 * - Integration between task influence map and trait evaluation
 * - Trait point accumulation affecting epigenetic development
 * - Real-world foal development scenarios with task progression
 * - Business rule validation across multiple systems
 * - Task completion tracking and trait probability influence
 *
 * 🔧 DEPENDENCIES:
 * - taskInfluenceConfig.js (task influence mapping)
 * - traitEvaluation.js (trait evaluation system)
 * - groomConfig.js (task category definitions)
 * - epigeneticTraits.js (trait definitions)
 *
 * 📋 BUSINESS RULES TESTED:
 * - Task completions accumulate trait points over time
 * - Trait points influence probability of trait expression
 * - Different tasks contribute to different trait development paths
 * - Foal development progression from enrichment to grooming tasks
 * - Integration between daily task exclusivity and trait development
 *
 * 🧪 TESTING APPROACH:
 * - Mock: None (testing real integration between systems)
 * - Real: All task mappings, trait calculations, business logic
 */

import { describe, it, expect } from '@jest/globals';
import {
  TASK_TRAIT_INFLUENCE_MAP,
  calculateTraitPoints,
  getTasksInfluencingTrait,
  getAllInfluencedTraits,
} from '../config/taskInfluenceConfig.mjs';
import { ELIGIBLE_FOAL_ENRICHMENT_TASKS, FOAL_GROOMING_TASKS } from '../config/groomConfig.mjs';

describe('Task-Trait Influence Integration', () => {
  describe('System Integration Validation', () => {
    it('should have complete coverage of foal tasks', () => {
      const allFoalTasks = [...ELIGIBLE_FOAL_ENRICHMENT_TASKS, ...FOAL_GROOMING_TASKS];
      const influenceMapTasks = Object.keys(TASK_TRAIT_INFLUENCE_MAP);

      expect(influenceMapTasks.sort()).toEqual(allFoalTasks.sort());
    });

    it('should provide logical trait development progression', () => {
      // Early enrichment tasks should focus on foundational traits
      const enrichmentTraits = new Set();
      ELIGIBLE_FOAL_ENRICHMENT_TASKS.forEach(task => {
        TASK_TRAIT_INFLUENCE_MAP[task].traits.forEach(trait => {
          enrichmentTraits.add(trait);
        });
      });

      // Should include foundational traits
      expect(enrichmentTraits.has('confident')).toBe(true);
      expect(enrichmentTraits.has('bonded')).toBe(true);
      expect(enrichmentTraits.has('resilient')).toBe(true);

      // Later grooming tasks should focus on presentation traits
      const groomingTraits = new Set();
      FOAL_GROOMING_TASKS.forEach(task => {
        TASK_TRAIT_INFLUENCE_MAP[task].traits.forEach(trait => {
          groomingTraits.add(trait);
        });
      });

      // Should include presentation and handling traits
      expect(groomingTraits.has('show_calm')).toBe(true);
      expect(groomingTraits.has('presentation_boosted')).toBe(true);
      expect(groomingTraits.has('calm')).toBe(true);
    });
  });

  describe('Trait Point Accumulation Scenarios', () => {
    it('should calculate trait points for early foal development (0-1 years)', () => {
      // Simulate early enrichment-focused development
      const taskCompletions = {
        trust_building: 5, // 5 days of trust building
        desensitization: 3, // 3 days of desensitization
        early_touch: 2, // 2 days of early touch (overlap period)
      };

      const traitPoints = calculateTraitPoints(taskCompletions);

      // Verify foundational trait development
      expect(traitPoints.bonded).toBe(25); // trust_building: 5 * 5
      expect(traitPoints.resilient).toBe(25); // trust_building: 5 * 5
      expect(traitPoints.confident).toBe(15); // desensitization: 3 * 5
      expect(traitPoints.calm).toBe(10); // early_touch: 2 * 5
    });

    it('should calculate trait points for middle development (1-2 years)', () => {
      // Simulate mixed enrichment and grooming development
      const taskCompletions = {
        trust_building: 3,
        showground_exposure: 2,
        early_touch: 4,
        hoof_handling: 2,
      };

      const traitPoints = calculateTraitPoints(taskCompletions);

      // Verify balanced development
      expect(traitPoints.bonded).toBe(15); // trust_building: 3 * 5
      expect(traitPoints.resilient).toBe(15); // trust_building: 3 * 5
      expect(traitPoints.confident).toBe(10); // showground_exposure: 2 * 5
      expect(traitPoints.crowd_ready).toBe(10); // showground_exposure: 2 * 5
      expect(traitPoints.calm).toBe(20); // early_touch: 4 * 5
      expect(traitPoints.show_calm).toBe(10); // hoof_handling: 2 * 5
    });

    it('should calculate trait points for advanced development (2-3 years)', () => {
      // Simulate grooming-focused development
      const taskCompletions = {
        hoof_handling: 4,
        tying_practice: 3,
        sponge_bath: 2,
        coat_check: 3,
        mane_tail_grooming: 2,
      };

      const traitPoints = calculateTraitPoints(taskCompletions);

      // Verify presentation-focused development
      expect(traitPoints.show_calm).toBe(45); // hoof_handling(4) + tying_practice(3) + sponge_bath(2) = 9 * 5
      expect(traitPoints.presentation_boosted).toBe(35); // sponge_bath(2) + coat_check(3) + mane_tail_grooming(2) = 7 * 5
    });
  });

  describe('Real-World Development Scenarios', () => {
    it('should support comprehensive foal development progression', () => {
      // Simulate 3-year development progression
      const fullDevelopmentTasks = {
        // Year 1: Enrichment focus
        trust_building: 8,
        desensitization: 6,

        // Year 2: Mixed development
        showground_exposure: 4,
        early_touch: 6,
        hoof_handling: 3,

        // Year 3: Presentation focus
        tying_practice: 5,
        sponge_bath: 4,
        coat_check: 6,
        mane_tail_grooming: 3,
      };

      const traitPoints = calculateTraitPoints(fullDevelopmentTasks);

      // Verify comprehensive trait development
      expect(traitPoints.bonded).toBe(40); // trust_building: 8 * 5
      expect(traitPoints.resilient).toBe(40); // trust_building: 8 * 5
      expect(traitPoints.confident).toBe(50); // desensitization(6) + showground_exposure(4) = 10 * 5
      expect(traitPoints.crowd_ready).toBe(20); // showground_exposure: 4 * 5
      expect(traitPoints.calm).toBe(30); // early_touch: 6 * 5
      expect(traitPoints.show_calm).toBe(60); // hoof_handling(3) + tying_practice(5) + sponge_bath(4) = 12 * 5
      expect(traitPoints.presentation_boosted).toBe(65); // sponge_bath(4) + coat_check(6) + mane_tail_grooming(3) = 13 * 5

      // Verify balanced development across all trait categories
      expect(Object.keys(traitPoints)).toHaveLength(7);
    });

    it('should handle specialized development paths', () => {
      // Simulate confidence-focused development
      const confidenceFocusedTasks = {
        desensitization: 10,
        showground_exposure: 8,
      };

      const confidencePoints = calculateTraitPoints(confidenceFocusedTasks);
      expect(confidencePoints.confident).toBe(90); // (10 + 8) * 5

      // Simulate presentation-focused development
      const presentationFocusedTasks = {
        sponge_bath: 6,
        coat_check: 8,
        mane_tail_grooming: 5,
      };

      const presentationPoints = calculateTraitPoints(presentationFocusedTasks);
      expect(presentationPoints.presentation_boosted).toBe(95); // (6 + 8 + 5) * 5
    });
  });

  describe('Trait Influence Analysis', () => {
    it('should identify tasks that develop specific traits', () => {
      // Test confidence development
      const confidenceTasks = getTasksInfluencingTrait('confident');
      expect(confidenceTasks).toContain('desensitization');
      expect(confidenceTasks).toContain('showground_exposure');
      expect(confidenceTasks).toHaveLength(2);

      // Test show calmness development
      const showCalmTasks = getTasksInfluencingTrait('show_calm');
      expect(showCalmTasks).toContain('hoof_handling');
      expect(showCalmTasks).toContain('tying_practice');
      expect(showCalmTasks).toContain('sponge_bath');
      expect(showCalmTasks).toHaveLength(3);

      // Test presentation development
      const presentationTasks = getTasksInfluencingTrait('presentation_boosted');
      expect(presentationTasks).toContain('sponge_bath');
      expect(presentationTasks).toContain('coat_check');
      expect(presentationTasks).toContain('mane_tail_grooming');
      expect(presentationTasks).toHaveLength(3);
    });

    it('should provide complete trait coverage', () => {
      const allTraits = getAllInfluencedTraits();

      // Should include all expected trait categories
      expect(allTraits).toContain('bonded');
      expect(allTraits).toContain('calm');
      expect(allTraits).toContain('confident');
      expect(allTraits).toContain('crowd_ready');
      expect(allTraits).toContain('presentation_boosted');
      expect(allTraits).toContain('resilient');
      expect(allTraits).toContain('show_calm');

      // Should have reasonable number of traits
      expect(allTraits.length).toBeGreaterThanOrEqual(6);
      expect(allTraits.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Business Rule Validation', () => {
    it('should enforce consistent daily values across all tasks', () => {
      const dailyValues = Object.values(TASK_TRAIT_INFLUENCE_MAP).map(
        influence => influence.dailyValue,
      );
      const uniqueValues = [...new Set(dailyValues)];

      expect(uniqueValues).toHaveLength(1);
      expect(uniqueValues[0]).toBe(5);
    });

    it('should support meaningful trait point accumulation', () => {
      // Test that daily values provide meaningful progression
      const singleTaskCompletion = calculateTraitPoints({ trust_building: 1 });
      expect(singleTaskCompletion.bonded).toBe(5);
      expect(singleTaskCompletion.resilient).toBe(5);

      // Test that multiple completions scale appropriately
      const multipleCompletions = calculateTraitPoints({ trust_building: 10 });
      expect(multipleCompletions.bonded).toBe(50);
      expect(multipleCompletions.resilient).toBe(50);
    });

    it('should provide balanced trait development opportunities', () => {
      // Count how many tasks influence each trait
      const traitTaskCounts = {};

      Object.values(TASK_TRAIT_INFLUENCE_MAP).forEach(influence => {
        influence.traits.forEach(trait => {
          traitTaskCounts[trait] = (traitTaskCounts[trait] || 0) + 1;
        });
      });

      // No trait should be overly dominant or neglected
      Object.values(traitTaskCounts).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(1); // At least one task per trait
        expect(count).toBeLessThanOrEqual(4); // No more than 4 tasks per trait
      });
    });
  });

  describe('Development Stage Integration', () => {
    it('should align with foal development stages', () => {
      // Enrichment tasks (0-2 years) should focus on foundational traits
      const enrichmentInfluences = ELIGIBLE_FOAL_ENRICHMENT_TASKS.map(
        task => TASK_TRAIT_INFLUENCE_MAP[task].traits,
      ).flat();

      expect(enrichmentInfluences).toContain('confident');
      expect(enrichmentInfluences).toContain('bonded');
      expect(enrichmentInfluences).toContain('resilient');
      expect(enrichmentInfluences).toContain('crowd_ready');

      // Grooming tasks (1-3 years) should focus on handling and presentation
      const groomingInfluences = FOAL_GROOMING_TASKS.map(
        task => TASK_TRAIT_INFLUENCE_MAP[task].traits,
      ).flat();

      expect(groomingInfluences).toContain('calm');
      expect(groomingInfluences).toContain('show_calm');
      expect(groomingInfluences).toContain('presentation_boosted');
    });

    it('should support age-appropriate task progression', () => {
      // Early tasks should build foundation
      expect(TASK_TRAIT_INFLUENCE_MAP.trust_building.traits).toContain('bonded');
      expect(TASK_TRAIT_INFLUENCE_MAP.desensitization.traits).toContain('confident');

      // Middle tasks should bridge foundation to presentation
      expect(TASK_TRAIT_INFLUENCE_MAP.early_touch.traits).toContain('calm');
      expect(TASK_TRAIT_INFLUENCE_MAP.showground_exposure.traits).toContain('crowd_ready');

      // Advanced tasks should focus on presentation
      expect(TASK_TRAIT_INFLUENCE_MAP.coat_check.traits).toContain('presentation_boosted');
      expect(TASK_TRAIT_INFLUENCE_MAP.mane_tail_grooming.traits).toContain('presentation_boosted');
    });
  });
});
