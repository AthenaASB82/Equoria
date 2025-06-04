import request from 'supertest';
import express from 'express';
import {
  corsOptions,
  createRateLimiter,
  helmetConfig,
  createSecurityMiddleware,
} from '../../middleware/security.mjs';

// Simple mock for logger
const _mockLogger = {
  warn: () => {},
};

describe('Security Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  describe('CORS Configuration', () => {
    it('should allow requests from localhost:3000', done => {
      corsOptions.origin('http://localhost:3000', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
        done();
      });
    });

    it('should allow requests from localhost:3001', done => {
      corsOptions.origin('http://localhost:3001', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
        done();
      });
    });

    it('should allow requests with no origin', done => {
      corsOptions.origin(undefined, (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);
        done();
      });
    });

    it('should block requests from unauthorized origins', done => {
      corsOptions.origin('http://malicious-site.com', (err, allowed) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Not allowed by CORS');
        expect(allowed).toBeUndefined();
        done();
      });
    });

    it('should allow origins from environment variable', done => {
      const originalEnv = process.env.ALLOWED_ORIGINS;
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      // Re-import to get updated environment
      corsOptions.origin('https://example.com', (err, allowed) => {
        expect(err).toBeNull();
        expect(allowed).toBe(true);

        process.env.ALLOWED_ORIGINS = originalEnv;
        done();
      });
    });
  });

  describe('Rate Limiter', () => {
    it('should create rate limiter with default values', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create rate limiter with custom values', () => {
      const limiter = createRateLimiter(60000, 50); // 1 minute, 50 requests
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should limit requests when threshold is exceeded', async () => {
      const limiter = createRateLimiter(60000, 2); // Very low limit for testing

      app.use(limiter);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      // First request should succeed
      await request(app).get('/test').expect(200);

      // Second request should succeed
      await request(app).get('/test').expect(200);

      // Third request should be rate limited
      const response = await request(app).get('/test').expect(429);

      expect(response.body).toEqual({
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 60,
      });
    });
  });

  describe('Helmet Configuration', () => {
    it('should have proper CSP directives', () => {
      expect(helmetConfig.contentSecurityPolicy.directives).toEqual({
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      });
    });

    it('should have HSTS configuration', () => {
      expect(helmetConfig.hsts).toEqual({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      });
    });

    it('should disable crossOriginEmbedderPolicy for API compatibility', () => {
      expect(helmetConfig.crossOriginEmbedderPolicy).toBe(false);
    });
  });

  describe('Security Middleware Factory', () => {
    it('should create security middleware array', () => {
      const middleware = createSecurityMiddleware();
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware).toHaveLength(3);

      // Each item should be a function (middleware)
      middleware.forEach(mw => {
        expect(typeof mw).toBe('function');
      });
    });

    it('should apply security headers through helmet', async () => {
      const middleware = createSecurityMiddleware();

      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test').expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });
});
