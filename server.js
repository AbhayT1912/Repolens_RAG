import express from "express";
import { ingestProject } from "./ingestData.js";
import { askQuestion } from "./ask.js";

const app = express();
app.use(express.json());

app.post("/ingest", async (req, res) => {
  const { repoPath, repoId } = req.body;

  try {
    await ingestProject(repoPath, repoId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { repoId, question } = req.body;

    if (!repoId || !question || question.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "repoId and non-empty question are required",
      });
    }

    const result = await askQuestion(repoId, question);

    res.json({
      success: true,
      answer: result.answer,
      usage: result.usage || {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
      },
    });
  } catch (err) {
    console.error("Ask endpoint failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(8000, () => {
  console.log("GraphRAG service running on port 8000");
});
