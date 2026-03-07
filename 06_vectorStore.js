import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ===============================
   Init Gemini + Pinecone
================================ */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const INDEX_NAME = process.env.PINECONE_INDEX || "codebase-index";

/* ===============================
   EMBEDDING FUNCTION (STABLE)
================================ */

async function embedText(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    console.error("❌ EMPTY OR INVALID TEXT PASSED TO EMBEDDING:", text);
    throw new Error("Invalid text passed to embedding");
  }

  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding failed:", error);
    throw error;
  }
}

/* ===============================
   Metadata Sanitization
================================ */

function sanitizeMetadata(metadata) {
  const clean = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value)) continue;
    clean[key] = value;
  }

  return clean;
}

/* ===============================
   Store Chunks
================================ */

export async function storeChunks(chunks) {
  if (!chunks?.length) return;

  const index = pc.index(INDEX_NAME);

  console.log(`Embedding ${chunks.length} chunks...`);

  const vectors = [];

  for (const chunk of chunks) {
    try {
      const values = await embedText(chunk.text);

      vectors.push({
        id: String(chunk.metadata.id),
        values,
        metadata: sanitizeMetadata({
          ...chunk.metadata,
          text: chunk.text,
        }),
      });
    } catch (e) {
      console.error(
        `Embedding failed for ${chunk.metadata.id}:`,
        e.message
      );
    }
  }

  console.log(`Validated ${vectors.length} vectors.`);

  const BATCH_SIZE = 100;

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);

    await index.upsert({ records: batch });

    console.log(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }

  console.log("All batches upserted successfully.");
}

/* ===============================
   Semantic Search
================================ */

export async function semanticSearch(query, topK = 10) {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    console.error("❌ INVALID QUERY PASSED TO semanticSearch:", query);
    throw new Error("Invalid query for semantic search");
  }

  const index = pc.index(INDEX_NAME);

  const embedding = await embedText(query);

  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  return result.matches.map((match) => match.metadata);
}