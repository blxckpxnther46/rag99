"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(response.token);
      router.push("/chats");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-7 shadow-sm"
      >
        <h1 className="text-2xl font-bold">Sign in to rag99</h1>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <Button className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-sm text-slate-600">
          New here?{" "}
          <Link className="text-teal-700" href="/register">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
