import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-textLight hover:bg-[#3d8a80]",
  secondary: "bg-secondary text-textDark hover:opacity-90",
  ghost: "bg-transparent text-textDark hover:bg-primary/20",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
  icon: "h-9 w-9 flex items-center justify-center p-0",
};

export function Button({ variant = "primary", size = "default", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md font-semibold transition flex items-center justify-center gap-2 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
