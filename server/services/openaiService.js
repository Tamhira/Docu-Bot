const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Read system prompt from external file
const systemPrompt = fs.readFileSync(path.join(__dirname, "../prompts/prompt.txt"), "utf-8");

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

const rateLimitedRequest = async (requestFn) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  return await requestFn();
};

exports.embedText = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error("Text is required for embedding");
  }
  const trimmedText = text.trim();
  try {
    const embedding = await rateLimitedRequest(async () => {
      const result = await axios.post(
        "https://api.openai.com/v1/embeddings",
        {
          input: trimmedText,
          model: "text-embedding-ada-002"
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );
      if (!result.data?.data?.[0]?.embedding) {
        throw new Error("Invalid response format from OpenAI embeddings API");
      }
      return result.data.data[0].embedding;
    });
    return embedding;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    } else if (error.response?.status === 401) {
      throw new Error("Invalid OpenAI API key");
    } else if (error.code === 'ECONNABORTED') {
      throw new Error("Request timeout - OpenAI API is taking too long to respond");
    } else {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
};

exports.askLLM = async (context, question) => {
  if (!context || !question) {
    throw new Error("Both context and question are required");
  }
  const userPrompt = `Context Information: ${context}
  Question: ${question}
  Please provide a clear, accurate answer based on the context above.`;
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
  try {
    return await rateLimitedRequest(async () => {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 45000
        }
      );
      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from OpenAI chat API");
      }
      return response.data.choices[0].message.content.trim();
    });
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    } else if (error.response?.status === 401) {
      throw new Error("Invalid OpenAI API key");
    } else if (error.code === 'ECONNABORTED') {
      throw new Error("Request timeout - OpenAI API is taking too long to respond");
    } else {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
};
