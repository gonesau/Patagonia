import { forwardRef, useId, type ChangeEvent, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  mask?: (value: string) => string;
}

function normalizeErrorMessage(error?: string): string | undefined {
  if (!error) {
    return undefined;
  }
  if (error.includes("Invalid input: expected string, received undefined")) {
    return "Este campo es requerido.";
  }
  return error;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, mask, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const normalizedError = normalizeErrorMessage(error);
    const errorId = normalizedError ? `${inputId}-error` : undefined;
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (mask) {
        event.target.value = mask(event.target.value);
      }
      onChange?.(event);
    };

    return (
      <label className="flex w-full flex-col gap-1 text-sm text-textDark" htmlFor={inputId}>
        <span className="font-medium">{label}</span>
        <input
          aria-describedby={errorId}
          aria-invalid={Boolean(normalizedError)}
          className={`rounded-md border border-border bg-white px-3 py-2 outline-none ring-primary focus:ring-2 ${className}`}
          id={inputId}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
        {normalizedError ? (
          <span className="text-danger" id={errorId}>
            {normalizedError}
          </span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = "Input";
