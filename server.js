import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let db;

/* =====================================
   DATABASE INITIALIZATION ✅
===================================== */
async function initDb() {
  db = await open({
    filename: "/var/data/usage.db", // ✅ Render persistent disk
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
   PDF GENERATION ✅
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

  if (!response.ok) {
    throw new Error("PDF generation failed");
  }

  const data = await response.json();
  return data.fileUrl;
}

/* =====================================
   OPENAI GENERATOR (PLACEHOLDER)
===================================== */
async function generateWithOpenAI(prompt) {
  return `<h1>Generated Content</h1><p>${prompt}</p>`;
}

/* =====================================
   MAIN GENERATION ENDPOINT ✅
===================================== */
app.post("/generate", async (req, res) => {
  try {
    const { email, prompt } = req.body;

    if (!email) {
      return res.status(400).json({ error: "EMAIL_REQUIRED" });
    }

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

    res.json({ html, pdfUrl });

  } catch (err) {
    console.error("❌ Generate error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =====================================
   EMAIL GENERATOR LOGIN ✅
===================================== */
app.post("/email-login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.redirect("https://salubriousai.com/email-login-generator/");
    }

    let user = await db.get(
      "SELECT * FROM usage WHERE email = ?",
      email
    );

    // ✅ First-time email
    if (!user) {
      await db.run(
        "INSERT INTO usage (email, count, paid) VALUES (?, 0, 0)",
        email
      );

      res.cookie("salai_email", email, { path: "/" });
      return res.redirect("https://salubriousai.com/generator");
    }

    // ✅ PAID USERS ALWAYS ALLOWED
    if (user.paid === 1) {
      res.cookie("salai_email", email, { path: "/" });
      return res.redirect("https://salubriousai.com/generator");
    }

    // ✅ FREE USERS WITH USES LEFT
    if (user.count < 5) {
      res.cookie("salai_email", email, { path: "/" });
      return res.redirect("https://salubriousai.com/generator");
    }

    // ❌ FREE LIMIT REACHED
    return res.redirect("https://salubriousai.com/used");

  } catch (err) {
    console.error("❌ Email login error:", err);
    return res.redirect("https://salubriousai.com/used");
  }
});

/* =====================================
   ACTIVATE PAID USER ✅
===================================== */
app.post("/activate-paid", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "EMAIL_REQUIRED" });
    }

    const user = await db.get(
      "SELECT * FROM usage WHERE email = ?",
      email
    );

    if (!user) {
      await db.run(
        "INSERT INTO usage (email, count, paid) VALUES (?, 0, 1)",
        email
      );
    } else {
      await db.run(
        "UPDATE usage SET paid = 1 WHERE email = ?",
        email
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Activate paid error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =====================================
   SERVER BOOTSTRAP ✅
===================================== */
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
}

startServer();
