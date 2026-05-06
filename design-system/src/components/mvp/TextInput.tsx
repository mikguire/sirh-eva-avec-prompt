import { forwardRef } from "react";

import { FormField } from "../shared/FormField";

type TextInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "search" | "tel";
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  hint?: string;
  error?: string;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { id, label, value, onChange, placeholder, type = "text", required, disabled, readOnly, hint, error },
  ref,
) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FormField id={id} label={label} required={required} hint={hint} error={error}>
      <input
        ref={ref}
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </FormField>
  );
});
