import { chunkText } from "./documents/chunk-text.js";
import { parseAnswer } from "./ai/prompt-builder.js";

if (chunkText("a".repeat(9000)).length !== 4) {
  throw new Error("chunking check failed");
}

if (parseAnswer('{"answer":"ok","citations":[]}').answer !== "ok") {
  throw new Error("JSON parsing check failed");
}

console.log("api self-check passed");
