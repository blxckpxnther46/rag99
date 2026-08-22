import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import env from "../config.js";
import { AppError } from "../http/errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, ".pool-index");
const embedIndexPath = path.join(__dirname, ".embed-index");

function loadRotationIndex(filePath: string): number {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8").trim();
      const parsed = parseInt(content, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`[ClientPool] Failed to read index cache ${filePath}:`, error);
  }
  return 0;
}

function saveRotationIndex(filePath: string, index: number) {
  try {
    fs.writeFileSync(filePath, String(index), "utf8");
  } catch (error) {
    console.warn(`[ClientPool] Failed to save index cache ${filePath}:`, error);
  }
}

interface ProviderTarget {
  name: string;
  baseUrl: string;
  apiKey: string;
  chatModel: string;
}

const targets: ProviderTarget[] = [];
const embeddingTargets: { name: string; apiKey: string }[] = [];

// 1. Add Groq if key exists
if (env.GROQ_API_KEY && env.GROQ_API_KEY !== "replace-with-groq-api-key") {
  targets.push({
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: env.GROQ_API_KEY,
    chatModel: "llama-3.3-70b-versatile",
  });
}

// 2. Add OpenRouter keys if they exist (both for completions and embeddings)
const orKeys = [
  { name: "OpenRouter Primary", key: env.OPENROUTER_API_KEY },
  { name: "OpenRouter Key #1", key: env.OPENROUTER_API_KEY1 },
  { name: "OpenRouter Key #2", key: env.OPENROUTER_API_KEY2 },
  { name: "OpenRouter Key #3", key: env.OPENROUTER_API_KEY3 },
];

orKeys.forEach((item) => {
  if (item.key && !item.key.startsWith("replace-with")) {
    targets.push({
      name: item.name,
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: item.key,
      chatModel: "meta-llama/llama-3.3-70b-instruct",
    });
    embeddingTargets.push({
      name: item.name,
      apiKey: item.key,
    });
  }
});

let rotationIndex = loadRotationIndex(indexPath);
let embeddingIndex = loadRotationIndex(embedIndexPath);

export async function answerRotated(messages: unknown[]) {
  if (targets.length === 0) {
    throw new AppError(500, "No AI providers configured in client pool. Make sure you set GROQ_API_KEY or OPENROUTER_API_KEYs.");
  }

  let lastError: any = null;

  for (let attempt = 0; attempt < targets.length; attempt++) {
    const currentIndex = rotationIndex % targets.length;
    const target = targets[currentIndex];
    
    // Rotate to the next index for future attempts/calls
    rotationIndex = (currentIndex + 1) % targets.length;

    console.log(`[ClientPool] [Attempt ${attempt + 1}/${targets.length}] Routing chat completion to ${target.name} (${target.chatModel})...`);

    try {
      const response = await fetch(`${target.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${target.apiKey}`,
        },
        body: JSON.stringify({
          model: target.chatModel,
          messages,
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ClientPool] ${target.name} returned status ${response.status}:`, errorText);
        throw new Error(`Status ${response.status}: ${errorText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("Invalid response format: message content is not a string");
      }

      console.log(`[ClientPool] ${target.name} succeeded!`);
      saveRotationIndex(indexPath, rotationIndex);
      return content;
    } catch (error) {
      console.warn(`[ClientPool] ${target.name} request failed:`, (error as Error).message);
      lastError = error;
    }
  }

  throw new AppError(502, `All AI providers failed in round-robin loop. Last error: ${lastError?.message}`);
}

export async function embedRotated(input: string, type: "query" | "passage" = "passage") {
  if (embeddingTargets.length === 0) {
    throw new AppError(500, "No OpenRouter keys configured for embedding generation.");
  }

  let lastError: any = null;

  for (let attempt = 0; attempt < embeddingTargets.length; attempt++) {
    const currentIndex = embeddingIndex % embeddingTargets.length;
    const target = embeddingTargets[currentIndex];
    
    // Rotate to the next index
    embeddingIndex = (currentIndex + 1) % embeddingTargets.length;

    console.log(`[ClientPool] [Attempt ${attempt + 1}/${embeddingTargets.length}] Routing embedding request to OpenRouter via ${target.name}...`);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${target.apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/text-embedding-3-small",
          input: [input],
          dimensions: 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ClientPool] ${target.name} embedding returned status ${response.status}:`, errorText);
        throw new Error(`Status ${response.status}: ${errorText}`);
      }

      const data = await response.json() as any;
      const embedding = data.data?.[0]?.embedding;
      if (!Array.isArray(embedding)) {
        throw new Error("Invalid embedding response format: embedding array missing");
      }

      console.log(`[ClientPool] ${target.name} embedding succeeded!`);
      saveRotationIndex(embedIndexPath, embeddingIndex);
      return embedding as number[];
    } catch (error) {
      console.warn(`[ClientPool] ${target.name} embedding failed:`, (error as Error).message);
      lastError = error;
    }
  }

  throw new AppError(502, `All embedding keys failed in round-robin loop. Last error: ${lastError?.message}`);
}
