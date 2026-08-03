import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const titleSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export const messageSchema = z.object({
  content: z.string().trim().min(1).max(10000),
});

export const chatParamsSchema = z.object({
  chatId: z.string().uuid(),
});

export const documentParamsSchema = z.object({
  documentId: z.string().uuid(),
});
