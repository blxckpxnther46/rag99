import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../db/prisma.js";
import env from "../config.js";
import { AppError } from "../http/errors.js";

type AuthInput = {
  email: string;
  password: string;
  name?: string;
};

export async function register(input: AuthInput) {
  const exists = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (exists) {
    throw new AppError(409, "Email already registered");
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name ?? "User",
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });

  return createTokenResponse(user);
}

export async function login(input: Pick<AuthInput, "email" | "password">) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, "Invalid credentials");
  }

  return createTokenResponse(user);
}

function createTokenResponse(user: { id: string; email: string; name: string }) {
  return {
    token: jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    ),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function loginWithGoogle(credential: string) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(500, "Google OAuth is not configured on this server.");
  }

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!res.ok) {
    throw new AppError(401, "Invalid Google credential");
  }

  const payload = await res.json() as any;
  if (payload.aud !== env.GOOGLE_CLIENT_ID) {
    throw new AppError(401, "Google client ID mismatch");
  }

  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    throw new AppError(401, "Google email not verified");
  }

  const email = String(payload.email);
  const name = String(payload.name ?? "Google User");

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
      },
    });
  }

  return createTokenResponse(user);
}

