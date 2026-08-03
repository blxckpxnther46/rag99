import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
