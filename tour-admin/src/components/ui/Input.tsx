import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-textDark">
      <span className="font-medium">{label}</span>
      <input
        className={`rounded-md border border-border bg-white px-3 py-2 outline-none ring-primary focus:ring-2 ${className}`}
        {...props}
      />
      {error ? <span className="text-danger">{error}</span> : null}
    </label>
  );
}
