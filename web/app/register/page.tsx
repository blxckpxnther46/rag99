"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "../../lib/api";
import { Logo } from "../../components/Logo";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.");
      return;
    }

    const { google } = window as any;
    if (google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
      });

      google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { 
          theme: "filled_blue", 
          size: "large", 
          width: 352,
          shape: "pill"
        }
      );
    }
  }, []);

  async function handleGoogleCredentialResponse(response: any) {
    setLoading(true);
    setError("");

    try {
      const data = await api<{ token: string; user: { name: string } }>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });

      setToken(data.token);
      localStorage.setItem("rag99_user_name", data.user.name);
      router.push("/chats");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api<{ token: string; user: { name: string } }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      setToken(data.token);
      localStorage.setItem("rag99_user_name", data.user.name);
      router.push("/chats");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-[#090A0F] text-[#e3e3e3] font-sans relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-glow-radial pointer-events-none z-0" />

      <div className="w-full max-w-md bg-[#11131A] border border-white/5 rounded-2xl p-8 space-y-6 shadow-xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size={36} />
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2">Create an account</h1>
          <p className="text-xs text-slate-400">
            Start building your custom pgvector RAG workspace
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full bg-[#090A0F] border border-white/5 hover:border-slate-800 focus:border-[#2e2f30] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-slate-650"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full bg-[#090A0F] border border-white/5 hover:border-slate-800 focus:border-[#2e2f30] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-slate-650"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <input
              type="password"
              placeholder="Password (8+ characters)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              className="w-full bg-[#090A0F] border border-white/5 hover:border-slate-800 focus:border-[#2e2f30] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-slate-650"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[#2563eb] hover:bg-[#3b82f6] text-white font-semibold rounded-full text-sm transition-all disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-mono tracking-widest">or</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        <div id="google-signin-btn" className="flex justify-center select-none"></div>

        <p className="text-xs text-center text-slate-400 pt-2">
          Already registered?{" "}
          <Link className="text-[#60a5fa] font-semibold hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
