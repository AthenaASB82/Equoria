import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.mjs';

/**
 * Security Middleware Configuration
 * Implements comprehensive security measures for the API
 */

// CORS configuration
export const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];

    // Add production origins from environment
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Rate limiting configuration
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs, // 15 minutes default
    max, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Helmet configuration for security headers
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

// API-specific rate limiters
export const apiLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const strictLimiter = createRateLimiter(15 * 60 * 1000, 20); // 20 requests per 15 minutes
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes

// Security middleware factory
export const createSecurityMiddleware = () => {
  return [helmet(helmetConfig), cors(corsOptions), apiLimiter];
};
