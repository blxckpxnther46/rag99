import { answerRotated, embedRotated } from "./client-pool.js";

export async function embed(input: string, type: "query" | "passage" = "passage") {
  return embedRotated(input, type);
}

export async function answer(messages: unknown[]) {
  return answerRotated(messages);
}
