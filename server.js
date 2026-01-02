// imports at top
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =====================
// EXISTING MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());

// ✅ PASTE THIS RIGHT HERE
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// =====================
// ROUTES
// =====================
app.get("/", (req, res) => {
  res.send("AI Generator running...");
});

app.post(
  "/generate",
  generateLimiter,
  requireApiKey,
  async (req, res) => {
    // existing generate logic
  }
);

app.listen(PORT, () => {
  console.log(`AI Generator running on port ${PORT}`);
});
