import { addXpToUser, getUserProgress } from '../controllers/progressionController';
import * as db from '../models/userModel';

jest.mock('../models/userModel');

describe('User Progression System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('XP Earning and Level Progression', () => {
    test('should gain 20 XP correctly', async() => {
      db.getUserById.mockResolvedValue({ id: 'user1', xp: 0, level: 1 });
      db.updateUserXpAndLevel.mockResolvedValue({ xp: 20, level: 1 });

      const result = await addXpToUser('user1', 20);
      expect(result.xp).toBe(20);
      expect(result.level).toBe(1);
    });

    test('should level up when reaching 100 XP', async() => {
      db.getUserById.mockResolvedValue({ id: 'user2', xp: 90, level: 1 });
      db.updateUserXpAndLevel.mockResolvedValue({ xp: 0, level: 2 });

      const result = await addXpToUser('user2', 10);
      expect(result.xp).toBe(0);
      expect(result.level).toBe(2);
    });

    test('should handle XP rollover correctly', async() => {
      db.getUserById.mockResolvedValue({ id: 'user3', xp: 90, level: 1 });
      db.updateUserXpAndLevel.mockResolvedValue({ xp: 15, level: 2 });

      const result = await addXpToUser('user3', 25);
      expect(result.xp).toBe(15);
      expect(result.level).toBe(2);
    });

    test('should handle multiple level ups', async() => {
      db.getUserById.mockResolvedValue({ id: 'user4', xp: 80, level: 1 });
      db.updateUserXpAndLevel.mockResolvedValue({ xp: 10, level: 3 });

      const result = await addXpToUser('user4', 130);
      expect(result.xp).toBe(10);
      expect(result.level).toBe(3);
    });
  });

  describe('User Progress Reporting', () => {
    test('should return correct progress for level 1 user', async() => {
      db.getUserById.mockResolvedValue({ id: 'user5', xp: 40, level: 1 });
      const result = await getUserProgress('user5');
      expect(result.valid).toBe(true);
    });

    test('should return correct progress for level 2 user', async() => {
      db.getUserById.mockResolvedValue({ id: 'user6', xp: 75, level: 2 });
      const result = await getUserProgress('user6');
      expect(result.valid).toBe(true);
    });

    test('should return correct progress for user at level boundary', async() => {
      db.getUserById.mockResolvedValue({ id: 'user7', xp: 0, level: 3 });
      const result = await getUserProgress('user7');
      expect(result.valid).toBe(true);
    });

    test('should handle non-existent user in getUserProgress', async() => {
      db.getUserById.mockImplementation(() => {
        throw new Error('Progress fetch failed: User not found.');
      });
      await expect(getUserProgress('no_user')).rejects.toThrow('Progress fetch failed: User not found.');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative XP amounts in addXpToUser', async() => {
      await expect(addXpToUser('user8', -5)).rejects.toThrow('XP amount must be a positive number.');
    });

    test('should handle zero XP amounts in addXpToUser', async() => {
      await expect(addXpToUser('user9', 0)).rejects.toThrow('XP amount must be a positive number.');
    });

    test('should handle database errors gracefully in getUserProgress', async() => {
      db.getUserById.mockImplementation(() => {
        throw new Error('Progress fetch failed: Lookup failed: Database connection failed');
      });
      await expect(getUserProgress('user10')).rejects.toThrow('Progress fetch failed: Lookup failed: Database connection failed');
    });

    test('should handle invalid (empty string) user ID in addXpToUser', async() => {
      await expect(addXpToUser('', 10)).rejects.toThrow('User ID is required.');
    });

    test('should handle invalid (empty string) user ID in getUserProgress', async() => {
      await expect(getUserProgress('')).rejects.toThrow('Progress fetch failed: Lookup failed: User ID is required.');
    });

    test('should handle null user ID in getUserProgress', async() => {
      await expect(getUserProgress(null)).rejects.toThrow('Progress fetch failed: Lookup failed: User ID is required.');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete training workflow with XP', async() => {
      db.getUserById.mockResolvedValue({ id: 'user11', xp: 40, level: 1 });
      db.updateUserXpAndLevel.mockResolvedValue({ xp: 60, level: 1 });

      const result = await addXpToUser('user11', 20);
      expect(result.xp).toBe(60);
      expect(result.level).toBe(1);
    });

    test('should handle complete competition workflow with XP', async() => {
      db.getUserById.mockResolvedValue({ id: 'user12', xp: 70, level: 1 });
      db.updateUserXpAndLevel.mockResolvedValue({ xp: 0, level: 2 });

      const result = await addXpToUser('user12', 30);
      expect(result.xp).toBe(0);
      expect(result.level).toBe(2);
    });

    test('should handle multiple XP sources in sequence', async() => {
      db.getUserById.mockResolvedValue({ id: 'user13', xp: 0, level: 1 });
      db.updateUserXpAndLevel.mockResolvedValue({ xp: 5, level: 1 });

      const result = await addXpToUser('user13', 5);
      expect(result.xp).toBe(5);
      expect(result.level).toBe(1);
    });
  });
});
