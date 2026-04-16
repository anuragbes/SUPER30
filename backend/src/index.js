import dotenv from 'dotenv'
dotenv.config({ path: '.env' })


import express from 'express';
import studentRoutes from './routes/studentRoutes.js';
import connectDB from './db/index.js'
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import { apiLimiter } from './middlewares/rateLimiter.js';


// initialise express app
const app = express();

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


const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});


