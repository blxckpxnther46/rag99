import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
      {...props}
    />
  );
}
