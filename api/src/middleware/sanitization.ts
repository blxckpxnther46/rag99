/**
 * ─────────────────────────────────────────────────────────────
 * CONCEPT: Prompt Injection Awareness & Defenses
 * ─────────────────────────────────────────────────────────────
 * WHAT THIS FILE IS FOR:
 * Intercepts incoming user prompts and document text to detect and
 * neutralize direct jailbreaks and indirect prompt injections
 * before text reaches the LLM.
 *
 * DEFENSE-IN-DEPTH LAYERS:
 * 1. Heuristic Pattern Detection (`PROMPT_INJECTION_PATTERNS`):
 *    Identifies known adversarial attacks ("ignore previous instructions",
 *    "system override", "DAN mode").
 * 2. Control Token Stripping (`SPECIAL_TOKENS`):
 *    Removes ChatML and Llama control tokens (`<|im_start|>`, `### System:`)
 *    preventing attackers from escaping role delimiters.
 * 3. ASCII Sanitization:
 *    Removes non-printable control characters that could bypass regex filters.
 * ─────────────────────────────────────────────────────────────
 */

// Layer 1: Adversarial Prompt Injection Signatures
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|directives|prompts)/i,
  /system\s+override/i,
  /you\s+are\s+now\s+(in\s+)?(dan|developer|jailbreak)\s+mode/i,
  /bypass\s+(all\s+)?(safety|security|content)\s+(filters|rules|guidelines)/i,
  /reveal\s+(the\s+)?(system\s+prompt|hidden\s+instructions)/i,
  /disregard\s+(the\s+)?rules\s+above/i,
];

// Layer 2: Model Delimiter Tokens (prevents role spoofing in ChatML/Instruct models)
const SPECIAL_TOKENS = [
  "<|im_start|>",
  "<|im_end|>",
  "<|system|>",
  "<|user|>",
  "<|assistant|>",
  "### System:",
  "### Human:",
  "### Assistant:",
];

/**
 * Sanitizes input text to neutralize HTML/XSS injection attempts
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Prompt Injection Sanitization Pipeline:
 * Returns sanitized string and injection telemetry flags.
 */
export function sanitizePrompt(prompt: string): {
  sanitized: string;
  hasInjectionRisk: boolean;
  detectedPatterns: string[];
} {
  if (!prompt) {
    return { sanitized: "", hasInjectionRisk: false, detectedPatterns: [] };
  }

  const detectedPatterns: string[] = [];

  // Step 1: Scan for jailbreak signatures
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      detectedPatterns.push(pattern.source);
    }
  }

  // Step 2: Strip special delimiter tokens
  let sanitized = prompt;
  for (const token of SPECIAL_TOKENS) {
    if (sanitized.includes(token)) {
      sanitized = sanitized.split(token).join("");
      detectedPatterns.push(`Delimiter token: ${token}`);
    }
  }

  // Step 3: Strip non-printable ASCII control characters (excluding newline and tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

  return {
    sanitized,
    hasInjectionRisk: detectedPatterns.length > 0,
    detectedPatterns,
  };
}
