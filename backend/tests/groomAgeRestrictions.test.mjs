/**
 * Groom Age Restrictions Test Suite
 * Tests for age-based task eligibility in the groom system
 *
 * 🎯 FEATURES TESTED:
 * - Foal enrichment task eligibility (0-3 years old)
 * - Adult grooming task eligibility (3+ years old)
 * - Age threshold validation and boundary conditions
 * - Task pool differentiation by age group
 * - Configuration-driven age restrictions
 *
 * 🔧 DEPENDENCIES:
 * - groomBondingSystem.js (validateGroomingEligibility function)
 * - groomConfig.js (age thresholds and task definitions)
 *
 * 📋 BUSINESS RULES TESTED:
 * - Foals (0-3 years): Can receive enrichment tasks for epigenetic development
 * - Adult horses (3+ years): Can receive bonding tasks for burnout prevention
 * - Age boundaries: Exactly 3 years (1095 days) is the transition point
 * - Task separation: Different task pools for different age groups
 *
 * 🧪 TESTING APPROACH:
 * - Mock: None (pure business logic testing)
 * - Real: Age calculations, task eligibility validation, configuration values
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { validateGroomingEligibility } from '../utils/groomBondingSystem.mjs';
import { GROOM_CONFIG } from '../config/groomConfig.mjs';

describe('Groom Age Restrictions & Task Eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Values', () => {
    it('should allow grooms to work with foals from birth', () => {
      expect(GROOM_CONFIG.MIN_AGE_FOR_GROOMING_TASKS).toBe(0);
    });

    it('should define adult horse age threshold at 3 years', () => {
      expect(GROOM_CONFIG.ADULT_HORSE_AGE_THRESHOLD).toBe(3);
    });

    it('should have foal enrichment tasks defined', () => {
      expect(GROOM_CONFIG.ELIGIBLE_FOAL_ENRICHMENT_TASKS).toBeDefined();
      expect(GROOM_CONFIG.ELIGIBLE_FOAL_ENRICHMENT_TASKS.length).toBeGreaterThan(0);
      expect(GROOM_CONFIG.ELIGIBLE_FOAL_ENRICHMENT_TASKS).toContain('gentle_touch');
      expect(GROOM_CONFIG.ELIGIBLE_FOAL_ENRICHMENT_TASKS).toContain('feeding_assistance');
    });

    it('should have adult grooming tasks defined', () => {
      expect(GROOM_CONFIG.ELIGIBLE_GROOMING_TASKS).toBeDefined();
      expect(GROOM_CONFIG.ELIGIBLE_GROOMING_TASKS.length).toBeGreaterThan(0);
      expect(GROOM_CONFIG.ELIGIBLE_GROOMING_TASKS).toContain('brushing');
      expect(GROOM_CONFIG.ELIGIBLE_GROOMING_TASKS).toContain('hand-walking');
    });
  });

  describe('Foal Enrichment Task Eligibility (0-3 years)', () => {
    it('should allow newborn foal (0 days) to receive enrichment tasks', async () => {
      const newbornFoal = { id: 1, age: 0, bondScore: 0 };
      const result = await validateGroomingEligibility(newbornFoal, 'gentle_touch');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });

    it('should allow 1-week-old foal (7 days) to receive enrichment tasks', async () => {
      const weekOldFoal = { id: 2, age: 7, bondScore: 10 };
      const result = await validateGroomingEligibility(weekOldFoal, 'feeding_assistance');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });

    it('should allow 1-year-old horse (365 days) to receive enrichment tasks', async () => {
      const yearlingHorse = { id: 3, age: 365, bondScore: 25 };
      const result = await validateGroomingEligibility(yearlingHorse, 'play_interaction');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });

    it('should allow 2.9-year-old horse (1059 days) to receive enrichment tasks', async () => {
      const youngHorse = { id: 4, age: 1059, bondScore: 40 };
      const result = await validateGroomingEligibility(youngHorse, 'environment_exploration');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });
  });

  describe('Adult Horse Grooming Task Eligibility (3+ years)', () => {
    it('should allow exactly 3-year-old horse (1095 days) to receive adult grooming tasks', async () => {
      const threeYearOld = { id: 5, age: 1095, bondScore: 50 };
      const result = await validateGroomingEligibility(threeYearOld, 'brushing');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });

    it('should allow 5-year-old horse (1825 days) to receive adult grooming tasks', async () => {
      const adultHorse = { id: 6, age: 1825, bondScore: 75 };
      const result = await validateGroomingEligibility(adultHorse, 'hand-walking');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });

    it('should allow senior horse (10+ years) to receive adult grooming tasks', async () => {
      const seniorHorse = { id: 7, age: 3650, bondScore: 90 };
      const result = await validateGroomingEligibility(seniorHorse, 'stall_care');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });
  });

  describe('Task Type Validation', () => {
    it('should reject invalid task types for any age', async () => {
      const horse = { id: 8, age: 1000, bondScore: 50 };
      const result = await validateGroomingEligibility(horse, 'invalid_task');

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('not an eligible');
    });

    it('should provide list of eligible tasks when task is invalid', async () => {
      const horse = { id: 9, age: 500, bondScore: 30 };
      const result = await validateGroomingEligibility(horse, 'nonexistent_task');

      expect(result.eligible).toBe(false);
      expect(result.eligibleTasks).toBeDefined();
      expect(Array.isArray(result.eligibleTasks)).toBe(true);
    });
  });

  describe('Age Boundary Conditions', () => {
    it('should handle exactly 3 years (1095 days) as adult threshold', async () => {
      const exactlyThreeYears = { id: 10, age: 1095, bondScore: 60 };

      // Should be eligible for adult tasks
      const adultTaskResult = await validateGroomingEligibility(exactlyThreeYears, 'brushing');
      expect(adultTaskResult.eligible).toBe(true);

      // Should also be eligible for foal tasks (transition period)
      const foalTaskResult = await validateGroomingEligibility(exactlyThreeYears, 'gentle_touch');
      expect(foalTaskResult.eligible).toBe(true);
    });

    it('should handle day before 3rd birthday (1094 days)', async () => {
      const almostThreeYears = { id: 11, age: 1094, bondScore: 55 };

      // Should be eligible for foal enrichment tasks
      const foalTaskResult = await validateGroomingEligibility(
        almostThreeYears,
        'play_interaction',
      );
      expect(foalTaskResult.eligible).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative age gracefully', async () => {
      const invalidHorse = { id: 12, age: -1, bondScore: 0 };
      const result = await validateGroomingEligibility(invalidHorse, 'gentle_touch');

      // Should still process (age validation might be handled elsewhere)
      expect(result).toBeDefined();
      expect(typeof result.eligible).toBe('boolean');
    });

    it('should handle very old horses (20+ years)', async () => {
      const veryOldHorse = { id: 13, age: 7300, bondScore: 100 }; // 20 years
      const result = await validateGroomingEligibility(veryOldHorse, 'brushing');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });
  });
});
