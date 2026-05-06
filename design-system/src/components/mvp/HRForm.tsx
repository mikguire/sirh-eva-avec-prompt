import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import type { FieldError } from "../../types";
import { DatePicker } from "./DatePicker";
import { TextInput } from "./TextInput";

type HRFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  startDate: string;
};

type HRFormProps = {
  initialValues?: Partial<HRFormValues>;
  onSubmit: (values: HRFormValues) => Promise<void> | void;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function HRForm({ initialValues, onSubmit }: HRFormProps) {
  const [values, setValues] = useState<HRFormValues>({
    firstName: initialValues?.firstName ?? "",
    lastName: initialValues?.lastName ?? "",
    email: initialValues?.email ?? "",
    startDate: initialValues?.startDate ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof HRFormValues, FieldError>>>({});
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  function validate(nextValues: HRFormValues): Partial<Record<keyof HRFormValues, FieldError>> {
    const nextErrors: Partial<Record<keyof HRFormValues, FieldError>> = {};

    if (!nextValues.firstName.trim()) nextErrors.firstName = { message: "Le prenom est obligatoire." };
    if (!nextValues.lastName.trim()) nextErrors.lastName = { message: "Le nom est obligatoire." };
    if (!emailRegex.test(nextValues.email)) nextErrors.email = { message: "Email invalide." };
    if (!nextValues.startDate) nextErrors.startDate = { message: "La date d'entree est obligatoire." };

    return nextErrors;
  }

  function updateField<K extends keyof HRFormValues>(key: K, value: HRFormValues[K]) {
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    setErrors(validate(nextValues));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <TextInput
        id="firstName"
        label="Prenom"
        value={values.firstName}
        required
        error={errors.firstName?.message}
        onChange={(value) => updateField("firstName", value)}
      />
      <TextInput
        id="lastName"
        label="Nom"
        value={values.lastName}
        required
        error={errors.lastName?.message}
        onChange={(value) => updateField("lastName", value)}
      />
      <TextInput
        id="email"
        label="Email pro"
        type="email"
        value={values.email}
        required
        error={errors.email?.message}
        onChange={(value) => updateField("email", value)}
      />
      <DatePicker
        id="startDate"
        label="Date d'entree"
        value={values.startDate}
        required
        error={errors.startDate?.message}
        onChange={(value) => updateField("startDate", value)}
      />

      <button
        type="submit"
        disabled={submitting || !isValid}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
