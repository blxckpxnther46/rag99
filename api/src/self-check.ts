/**
 * ─────────────────────────────────────────────────────────────
 * CONCEPT: LLM Eval Sets & RAG Pipeline Pre-flight Verification
 * ─────────────────────────────────────────────────────────────
 * WHAT THIS FILE IS FOR:
 * Automated smoke and regression test (`npm run self-check`) executed
 * before deployment to verify the integrity of the RAG ingestion,
 * LLM output parsing pipelines, and environment secrets validation.
 *
 * EVALUATION CHECKS:
 * 1. Chunking Boundary Formula:
 *    - Validates sliding window chunking with size=2000, overlap=200 (step=1800).
 *    - Asserts that a 9000-character payload generates exactly 5 chunks:
 *      [0..2000], [1800..3800], [3600..5600], [5400..7400], [7200..9200].
 * 2. Structured LLM Output Contract Evaluation:
 *    - Verifies that `parseAnswer()` correctly parses the structured JSON
 *      contract (`{"answer": "...", "citations": [...]}`) required from the LLM,
 *      ensuring downstream consumers never crash on valid model outputs.
 * 3. Environment Variables & Secrets Management:
 *    - Verifies fail-fast boot-time validation via `validateSecrets()`.
 * ─────────────────────────────────────────────────────────────
 */
import { chunkText } from "./documents/chunk-text.js";
import { parseAnswer } from "./ai/prompt-builder.js";
import { validateSecrets } from "./config.js";

// Check 1: Ingestion & Chunking Evaluation
if (chunkText("a".repeat(9000)).length !== 5) {
  throw new Error("chunking check failed");
}

// Check 2: Structured Output Schema Evaluation
if (parseAnswer('{"answer":"ok","citations":[]}').answer !== "ok") {
  throw new Error("JSON parsing check failed");
}

// Check 3: Environment Variables & Secrets Management Evaluation
const secretsCheck = validateSecrets();
if (!secretsCheck.valid) {
  throw new Error("secrets validation check failed");
}

console.log("api self-check passed");
