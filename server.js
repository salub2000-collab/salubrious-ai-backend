// server.js — FINAL WORKING VERSION (Node 24+, built-in fetch)

const express = require("express");
const cors = require("cors");

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost",
    "http://localhost:3000",
    "https://salubriousai.com",
    "https://www.salubriousai.com"
  ],
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));

/* =====================
   ROUTE
===================== */
app.post("/generate-resource", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY not set"
      });
    }

    const f = req.body || {};

    const prompt = `
You are an experienced classroom teacher and curriculum designer.

Grade: ${f.grade || ""}
Subject: ${f.subject || ""}
Resource Type: ${f.resource_type || ""}
Topic: ${f.topic || ""}
Standard: ${f.standard || ""}
Length: ${f.length || ""}

Generate:
1) Student-facing worksheet
2) Teacher answer key

Rules:
- Classroom-safe language
- No emojis
- Clear formatting
- Label the answer key EXACTLY as: ANSWER KEY:
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "OpenAI API error",
        details: data
      });
    }

    // ✅ Correct Responses API text extraction
    let text = "";

    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text") {
              text += c.text;
            }
          }
        }
      }
    }

    if (!text) {
      return res.status(500).json({
        error: "No text returned from OpenAI",
        raw: data
      });
    }

    const parts = text.split("ANSWER KEY:");

    res.json({
      worksheet: (parts[0] || "").trim(),
      answer_key: (parts[1] || "").trim()
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      error: "Generation failed",
      details: String(err)
    });
  }
});

/* =====================
   START SERVER
===================== */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`AI Generator running on port ${PORT}`);
});
