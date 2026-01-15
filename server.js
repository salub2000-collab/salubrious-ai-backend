import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Open database
const db = await open({
  filename: "./usage.db",
  driver: sqlite3.Database
});

// Create table if it doesn't exist
await db.exec(`
  CREATE TABLE IF NOT EXISTS usage (
    email TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    paid INTEGER DEFAULT 0
  );
`);
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

/* =====================================
   RenderPDF helper ✅
   (PASTE THIS NEAR THE TOP)
===================================== */
async function generatePDF(html) {
  const response = await fetch(
    "https://renderpdf.io/api/pdfs/render-sync",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RENDERPDF_API_KEY}`,
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
   OpenAI function (yours already exists)
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "EMAIL_REQUIRED" });
    }

    // Look up user
    let user = await db.get(
      "SELECT * FROM usage WHERE email = ?",
      email
    );

    // New user
    if (!user) {
      await db.run(
        "INSERT INTO usage (email, count, paid) VALUES (?, 1, 0)",
        email
      );
    } else {
      // Free limit reached
      if (!user.paid && user.count >= 5) {
        return res
          .status(402)
          .json({ error: "FREE_LIMIT_REACHED" });
      }

      // Increment usage
      await db.run(
        "UPDATE usage SET count = count + 1 WHERE email = ?",
        email
      );
    }

    // ✅ ONLY NOW generate content
    const result = await generateWorksheet(req.body);

    res.json({ output: result });

  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

    // 1️⃣ Generate AI content
    const aiContent = await generateWithOpenAI(prompt);

    // 2️⃣ BUILD FULL HTML DOCUMENT ✅
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
      color: #000;
    }
    h1, h2, h3 {
      page-break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
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

    // 3️⃣ GENERATE PDF ✅
    const pdfUrl = await generatePDF(html);

    // 4️⃣ RETURN RESULTS ✅
    res.json({
      html,
      pdfUrl
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Generation failed" });
  }
});

/* =====================================
   SERVER START ✅
===================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
