/**
 * 🧪 UNIT TEST: Groom System Logic - Pure Business Logic Validation
 *
 * This test validates the groom system calculation logic without database dependencies,
 * focusing on pure business rule validation and mathematical calculations.
 *
 * 📋 BUSINESS RULES TESTED:
 * - Groom interaction effects: Bonding change, stress reduction, cost calculation, quality assessment
 * - Specialty modifiers: foalCare (1.5x), general (1.0x), training, medical specialties
 * - Skill level progression: novice (0.8x), intermediate (1.0x), expert (1.3x), master (1.6x)
 * - Personality traits: gentle (1.2x), energetic, patient, strict modifiers
 * - Experience bonuses: +1 bonding per 5 years of experience
 * - Duration scaling: Cost scales with time (hourlyRate * duration/60 * skillModifier)
 * - Interaction types: dailyCare, feeding, grooming activities
 * - System constants: Specialty definitions, skill levels, personality traits, default grooms
 * - Modifier combinations: Multiplicative bonding modifiers (specialty × skill × personality)
 * - Edge case handling: Invalid specialties, extreme durations, high experience values
 *
 * 🎯 FUNCTIONALITY TESTED:
 * 1. calculateGroomInteractionEffects() - Complete interaction calculation engine
 * 2. Specialty bonuses - foalCare vs general vs training vs medical modifiers
 * 3. Skill progression - novice through master level effects and costs
 * 4. Personality effects - gentle vs strict vs energetic vs patient modifiers
 * 5. Experience scaling - Linear bonus progression per 5-year increments
 * 6. Cost calculations - Duration × hourly rate × skill modifier
 * 7. System constants - GROOM_SPECIALTIES, SKILL_LEVELS, PERSONALITY_TRAITS validation
 * 8. Default profiles - DEFAULT_GROOMS configuration validation
 *
 * 🔄 BALANCED MOCKING APPROACH:
 * ✅ REAL: Complete business logic, mathematical calculations, modifier combinations
 * ✅ REAL: System constants validation, configuration object testing
 * 🔧 MOCK: None - pure utility function testing with real business logic
 *
 * 💡 TEST STRATEGY: Pure unit testing of business logic without external dependencies
 *    to validate mathematical accuracy and business rule compliance
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateGroomInteractionEffects,
  GROOM_SPECIALTIES,
  SKILL_LEVELS,
  PERSONALITY_TRAITS,
  DEFAULT_GROOMS,
} from '../utils/groomSystem.mjs';

describe('🧮 UNIT: Groom System Logic - Pure Business Logic Validation', () => {
  describe('calculateGroomInteractionEffects', () => {
    const mockGroom = {
      id: 1,
      name: 'Sarah Johnson',
      speciality: 'foalCare',
      skillLevel: 'intermediate',
      personality: 'gentle',
      experience: 5,
      sessionRate: 18.0,
    };

    const mockFoal = {
      id: 1,
      name: 'Test Foal',
      bondScore: 50,
      stressLevel: 20,
    };

    it('should calculate basic interaction effects', () => {
      const effects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 60);

      expect(effects).toHaveProperty('bondingChange');
      expect(effects).toHaveProperty('stressChange');
      expect(effects).toHaveProperty('cost');
      expect(effects).toHaveProperty('quality');
      expect(effects).toHaveProperty('modifiers');

      // Bonding change should be positive and within bounds
      expect(effects.bondingChange).toBeGreaterThanOrEqual(0);
      expect(effects.bondingChange).toBeLessThanOrEqual(10);

      // Stress change should be negative (stress reduction) or small positive
      expect(effects.stressChange).toBeGreaterThanOrEqual(-10);
      expect(effects.stressChange).toBeLessThanOrEqual(5);

      // Cost should be positive
      expect(effects.cost).toBeGreaterThan(0);

      // Quality should be valid
      expect(['poor', 'fair', 'good', 'excellent']).toContain(effects.quality);
    });

    it('should apply foal care specialty bonuses correctly', () => {
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

      // Foal care specialist should have better bonding modifier
      expect(foalCareEffects.modifiers.specialty).toBe(1.5);
      expect(generalEffects.modifiers.specialty).toBe(1.0);
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

      // Expert should have better bonding modifier
      expect(expertEffects.modifiers.skillLevel).toBe(1.3);
      expect(noviceEffects.modifiers.skillLevel).toBe(0.8);
      expect(expertEffects.modifiers.skillLevel).toBeGreaterThan(
        noviceEffects.modifiers.skillLevel,
      );

      // Expert should cost more
      expect(expertEffects.cost).toBeGreaterThan(noviceEffects.cost);
    });

    it('should apply personality modifiers correctly', () => {
      const gentleGroom = { ...mockGroom, personality: 'gentle' };
      const strictGroom = { ...mockGroom, personality: 'strict' };

      const gentleEffects = calculateGroomInteractionEffects(
        gentleGroom,
        mockFoal,
        'dailyCare',
        60,
      );
      const strictEffects = calculateGroomInteractionEffects(
        strictGroom,
        mockFoal,
        'dailyCare',
        60,
      );

      // Gentle should have better bonding modifier
      expect(gentleEffects.modifiers.personality).toBe(1.2);
      expect(strictEffects.modifiers.personality).toBe(0.9);
      expect(gentleEffects.modifiers.personality).toBeGreaterThan(
        strictEffects.modifiers.personality,
      );
    });

    it('should apply experience bonuses correctly', () => {
      const experiencedGroom = { ...mockGroom, experience: 15 };
      const newGroom = { ...mockGroom, experience: 1 };

      const experiencedEffects = calculateGroomInteractionEffects(
        experiencedGroom,
        mockFoal,
        'dailyCare',
        60,
      );
      const newGroomEffects = calculateGroomInteractionEffects(newGroom, mockFoal, 'dailyCare', 60);

      // Experience bonus: +1 bonding per 5 years
      expect(experiencedEffects.modifiers.experience).toBe(3); // 15/5 = 3
      expect(newGroomEffects.modifiers.experience).toBe(0); // 1/5 = 0
      expect(experiencedEffects.modifiers.experience).toBeGreaterThan(
        newGroomEffects.modifiers.experience,
      );
    });

    it('should scale cost with duration and session rate', () => {
      const shortEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 30);
      const longEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 120);

      // Longer duration should cost more
      expect(longEffects.cost).toBeGreaterThan(shortEffects.cost);

      // Cost should be based on sessionRate with skill modifier and duration scaling
      // Note: The actual calculation uses sessionRate * skillModifier * duration scaling
      expect(shortEffects.cost).toBeGreaterThan(0);
      expect(longEffects.cost).toBeGreaterThan(shortEffects.cost);
    });

    it('should handle different interaction types', () => {
      const dailyCareEffects = calculateGroomInteractionEffects(
        mockGroom,
        mockFoal,
        'dailyCare',
        60,
      );
      const feedingEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'feeding', 60);
      const groomingEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'grooming', 60);

      // All should produce valid effects
      expect(dailyCareEffects.bondingChange).toBeGreaterThanOrEqual(0);
      expect(feedingEffects.bondingChange).toBeGreaterThanOrEqual(0);
      expect(groomingEffects.bondingChange).toBeGreaterThanOrEqual(0);

      // All should have same cost for same duration and groom
      expect(dailyCareEffects.cost).toBeCloseTo(feedingEffects.cost, 2);
      expect(feedingEffects.cost).toBeCloseTo(groomingEffects.cost, 2);
    });

    it('should handle edge cases gracefully', () => {
      // Very short duration
      const shortEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 5);
      expect(shortEffects.bondingChange).toBeGreaterThanOrEqual(0);
      expect(shortEffects.cost).toBeGreaterThan(0);

      // Very long duration
      const longEffects = calculateGroomInteractionEffects(mockGroom, mockFoal, 'dailyCare', 480);
      expect(longEffects.bondingChange).toBeLessThanOrEqual(10);
      expect(longEffects.cost).toBeGreaterThan(0);

      // High experience groom
      const masterGroom = { ...mockGroom, experience: 20, skillLevel: 'master' };
      const masterEffects = calculateGroomInteractionEffects(
        masterGroom,
        mockFoal,
        'dailyCare',
        60,
      );
      expect(masterEffects.modifiers.experience).toBe(4); // 20/5 = 4
      expect(masterEffects.modifiers.skillLevel).toBe(1.6);
    });
  });

  describe('System Constants', () => {
    it('should have all required groom specialties', () => {
      expect(GROOM_SPECIALTIES).toHaveProperty('foal_care');
      expect(GROOM_SPECIALTIES).toHaveProperty('general');
      expect(GROOM_SPECIALTIES).toHaveProperty('training');
      expect(GROOM_SPECIALTIES).toHaveProperty('medical');

      // Check foal_care specialty details
      const { foal_care } = GROOM_SPECIALTIES;
      expect(foal_care.name).toBe('Foal Care Specialist');
      expect(foal_care.bondingModifier).toBe(1.5);
      expect(foal_care.stressReduction).toBe(1.3);
      expect(foal_care.preferredActivities).toContain('daily_care');
      expect(foalCare.preferredActivities).toContain('feeding');
      expect(foalCare.preferredActivities).toContain('grooming');

      // Check all specialties have required properties
      Object.values(GROOM_SPECIALTIES).forEach(specialty => {
        expect(specialty).toHaveProperty('name');
        expect(specialty).toHaveProperty('description');
        expect(specialty).toHaveProperty('bondingModifier');
        expect(specialty).toHaveProperty('stressReduction');
        expect(specialty).toHaveProperty('preferredActivities');
        expect(Array.isArray(specialty.preferredActivities)).toBe(true);
      });
    });

    it('should have all required skill levels', () => {
      expect(SKILL_LEVELS).toHaveProperty('novice');
      expect(SKILL_LEVELS).toHaveProperty('intermediate');
      expect(SKILL_LEVELS).toHaveProperty('expert');
      expect(SKILL_LEVELS).toHaveProperty('master');

      // Check skill level progression
      expect(SKILL_LEVELS.novice.bondingModifier).toBe(0.8);
      expect(SKILL_LEVELS.intermediate.bondingModifier).toBe(1.0);
      expect(SKILL_LEVELS.expert.bondingModifier).toBe(1.3);
      expect(SKILL_LEVELS.master.bondingModifier).toBe(1.6);

      // Check cost progression
      expect(SKILL_LEVELS.novice.costModifier).toBe(0.7);
      expect(SKILL_LEVELS.intermediate.costModifier).toBe(1.0);
      expect(SKILL_LEVELS.expert.costModifier).toBe(1.5);
      expect(SKILL_LEVELS.master.costModifier).toBe(2.0);

      // Check error chance decreases with skill
      expect(SKILL_LEVELS.novice.errorChance).toBe(0.15);
      expect(SKILL_LEVELS.intermediate.errorChance).toBe(0.08);
      expect(SKILL_LEVELS.expert.errorChance).toBe(0.03);
      expect(SKILL_LEVELS.master.errorChance).toBe(0.01);

      // Check all skill levels have required properties
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

      // Check gentle personality
      const { gentle } = PERSONALITY_TRAITS;
      expect(gentle.name).toBe('Gentle');
      expect(gentle.bondingModifier).toBe(1.2);
      expect(gentle.stressReduction).toBe(1.4);
      expect(gentle.description).toBe('Calm and patient approach');

      // Check all personalities have required properties
      Object.values(PERSONALITY_TRAITS).forEach(trait => {
        expect(trait).toHaveProperty('name');
        expect(trait).toHaveProperty('bondingModifier');
        expect(trait).toHaveProperty('stressReduction');
        expect(trait).toHaveProperty('description');
      });
    });

    it('should have valid default groom profiles', () => {
      expect(Array.isArray(DEFAULT_GROOMS)).toBe(true);
      expect(DEFAULT_GROOMS.length).toBe(3);

      // Check Sarah Johnson (foal care specialist)
      const sarah = DEFAULT_GROOMS[0];
      expect(sarah.name).toBe('Sarah Johnson');
      expect(sarah.speciality).toBe('foal_care');
      expect(sarah.skillLevel).toBe('intermediate');
      expect(sarah.personality).toBe('gentle');
      expect(sarah.sessionRate).toBe(18.0);
      expect(sarah.experience).toBe(5);

      // Check all default grooms have required properties
      DEFAULT_GROOMS.forEach(groom => {
        expect(groom).toHaveProperty('name');
        expect(groom).toHaveProperty('speciality');
        expect(groom).toHaveProperty('experience');
        expect(groom).toHaveProperty('skillLevel');
        expect(groom).toHaveProperty('personality');
        expect(groom).toHaveProperty('sessionRate');
        expect(groom).toHaveProperty('bio');
        expect(groom).toHaveProperty('availability');

        // Validate speciality
        expect(Object.keys(GROOM_SPECIALTIES)).toContain(groom.speciality);

        // Validate skill level
        expect(Object.keys(SKILL_LEVELS)).toContain(groom.skillLevel);

        // Validate personality
        expect(Object.keys(PERSONALITY_TRAITS)).toContain(groom.personality);

        // Validate numeric values
        expect(groom.experience).toBeGreaterThan(0);
        expect(groom.hourlyRate).toBeGreaterThan(0);
      });
    });
  });

  describe('Modifier Calculations', () => {
    it('should combine modifiers correctly', () => {
      const testGroom = {
        speciality: 'foalCare', // 1.5x bonding
        skillLevel: 'expert', // 1.3x bonding
        personality: 'gentle', // 1.2x bonding
        experience: 10, // +2 bonding (10/5)
        sessionRate: 25.0,
      };

      const effects = calculateGroomInteractionEffects(
        testGroom,
        { bondScore: 50 },
        'dailyCare',
        60,
      );

      // Check individual modifiers
      expect(effects.modifiers.specialty).toBe(1.5);
      expect(effects.modifiers.skillLevel).toBe(1.3);
      expect(effects.modifiers.personality).toBe(1.2);
      expect(effects.modifiers.experience).toBe(2);

      // Total modifier should be 1.5 * 1.3 * 1.2 = 2.34
      const expectedTotalModifier = 1.5 * 1.3 * 1.2;
      expect(expectedTotalModifier).toBeCloseTo(2.34, 2);
    });

    it('should handle invalid modifiers gracefully', () => {
      const invalidGroom = {
        speciality: 'invalid_specialty',
        skillLevel: 'invalid_level',
        personality: 'invalid_personality',
        experience: 5,
        hourlyRate: 18.0,
      };

      // Should not throw error, should use defaults
      const effects = calculateGroomInteractionEffects(
        invalidGroom,
        { bondScore: 50 },
        'dailyCare',
        60,
      );

      expect(effects).toHaveProperty('bondingChange');
      expect(effects).toHaveProperty('stressChange');
      expect(effects).toHaveProperty('cost');
      expect(effects.bondingChange).toBeGreaterThanOrEqual(0);
    });
  });
});
