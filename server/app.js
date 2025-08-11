const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const docRoutes = require("./routes/docRoutes");
const cors = require("cors");

dotenv.config();

const { QdrantClient } = require("@qdrant/js-client-rest");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Test Qdrant connection
const qdrantTest = async () => {
  const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
  });
  try {
    const collections = await client.getCollections();
    console.log("✅ Connected to Qdrant:", collections.collections.length, "collections found");
  } catch (err) {
    console.error("❌ Failed to connect to Qdrant:", err.message);
    process.exit(1);
  }
};

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use("/api/docs", docRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? "Internal server error" 
      : err.message 
  });
});
app.use("/*catchall", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await qdrantTest();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Upload endpoint: http://localhost:${PORT}/api/docs/upload`);
      console.log(`❓ Ask endpoint: http://localhost:${PORT}/api/docs/ask`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();