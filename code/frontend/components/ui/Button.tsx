"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

export function Button({
  icon: Icon,
  iconPosition = "left",
  loading,
  variant = "primary",
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const Glyph = loading ? Loader2 : Icon;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-display text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        loading && "[&_svg]:animate-spin",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {iconPosition === "left" && <Glyph size={16} aria-hidden />}
      {children}
      {iconPosition === "right" && <Glyph size={16} aria-hidden />}
    </button>
  );
}
