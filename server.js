import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

/* ===== Middleware ===== */
app.use(cors());
app.use(express.json());

/* ===== OpenAI Client ===== */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ===== Health Check (optional but useful) ===== */
app.get("/", (req, res) => {
  res.send("Salubrious AI backend is running ✅");
});

/* ===== Main Generator Endpoint ===== */
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
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
Create a ${resource_type} for a ${grade} ${subject} class.

Topic: ${topic}
Standard: ${standard || "Not specified"}
Length: ${length || "Standard"}

Return TWO sections:
1. Student worksheet
2. Teacher answer key

Format clearly with headings.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert curriculum designer." },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0].message.content;

    // Simple split (you can improve later)
    const [worksheet, answer_key] = text.split(/Answer Key:/i);

    res.json({
      worksheet: worksheet?.trim() || text,
      answer_key: answer_key?.trim() || "Answer key not generated.",
    });
  } catch (error) {
    console.error("❌ Generation error:", error);
    res.status(500).json({ error: "Generation failed" });
  }
});

/* ===== ✅ REQUIRED Render Port Binding ===== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Generator running on port ${PORT}`);
});
