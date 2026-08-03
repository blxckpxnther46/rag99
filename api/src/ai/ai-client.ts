import env from "../config.js";
import { AppError } from "../http/errors.js";

async function call(path: string, body: unknown) {
  const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AppError(502, `AI provider returned ${response.status}`);
  }

  return response.json() as Promise<any>;
}

export async function embed(input: string) {
  const data = await call("/embeddings", {
    model: env.AI_EMBEDDING_MODEL,
    input,
  });

  return data.data[0].embedding as number[];
}

export async function answer(messages: unknown[]) {
  const data = await call("/chat/completions", {
    model: env.AI_CHAT_MODEL,
    messages,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  return data.choices[0].message.content as string;
}
