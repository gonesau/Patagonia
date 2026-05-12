import { CheckCircle2, XCircle } from "lucide-react";

interface AlertMessageProps {
  type: "success" | "error";
  message: string;
  className?: string;
}

export function AlertMessage({ type, message, className = "" }: AlertMessageProps) {
  if (type === "success") {
    return (
      <div
        className={`flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success animate-fadeIn ${className}`}
        role="alert"
      >
        <CheckCircle2 className="mt-0.5 shrink-0" size={16} strokeWidth={2} />
        <span className="font-medium">{message}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger animate-fadeIn ${className}`}
      role="alert"
    >
      <XCircle className="mt-0.5 shrink-0" size={16} strokeWidth={2} />
      <span className="font-medium">{message}</span>
    </div>
  );
}
