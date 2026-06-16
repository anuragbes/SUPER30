import rateLimit from "express-rate-limit";
import { logSecurity } from "../utils/logger.js";

const limitHandler = (req, res, next, options) => {
  logSecurity("RATE_LIMIT_EXCEEDED", { requestId: req.requestId, path: req.originalUrl, limit: options.max }, req);
  res.status(options.statusCode).send({ error: options.message });
};

// General API rate limiter - 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => req.headers["x-admin-bypass"] === "true", // Skip for admins
  handler: limitHandler,
});

// Student registration limiter - 10 requests per 1 hour per IP
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many registrations from this IP. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// Admin login limiter - 5 attempts per 15 minutes per IP (brute force protection)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  handler: limitHandler,
});

// Email sending limiter - 10 requests per 1 hour per IP, but bypass admin users
// Note: This is applied AFTER adminAuth middleware, so req.admin will be set for authenticated admins
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many email requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated admin users
    return req.admin !== undefined;
  },
  handler: limitHandler,
});

// Bulk operations limiter - 3 requests per 1 hour per IP, bypass admin users
// Note: This is applied AFTER adminAuth middleware, so req.admin will be set for authenticated admins
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: "Too many bulk operations. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated admin users
    return req.admin !== undefined;
  },
  handler: limitHandler,
});
