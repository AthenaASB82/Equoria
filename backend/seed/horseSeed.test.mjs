import { jest, describe, beforeEach, expect, it, beforeAll, afterAll } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock logger first
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.unstable_mockModule(join(__dirname, '../utils/logger.js'), () => ({
  default: mockLogger,
}));

// Mock other modules
jest.unstable_mockModule(join(__dirname, '../db/index.js'), () => ({
  default: {
    breed: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      upsert: jest.fn(),
    },
    stable: {
      upsert: jest.fn(),
    },
    horse: {
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

jest.unstable_mockModule(join(__dirname, '../models/horseModel.js'), () => ({
  createHorse: jest.fn(),
}));

describe('horseSeed', () => {
  let mockPrisma;
  let findOrCreateBreed;
  let ensureReferencedRecordsExist;
  let checkHorseExists;
  let seedHorses;

  beforeAll(async () => {
    mockPrisma = (await import(join(__dirname, '../db/index.js'))).default;
    const seedModule = await import(join(__dirname, './horseSeed.js'));
    ({ findOrCreateBreed, ensureReferencedRecordsExist, checkHorseExists, seedHorses } =
      seedModule);
  });

  afterAll(async () => {
    if (mockPrisma?.$disconnect) {
      await mockPrisma.$disconnect();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHorseExists', () => {
    it('should return true if horse exists', async () => {
      const existingHorse = { id: 1, name: 'Test Horse' };
      mockPrisma.horse.findFirst.mockResolvedValue(existingHorse);

      const result = await checkHorseExists('Test Horse');

      expect(mockPrisma.horse.findFirst).toHaveBeenCalledWith({
        where: { name: 'Test Horse' },
      });
      expect(result).toBe(true);
    });

    it('should return false if horse does not exist', async () => {
      mockPrisma.horse.findFirst.mockResolvedValue(null);

      const result = await checkHorseExists('Nonexistent Horse');

      expect(mockPrisma.horse.findFirst).toHaveBeenCalledWith({
        where: { name: 'Nonexistent Horse' },
      });
      expect(result).toBe(false);
    });

    it('should return false and log warning on database error', async () => {
      const error = new Error('Database error');
      mockPrisma.horse.findFirst.mockRejectedValue(error);

      const result = await checkHorseExists('Error Horse');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[seed] Failed to check if horse "Error Horse" exists: Database error',
      );
    });
  });

  describe('findOrCreateBreed', () => {
    it('should return existing breed if found', async () => {
      const existingBreed = { id: 1, name: 'Thoroughbred' };
      mockPrisma.breed.findUnique.mockResolvedValue(existingBreed);

      const result = await findOrCreateBreed('Thoroughbred');

      expect(mockPrisma.breed.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.breed.findUnique).toHaveBeenCalledWith({
        where: { name: 'Thoroughbred' },
      });
      expect(mockPrisma.breed.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingBreed);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[seed] Found existing breed: Thoroughbred (ID: 1)',
      );
    });

    it('should create new breed if not found', async () => {
      const newBreed = { id: 2, name: 'Arabian', description: 'Seed-created Arabian' };
      mockPrisma.breed.findUnique.mockResolvedValue(null);
      mockPrisma.breed.create.mockResolvedValue(newBreed);

      const result = await findOrCreateBreed('Arabian');

      expect(mockPrisma.breed.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.breed.findUnique).toHaveBeenCalledWith({
        where: { name: 'Arabian' },
      });
      expect(mockPrisma.breed.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.breed.create).toHaveBeenCalledWith({
        data: { name: 'Arabian', description: 'Seed-created Arabian' },
      });
      expect(result).toEqual(newBreed);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[seed] Breed "Arabian" not found, creating new one.',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Created breed: Arabian (ID: 2)');
    });

    it('should return null for undefined breed name', async () => {
      const result = await findOrCreateBreed();

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[seed] Breed name is undefined or null. Skipping breed creation/connection.',
      );
      expect(mockPrisma.breed.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.breed.create).not.toHaveBeenCalled();
    });

    it('should throw error if database operation fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.breed.findUnique.mockRejectedValue(error);

      await expect(findOrCreateBreed('Test Breed')).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[seed] Failed to find or create breed "Test Breed": Database connection failed',
      );
    });
  });

  describe('ensureReferencedRecordsExist', () => {
    it('should create users and stables if they do not exist', async () => {
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 1,
        username: 'Default Owner',
        email: 'owner1@example.com',
      });
      mockPrisma.user.upsert.mockResolvedValueOnce({
        id: 2,
        username: 'Second Owner',
        email: 'owner2@example.com',
      });
      mockPrisma.stable.upsert.mockResolvedValueOnce({ id: 1, name: 'Main Stable' });
      mockPrisma.stable.upsert.mockResolvedValueOnce({ id: 2, name: 'Second Stable' });

      await ensureReferencedRecordsExist();

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.stable.upsert).toHaveBeenCalledTimes(2);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { username: 'Default Owner' },
        create: {
          id: 1,
          username: 'Default Owner',
          email: 'owner1@example.com',
          password: 'password',
        },
      });

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 2 },
        update: { username: 'Second Owner' },
        create: {
          id: 2,
          username: 'Second Owner',
          email: 'owner2@example.com',
          password: 'password',
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured User ID 1 exists.');
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured User ID 2 exists.');
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured Stable ID 1 exists.');
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured Stable ID 2 exists.');
    });

    it('should handle errors gracefully when user creation fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.user.upsert.mockRejectedValue(error);
      mockPrisma.stable.upsert.mockResolvedValue({ id: 1, name: 'A Stable' });

      await ensureReferencedRecordsExist();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[seed] Could not ensure User ID 1. Error: Database connection failed',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[seed] Could not ensure User ID 2. Error: Database connection failed',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured Stable ID 1 exists.');
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured Stable ID 2 exists.');
    });

    it('should handle errors gracefully when stable creation fails', async () => {
      const error = new Error('Stable DB error');
      mockPrisma.user.upsert.mockResolvedValue({ id: 1, username: 'A User' });
      mockPrisma.stable.upsert.mockRejectedValue(error);

      await ensureReferencedRecordsExist();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[seed] Could not ensure Stable ID 1. Error: Stable DB error',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[seed] Could not ensure Stable ID 2. Error: Stable DB error',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured User ID 1 exists.');
      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured User ID 2 exists.');
    });
  });

  describe('seedHorses', () => {
    beforeEach(() => {
      mockPrisma.breed.upsert.mockClear();
      mockPrisma.horse.create.mockClear();
    });

    it('should log a warning and return an empty array if no users are provided', async () => {
      const result = await seedHorses(mockPrisma, []);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No users provided for horse seeding. Skipping horse creation.',
      );
      expect(result).toEqual([]);
    });

    it('should create breeds and horses for the provided user', async () => {
      const mockUser = { id: 1, username: 'TestUser' };
      const mockThoroughbredBreed = {
        id: 1,
        name: 'Thoroughbred',
        baseSpeed: 80,
        baseStamina: 70,
        baseStrength: 60,
        rarity: 'Common',
      };
      const mockArabianBreed = {
        id: 2,
        name: 'Arabian',
        baseSpeed: 75,
        baseStamina: 80,
        baseStrength: 50,
        rarity: 'Rare',
      };
      const mockQuarterHorseBreed = {
        id: 3,
        name: 'Quarter Horse',
        baseSpeed: 70,
        baseStamina: 60,
        baseStrength: 80,
        rarity: 'Common',
      };
      const mockAkhalTekeBreed = {
        id: 4,
        name: 'Akhal-Teke',
        baseSpeed: 85,
        baseStamina: 75,
        baseStrength: 65,
        rarity: 'Epic',
      };

      const mockHorseLightning = {
        id: 1,
        name: 'Lightning Bolt',
        breedId: mockThoroughbredBreed.id,
        ownerId: mockUser.id,
        userId: mockUser.id,
      };
      const mockHorseDesertRose = {
        id: 2,
        name: 'Desert Rose',
        breedId: mockArabianBreed.id,
        ownerId: mockUser.id,
        userId: mockUser.id,
      };

      mockPrisma.breed.upsert.mockImplementation(async ({ where, create }) => {
        if (where.name === 'Thoroughbred') {
          return mockThoroughbredBreed;
        }
        if (where.name === 'Arabian') {
          return mockArabianBreed;
        }
        if (where.name === 'Quarter Horse') {
          return mockQuarterHorseBreed;
        }
        if (where.name === 'Akhal-Teke') {
          return mockAkhalTekeBreed;
        }
        return { ...create, id: Math.floor(Math.random() * 1000) };
      });

      mockPrisma.horse.create.mockImplementation(async data => {
        if (data.data.name === 'Lightning Bolt') {
          return mockHorseLightning;
        }
        if (data.data.name === 'Desert Rose') {
          return mockHorseDesertRose;
        }
        return { ...data.data, id: Math.floor(Math.random() * 1000) };
      });

      const result = await seedHorses(mockPrisma, [mockUser]);

      expect(mockPrisma.breed.upsert).toHaveBeenCalledTimes(4);
      expect(mockPrisma.horse.create).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);
      expect(result).toContainEqual(mockHorseLightning);
      expect(result).toContainEqual(mockHorseDesertRose);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Created horse: ${mockHorseLightning.name} for user ID: ${mockUser.id}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Created horse: ${mockHorseDesertRose.name} for user ID: ${mockUser.id}`,
      );
    });

    it('should log a warning if a horse is skipped due to missing breedId', async () => {
      const mockUser = { id: 1, username: 'TestUser' };
      mockPrisma.breed.upsert.mockImplementation(async ({ where }) => {
        if (where.name === 'Arabian') {
          return { id: 2, name: 'Arabian' };
        }
        if (where.name === 'Quarter Horse') {
          return { id: 3, name: 'Quarter Horse' };
        }
        if (where.name === 'Akhal-Teke') {
          return { id: 4, name: 'Akhal-Teke' };
        }
        return undefined;
      });
      mockPrisma.horse.create.mockResolvedValue({ id: 1, name: 'Some Horse' });

      await seedHorses(mockPrisma, [mockUser]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping horse Lightning Bolt due to missing breedId.'),
      );
      const createCalls = mockPrisma.horse.create.mock.calls;
      const createdDesertRose = createCalls.some(call => call[0].data.name === 'Desert Rose');
      expect(createdDesertRose).toBe(true);
    });

    it('should log an error if horse creation fails', async () => {
      const mockUser = { id: 1, username: 'TestUser' };
      const mockBreed = { id: 1, name: 'Thoroughbred' };
      const error = new Error('Failed to create horse');

      mockPrisma.breed.upsert.mockResolvedValue(mockBreed);
      mockPrisma.horse.create.mockRejectedValue(error);

      await seedHorses(mockPrisma, [mockUser]);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error seeding horse Lightning Bolt: Failed to create horse'),
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error seeding horse Desert Rose: Failed to create horse'),
      );
    });
  });

  describe('main execution (integration)', () => {
    it('should call ensureReferencedRecordsExist and seedHorses with sample data', async () => {
      const { default: actualMain } = await import(join(__dirname, './horseSeed.js'));

      mockPrisma.user.upsert.mockResolvedValue({ id: 1 });
      mockPrisma.stable.upsert.mockResolvedValue({ id: 1 });
      mockPrisma.breed.findUnique.mockResolvedValue({ id: 1, name: 'Thoroughbred' });
      mockPrisma.horse.findFirst.mockResolvedValue(null);
      const { createHorse: mockCreateHorse } = await import(
        join(__dirname, '../models/horseModel.js')
      );
      mockCreateHorse.mockResolvedValue({ id: 1, name: 'Created Horse' });

      await actualMain();

      expect(mockLogger.info).toHaveBeenCalledWith('[seed] Ensured User ID 1 exists.');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully seeded horse:'),
      );
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it('should handle errors during main execution and disconnect prisma', async () => {
      const { default: actualMain } = await import(join(__dirname, './horseSeed.js'));
      mockPrisma.user.upsert.mockRejectedValue(new Error('Main execution DB error'));

      await expect(actualMain()).rejects.toThrow('Main execution DB error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during database seeding: Main execution DB error'),
      );
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
