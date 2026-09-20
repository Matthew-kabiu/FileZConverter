"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Shared auth form primitives: icon inputs, visibility toggle, inline errors. */

export function validateEmail(value: string): string | null {
  if (!value.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < 12) return "Password must be at least 12 characters.";
  return null;
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

const inputCls =
  "h-11 w-full rounded-xl border border-ocean-500/20 bg-transparent pl-10 pr-3 text-sm outline-none focus:border-surf-500/60 dark:border-white/10";

export function IconField({
  id,
  label,
  icon,
  error,
  ...props
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string | null;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50">
          {icon}
        </span>
        <input
          id={id}
          {...props}
          aria-invalid={!!error}
          className={cn(inputCls, error && "border-red-500/60")}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  error,
  ...props
}: {
  id: string;
  label: string;
  error?: string | null;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50">
          <LockKeyhole size={16} aria-hidden />
        </span>
        <input
          id={id}
          type={visible ? "text" : "password"}
          {...props}
          aria-invalid={!!error}
          className={cn(inputCls, "pr-10", error && "border-red-500/60")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg opacity-60 transition hover:bg-ocean-500/10 hover:opacity-100 active:scale-95"
        >
          {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
