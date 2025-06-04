/**
 * 🧪 UNIT TEST: Horse Eligibility - Competition Entry Validation
 *
 * This test validates the horse eligibility system for competition entry,
 * focusing on business rule validation and entry requirement checking.
 *
 * 📋 BUSINESS RULES TESTED:
 * - Age requirements: Horses must be 3-20 years old (inclusive) to compete
 * - Level requirements: Horse level must be within show's levelMin-levelMax range
 * - Previous entry prevention: Horses cannot enter the same show twice
 * - Input validation: Proper error handling for invalid horse/show objects
 * - Discipline independence: All horses can enter any discipline (no trait restrictions)
 * - Health status independence: Health status does not affect eligibility
 * - Flexible level limits: Shows can have no levelMin/levelMax (open entry)
 * - Mixed ID types: Support for string and numeric show IDs
 * - Edge case handling: Zero levels, negative values, large arrays, empty strings
 *
 * 🎯 FUNCTIONALITY TESTED:
 * 1. isHorseEligibleForShow() - Complete eligibility validation engine
 * 2. Input validation - Null/undefined horse/show objects, invalid previousEntries
 * 3. Age validation - Boundary testing (2, 3, 20, 21), invalid age types
 * 4. Level validation - Range checking, boundary testing, missing limits
 * 5. Previous entry checking - Duplicate prevention, mixed ID types
 * 6. Discipline independence - No trait-based restrictions
 * 7. Edge cases - Zero values, negative numbers, large datasets, empty strings
 * 8. Valid entry scenarios - Complete success cases with all requirements met
 *
 * 🔄 BALANCED MOCKING APPROACH:
 * ✅ REAL: Complete business logic, validation rules, eligibility calculations
 * ✅ REAL: Input validation, boundary checking, edge case handling
 * 🔧 MOCK: None - pure utility function testing with real business logic
 *
 * 💡 TEST STRATEGY: Pure unit testing of business logic without external dependencies
 *    to validate eligibility rules and ensure comprehensive edge case coverage
 */

import { describe, it, expect } from '@jest/globals';
import { isHorseEligibleForShow } from '../utils/isHorseEligible.mjs';

describe('🏆 UNIT: Horse Eligibility - Competition Entry Validation', () => {
  // Sample test data
  const validHorse = {
    id: 1,
    name: 'Test Horse',
    age: 5,
    level: 10,
    trait: 'Agile',
    health_status: 'Excellent',
  };

  const validShow = {
    id: 'show-123',
    name: 'Test Show',
    levelMin: 5,
    levelMax: 15,
    discipline: 'Dressage',
  };

  describe('Input Validation', () => {
    it('should throw error for null horse', () => {
      expect(() => isHorseEligibleForShow(null, validShow)).toThrow('Horse object is required');
    });

    it('should throw error for undefined horse', () => {
      expect(() => isHorseEligibleForShow(undefined, validShow)).toThrow(
        'Horse object is required',
      );
    });

    it('should throw error for null show', () => {
      expect(() => isHorseEligibleForShow(validHorse, null)).toThrow('Show object is required');
    });

    it('should throw error for undefined show', () => {
      expect(() => isHorseEligibleForShow(validHorse)).toThrow('Show object is required');
    });

    it('should throw error for non-array previousEntries', () => {
      expect(() => isHorseEligibleForShow(validHorse, validShow, 'not-array')).toThrow(
        'previousEntries must be an array',
      );
    });

    it('should throw error for null previousEntries', () => {
      expect(() => isHorseEligibleForShow(validHorse, validShow, null)).toThrow(
        'previousEntries must be an array',
      );
    });
  });

  describe('Age Requirements (3-20 inclusive)', () => {
    it('should return false for horse younger than 3', () => {
      const youngHorse = { ...validHorse, age: 2 };
      expect(isHorseEligibleForShow(youngHorse, validShow)).toBe(false);
    });

    it('should return false for horse age 1', () => {
      const veryYoungHorse = { ...validHorse, age: 1 };
      expect(isHorseEligibleForShow(veryYoungHorse, validShow)).toBe(false);
    });

    it('should return true for horse exactly age 3', () => {
      const minAgeHorse = { ...validHorse, age: 3 };
      expect(isHorseEligibleForShow(minAgeHorse, validShow)).toBe(true);
    });

    it('should return true for horse exactly age 20', () => {
      const maxAgeHorse = { ...validHorse, age: 20 };
      expect(isHorseEligibleForShow(maxAgeHorse, validShow)).toBe(true);
    });

    it('should return false for horse older than 20', () => {
      const oldHorse = { ...validHorse, age: 21 };
      expect(isHorseEligibleForShow(oldHorse, validShow)).toBe(false);
    });

    it('should return false for horse age 25', () => {
      const veryOldHorse = { ...validHorse, age: 25 };
      expect(isHorseEligibleForShow(veryOldHorse, validShow)).toBe(false);
    });

    it('should return false for horse with non-numeric age', () => {
      const invalidAgeHorse = { ...validHorse, age: 'five' };
      expect(isHorseEligibleForShow(invalidAgeHorse, validShow)).toBe(false);
    });

    it('should return false for horse with null age', () => {
      const nullAgeHorse = { ...validHorse, age: null };
      expect(isHorseEligibleForShow(nullAgeHorse, validShow)).toBe(false);
    });

    it('should return false for horse with undefined age', () => {
      const undefinedAgeHorse = { ...validHorse, age: undefined };
      expect(isHorseEligibleForShow(undefinedAgeHorse, validShow)).toBe(false);
    });
  });

  describe('Level Requirements', () => {
    it('should return false for horse level below show minimum', () => {
      const lowLevelHorse = { ...validHorse, level: 3 };
      expect(isHorseEligibleForShow(lowLevelHorse, validShow)).toBe(false);
    });

    it('should return true for horse level exactly at show minimum', () => {
      const minLevelHorse = { ...validHorse, level: 5 };
      expect(isHorseEligibleForShow(minLevelHorse, validShow)).toBe(true);
    });

    it('should return true for horse level exactly at show maximum', () => {
      const maxLevelHorse = { ...validHorse, level: 15 };
      expect(isHorseEligibleForShow(maxLevelHorse, validShow)).toBe(true);
    });

    it('should return false for horse level above show maximum', () => {
      const highLevelHorse = { ...validHorse, level: 20 };
      expect(isHorseEligibleForShow(highLevelHorse, validShow)).toBe(false);
    });

    it('should return true for horse level within show range', () => {
      const midLevelHorse = { ...validHorse, level: 10 };
      expect(isHorseEligibleForShow(midLevelHorse, validShow)).toBe(true);
    });

    it('should return false for horse with non-numeric level', () => {
      const invalidLevelHorse = { ...validHorse, level: 'ten' };
      expect(isHorseEligibleForShow(invalidLevelHorse, validShow)).toBe(false);
    });

    it('should return false for horse with null level', () => {
      const nullLevelHorse = { ...validHorse, level: null };
      expect(isHorseEligibleForShow(nullLevelHorse, validShow)).toBe(false);
    });

    it('should return false for horse with undefined level', () => {
      const undefinedLevelHorse = { ...validHorse, level: undefined };
      expect(isHorseEligibleForShow(undefinedLevelHorse, validShow)).toBe(false);
    });

    it('should handle show with no levelMin specified', () => {
      const showNoMin = { ...validShow, levelMin: undefined };
      const lowLevelHorse = { ...validHorse, level: 1 };
      expect(isHorseEligibleForShow(lowLevelHorse, showNoMin)).toBe(true);
    });

    it('should handle show with no levelMax specified', () => {
      const showNoMax = { ...validShow, levelMax: undefined };
      const highLevelHorse = { ...validHorse, level: 100 };
      expect(isHorseEligibleForShow(highLevelHorse, showNoMax)).toBe(true);
    });

    it('should handle show with neither levelMin nor levelMax specified', () => {
      const showNoLimits = { ...validShow, levelMin: undefined, levelMax: undefined };
      const anyLevelHorse = { ...validHorse, level: 50 };
      expect(isHorseEligibleForShow(anyLevelHorse, showNoLimits)).toBe(true);
    });
  });

  describe('Previous Entries Check', () => {
    it('should return false if horse has already entered this show', () => {
      const previousEntries = ['show-123', 'show-456'];
      expect(isHorseEligibleForShow(validHorse, validShow, previousEntries)).toBe(false);
    });

    it('should return true if horse has not entered this show', () => {
      const previousEntries = ['show-456', 'show-789'];
      expect(isHorseEligibleForShow(validHorse, validShow, previousEntries)).toBe(true);
    });

    it('should return true with empty previousEntries array', () => {
      const previousEntries = [];
      expect(isHorseEligibleForShow(validHorse, validShow, previousEntries)).toBe(true);
    });

    it('should return true when previousEntries is not provided (default empty array)', () => {
      expect(isHorseEligibleForShow(validHorse, validShow)).toBe(true);
    });

    it('should handle numeric show IDs in previousEntries', () => {
      const numericShow = { ...validShow, id: 123 };
      const previousEntries = [123, 456];
      expect(isHorseEligibleForShow(validHorse, numericShow, previousEntries)).toBe(false);
    });

    it('should handle mixed type show IDs in previousEntries', () => {
      const previousEntries = ['show-456', 789, 'show-123'];
      expect(isHorseEligibleForShow(validHorse, validShow, previousEntries)).toBe(false);
    });
  });

  describe('Discipline Independence', () => {
    it('should allow horse to enter Dressage regardless of trait', () => {
      const dressageShow = { ...validShow, discipline: 'Dressage' };
      const agilityHorse = { ...validHorse, trait: 'Agile' };
      expect(isHorseEligibleForShow(agilityHorse, dressageShow)).toBe(true);
    });

    it('should allow horse to enter Jumping regardless of trait', () => {
      const jumpingShow = { ...validShow, discipline: 'Jumping' };
      const strengthHorse = { ...validHorse, trait: 'Strong' };
      expect(isHorseEligibleForShow(strengthHorse, jumpingShow)).toBe(true);
    });

    it('should allow horse to enter Racing regardless of trait', () => {
      const racingShow = { ...validShow, discipline: 'Racing' };
      const gracefulHorse = { ...validHorse, trait: 'Graceful' };
      expect(isHorseEligibleForShow(gracefulHorse, racingShow)).toBe(true);
    });

    it('should allow horse to enter any discipline regardless of health status', () => {
      const poorHealthHorse = { ...validHorse, health_status: 'Poor' };
      expect(isHorseEligibleForShow(poorHealthHorse, validShow)).toBe(true);
    });
  });

  describe('Valid Entry Cases', () => {
    it('should return true for completely valid entry', () => {
      const eligibleHorse = {
        id: 1,
        name: 'Champion',
        age: 8,
        level: 12,
        trait: 'Swift',
        health_status: 'Excellent',
      };

      const openShow = {
        id: 'championship-2024',
        name: 'Annual Championship',
        levelMin: 10,
        levelMax: 20,
        discipline: 'All-Around',
      };

      const previousEntries = ['local-show-1', 'regional-show-2'];

      expect(isHorseEligibleForShow(eligibleHorse, openShow, previousEntries)).toBe(true);
    });

    it('should return true for minimum age and level requirements', () => {
      const minRequirementHorse = {
        id: 2,
        name: 'Young Talent',
        age: 3,
        level: 1,
      };

      const beginnerShow = {
        id: 'beginner-show',
        name: 'Beginner Competition',
        levelMin: 1,
        levelMax: 5,
        discipline: 'Training',
      };

      expect(isHorseEligibleForShow(minRequirementHorse, beginnerShow)).toBe(true);
    });

    it('should return true for maximum age and level requirements', () => {
      const maxRequirementHorse = {
        id: 3,
        name: 'Veteran Champion',
        age: 20,
        level: 50,
      };

      const veteranShow = {
        id: 'veteran-show',
        name: 'Veteran Competition',
        levelMin: 40,
        levelMax: 50,
        discipline: 'Senior',
      };

      expect(isHorseEligibleForShow(maxRequirementHorse, veteranShow)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle show with zero as levelMin', () => {
      const showZeroMin = { ...validShow, levelMin: 0 };
      const zeroLevelHorse = { ...validHorse, level: 0 };
      expect(isHorseEligibleForShow(zeroLevelHorse, showZeroMin)).toBe(true);
    });

    it('should handle negative horse level', () => {
      const negativeLevelHorse = { ...validHorse, level: -5 };
      expect(isHorseEligibleForShow(negativeLevelHorse, validShow)).toBe(false);
    });

    it('should handle very large previousEntries array', () => {
      const largePreviousEntries = Array.from({ length: 1000 }, (_, i) => `other-show-${i}`);
      expect(isHorseEligibleForShow(validHorse, validShow, largePreviousEntries)).toBe(true);
    });

    it('should handle show ID that is an empty string', () => {
      const emptyIdShow = { ...validShow, id: '' };
      const previousEntries = [''];
      expect(isHorseEligibleForShow(validHorse, emptyIdShow, previousEntries)).toBe(false);
    });
  });
});
