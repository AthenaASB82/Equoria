/**
 * Groom Configuration Test Suite
 * Tests for foal task categories and age-based task eligibility
 *
 * 🎯 FEATURES TESTED:
 * - Foal enrichment tasks (0-2 years) for epigenetic trait development
 * - Foal grooming tasks (1-3 years) for visual prep and bonding
 * - Task category definitions and mutual exclusivity
 * - Age-based task eligibility validation
 * - Configuration constants and environment overrides
 *
 * 🔧 DEPENDENCIES:
 * - groomConfig.js (configuration constants)
 *
 * 📋 BUSINESS RULES TESTED:
 * - Enrichment tasks: desensitization, trust_building, showground_exposure
 * - Grooming tasks: early_touch, hoof_handling, tying_practice, sponge_bath, coat_check, mane_tail_grooming
 * - Age restrictions: 0-2 enrichment, 1-3 grooming, 3+ general
 * - Task categories for mutual exclusivity enforcement
 *
 * 🧪 TESTING APPROACH:
 * - Mock: Environment variables (when testing overrides)
 * - Real: Configuration values, task arrays, age calculations
 */

import { describe, it, expect } from '@jest/globals';
import {
  GROOM_CONFIG,
  ELIGIBLE_FOAL_ENRICHMENT_TASKS,
  FOAL_GROOMING_TASKS,
} from '../config/groomConfig.mjs';

describe('Groom Configuration', () => {
  describe('Foal Task Categories', () => {
    describe('Enrichment Tasks (0-2 years)', () => {
      it('should define correct enrichment tasks for early development', () => {
        expect(ELIGIBLE_FOAL_ENRICHMENT_TASKS).toEqual([
          'desensitization',
          'trust_building',
          'showground_exposure',
        ]);
      });

      it('should have exactly 3 enrichment tasks', () => {
        expect(ELIGIBLE_FOAL_ENRICHMENT_TASKS).toHaveLength(3);
      });

      it('should contain only string values', () => {
        ELIGIBLE_FOAL_ENRICHMENT_TASKS.forEach(task => {
          expect(typeof task).toBe('string');
          expect(task.length).toBeGreaterThan(0);
        });
      });

      it('should not contain any grooming tasks', () => {
        const groomingTasks = FOAL_GROOMING_TASKS;
        ELIGIBLE_FOAL_ENRICHMENT_TASKS.forEach(enrichmentTask => {
          expect(groomingTasks).not.toContain(enrichmentTask);
        });
      });
    });

    describe('Foal Grooming Tasks (1-3 years)', () => {
      it('should define correct grooming tasks for handling preparation', () => {
        expect(FOAL_GROOMING_TASKS).toEqual([
          'early_touch',
          'hoof_handling',
          'tying_practice',
          'sponge_bath',
          'coat_check',
          'mane_tail_grooming',
        ]);
      });

      it('should have exactly 6 grooming tasks', () => {
        expect(FOAL_GROOMING_TASKS).toHaveLength(6);
      });

      it('should contain only string values', () => {
        FOAL_GROOMING_TASKS.forEach(task => {
          expect(typeof task).toBe('string');
          expect(task.length).toBeGreaterThan(0);
        });
      });

      it('should not contain any enrichment tasks', () => {
        const enrichmentTasks = ELIGIBLE_FOAL_ENRICHMENT_TASKS;
        FOAL_GROOMING_TASKS.forEach(groomingTask => {
          expect(enrichmentTasks).not.toContain(groomingTask);
        });
      });
    });

    describe('Task Category Separation', () => {
      it('should have no overlap between enrichment and grooming tasks', () => {
        const enrichmentSet = new Set(ELIGIBLE_FOAL_ENRICHMENT_TASKS);
        const groomingSet = new Set(FOAL_GROOMING_TASKS);

        // Check for intersection
        const intersection = [...enrichmentSet].filter(task => groomingSet.has(task));
        expect(intersection).toHaveLength(0);
      });

      it('should have all tasks be unique within each category', () => {
        // Check enrichment tasks for duplicates
        const enrichmentSet = new Set(ELIGIBLE_FOAL_ENRICHMENT_TASKS);
        expect(enrichmentSet.size).toBe(ELIGIBLE_FOAL_ENRICHMENT_TASKS.length);

        // Check grooming tasks for duplicates
        const groomingSet = new Set(FOAL_GROOMING_TASKS);
        expect(groomingSet.size).toBe(FOAL_GROOMING_TASKS.length);
      });
    });
  });

  describe('Configuration Constants', () => {
    it('should have correct age thresholds for task eligibility', () => {
      expect(GROOM_CONFIG.FOAL_ENRICHMENT_MAX_AGE).toBe(2);
      expect(GROOM_CONFIG.FOAL_GROOMING_MIN_AGE).toBe(1);
      expect(GROOM_CONFIG.FOAL_GROOMING_MAX_AGE).toBe(3);
      expect(GROOM_CONFIG.GENERAL_GROOMING_MIN_AGE).toBe(3);
    });

    it('should have task category definitions', () => {
      expect(GROOM_CONFIG.TASK_CATEGORIES.ENRICHMENT).toBe('enrichment');
      expect(GROOM_CONFIG.TASK_CATEGORIES.GROOMING).toBe('grooming');
    });

    it('should have bonding and streak configuration', () => {
      expect(GROOM_CONFIG.BOND_SCORE_START).toBe(0);
      expect(GROOM_CONFIG.BOND_SCORE_MAX).toBe(100);
      expect(GROOM_CONFIG.DAILY_BOND_GAIN).toBe(2);
      expect(GROOM_CONFIG.FOAL_STREAK_BONUS_THRESHOLD).toBe(7);
      expect(GROOM_CONFIG.FOAL_STREAK_GRACE_DAYS).toBe(2);
    });
  });

  describe('Age-Based Task Eligibility Logic', () => {
    it('should allow enrichment tasks for ages 0-2', () => {
      // Ages 0, 1, 2 should be eligible for enrichment
      for (let age = 0; age <= 2; age++) {
        expect(age <= GROOM_CONFIG.FOAL_ENRICHMENT_MAX_AGE).toBe(true);
      }

      // Age 3+ should not be eligible for enrichment only
      expect(GROOM_CONFIG.FOAL_ENRICHMENT_MAX_AGE >= 3).toBe(false);
    });

    it('should allow grooming tasks for ages 1-3', () => {
      // Age 0 should not be eligible for grooming
      expect(GROOM_CONFIG.FOAL_GROOMING_MIN_AGE <= 0).toBe(false);

      // Ages 1, 2, 3 should be eligible for grooming
      for (let age = 1; age <= 3; age++) {
        expect(
          age >= GROOM_CONFIG.FOAL_GROOMING_MIN_AGE && age <= GROOM_CONFIG.FOAL_GROOMING_MAX_AGE,
        ).toBe(true);
      }

      // Age 4+ should not be eligible for foal grooming
      expect(GROOM_CONFIG.FOAL_GROOMING_MAX_AGE >= 4).toBe(false);
    });

    it('should allow general grooming tasks for ages 3+', () => {
      // Ages 0, 1, 2 should not be eligible for general grooming
      for (let age = 0; age < 3; age++) {
        expect(age >= GROOM_CONFIG.GENERAL_GROOMING_MIN_AGE).toBe(false);
      }

      // Ages 3+ should be eligible for general grooming
      for (let age = 3; age <= 10; age++) {
        expect(age >= GROOM_CONFIG.GENERAL_GROOMING_MIN_AGE).toBe(true);
      }
    });

    it('should have overlap period for ages 1-3 (both enrichment and grooming)', () => {
      // Ages 1 and 2 should be eligible for BOTH enrichment and grooming
      for (let age = 1; age <= 2; age++) {
        const canEnrichment = age <= GROOM_CONFIG.FOAL_ENRICHMENT_MAX_AGE;
        const canGrooming =
          age >= GROOM_CONFIG.FOAL_GROOMING_MIN_AGE && age <= GROOM_CONFIG.FOAL_GROOMING_MAX_AGE;

        expect(canEnrichment && canGrooming).toBe(true);
      }
    });
  });
});
