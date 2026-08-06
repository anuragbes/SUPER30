import dotenv from 'dotenv'
dotenv.config({ path: '.env' })


import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import studentRoutes from './routes/studentRoutes.js';
import connectDB from './db/index.js'
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import cookieParser from "cookie-parser";
import { apiLimiter } from './middlewares/rateLimiter.js';
import { logError } from './utils/logger.js';
import { generateRequestId } from './utils/requestId.js';
import { sanitizeRequest } from './middlewares/sanitizeRequest.js';


// initialise express app
const app = express();

// Trust the proxy (Render, Vercel, Nginx, etc.)
// Without this, the rate limiter thinks all requests come from the same internal proxy IP
app.set("trust proxy", "loopback, linklocal, uniquelocal");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://super30-sandy.vercel.app",
      "https://www.bsgurukul.com",
      "https://super30-g748.onrender.com"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Standard security headers. Cross-Origin-Resource-Policy is explicitly set
// to "cross-origin" (Helmet defaults to "same-origin") because the frontend
// (Vercel) and this API (Render) are on different origins by design -- the
// default would fight the CORS config above. Every other Helmet default is
// safe as-is: this backend never serves HTML/templates (verified), so
// Content-Security-Policy and friends are inert on its JSON/PDF responses.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Connect Database
connectDB()

// middleware to parse JSON Body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeRequest);

// Assign a unique requestId to every incoming request
app.use((req, res, next) => {
  req.requestId = generateRequestId();
  req.startTime = Date.now();
  next();
});

// HTTP request logging — only logs 4xx/5xx failures with requestId correlation
morgan.token("id", (req) => req.requestId);
app.use(
  morgan('[HTTP_ERROR] requestId=:id :method :url :status :response-time ms', {
    skip: (req, res) => req.path === '/health' || res.statusCode < 400,
  })
);

// Apply global API rate limiting
app.use('/api/', apiLimiter);

// routes
app.use('/api/students', studentRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.status(200).send("Backend is running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Global error handler
app.use((err, req, res, next) => {
  logError(`GlobalErrorHandler ${req.method} ${req.path}`, err, req);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected server error occurred.",
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

// Crash protection — catch fatal errors that bypass Express
process.on("uncaughtException", (error) => {
  logError("UNCAUGHT_EXCEPTION", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const errorObj = reason instanceof Error ? reason : new Error(typeof reason === "object" ? JSON.stringify(reason) : String(reason));
  logError("UNHANDLED_REJECTION", errorObj);
});
