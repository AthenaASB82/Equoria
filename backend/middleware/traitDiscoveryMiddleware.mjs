/**
 * Trait Discovery Middleware
 * Automatically triggers trait discovery when certain conditions are met
 */

import { revealTraits } from '../utils/traitDiscovery.mjs';
import logger from '../utils/logger.mjs';

/**
 * Middleware to automatically check for trait discoveries after horse updates
 * This middleware should be used after operations that might trigger discoveries:
 * - Bond score changes
 * - Stress level changes
 * - Enrichment activity completion
 * - Training completion
 */
export function autoDiscoveryMiddleware(options = {}) {
  const {
    checkEnrichment = true,
    skipIfRecentlyChecked = true,
    recentCheckThreshold = 5 * 60 * 1000, // 5 minutes
  } = options;

  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json;

    res.json = function (data) {
      // Call original json method first
      const result = originalJson.call(this, data);

      // Only trigger discovery on successful operations
      if (data?.success && res.statusCode >= 200 && res.statusCode < 300) {
        // Extract horse ID from various possible sources
        const horseId = extractHorseId(req, data);

        if (horseId) {
          // Trigger discovery asynchronously (don't block response)
          setImmediate(async () => {
            try {
              await triggerAutoDiscovery(horseId, {
                checkEnrichment,
                skipIfRecentlyChecked,
                recentCheckThreshold,
                trigger: req.route?.path || req.path,
              });
            } catch (error) {
              logger.error(
                `[traitDiscoveryMiddleware] Auto-discovery failed for horse ${horseId}: ${error.message}`,
              );
            }
          });
        }
      }

      return result;
    };

    next();
  };
}

/**
 * Extract horse ID from request or response data
 * @param {Object} req - Express request object
 * @param {Object} data - Response data
 * @returns {number|null} Horse ID or null if not found
 */
function extractHorseId(req, data) {
  // Try to get horse ID from various sources
  let horseId = null;

  // From URL parameters
  if (req.params.horseId) {
    horseId = parseInt(req.params.horseId, 10);
  } else if (req.params.foalId) {
    horseId = parseInt(req.params.foalId, 10);
  } else if (req.params.id) {
    horseId = parseInt(req.params.id, 10);
  }

  // From request body
  if (!horseId && req.body) {
    if (req.body.horseId) {
      horseId = parseInt(req.body.horseId, 10);
    } else if (req.body.foalId) {
      horseId = parseInt(req.body.foalId, 10);
    }
  }

  // From response data
  if (!horseId && data && data.data) {
    if (data.data.horseId) {
      horseId = parseInt(data.data.horseId, 10);
    } else if (data.data.foalId) {
      horseId = parseInt(data.data.foalId, 10);
    } else if (data.data.foal?.id) {
      horseId = parseInt(data.data.foal.id, 10);
    }
  }

  // Validate horse ID
  if (isNaN(horseId) || horseId <= 0) {
    return null;
  }

  return horseId;
}

/**
 * Trigger automatic trait discovery for a horse
 * @param {number} horseId - Horse ID
 * @param {Object} options - Discovery options
 */
async function triggerAutoDiscovery(horseId, options = {}) {
  const {
    checkEnrichment = true,
    skipIfRecentlyChecked = true,
    recentCheckThreshold = 5 * 60 * 1000,
    trigger = 'unknown',
  } = options;

  try {
    logger.debug(
      `[traitDiscoveryMiddleware.triggerAutoDiscovery] Checking discovery for horse ${horseId} (trigger: ${trigger})`,
    );

    // Check if we should skip due to recent check
    if (skipIfRecentlyChecked) {
      const lastCheck = await getLastDiscoveryCheck(horseId);
      if (lastCheck && Date.now() - lastCheck.getTime() < recentCheckThreshold) {
        logger.debug(
          `[traitDiscoveryMiddleware.triggerAutoDiscovery] Skipping discovery for horse ${horseId} - recently checked`,
        );
        return;
      }
    }

    // Perform discovery
    const discoveryResult = await revealTraits(horseId, {
      checkEnrichment,
      forceCheck: false,
    });

    // Update last check time
    await updateLastDiscoveryCheck(horseId);

    // Log significant discoveries
    if (discoveryResult.revealed && discoveryResult.revealed.length > 0) {
      logger.info(
        `[traitDiscoveryMiddleware.triggerAutoDiscovery] Auto-discovered ${discoveryResult.revealed.length} traits for horse ${horseId} (trigger: ${trigger})`,
      );

      // Emit discovery event for real-time updates (if WebSocket is available)
      emitDiscoveryEvent(horseId, discoveryResult);
    }
  } catch (error) {
    logger.error(
      `[traitDiscoveryMiddleware.triggerAutoDiscovery] Error during auto-discovery for horse ${horseId}: ${error.message}`,
    );
  }
}

/**
 * Get last discovery check time for a horse
 * @param {number} horseId - Horse ID
 * @returns {Date|null} Last check time or null
 */
async function getLastDiscoveryCheck(horseId) {
  try {
    // For now, we'll use a simple in-memory cache
    // In production, you might want to store this in Redis or database
    if (!global.discoveryCheckCache) {
      global.discoveryCheckCache = new Map();
    }

    return global.discoveryCheckCache.get(horseId) || null;
  } catch (error) {
    logger.warn(
      `[traitDiscoveryMiddleware.getLastDiscoveryCheck] Error getting last check time: ${error.message}`,
    );
    return null;
  }
}

/**
 * Update last discovery check time for a horse
 * @param {number} horseId - Horse ID
 */
async function updateLastDiscoveryCheck(horseId) {
  try {
    if (!global.discoveryCheckCache) {
      global.discoveryCheckCache = new Map();
    }

    global.discoveryCheckCache.set(horseId, new Date());

    // Clean up old entries (keep only last 1000 entries)
    if (global.discoveryCheckCache.size > 1000) {
      const entries = Array.from(global.discoveryCheckCache.entries());
      entries.sort((a, b) => b[1].getTime() - a[1].getTime());

      global.discoveryCheckCache.clear();
      entries.slice(0, 1000).forEach(([id, time]) => {
        global.discoveryCheckCache.set(id, time);
      });
    }
  } catch (error) {
    logger.warn(
      `[traitDiscoveryMiddleware.updateLastDiscoveryCheck] Error updating last check time: ${error.message}`,
    );
  }
}

/**
 * Emit discovery event for real-time updates
 * @param {number} horseId - Horse ID
 * @param {Object} discoveryResult - Discovery result
 */
function emitDiscoveryEvent(horseId, discoveryResult) {
  try {
    // Check if WebSocket/Socket.IO is available
    if (global.io) {
      global.io.emit('traitDiscovered', {
        horseId,
        timestamp: new Date().toISOString(),
        ...discoveryResult,
      });

      logger.debug(
        `[traitDiscoveryMiddleware.emitDiscoveryEvent] Emitted discovery event for horse ${horseId}`,
      );
    }
  } catch (error) {
    logger.warn(
      `[traitDiscoveryMiddleware.emitDiscoveryEvent] Error emitting discovery event: ${error.message}`,
    );
  }
}

/**
 * Middleware specifically for foal enrichment activities
 * Triggers discovery after enrichment completion
 */
export function enrichmentDiscoveryMiddleware() {
  return autoDiscoveryMiddleware({
    checkEnrichment: true,
    skipIfRecentlyChecked: true,
    recentCheckThreshold: 2 * 60 * 1000, // 2 minutes for enrichment
  });
}

/**
 * Middleware specifically for training activities
 * Triggers discovery after training completion
 */
export function trainingDiscoveryMiddleware() {
  return autoDiscoveryMiddleware({
    checkEnrichment: false,
    skipIfRecentlyChecked: true,
    recentCheckThreshold: 10 * 60 * 1000, // 10 minutes for training
  });
}

/**
 * Middleware specifically for bonding/stress updates
 * Triggers discovery after significant stat changes
 */
export function bondingDiscoveryMiddleware() {
  return autoDiscoveryMiddleware({
    checkEnrichment: true,
    skipIfRecentlyChecked: true,
    recentCheckThreshold: 1 * 60 * 1000, // 1 minute for bonding changes
  });
}

/**
 * Manual discovery trigger for specific routes
 * Use this when you want to force discovery checks
 */
export async function manualDiscoveryTrigger(horseId, options = {}) {
  try {
    logger.info(
      `[traitDiscoveryMiddleware.manualDiscoveryTrigger] Manual discovery triggered for horse ${horseId}`,
    );

    const discoveryResult = await revealTraits(horseId, {
      checkEnrichment: true,
      forceCheck: true,
      ...options,
    });

    // Emit discovery event
    if (discoveryResult.revealed && discoveryResult.revealed.length > 0) {
      emitDiscoveryEvent(horseId, discoveryResult);
    }

    return discoveryResult;
  } catch (error) {
    logger.error(
      `[traitDiscoveryMiddleware.manualDiscoveryTrigger] Error during manual discovery: ${error.message}`,
    );
    throw error;
  }
}

export default {
  autoDiscoveryMiddleware,
  enrichmentDiscoveryMiddleware,
  trainingDiscoveryMiddleware,
  bondingDiscoveryMiddleware,
  manualDiscoveryTrigger,
};
