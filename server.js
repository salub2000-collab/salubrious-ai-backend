const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// Health Check
// =======================
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// =======================
// Version
// =======================
app.get("/version", (req, res) => {
  res.send("DEPLOYED VERSION: PUBLIC + OPENAI");
});

// =======================
// OpenAI Generator
// =======================
async function generateWithOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert K–12 curriculum designer."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();

  if (!data.choices) {
    throw new Error("OpenAI response error");
  }

  return data.choices[0].message.content;
}

// =======================
// MAIN GENERATION ENDPOINT ✅
// =======================
app.post("/generate", async (req, res) => {
  try {
    const {
      grade,
      resource_type,
      subject,
      topic,
      standard,
      length,
      scope,
      output_type
    } = req.body;

    const prompt = `
Create a ${resource_type} for Grade ${grade} students.

Subject: ${subject}
Topic: ${topic}
Standard: ${standard || "N/A"}
Length: ${length || "N/A"}
Scope: ${scope || "N/A"}
Output type: ${output_type || "Teacher-ready instructional material"}

Include:
- Clear instructions
- Student-friendly language
- Examples
- Practice problems
- Answer key if appropriate
`;

    const aiOutput = await generateWithOpenAI(prompt);

    res.json({
      output: aiOutput
    });

  } catch (err) {
    console.error("❌ Generate error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// =======================
// Server Bootstrap
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
