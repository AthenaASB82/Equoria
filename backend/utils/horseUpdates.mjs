import prisma from '../db/index.mjs';
import logger from './logger.mjs';

/**
 * Update horse earnings after competition
 * @param {number} horseId - Horse ID
 * @param {number} prizeAmount - Prize amount to add
 * @returns {Object} - Updated horse object
 */
async function updateHorseEarnings(horseId, prizeAmount) {
  try {
    if (!horseId || typeof horseId !== 'number' || horseId <= 0) {
      throw new Error('Valid horse ID is required');
    }

    if (!prizeAmount || typeof prizeAmount !== 'number' || prizeAmount < 0) {
      throw new Error('Valid prize amount is required');
    }

    const updatedHorse = await prisma.horse.update({
      where: { id: horseId },
      data: {
        earnings: {
          increment: prizeAmount,
        },
      },
      include: {
        breed: true,
        owner: true,
        stable: true,
        player: true,
      },
    });

    logger.info(
      `[horseUpdates.updateHorseEarnings] Updated horse ${horseId} earnings by $${prizeAmount} (total: $${updatedHorse.earnings})`,
    );
    return updatedHorse;
  } catch (error) {
    logger.error(
      `[horseUpdates.updateHorseEarnings] Error updating horse earnings: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Update horse stat after competition win
 * @param {number} horseId - Horse ID
 * @param {string} statName - Name of stat to increase
 * @param {number} increase - Amount to increase (default 1)
 * @returns {Object} - Updated horse object
 */
async function updateHorseStat(horseId, statName, increase = 1) {
  try {
    if (!horseId || typeof horseId !== 'number' || horseId <= 0) {
      throw new Error('Valid horse ID is required');
    }

    if (!statName || typeof statName !== 'string') {
      throw new Error('Valid stat name is required');
    }

    if (!increase || typeof increase !== 'number' || increase <= 0) {
      throw new Error('Valid increase amount is required');
    }

    // Validate stat name
    const validStats = [
      'speed',
      'stamina',
      'agility',
      'balance',
      'precision',
      'intelligence',
      'boldness',
      'flexibility',
      'obedience',
      'focus',
    ];

    if (!validStats.includes(statName)) {
      throw new Error(`Invalid stat name: ${statName}. Must be one of: ${validStats.join(', ')}`);
    }

    // Build dynamic update object
    const updateData = {
      [statName]: {
        increment: increase,
      },
    };

    const updatedHorse = await prisma.horse.update({
      where: { id: horseId },
      data: updateData,
      include: {
        breed: true,
        owner: true,
        stable: true,
        player: true,
      },
    });

    logger.info(
      `[horseUpdates.updateHorseStat] Updated horse ${horseId} ${statName} by +${increase} (new value: ${updatedHorse[statName]})`,
    );
    return updatedHorse;
  } catch (error) {
    logger.error(`[horseUpdates.updateHorseStat] Error updating horse stat: ${error.message}`);
    throw error;
  }
}

/**
 * Update both earnings and stats for a competition winner
 * @param {number} horseId - Horse ID
 * @param {number} prizeAmount - Prize amount to add
 * @param {Object|null} statGain - Stat gain object {stat, gain} or null
 * @returns {Object} - Updated horse object
 */
async function updateHorseRewards(horseId, prizeAmount, statGain = null) {
  try {
    // Start with earnings update
    let updatedHorse = await updateHorseEarnings(horseId, prizeAmount);

    // Apply stat gain if applicable
    if (statGain?.stat && statGain.gain) {
      updatedHorse = await updateHorseStat(horseId, statGain.stat, statGain.gain);
    }

    return updatedHorse;
  } catch (error) {
    logger.error(
      `[horseUpdates.updateHorseRewards] Error updating horse rewards: ${error.message}`,
    );
    throw error;
  }
}

export { updateHorseEarnings, updateHorseStat, updateHorseRewards };
