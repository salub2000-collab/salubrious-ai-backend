import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());

// =====================
// API KEY AUTH MIDDLEWARE
// =====================
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

// =====================
// RATE LIMITER
// =====================
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,            // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================
// OPENAI CLIENT
// =====================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================
// ROUTES
// =====================

// Health check
app.get("/", (req, res) => {
  res.send("AI Generator running...");
});

// ✅ SECURED GENERATION ENDPOINT
app.post(
  "/generate",
  generateLimiter,
  requireApiKey,
  async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: prompt }
        ],
      });

      res.json({
        output: response.choices[0].message.content
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Generation failed" });
    }
  }
);

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`AI Generator running on port ${PORT}`);
});
