import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { AppError } from "../http/errors.js";

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
) {
  if (mimeType === "application/pdf") {
    return (await pdfParse(buffer)).text;
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return (await mammoth.extractRawText({ buffer })).value;
  }

  if (mimeType === "text/plain" || originalName.endsWith(".md")) {
    return buffer.toString("utf8");
  }

  throw new AppError(415, "Unsupported file type");
}
