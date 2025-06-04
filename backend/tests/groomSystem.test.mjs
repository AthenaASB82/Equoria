import { expect, jest, test, describe, beforeEach, afterEach, it } from '@jest/globals';

/**
 * 🧪 UNIT TEST: Groom System - Foal Care Assignment & Management
 *
 * This test validates the groom system's functionality for assigning, managing,
 * and calculating effects of professional groom care for foals.
 *
 * 📋 BUSINESS RULES TESTED:
 * - Groom assignment to foals with validation (active status, availability)
 * - Priority-based assignment system (primary vs secondary grooms)
 * - Default groom auto-creation for new foals without assignments
 * - Groom interaction effect calculations (bonding, stress, cost)
 * - Specialty modifiers: foalCare > general > training > medical for foals
 * - Skill level impact: master > expert > intermediate > novice (cost & effectiveness)
 * - Experience bonuses: years of experience improve effectiveness
 * - Duration scaling: longer sessions = proportionally higher costs/effects
 * - Personality trait effects: gentle, energetic, patient, strict modifiers
 * - Assignment deactivation when reassigning primary grooms
 * - Database error handling with comprehensive logging
 *
 * 🎯 FUNCTIONALITY TESTED:
 * 1. assignGroomToFoal() - Groom assignment with validation and priority management
 * 2. ensureDefaultGroomAssignment() - Auto-assignment for foals without grooms
 * 3. calculateGroomInteractionEffects() - Complex effect calculation with modifiers
 * 4. System Constants - GROOM_SPECIALTIES, SKILL_LEVELS, PERSONALITY_TRAITS validation
 * 5. Error handling for missing entities and database failures
 * 6. Edge cases: inactive grooms, duplicate assignments, invalid data
 *
 * 🔄 BALANCED MOCKING APPROACH:
 * ✅ REAL: All business logic, calculation algorithms, validation rules, effect modifiers
 * ✅ REAL: Assignment priority logic, cost calculations, specialty bonuses, experience scaling
 * 🔧 MOCK: Database operations (Prisma calls) - external dependency
 * 🔧 MOCK: Logger calls - external dependency for audit trails
 *
 * 💡 TEST STRATEGY: Unit testing with mocked database to focus on groom management
 *    business logic while ensuring predictable test outcomes for complex calculations
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock dependencies
const mockPrisma = {
  horse: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  groom: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  groomAssignment: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  groomInteraction: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock the imports
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger,
}));

// Import the module under test
const {
  assignGroomToFoal,
  ensureDefaultGroomAssignment,
  calculateGroomInteractionEffects,
  hasAlreadyCompletedFoalTaskToday,
  GROOM_SPECIALTIES,
  SKILL_LEVELS,
  PERSONALITY_TRAITS,
} = await import(join(__dirname, '../utils/groomSystem.js'));

describe('👩‍🔧 UNIT: Groom System - Foal Care Assignment & Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignGroomToFoal', () => {
    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      age: 1,
    };

    const mockGroom = {
      id: 1,
      name: 'Sarah Johnson',
      speciality: 'foalCare',
      skillLevel: 'intermediate',
      isActive: true,
      availability: { monday: true, tuesday: true },
    };

    it('should assign groom to foal successfully', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(mockGroom);
      mockPrisma.groomAssignment.findFirst.mockResolvedValue(null); // No existing assignment
      mockPrisma.groomAssignment.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.groomAssignment.create.mockResolvedValue({
        id: 1,
        foalId: 1,
        groomId: 1,
        priority: 1,
        isActive: true,
        groom: mockGroom,
        foal: mockFoal,
      });

      const result = await assignGroomToFoal(1, 1, 'player-1');

      expect(result.success).toBe(true);
      expect(result.assignment.foalId).toBe(1);
      expect(result.assignment.groomId).toBe(1);
      expect(mockPrisma.groomAssignment.create).toHaveBeenCalledWith({
        data: {
          foalId: 1,
          groomId: 1,
          userId: 'player-1',
          priority: 1,
          notes: null,
          isDefault: false,
          isActive: true,
        },
        include: {
          groom: true,
          foal: {
            select: { id: true, name: true },
          },
        },
      });
    });

    it('should throw error when foal not found', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(null);

      await expect(assignGroomToFoal(999, 1, 'player-1')).rejects.toThrow(
        'Foal with ID 999 not found',
      );
    });

    it('should throw error when groom not found', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(null);

      await expect(assignGroomToFoal(1, 999, 'player-1')).rejects.toThrow(
        'Groom with ID 999 not found',
      );
    });

    it('should throw error when groom is not active', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue({
        ...mockGroom,
        isActive: false,
      });

      await expect(assignGroomToFoal(1, 1, 'player-1')).rejects.toThrow(
        'Groom Sarah Johnson is not currently active',
      );
    });

    it('should throw error when groom already assigned', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(mockGroom);
      mockPrisma.groomAssignment.findFirst.mockResolvedValue({
        id: 1,
        foalId: 1,
        groomId: 1,
        isActive: true,
      });

      await expect(assignGroomToFoal(1, 1, 'player-1')).rejects.toThrow(
        'Groom Sarah Johnson is already assigned to this foal',
      );
    });

    it('should deactivate existing primary assignments when assigning new primary', async () => {
      mockPrisma.horse.findUnique.mockResolvedValue(mockFoal);
      mockPrisma.groom.findUnique.mockResolvedValue(mockGroom);
      mockPrisma.groomAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.groomAssignment.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.groomAssignment.create.mockResolvedValue({
        id: 2,
        foalId: 1,
        groomId: 1,
        priority: 1,
        isActive: true,
        groom: mockGroom,
        foal: mockFoal,
      });

      await assignGroomToFoal(1, 1, 'player-1', { priority: 1 });

      expect(mockPrisma.groomAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          foalId: 1,
          priority: 1,
          isActive: true,
        },
        data: {
          isActive: false,
          endDate: expect.any(Date),
        },
      });
    });
  });

  describe('ensureDefaultGroomAssignment', () => {
    it('should return existing assignment if one exists', async () => {
      const existingAssignment = {
        id: 1,
        foalId: 1,
        groomId: 1,
        isActive: true,
        groom: {
          id: 1,
          name: 'Sarah Johnson',
        },
      };

      mockPrisma.groomAssignment.findFirst.mockResolvedValue(existingAssignment);

      const result = await ensureDefaultGroomAssignment(1, 'player-1');

      expect(result.success).toBe(true);
      expect(result.isExisting).toBe(true);
      expect(result.assignment).toEqual(existingAssignment);
    });

    it('should create default assignment if none exists', async () => {
      mockPrisma.groomAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.groom.findFirst.mockResolvedValue(null); // No existing groom
      mockPrisma.groom.create.mockResolvedValue({
        id: 1,
        name: 'Sarah Johnson',
        speciality: 'foalCare',
        userId: 'player-1',
      });

      mockPrisma.horse.findUnique.mockResolvedValue({ id: 1, name: 'Test Foal', age: 1 });
      mockPrisma.groom.findUnique.mockResolvedValue({
        id: 1,
        name: 'Sarah Johnson',
        speciality: 'foalCare',
        isActive: true,
      });
      mockPrisma.groomAssignment.create.mockResolvedValue({
        id: 1,
        foalId: 1,
        groomId: 1,
        isDefault: true,
      });

      const result = await ensureDefaultGroomAssignment(1, 'player-1');

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
    });
  });

  describe('calculateGroomInteractionEffects', () => {
    const mockGroom = {
      id: 1,
      name: 'Sarah Johnson',
      speciality: 'foalCare',
      skillLevel: 'intermediate',
      personality: 'gentle',
      experience: 5,
      hourlyRate: 18.0,
    };

    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      bondScore: 50,
      stressLevel: 20,
    };

    it('should calculate bonding and stress effects correctly', () => {
      const effects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 60);

      expect(effects).toHaveProperty('bondingChange');
      expect(effects).toHaveProperty('stressChange');
      expect(effects).toHaveProperty('cost');
      expect(effects).toHaveProperty('quality');
      expect(effects).toHaveProperty('modifiers');

      expect(effects.bondingChange).toBeGreaterThanOrEqual(0);
      expect(effects.bondingChange).toBeLessThanOrEqual(10);
      expect(effects.stressChange).toBeLessThanOrEqual(5);
      expect(effects.stressChange).toBeGreaterThanOrEqual(-10);
      expect(effects.cost).toBeGreaterThan(0);
      expect(['poor', 'fair', 'good', 'excellent']).toContain(effects.quality);
    });

    it('should apply specialty modifiers correctly', () => {
      const foalCareGroom = { ...mockGroom, speciality: 'foalCare' };
      const generalGroom = { ...mockGroom, speciality: 'general' };

      const foalCareEffects = calculateGroomInteractionEffects(
        foalCareGroom,
        mockFoal,
        'dailyCare',
        60,
      );
      const generalEffects = calculateGroomInteractionEffects(
        generalGroom,
        mockFoal,
        'dailyCare',
        60,
      );

      expect(foalCareEffects.modifiers.specialty).toBeGreaterThan(
        generalEffects.modifiers.specialty,
      );
    });

    it('should apply skill level modifiers correctly', () => {
      const expertGroom = { ...mockGroom, skillLevel: 'expert' };
      const noviceGroom = { ...mockGroom, skillLevel: 'novice' };

      const expertEffects = calculateGroomInteractionEffects(
        expertGroom,
        mockFoal,
        'dailyCare',
        60,
      );
      const noviceEffects = calculateGroomInteractionEffects(
        noviceGroom,
        mockFoal,
        'dailyCare',
        60,
      );

      expect(expertEffects.modifiers.skillLevel).toBeGreaterThan(
        noviceEffects.modifiers.skillLevel,
      );
      expect(expertEffects.cost).toBeGreaterThan(noviceEffects.cost);
    });

    it('should apply experience bonus correctly', () => {
      const experiencedGroom = { ...mockGroom, experience: 15 };
      const newGroom = { ...mockGroom, experience: 1 };

      const experiencedEffects = calculateGroomInteractionEffects(
        experiencedGroom,
        mockFoal,
        'dailyCare',
        60,
      );
      const newGroomEffects = calculateGroomInteractionEffects(newGroom, mockFoal, 'dailyCare', 60);

      expect(experiencedEffects.modifiers.experience).toBeGreaterThan(
        newGroomEffects.modifiers.experience,
      );
    });

    it('should scale effects with duration', () => {
      const shortEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 30);
      const longEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 120);

      expect(longEffects.cost).toBeGreaterThan(shortEffects.cost);
    });
  });

  describe('System Constants', () => {
    it('should have all required groom specialties', () => {
      expect(GROOM_SPECIALTIES).toHaveProperty('foal_care');
      expect(GROOM_SPECIALTIES).toHaveProperty('general');
      expect(GROOM_SPECIALTIES).toHaveProperty('training');
      expect(GROOM_SPECIALTIES).toHaveProperty('medical');

      Object.values(GROOM_SPECIALTIES).forEach(specialty => {
        expect(specialty).toHaveProperty('name');
        expect(specialty).toHaveProperty('description');
        expect(specialty).toHaveProperty('bondingModifier');
        expect(specialty).toHaveProperty('stressReduction');
        expect(specialty).toHaveProperty('preferredActivities');
      });
    });

    it('should have all required skill levels', () => {
      expect(SKILL_LEVELS).toHaveProperty('novice');
      expect(SKILL_LEVELS).toHaveProperty('intermediate');
      expect(SKILL_LEVELS).toHaveProperty('expert');
      expect(SKILL_LEVELS).toHaveProperty('master');

      Object.values(SKILL_LEVELS).forEach(level => {
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('bondingModifier');
        expect(level).toHaveProperty('costModifier');
        expect(level).toHaveProperty('errorChance');
        expect(level).toHaveProperty('description');
      });
    });

    it('should have all required personality traits', () => {
      expect(PERSONALITY_TRAITS).toHaveProperty('gentle');
      expect(PERSONALITY_TRAITS).toHaveProperty('energetic');
      expect(PERSONALITY_TRAITS).toHaveProperty('patient');
      expect(PERSONALITY_TRAITS).toHaveProperty('strict');

      Object.values(PERSONALITY_TRAITS).forEach(trait => {
        expect(trait).toHaveProperty('name');
        expect(trait).toHaveProperty('bondingModifier');
        expect(trait).toHaveProperty('stressReduction');
        expect(trait).toHaveProperty('description');
      });
    });
  });

  describe('hasAlreadyCompletedFoalTaskToday', () => {
    const today = '2024-01-15';

    it('should return false when foal has no daily task record', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: null,
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(false);
    });

    it('should return false when foal has empty daily task record', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {},
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(false);
    });

    it('should return false when foal has no tasks for today', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {
          '2024-01-14': ['trust_building'],
          '2024-01-16': ['hoof_handling'],
        },
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(false);
    });

    it('should return false when foal has empty task array for today', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {
          [today]: [],
        },
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(false);
    });

    it('should return true when foal has completed enrichment task today', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {
          [today]: ['trust_building'],
        },
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(true);
    });

    it('should return true when foal has completed grooming task today', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {
          [today]: ['hoof_handling'],
        },
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(true);
    });

    it('should return true when foal has completed multiple tasks today', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {
          [today]: ['trust_building', 'early_touch'],
        },
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(true);
    });

    it('should return false when foal has completed non-foal tasks today', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {
          [today]: ['general_grooming', 'exercise', 'medical_check'],
        },
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(false);
    });

    it('should return true when foal has mixed tasks including foal tasks today', () => {
      const foal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: {
          [today]: ['general_grooming', 'trust_building', 'exercise'],
        },
      };

      const result = hasAlreadyCompletedFoalTaskToday(foal, today);
      expect(result).toBe(true);
    });

    it('should test all enrichment tasks are detected', () => {
      const enrichmentTasks = ['desensitization', 'trust_building', 'showground_exposure'];

      enrichmentTasks.forEach(task => {
        const foal = {
          id: 1,
          name: 'Test Foal',
          dailyTaskRecord: {
            [today]: [task],
          },
        };

        const result = hasAlreadyCompletedFoalTaskToday(foal, today);
        expect(result).toBe(true);
      });
    });

    it('should test all grooming tasks are detected', () => {
      const groomingTasks = [
        'early_touch',
        'hoof_handling',
        'tying_practice',
        'sponge_bath',
        'coat_check',
        'mane_tail_grooming',
      ];

      groomingTasks.forEach(task => {
        const foal = {
          id: 1,
          name: 'Test Foal',
          dailyTaskRecord: {
            [today]: [task],
          },
        };

        const result = hasAlreadyCompletedFoalTaskToday(foal, today);
        expect(result).toBe(true);
      });
    });

    it('should handle edge cases gracefully', () => {
      // Test with undefined dailyTaskRecord
      const foalUndefined = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: undefined,
      };
      expect(hasAlreadyCompletedFoalTaskToday(foalUndefined, today)).toBe(false);

      // Test with null today parameter
      const foalNormal = {
        id: 1,
        name: 'Test Foal',
        dailyTaskRecord: { [today]: ['trust_building'] },
      };
      expect(hasAlreadyCompletedFoalTaskToday(foalNormal, null)).toBe(false);

      // Test with empty string today parameter
      expect(hasAlreadyCompletedFoalTaskToday(foalNormal, '')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.horse.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(assignGroomToFoal(1, 1, 'player-1')).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid groom data in calculations', () => {
      const invalidGroom = {
        id: 1,
        name: 'Invalid Groom',
        speciality: 'invalid_specialty',
        skillLevel: 'invalid_level',
        personality: 'invalid_personality',
        experience: 5,
        sessionRate: 18.0,
      };

      const effects = calculateGroomInteractionEffects(
        invalidGroom,
        { id: 1, bondScore: 50 },
        'dailyCare',
        60,
      );

      expect(effects).toHaveProperty('bondingChange');
      expect(effects).toHaveProperty('stressChange');
      expect(effects).toHaveProperty('cost');
    });
  });
});
