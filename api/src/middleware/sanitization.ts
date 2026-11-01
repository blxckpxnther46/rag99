/**
 * Input Sanitization & Prompt Injection Awareness and Defenses
 *
 * Provides:
 * 1. XSS / HTML / Script injection sanitization
 * 2. Prompt injection pattern detection & delimiter escaping
 */

// Known adversarial prompt injection attack signatures
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|directives|prompts)/i,
  /system\s+override/i,
  /you\s+are\s+now\s+(in\s+)?(dan|developer|jailbreak)\s+mode/i,
  /bypass\s+(all\s+)?(safety|security|content)\s+(filters|rules|guidelines)/i,
  /reveal\s+(the\s+)?(system\s+prompt|hidden\s+instructions)/i,
  /disregard\s+(the\s+)?rules\s+above/i,
];

// Dangerous control characters and prompt delimiter escapes
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
 * Sanitizes and neutralizes Prompt Injection attacks for LLM safety
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

  // Check against prompt injection signatures
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      detectedPatterns.push(pattern.source);
    }
  }

  // Neutralize special prompt delimiters
  let sanitized = prompt;
  for (const token of SPECIAL_TOKENS) {
    if (sanitized.includes(token)) {
      sanitized = sanitized.split(token).join("");
      detectedPatterns.push(`Delimiter token: ${token}`);
    }
  }

  // Trim and strip non-printable ASCII control characters (except newline and tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

  return {
    sanitized,
    hasInjectionRisk: detectedPatterns.length > 0,
    detectedPatterns,
  };
}
