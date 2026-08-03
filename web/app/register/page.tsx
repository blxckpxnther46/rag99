"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const response = await api<{ token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      setToken(response.token);
      router.push("/chats");
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-7 shadow-sm"
      >
        <h1 className="text-2xl font-bold">Create your rag99 account</h1>

        <Input
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />

        <Button className="w-full">Create account</Button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-sm text-slate-600">
          Already registered?{" "}
          <Link className="text-teal-700" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
