import type { ButtonHTMLAttributes } from "react";

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[
        "rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white",
        "hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
