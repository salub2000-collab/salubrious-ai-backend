import express from "express";
import cors from "cors";
async function generatePDF(html) {
  const response = await fetch("https://renderpdf.io/api/pdfs/render-sync", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RENDERPDF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      htmlContent: html,
      paperWidth: "8.5in",
      paperHeight: "11in"
    })
  });

  const data = await response.json();
  return data.fileUrl;
}

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI Generator running...");
});

app.post("/generate", async (req, res) => {
  try {
    console.log("REQUEST BODY:", req.body);

    const {
      grade,
      resource_type,
      subject,
      topic,
      standard,
      length,
      scope,
      output_type
    } = req.body || {};

    const prompt = `
Create a ${resource_type} for grade ${grade} students.

Subject: ${subject}
Topic: ${topic}
Standard: ${standard || "N/A"}
Length: ${length || "N/A"}
Scope: ${scope || "N/A"}
Output Type: ${output_type || "N/A"}

Make it classroom-ready, clear, and teacher-friendly.
`.trim();

    if (!prompt || prompt.length < 10) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("PROMPT SENT TO OPENAI:", prompt);

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt
        })
      }
    );

    const data = await openaiResponse.json();

    console.log("OPENAI RAW RESPONSE:", data);

    const output =
      data.output?.[0]?.content?.[0]?.text ||
      data.output_text ||
      null;

    if (!output) {
      return res.status(500).json({
        error: "OpenAI returned no usable output",
        raw: data
      });
    }

    res.json({ output });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Generator running on port ${PORT}`);
});
