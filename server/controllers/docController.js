const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { embedText, askLLM } = require("../services/openaiService");
const { storeChunk, queryRelevantChunks } = require("../services/qdrantService");
const { getAllDocuments } = require("../services/qdrantService");

// Smart chunking function
function smartChunk(text, maxSize = 1000, overlap = 100) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
    if (potentialChunk.length > maxSize && currentChunk) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5)); // Approximate word overlap
      currentChunk = overlapWords.join(' ') + (overlapWords.length > 0 ? '. ' : '') + trimmedSentence;
    } else {
      currentChunk = potentialChunk;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
}

exports.uploadDocument = async (req, res) => {
  const uploadedFiles = req.files;
  if (!uploadedFiles || uploadedFiles.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  const results = [];
  for (const file of uploadedFiles) {
    const filePath = file.path;
    try {
      console.log(`Processing: ${file.originalname}`);
      const dataBuffer = fs.readFileSync(filePath);
      let text = '';
      if (file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else if (file.mimetype === 'text/plain') {
        text = dataBuffer.toString('utf-8');
      } else if (file.mimetype.includes('word') || file.originalname.endsWith('.docx') || file.originalname.endsWith('.doc')) {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        text = result.value;
      } else {
        throw new Error(`Unsupported file type: ${file.originalname}`);
      }
      if (!text || text.trim().length < 100) {
        throw new Error("PDF is empty or has too little text");
      }
      const chunks = smartChunk(text);
      if (chunks.length === 0) {
        throw new Error("No valid chunks from document");
      }
      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await Promise.all(batch.map(async (chunk, idx) => {
          await new Promise(resolve => setTimeout(resolve, idx * 100));
          return embedText(chunk);
        }));
        for (let j = 0; j < embeddings.length; j++) {
          await storeChunk(embeddings[j], batch[j], {
            filename: file.originalname,
            uploadTime: new Date().toISOString(),
            chunkIndex: i + j
          });
        }
      }
      results.push({
        filename: file.originalname,
        message: "Uploaded & indexed successfully",
        chunks: chunks.length
      });
    } catch (error) {
      console.error(`❌ Error with ${file.originalname}:`, error.message);
      results.push({
        filename: file.originalname,
        error: error.message
      });
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
  return res.json({ status: "completed", results });
};

exports.handleQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }
    if (typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({ error: "Question must be a non-empty string" });
    }
    if (question.length > 1_000) {
      return res.status(400).json({ error: "Question is too long (max 1000 characters)" });
    }
    const trimmedQuestion = question.trim();
    console.log(`Processing question: ${trimmedQuestion.substring(0, 100)}…`);
    // Embed question and retrieve chunks
    const questionEmbedding = await embedText(trimmedQuestion);
    const searchResults = await queryRelevantChunks(questionEmbedding, 5);
    if (!searchResults || searchResults.length === 0) {
      return res.json({
        answer:
          "I couldn't find relevant information in the uploaded documents to answer your question. Please make sure you've uploaded relevant documents first.",
        sources: []
      });
    }
    /* ---------- 1️⃣  INCLUDE METADATA IN CONTEXT  ---------- */
    const context = searchResults
      .map((r, i) => {
        const text = r.payload?.text || "";
        const score = (r.score || 0) * 100;
        const filename = r.payload?.filename || "Unknown";
        const chunkIndex = r.payload?.chunkIndex ?? "n/a";
        return `[Source ${i + 1}] File: ${filename}, Chunk: ${chunkIndex} (Relevance: ${score.toFixed(1)}%)\n${text}`;  // ← NEW
      })
      .join("\n\n---\n\n");
    /* ------------------------------------------------------- */
    console.log(`Found ${searchResults.length} relevant chunks`);
    const answer = await askLLM(context, trimmedQuestion);
    /* ---------- 2️⃣  RETURN METADATA TO CLIENT ------------- */
    const sources = searchResults.map((r, i) => ({
      index: i + 1,
      relevance: ((r.score || 0) * 100).toFixed(1) + "%",
      filename: r.payload?.filename || "Unknown",   // ← NEW (was already there, keep it)
      chunkIndex: r.payload?.chunkIndex || 0,
      preview: (r.payload?.text || "").substring(0, 200) + "…"
    }));
    /* ------------------------------------------------------- */
    res.json({ answer, sources, totalSources: searchResults.length });
    console.log("Answer:", answer);
  } catch (error) {
    console.error("Question handling error:", error);
    res.status(500).json({
      error: "Failed to process question",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await getAllDocuments();
    res.json({ total: documents.length, documents });
  } catch (error) {
    console.error("Error in getAllDocuments:", error.message);
    res.status(500).json({ error: "Failed to retrieve uploaded documents" });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: "Filename is required" });
    }

    const result = await require("../services/qdrantService").deleteDocumentByFilename(filename);
    res.json({ message: "Document deleted successfully", deletedChunks: result.deleted });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: error.message || "Failed to delete document" });
  }
};
