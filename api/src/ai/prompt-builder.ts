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
) {
  const evidence = context
    .map((item, index) => {
      return `[${index + 1}] ${item.document}, chunk ${item.chunk}: ${item.content}`;
    })
    .join("\n\n");

  return [
    {
      role: "system",
      content:
        "You answer only from the evidence. If evidence is insufficient, say so. " +
        'Return JSON: {"answer":"string","citations":[{"source":"string","chunk":number}]}. ' +
        `Evidence:\n${evidence || "No evidence found."}`,
    },
    ...history.slice(-6),
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
