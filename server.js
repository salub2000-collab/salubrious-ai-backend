const express = require("express");
const cors = require("cors");

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
// Version Check
// =======================
app.get("/version", (req, res) => {
  res.send("DEPLOYED VERSION: PUBLIC / NO LOGIN / NO PDF");
});

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

    // ✅ Build prompt from frontend fields
    const output = `
Generated Resource

Grade: ${grade}
Resource Type: ${resource_type}
Subject: ${subject}
Topic: ${topic}
Standard: ${standard || "N/A"}
Length: ${length || "N/A"}
Scope: ${scope || "N/A"}
Output Type: ${output_type || "N/A"}

This is a placeholder response.
Replace this logic with your AI generator.
`;

    // ✅ Return EXACTLY what frontend expects
    res.json({
      output
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
