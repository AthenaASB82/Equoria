/**
 * Foal Task Log Manager Test Suite
 * Tests for foal task log utility functions and streak management
 *
 * 🎯 FEATURES TESTED:
 * - Task log manipulation and validation functions
 * - Streak calculation and burnout immunity logic
 * - Care data updates and summary statistics
 * - Grace period handling and streak resets
 * - Data validation and error handling
 *
 * 🔧 DEPENDENCIES:
 * - foalTaskLogManager.js utility functions
 * - Logger for error handling
 *
 * 📋 BUSINESS RULES TESTED:
 * - Task counts increment correctly and preserve data integrity
 * - Streak calculations use 2-day grace period for missed days
 * - Burnout immunity achieved after 7 consecutive days
 * - Task log validation ensures data quality
 * - Care summary provides comprehensive statistics
 *
 * 🧪 TESTING APPROACH:
 * - Mock: Logger calls (external dependency)
 * - Real: All business logic, calculations, data manipulation
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock the logger import
jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  logger: mockLogger,
}));

// Import the functions after mocking
const {
  initializeTaskLog,
  incrementTaskCount,
  getTaskCount,
  getTotalTaskCount,
  getCompletedTasks,
  calculateStreakFromLastCareDate,
  hasBurnoutImmunity,
  updateFoalCareData,
  validateTaskLog,
  getFoalCareSummary,
  resetFoalCareStreak,
} = await import(join(__dirname, '../utils/foalTaskLogManager.js'));

describe('Foal Task Log Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Task Log Initialization and Manipulation', () => {
    it('should initialize empty task log', () => {
      const taskLog = initializeTaskLog();
      expect(taskLog).toEqual({});
    });

    it('should increment task count for new task', () => {
      const taskLog = {};
      const updated = incrementTaskCount(taskLog, 'trust_building');

      expect(updated).toEqual({ trust_building: 1 });
      expect(updated).not.toBe(taskLog); // Should return new object
    });

    it('should increment existing task count', () => {
      const taskLog = { trust_building: 3, desensitization: 1 };
      const updated = incrementTaskCount(taskLog, 'trust_building');

      expect(updated).toEqual({ trust_building: 4, desensitization: 1 });
    });

    it('should increment by custom amount', () => {
      const taskLog = { early_touch: 2 };
      const updated = incrementTaskCount(taskLog, 'early_touch', 3);

      expect(updated).toEqual({ early_touch: 5 });
    });

    it('should handle null task log', () => {
      const updated = incrementTaskCount(null, 'trust_building');
      expect(updated).toEqual({ trust_building: 1 });
    });

    it('should get task count for existing task', () => {
      const taskLog = { trust_building: 5, desensitization: 2 };
      expect(getTaskCount(taskLog, 'trust_building')).toBe(5);
      expect(getTaskCount(taskLog, 'desensitization')).toBe(2);
    });

    it('should return 0 for non-existent task', () => {
      const taskLog = { trust_building: 5 };
      expect(getTaskCount(taskLog, 'non_existent')).toBe(0);
    });

    it('should handle null task log in getTaskCount', () => {
      expect(getTaskCount(null, 'trust_building')).toBe(0);
      expect(getTaskCount(undefined, 'trust_building')).toBe(0);
    });
  });

  describe('Task Log Statistics', () => {
    it('should calculate total task count', () => {
      const taskLog = { trust_building: 5, desensitization: 3, early_touch: 2 };
      expect(getTotalTaskCount(taskLog)).toBe(10);
    });

    it('should handle empty task log in total count', () => {
      expect(getTotalTaskCount({})).toBe(0);
      expect(getTotalTaskCount(null)).toBe(0);
    });

    it('should ignore non-numeric values in total count', () => {
      const taskLog = { trust_building: 5, invalid: 'not_a_number', desensitization: 3 };
      expect(getTotalTaskCount(taskLog)).toBe(8);
    });

    it('should get completed tasks list', () => {
      const taskLog = { trust_building: 5, desensitization: 0, early_touch: 2 };
      const completed = getCompletedTasks(taskLog);

      expect(completed).toEqual(['trust_building', 'early_touch']);
      expect(completed).not.toContain('desensitization');
    });

    it('should handle empty task log in completed tasks', () => {
      expect(getCompletedTasks({})).toEqual([]);
      expect(getCompletedTasks(null)).toEqual([]);
    });
  });

  describe('Streak Calculation', () => {
    const baseDate = new Date('2024-06-01T12:00:00Z');

    it('should handle null last care date', () => {
      const result = calculateStreakFromLastCareDate(null, baseDate);

      expect(result).toEqual({
        isStreakActive: false,
        daysSinceLastCare: null,
        isWithinGracePeriod: false,
        streakBroken: false,
      });
    });

    it('should calculate same day care', () => {
      const lastCare = new Date('2024-06-01T10:00:00Z');
      const result = calculateStreakFromLastCareDate(lastCare, baseDate);

      expect(result.isStreakActive).toBe(true);
      expect(result.daysSinceLastCare).toBe(0);
      expect(result.isWithinGracePeriod).toBe(true);
      expect(result.streakBroken).toBe(false);
    });

    it('should calculate within grace period', () => {
      const lastCare = new Date('2024-05-30T12:00:00Z'); // 2 days ago
      const result = calculateStreakFromLastCareDate(lastCare, baseDate);

      expect(result.isStreakActive).toBe(true);
      expect(result.daysSinceLastCare).toBe(2);
      expect(result.isWithinGracePeriod).toBe(true);
      expect(result.streakBroken).toBe(false);
    });

    it('should detect broken streak beyond grace period', () => {
      const lastCare = new Date('2024-05-28T12:00:00Z'); // 4 days ago
      const result = calculateStreakFromLastCareDate(lastCare, baseDate);

      expect(result.isStreakActive).toBe(false);
      expect(result.daysSinceLastCare).toBe(4);
      expect(result.isWithinGracePeriod).toBe(false);
      expect(result.streakBroken).toBe(true);
    });

    it('should use custom grace period', () => {
      const lastCare = new Date('2024-05-29T12:00:00Z'); // 3 days ago
      const result = calculateStreakFromLastCareDate(lastCare, baseDate, 3);

      expect(result.isStreakActive).toBe(true);
      expect(result.isWithinGracePeriod).toBe(true);
    });
  });

  describe('Burnout Immunity', () => {
    it('should grant immunity after 7 days', () => {
      expect(hasBurnoutImmunity(7)).toBe(true);
      expect(hasBurnoutImmunity(10)).toBe(true);
    });

    it('should not grant immunity before 7 days', () => {
      expect(hasBurnoutImmunity(6)).toBe(false);
      expect(hasBurnoutImmunity(0)).toBe(false);
    });

    it('should handle invalid input', () => {
      expect(hasBurnoutImmunity(null)).toBe(false);
      expect(hasBurnoutImmunity()).toBe(false);
      expect(hasBurnoutImmunity('not_a_number')).toBe(false);
    });

    it('should use custom immunity threshold', () => {
      expect(hasBurnoutImmunity(5, 5)).toBe(true);
      expect(hasBurnoutImmunity(4, 5)).toBe(false);
    });
  });

  describe('Care Data Updates', () => {
    it('should update foal care data with new task', () => {
      const currentData = {
        taskLog: null,
        lastGroomed: null,
        daysGroomedInARow: 0,
      };

      const careDate = new Date('2024-06-01T12:00:00Z');
      const updated = updateFoalCareData(currentData, 'trust_building', careDate);

      expect(updated.taskLog).toEqual({ trust_building: 1 });
      expect(updated.lastGroomed).toEqual(careDate);
      expect(updated.daysGroomedInARow).toBe(1);
    });

    it('should continue streak within grace period', () => {
      const lastCare = new Date('2024-05-30T12:00:00Z');
      const currentData = {
        taskLog: { trust_building: 2 },
        lastGroomed: lastCare,
        daysGroomedInARow: 3,
      };

      const careDate = new Date('2024-06-01T12:00:00Z'); // 2 days later
      const updated = updateFoalCareData(currentData, 'desensitization', careDate);

      expect(updated.taskLog).toEqual({ trust_building: 2, desensitization: 1 });
      expect(updated.daysGroomedInARow).toBe(4); // Continued streak
    });

    it('should reset streak when broken', () => {
      const lastCare = new Date('2024-05-25T12:00:00Z'); // 7 days ago
      const currentData = {
        taskLog: { trust_building: 5 },
        lastGroomed: lastCare,
        daysGroomedInARow: 10,
      };

      const careDate = new Date('2024-06-01T12:00:00Z');
      const updated = updateFoalCareData(currentData, 'early_touch', careDate);

      expect(updated.taskLog).toEqual({ trust_building: 5, early_touch: 1 });
      expect(updated.daysGroomedInARow).toBe(1); // Reset to 1
    });
  });

  describe('Task Log Validation', () => {
    it('should validate correct task log', () => {
      const taskLog = { trust_building: 5, desensitization: 3 };
      const result = validateTaskLog(taskLog);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should allow null task log', () => {
      const result = validateTaskLog(null);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-object task log', () => {
      const result = validateTaskLog('not_an_object');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task log must be an object');
    });

    it('should reject invalid task names', () => {
      const taskLog = { '': 5, 123: 3 };
      const result = validateTaskLog(taskLog);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid task name'))).toBe(true);
    });

    it('should reject invalid counts', () => {
      const taskLog = { trust_building: -1, desensitization: 'not_a_number', early_touch: 3.5 };
      const result = validateTaskLog(taskLog);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid count'))).toBe(true);
    });
  });

  describe('Care Summary', () => {
    it('should generate comprehensive care summary', () => {
      const foalData = {
        taskLog: { trust_building: 5, desensitization: 3, early_touch: 2 },
        lastGroomed: new Date('2024-06-01T12:00:00Z'),
        daysGroomedInARow: 8,
      };

      const summary = getFoalCareSummary(foalData);

      expect(summary.totalTaskCompletions).toBe(10);
      expect(summary.uniqueTasksCompleted).toBe(3);
      expect(summary.completedTaskTypes).toEqual([
        'trust_building',
        'desensitization',
        'early_touch',
      ]);
      expect(summary.consecutiveDaysOfCare).toBe(8);
      expect(summary.hasBurnoutImmunity).toBe(true);
      expect(summary.lastCareDate).toEqual(foalData.lastGroomed);
    });

    it('should handle empty foal data', () => {
      const foalData = {
        taskLog: null,
        lastGroomed: null,
        daysGroomedInARow: 0,
      };

      const summary = getFoalCareSummary(foalData);

      expect(summary.totalTaskCompletions).toBe(0);
      expect(summary.uniqueTasksCompleted).toBe(0);
      expect(summary.hasBurnoutImmunity).toBe(false);
    });
  });

  describe('Streak Reset', () => {
    it('should reset foal care streak', () => {
      const currentData = {
        taskLog: { trust_building: 5 },
        lastGroomed: new Date(),
        daysGroomedInARow: 10,
      };

      const reset = resetFoalCareStreak(currentData);

      expect(reset.taskLog).toEqual(currentData.taskLog); // Preserved
      expect(reset.lastGroomed).toEqual(currentData.lastGroomed); // Preserved
      expect(reset.daysGroomedInARow).toBe(0); // Reset
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in incrementTaskCount', () => {
      // Force an error by passing invalid parameters
      expect(() => {
        incrementTaskCount({}, null); // null task name
      }).toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle errors in calculateStreakFromLastCareDate', () => {
      expect(() => {
        calculateStreakFromLastCareDate('invalid_date');
      }).toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
