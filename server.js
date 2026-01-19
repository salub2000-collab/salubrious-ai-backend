const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let db;

// =======================
// Database Initialization
// =======================
async function initDb() {
  db = await open({
    filename: "./usage.db",
    driver: sqlite3.Database
  });

  console.log("✅ Database initialized (no auth)");
}

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
  res.send("DEPLOYED VERSION: PUBLIC / NO LOGIN / FRONTEND MATCH");
});

// =======================
// PDF Generation
// =======================
async function generatePDF(html) {
  const response = await fetch(
    "https://renderpdf.io/api/pdfs/render-sync",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RENDERPDF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        htmlContent: html,
        paperWidth: "8.5in",
        paperHeight: "11in",
        landscape: false
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PDF API Error:", errorText);
    throw new Error("PDF generation failed");
  }

  const data = await response.json();
  return data.fileUrl;
}

// =======================
// OpenAI Generator (Placeholder)
// =======================
async function generateWithOpenAI(prompt) {
  return `<h1>Generated Content</h1><p>${prompt}</p>`;
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
Create a ${resource_type}.
Grade level: ${grade}
Subject: ${subject}
Topic: ${topic}
Standard: ${standard || "N/A"}
Length: ${length || "N/A"}
Scope: ${scope || "N/A"}
Output type: ${output_type || "N/A"}
`;

    const aiContent = await generateWithOpenAI(prompt);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; }
  </style>
</head>
<body>
  ${aiContent}
</body>
</html>
`;

    const pdfUrl = await generatePDF(html);

    res.json({
      html,
      pdfUrl
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

(async () => {
  try {
    await initDb();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
})();
