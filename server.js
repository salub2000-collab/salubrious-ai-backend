import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

/* =========================
   Middleware
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   OpenAI Client
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   Health Check
========================= */
app.get("/", (req, res) => {
  res.send("Salubrious AI backend is running ✅");
});

/* =========================
   Generator Endpoint
========================= */
app.post("/generate-resource", async (req, res) => {
  try {
    const {
      grade,
      subject,
      resource_type,
      topic,
      standard,
      length,
    } = req.body;

    if (!grade || !subject || !resource_type || !topic) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const prompt = `
Create a ${resource_type} for a ${grade} ${subject} class.

Topic: ${topic}
Standard: ${standard || "Not specified"}
Length: ${length || "Standard"}

Return TWO clearly labeled sections:

STUDENT WORKSHEET
TEACHER ANSWER KEY
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert curriculum designer.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const output = completion.choices[0].message.content;

    let worksheet = output;
    let answer_key = "Answer key not found.";

    if (output.toLowerCase().includes("answer key")) {
      const parts = output.split(/answer key/i);
      worksheet = parts[0].trim();
      answer_key = parts[1]?.trim() || answer_key;
    }

    res.json({
      worksheet,
      answer_key,
    });
  } catch (error) {
    console.error("❌ Error generating resource:", error);
    res.status(500).json({
      error: "Failed to generate resource",
    });
  }
});

/* =========================
   ✅ REQUIRED Render Port
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Generator running on port ${PORT}`);
});
