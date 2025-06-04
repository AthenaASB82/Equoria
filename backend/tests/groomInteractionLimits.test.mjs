/**
 * 🧪 UNIT TEST: Groom Interaction Daily Limits - TDD Implementation
 *
 * This test validates that ALL horses (regardless of age) are limited to
 * one groom interaction per day, following TDD principles with balanced mocking.
 *
 * 📋 BUSINESS RULES TESTED:
 * - ALL horses (foals and adults) limited to 1 interaction per day
 * - Clear error messages when daily limit reached
 * - Next day interactions should be allowed
 * - Proper validation for missing horses
 *
 * 🎯 TDD APPROACH:
 * - Write failing tests first
 * - Minimal mocking (only database operations)
 * - Test real business logic validation
 * - Step-by-step implementation
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Prisma with minimal, focused mocking
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
  },
  groomInteraction: {
    findMany: jest.fn(),
  },
};

// Mock logger with minimal functionality
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock the imports with minimal mocking approach
jest.unstable_mockModule('../db/index.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: mockLogger,
}));

// Import the function under test
const { validateFoalInteractionLimits } = await import('../utils/groomSystem.js');

describe('🐴 TDD: Groom Interaction Daily Limits - ALL Horses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Adult Horse Daily Limits (FAILING TESTS - Current Implementation Bug)', () => {
    it('should FAIL: 1-year-old horse should be limited to once per day', async () => {
      // ARRANGE: 1-year-old horse (365 days)
      const adultHorse = {
        id: 1,
        name: 'Adult Horse',
        age: 365, // 1 year old
      };

      const todaysInteraction = {
        id: 1,
        foalId: 1,
        groomId: 1,
        timestamp: new Date(),
        interactionType: 'daily_care',
      };

      mockPrisma.horse.findUnique.mockResolvedValue(adultHorse);
      mockPrisma.groomInteraction.findMany.mockResolvedValue([todaysInteraction]);

      // ACT: Try to validate interaction limits
      const result = await validateFoalInteractionLimits(1);

      // ASSERT: Should prevent interaction but currently FAILS
      // This test will FAIL with current implementation because it only limits foals 0-7 days
      expect(result.canInteract).toBe(false); // This will FAIL - current code returns true
      expect(result.message).toContain('already had a groom interaction today');
    });

    it('should FAIL: 2-year-old horse should be limited to once per day', async () => {
      // ARRANGE: 2-year-old horse
      const adultHorse = {
        id: 2,
        name: 'Mature Horse',
        age: 730, // 2 years old
      };

      const todaysInteraction = {
        id: 2,
        foalId: 2,
        groomId: 1,
        timestamp: new Date(),
        interactionType: 'grooming',
      };

      mockPrisma.horse.findUnique.mockResolvedValue(adultHorse);
      mockPrisma.groomInteraction.findMany.mockResolvedValue([todaysInteraction]);

      // ACT: Try to validate interaction limits
      const result = await validateFoalInteractionLimits(2);

      // ASSERT: Should prevent interaction but currently FAILS
      expect(result.canInteract).toBe(false); // This will FAIL - current code returns true
      expect(result.message).toContain('already had a groom interaction today');
    });
  });

  describe('Foal Daily Limits (Should PASS with current implementation)', () => {
    it('should correctly limit 3-day-old foal to once per day', async () => {
      // ARRANGE: Young foal
      const youngFoal = {
        id: 3,
        name: 'Young Foal',
        age: 3, // 3 days old
      };

      const todaysInteraction = {
        id: 3,
        foalId: 3,
        groomId: 1,
        timestamp: new Date(),
        interactionType: 'feeding',
      };

      mockPrisma.horse.findUnique.mockResolvedValue(youngFoal);
      mockPrisma.groomInteraction.findMany.mockResolvedValue([todaysInteraction]);

      // ACT: Try to validate interaction limits
      const result = await validateFoalInteractionLimits(3);

      // ASSERT: Should prevent interaction (this should PASS with current code)
      expect(result.canInteract).toBe(false);
      expect(result.message).toContain('already had a groom interaction today');
      expect(result.interactionsToday).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing horse', async () => {
      // ARRANGE: Horse not found
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      // ACT & ASSERT: Should throw error
      await expect(validateFoalInteractionLimits(999)).rejects.toThrow(
        'Foal with ID 999 not found',
      );
    });

    it('should allow interaction when no previous interactions today', async () => {
      // ARRANGE: Horse with no interactions today
      const horse = {
        id: 4,
        name: 'Fresh Horse',
        age: 100, // Any age
      };

      mockPrisma.horse.findUnique.mockResolvedValue(horse);
      mockPrisma.groomInteraction.findMany.mockResolvedValue([]); // No interactions today

      // ACT: Validate interaction limits
      const result = await validateFoalInteractionLimits(4);

      // ASSERT: Should allow interaction
      expect(result.canInteract).toBe(true);
      expect(result.message).toContain('can have a groom interaction today');
    });
  });
});
