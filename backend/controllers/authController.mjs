import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken, generateRefreshToken } from '../middleware/auth.mjs';
import { AppError, ValidationError } from '../errors/index.mjs';
import logger from '../utils/logger.mjs';
import prisma from '../db/index.mjs';

/**
 * Register a new user and create a corresponding user record.
 */
export const register = async (req, res, next) => {
  // eslint-disable-next-line no-console
  console.log('REGISTER BODY:', req.body); // TEMPORARY FOR DEBUGGING
  try {
    const { username, email, password, firstName, lastName, money, level, xp, settings } = req.body; // Removed 'name' and 'role' from destructuring

    // Validate input
    if (!username || !email || !password) {
      throw new ValidationError('Username, email, and password are required');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new AppError('User with this email or username already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Name construction logic removed - was unused

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null, // Set to null if not provided
        lastName: lastName || null, // Set to null if not provided
        money: money === undefined ? 1000 : money, // Default starting money if not provided
        level: level === undefined ? 1 : level, // Default starting level if not provided
        xp: xp === undefined ? 0 : xp, // Default starting XP if not provided
        settings: settings || {}, // Default empty settings object
      },
    });

    // Generate tokens based on the User identity
    const token = generateToken(user);
    const refreshTokenValue = generateRefreshToken(user);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          money: user.money,
          level: user.level,
          xp: user.xp,
        },
        token,
        refreshToken: refreshTokenValue,
      },
    });
  } catch (error) {
    logger.error('[authController.register] Error registering user:', error);
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      // include: { user: true } // User data not typically returned on login by default
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = generateToken(user);
    const refreshTokenValue = generateRefreshToken(user);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
        refreshToken: refreshTokenValue,
      },
    });
  } catch (error) {
    logger.error('[authController.login] Error logging in user:', error);
    if (error instanceof AppError || error instanceof ValidationError) {
      return next(error);
    }
    next(new AppError('Login failed due to an unexpected error.', 500));
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: providedRefreshToken } = req.body; // Renamed to avoid conflict

    if (!providedRefreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const storedToken = await prisma.refreshToken.findFirst({
      where: { token: providedRefreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    try {
      jwt.verify(providedRefreshToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      logger.warn('[authController.refreshToken] JWT verification failed:', jwtError.message);
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const token = generateToken(storedToken.user);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token,
      },
    });
  } catch (error) {
    logger.error('[authController.refreshToken] Error refreshing token:', error);
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Token refresh failed due to an unexpected error.', 500));
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Authentication error, user not found in request', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    logger.error('[authController.getProfile] Error retrieving profile:', error);
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Failed to retrieve profile due to an unexpected error.', 500));
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { username, email } = req.body;

    // Validate input
    if (!username && !email) {
      throw new ValidationError('At least one field is required');
    }

    // Check for existing username or email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email || '' }, { username: username || '' }],
        NOT: {
          id: req.user.id,
        },
      },
    });

    if (existingUser) {
      throw new AppError('Username or email already in use', 400);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        username: username || undefined,
        email: email || undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error('[authController.updateProfile] Error updating profile:', error);
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (req, res, next) => {
  try {
    // const { refreshToken: _unusedRefreshToken } = req.body; // Marked as unused if not needed for specific token invalidation

    if (req.user?.id) {
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.id },
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('[authController.logout] Error logging out user:', error);
    next(new AppError('Logout failed due to an unexpected error.', 500));
  }
};
