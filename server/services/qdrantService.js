const { QdrantClient } = require("@qdrant/js-client-rest");
const { v4: uuidv4 } = require("uuid");

const client = new QdrantClient({
  url: "https://cb5d86ba-23ff-40fa-9a35-57cc3ec5bef2.europe-west3-0.gcp.cloud.qdrant.io:6333",
  apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.2bRQJITljBf8x9KM05nUfznY_AuVnFyKHpvJwMlAlRQ",
  checkCompatibility: false
});

// const { client } = require('./qdrantClient'); // adjust path
const COLLECTION_NAME = "documents";

async function ensureCollectionExists() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    if (!exists) {
      console.log(`Creating collection: ${COLLECTION_NAME}`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536,
          distance: "Cosine"
        }
      });
      console.log(`Collection ${COLLECTION_NAME} created successfully`);
    }
  } catch (error) {
    console.error("Error ensuring collection exists:", error);
    throw new Error(`Failed to setup Qdrant collection: ${error.message}`);
  }
}

exports.storeChunk = async (embedding, text, metadata = {}) => {
  const { v4: uuidv4 } = require('uuid');
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Valid embedding array is required");
  } 
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error("Valid text content is required");
  }
  if (embedding.length !== 1536) {
    throw new Error(`Invalid embedding dimension: expected 1536, got ${embedding.length}`);
  }
  try {
    await ensureCollectionExists();  
    const result = await client.upsert(COLLECTION_NAME, {
      points: [
        {
          id: uuidv4(),
          vector: embedding,
          payload: { 
            text: text.trim(),
            ...metadata,
            storedAt: new Date().toISOString()
          }
        }
      ]
    });
    return result;
  } catch (error) {
    console.error("Error storing chunk:", error);
    throw new Error(`Failed to store chunk in Qdrant: ${error.message}`);
  }
};

exports.queryRelevantChunks = async (embedding, limit = 500) => {
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Valid embedding array is required for querying");
  }
  if (embedding.length !== 1536) {
    throw new Error(`Invalid embedding dimension: expected 1536, got ${embedding.length}`);
  } 
  try {
    const result = await client.search(COLLECTION_NAME, {
      vector: embedding,
      limit: 500,
      with_payload: true,
      // score_threshold: 0.1 // Only return results with decent similarity
    }); 
    console.log(`Found ${result.length} relevant chunks --------`);
    return result;
  } catch (error) {
    console.error("Error querying chunks:", error);
    throw new Error(`Failed to query Qdrant: ${error.message}`);
  }
};

exports.getAllDocuments = async () => {
  try {
    await ensureCollectionExists();
    const response = await client.scroll(COLLECTION_NAME, {
      limit: 1000,
      with_payload: true,
    });

    const documentsMap = new Map();

    for (const point of response.points || []) {
      const payload = point.payload || {};
      const filename = payload.filename || "Unknown";

      if (!documentsMap.has(filename)) {
        documentsMap.set(filename, {
          filename,
          uploadTime: payload.uploadTime || payload.storedAt || "N/A",
          totalChunks: 1,
        });
      } else {
        const doc = documentsMap.get(filename);
        doc.totalChunks += 1;
        documentsMap.set(filename, doc);
      }
    }

    return Array.from(documentsMap.values());
  } catch (error) {
    console.error("Error retrieving documents:", error);
    throw new Error("Failed to retrieve uploaded documents from Qdrant");
  }
};

exports.deleteDocumentByFilename = async (filename) => {
  if (!filename || typeof filename !== 'string') {
    throw new Error("Filename is required for deletion");
  }

  try {
    await ensureCollectionExists();
    const pointsToDelete = [];

    // Scroll through points and collect IDs to delete
    let offset = null;
    do {
      const response = await client.scroll(COLLECTION_NAME, {
        limit: 100,
        offset,
        with_payload: true,
      });

      for (const point of response.points || []) {
        if (point.payload?.filename === filename) {
          pointsToDelete.push(point.id);
        }
      }

      offset = response.next_page_offset || null;
    } while (offset);

    if (pointsToDelete.length === 0) {
      throw new Error("No chunks found for this document");
    }

    // Delete the points by IDs
    await client.delete(COLLECTION_NAME, {
      points: pointsToDelete,
    });

    return { deleted: pointsToDelete.length };
  } catch (error) {
    console.error("Error deleting document from Qdrant:", error);
    throw new Error("Failed to delete document from Qdrant");
  }
};
