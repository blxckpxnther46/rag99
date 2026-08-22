import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: error.message },
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: "Validation failed",
        details: error.flatten(),
      },
    };
  }

  if (typeof error === "object" && error && "code" in error) {
    const code = String(error.code);

    if (code === "LIMIT_FILE_SIZE") {
      return {
        status: 413,
        body: { error: "File is too large" },
      };
    }
  }

  console.error("Unhandled API Error:", error);

  return {
    status: 500,
    body: { error: "Internal server error" },
  };
}
