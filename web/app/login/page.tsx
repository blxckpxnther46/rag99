"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "../../lib/api";
import { Logo } from "../../components/Logo";

export default function Login() {
  const router = useRouter();
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
      const data = await api<{ token: string; user: { name: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
    <main className="flex min-h-screen items-center justify-center p-6 bg-[#000000] text-[#e3e3e3] font-sans relative overflow-hidden">
      {/* Centered glowing radial ambient gradient */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ background: "radial-gradient(circle at center, rgba(66, 133, 244, 0.08) 0%, transparent 70%)" }} 
      />

      <div className="w-full max-w-md bg-[#131314]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 space-y-6 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size={36} />
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2">Sign in to rag99</h1>
          <p className="text-xs text-zinc-400">
            Access your private AI knowledge workspace
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full bg-[#000000]/60 border border-white/[0.08] hover:border-white/[0.15] focus:border-white/[0.2] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-zinc-500"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full bg-[#000000]/60 border border-white/[0.08] hover:border-white/[0.15] focus:border-white/[0.2] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-zinc-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-955/10 border border-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[#ffffff] hover:bg-zinc-200 text-[#000000] font-semibold rounded-full text-sm transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase font-mono tracking-widest">or</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        <div id="google-signin-btn" className="flex justify-center select-none"></div>

        <p className="text-xs text-center text-slate-400 pt-2">
          New here?{" "}
          <Link className="text-[#60a5fa] font-semibold hover:underline" href="/register">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
