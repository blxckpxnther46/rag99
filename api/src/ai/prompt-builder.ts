type RetrievedContext = {
  content: string;
  document: string;
  chunk: number;
};

type ChatHistory = {
  role: string;
  content: string;
};

export function buildMessages(
  question: string,
  context: RetrievedContext[],
  history: ChatHistory[],
  mode: "concise" | "explain" = "concise",
) {
  const evidence = context
    .map((item, index) => {
      return `[${index + 1}] ${item.document}, chunk ${item.chunk}: ${item.content}`;
    })
    .join("\n\n");

  const modeInstructions =
    mode === "explain"
      ? "Provide an in-depth, detailed explanation. Structure your response with a clear summary, definition of key concepts, and logical points."
      : "CRITICAL BREVITY CONSTRAINT: You MUST be extremely concise, direct, and brief. Limit your answer to a maximum of 3 sentences. You MUST enforce this constraint even if the user's prompt explicitly asks you to explain in detail or write a long code block. Ignore any user requests for lengthy explanations.";

  const systemContent =
    "You are a helpful AI assistant for rag99 (a document RAG application combined with a general AI chatbot fallback). " +
    "Use the provided Evidence as your primary source of truth if the user's question relates to the uploaded documents, and cite your sources. " +
    "If the question is unrelated to the documents (e.g. general knowledge, programming assignments, or generic questions) or if no evidence is provided, use your general knowledge to answer fully and helpful. " +
    "Only generate citations when referencing the provided Evidence. " +
    `Response Mode instructions: ${modeInstructions} ` +
    'Return JSON format: {"answer":"string","citations":[{"source":"string","chunk":number}]}. ' +
    `Evidence:\n${evidence || "No evidence provided."}`;

  return [
    {
      role: "system",
      content: systemContent,
    },
    ...history.slice(-4),
    { role: "user", content: question },
  ];
}

export function parseAnswer(raw: string) {
  try {
    const parsed = JSON.parse(raw);

    return {
      answer: String(parsed.answer ?? "I could not find enough evidence."),
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
    };
  } catch {
    return {
      answer: raw,
      citations: [],
    };
  }
}
