import dotenv from 'dotenv'
dotenv.config({ path: '.env' })


import express from 'express';
import morgan from 'morgan';
import studentRoutes from './routes/studentRoutes.js';
import connectDB from './db/index.js'
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import { apiLimiter } from './middlewares/rateLimiter.js';
import { logError } from './utils/logger.js';


// initialise express app
const app = express();

// Trust the first proxy (Render, Vercel, Nginx, etc.)
// Without this, the rate limiter thinks all requests come from the same proxy IP
app.set("trust proxy", 1);

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


// Connect Database
connectDB()

// middleware to parse JSON Body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging — skips /health and successful requests to reduce noise
app.use(
  morgan('❌ :method :url | :status', {
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
  logError(`[GlobalErrorHandler] ${req.method} ${req.path}`, err);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected server error occurred.",
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});


