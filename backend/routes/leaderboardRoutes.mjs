import express from 'express';
import prisma from '../db/index.mjs';
import { query, validationResult } from 'express-validator';
import {
  getTopPlayersByLevel,
  getTopPlayersByXP,
  getTopHorsesByEarnings,
  getTopHorsesByPerformance,
  getTopPlayersByHorseEarnings,
  getRecentWinners,
  getLeaderboardStats,
} from '../controllers/leaderboardController.mjs';
import { getAllDisciplines } from '../utils/competitionLogic.mjs';
import auth from '../middleware/auth.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @swagger
 * /api/leaderboard/players/level:
 *   get:
 *     summary: Get top players ranked by level and XP
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of players to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of players to skip for pagination
 *     responses:
 *       200:
 *         description: List of top players by level
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     players:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: integer
 *                           playerId:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           level:
 *                             type: integer
 *                           xp:
 *                             type: integer
 *                           progressToNext:
 *                             type: number
 *                           xpToNext:
 *                             type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 */
router.get('/players/level', auth, getTopPlayersByLevel);

/**
 * @swagger
 * /api/leaderboard/players/xp:
 *   get:
 *     summary: Get top players ranked by XP earned
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: all
 *         description: Time period for XP ranking
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of players to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of players to skip for pagination
 *     responses:
 *       200:
 *         description: List of top players by XP
 */
router.get('/players/xp', auth, getTopPlayersByXP);

/**
 * @swagger
 * /api/leaderboard/horses/earnings:
 *   get:
 *     summary: Get top horses ranked by total earnings
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: breed
 *         schema:
 *           type: string
 *         description: Filter by specific breed
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of horses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of horses to skip for pagination
 *     responses:
 *       200:
 *         description: List of top horses by earnings
 */
router.get('/horses/earnings', auth, getTopHorsesByEarnings);

/**
 * @swagger
 * /api/leaderboard/horses/performance:
 *   get:
 *     summary: Get top horses ranked by performance metrics
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [wins, placements, average_score]
 *           default: wins
 *         description: Performance metric to rank by
 *       - in: query
 *         name: discipline
 *         schema:
 *           type: string
 *         description: Filter by specific discipline
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of horses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of horses to skip for pagination
 *     responses:
 *       200:
 *         description: List of top horses by performance
 */
router.get('/horses/performance', auth, getTopHorsesByPerformance);

/**
 * @swagger
 * /api/leaderboard/players/horse-earnings:
 *   get:
 *     summary: Get top players ranked by combined horse earnings
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of players to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of players to skip for pagination
 *     responses:
 *       200:
 *         description: List of top players by horse earnings
 */
router.get('/players/horse-earnings', auth, getTopPlayersByHorseEarnings);

/**
 * @swagger
 * /api/leaderboard/recent-winners:
 *   get:
 *     summary: Get recent competition winners
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: discipline
 *         schema:
 *           type: string
 *         description: Filter by specific discipline
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of recent winners to return
 *     responses:
 *       200:
 *         description: List of recent competition winners
 */
router.get('/recent-winners', auth, getRecentWinners);

/**
 * @swagger
 * /api/leaderboard/stats:
 *   get:
 *     summary: Get comprehensive leaderboard statistics
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive leaderboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     playerStats:
 *                       type: object
 *                     horseStats:
 *                       type: object
 *                     competitionStats:
 *                       type: object
 *                     topPerformers:
 *                       type: object
 */
router.get('/stats', auth, getLeaderboardStats);

/**
 * @swagger
 * /api/leaderboard/competition:
 *   get:
 *     summary: Get competition leaderboards with enhanced filtering
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: discipline
 *         schema:
 *           type: string
 *         description: Filter by specific discipline
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: all
 *         description: Time period for competition results
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [wins, earnings, placements, average_placement]
 *           default: wins
 *         description: Metric to rank by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip for pagination
 *     responses:
 *       200:
 *         description: Competition leaderboard results
 */
router.get(
  '/competition',
  auth,
  [
    query('discipline')
      .optional()
      .isString()
      .custom(value => {
        if (value && !getAllDisciplines().includes(value)) {
          throw new Error('Invalid discipline');
        }
        return true;
      }),
    query('period')
      .optional()
      .isIn(['week', 'month', 'year', 'all'])
      .withMessage('Period must be one of: week, month, year, all'),
    query('metric')
      .optional()
      .isIn(['wins', 'earnings', 'placements', 'average_placement'])
      .withMessage('Metric must be one of: wins, earnings, placements, average_placement'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(
          `[leaderboardRoutes.GET /competition] Validation errors: ${JSON.stringify(errors.array())}`,
        );
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { discipline, period = 'all', metric = 'wins', limit = 20, offset = 0 } = req.query;

      logger.info(
        `[leaderboardRoutes.GET /competition] Getting competition leaderboard: discipline=${discipline}, period=${period}, metric=${metric}`,
      );

      // Calculate date filter based on period
      let dateFilter = {};
      if (period !== 'all') {
        const now = new Date();
        let startDate;

        switch (period) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }

        if (startDate) {
          dateFilter = {
            runDate: {
              gte: startDate.toISOString().split('T')[0],
            },
          };
        }
      }

      // Build where clause
      const whereClause = {
        placement: { not: null }, // Only completed competitions
        ...dateFilter,
      };

      if (discipline) {
        whereClause.discipline = discipline;
      }

      // Get competition results based on metric
      let results = [];

      if (metric === 'wins') {
        // Count wins (1st place) per horse
        const winCounts = await prisma.competitionResult.groupBy({
          by: ['horseId'],
          where: {
            ...whereClause,
            placement: '1',
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
        });

        // Get horse details for winners
        const horseIds = winCounts.map(w => w.horseId);
        const horses = await prisma.horse.findMany({
          where: { id: { in: horseIds } },
          include: { user: { select: { id: true, username: true } } },
        });

        results = winCounts.map((winCount, index) => {
          const horse = horses.find(h => h.id === winCount.horseId);
          return {
            rank: parseInt(offset) + index + 1,
            horseId: winCount.horseId,
            horseName: horse?.name || 'Unknown',
            userId: horse?.userId,
            userName: horse?.user?.username || 'Unknown',
            wins: winCount._count.id,
            metric: 'wins',
            value: winCount._count.id,
          };
        });
      } else if (metric === 'earnings') {
        // Sum earnings per horse
        const earnings = await prisma.competitionResult.groupBy({
          by: ['horseId'],
          where: whereClause,
          _sum: {
            prizeWon: true,
          },
          orderBy: {
            _sum: {
              prizeWon: 'desc',
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
        });

        // Get horse details
        const horseIds = earnings.map(e => e.horseId);
        const horses = await prisma.horse.findMany({
          where: { id: { in: horseIds } },
          include: { user: { select: { id: true, username: true } } },
        });

        results = earnings.map((earning, index) => {
          const horse = horses.find(h => h.id === earning.horseId);
          return {
            rank: parseInt(offset) + index + 1,
            horseId: earning.horseId,
            horseName: horse?.name || 'Unknown',
            userId: horse?.userId,
            userName: horse?.user?.username || 'Unknown',
            totalEarnings: Number(earning._sum.prizeWon) || 0,
            metric: 'earnings',
            value: Number(earning._sum.prizeWon) || 0,
          };
        });
      } else if (metric === 'placements') {
        // Count top 3 placements per horse
        const placements = await prisma.competitionResult.groupBy({
          by: ['horseId'],
          where: {
            ...whereClause,
            placement: { in: ['1', '2', '3'] },
          },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
        });

        // Get horse details
        const horseIds = placements.map(p => p.horseId);
        const horses = await prisma.horse.findMany({
          where: { id: { in: horseIds } },
          include: { user: { select: { id: true, username: true } } },
        });

        results = placements.map((placement, index) => {
          const horse = horses.find(h => h.id === placement.horseId);
          return {
            rank: parseInt(offset) + index + 1,
            horseId: placement.horseId,
            horseName: horse?.name || 'Unknown',
            userId: horse?.userId,
            userName: horse?.user?.username || 'Unknown',
            topPlacements: placement._count.id,
            metric: 'placements',
            value: placement._count.id,
          };
        });
      } else if (metric === 'average_placement') {
        // Calculate average placement per horse
        const avgPlacements = await prisma.competitionResult.groupBy({
          by: ['horseId'],
          where: whereClause,
          _avg: {
            placement: true,
          },
          _count: {
            id: true,
          },
          having: {
            id: {
              _count: {
                gte: 3, // Minimum 3 competitions for average
              },
            },
          },
          orderBy: {
            _avg: {
              placement: 'asc', // Lower average placement is better
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
        });

        // Get horse details
        const horseIds = avgPlacements.map(a => a.horseId);
        const horses = await prisma.horse.findMany({
          where: { id: { in: horseIds } },
          include: { user: { select: { id: true, username: true } } },
        });

        results = avgPlacements.map((avgPlacement, index) => {
          const horse = horses.find(h => h.id === avgPlacement.horseId);
          return {
            rank: parseInt(offset) + index + 1,
            horseId: avgPlacement.horseId,
            horseName: horse?.name || 'Unknown',
            userId: horse?.userId,
            userName: horse?.user?.username || 'Unknown',
            averagePlacement: Number(avgPlacement._avg.placement) || 0,
            competitionCount: avgPlacement._count.id,
            metric: 'average_placement',
            value: Number(avgPlacement._avg.placement) || 0,
          };
        });
      }

      // Get total count for pagination
      const totalCount = await prisma.competitionResult.groupBy({
        by: ['horseId'],
        where: whereClause,
        _count: {
          id: true,
        },
      });

      logger.info(
        `[leaderboardRoutes.GET /competition] Retrieved ${results.length} leaderboard entries`,
      );

      res.status(200).json({
        success: true,
        data: {
          leaderboard: results,
          filters: {
            discipline,
            period,
            metric,
          },
          pagination: {
            total: totalCount.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < totalCount.length,
          },
        },
      });
    } catch (error) {
      logger.error(`[leaderboardRoutes.GET /competition] Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      });
    }
  },
);

export default router;
