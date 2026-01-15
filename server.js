import express from "express";
import fetch from "node-fetch";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(express.json());

/* =====================================
   DATABASE INIT (RENDER SAFE ✅)
===================================== */
let db;

async function initDb() {
  db = await open({
    filename: "/var/data/usage.db", // ✅ persistent disk path
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      email TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      paid INTEGER DEFAULT 0
    );
  `);

  console.log("✅ Database initialized");
}

/* =====================================
   RenderPDF helper ✅
===================================== */
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

  const data = await response.json();
  return data.fileUrl;
}

/* =====================================
   OpenAI generator (KEEP YOUR REAL LOGIC)
===================================== */
async function generateWithOpenAI(prompt) {
  // ✅ Replace with your real OpenAI logic
  return `<h1>Generated Content</h1><p>${prompt}</p>`;
}

/* =====================================
   MAIN GENERATOR ROUTE ✅
===================================== */
app.post("/generate", async (req, res) => {
  try {
    const { email, prompt } = req.body;

    if (!email) {
      return res.status(400).json({ error: "EMAIL_REQUIRED" });
    }

    // ✅ Look up usage
    const user = await db.get(
      "SELECT * FROM usage WHERE email = ?",
      email
    );

    if (!user) {
      await db.run(
        "INSERT INTO usage (email, count, paid) VALUES (?, 1, 0)",
        email
      );
    } else {
      if (!user.paid && user.count >= 5) {
        return res.status(402).json({
          error: "FREE_LIMIT_REACHED"
        });
      }

      await db.run(
        "UPDATE usage SET count = count + 1 WHERE email = ?",
        email
      );
    }

    // ✅ Generate AI content
    const aiContent = await generateWithOpenAI(prompt);

    // ✅ Build HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.45;
    }
    h1, h2, h3 {
      page-break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
    }
  </style>
</head>
<body>
  ${aiContent}
</body>
</html>
`;

    // ✅ Generate PDF
    const pdfUrl = await generatePDF(html);

    // ✅ Final response
    res.json({
      html,
      pdfUrl
    });

  } catch (err) {
    console.error("❌ Generate error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =====================================
   SERVER START ✅
===================================== */
const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB init failed", err);
    process.exit(1);
  });
