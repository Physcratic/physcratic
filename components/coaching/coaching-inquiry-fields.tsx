"use client";

import type { ComponentProps } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function RequiredMark() {
  return <span aria-hidden="true" className="text-accent">*</span>;
}

type InquiryTextFieldProps = {
  prefix: string;
  name: string;
  label: string;
  error?: string;
  description?: string;
  wide?: boolean;
} & Omit<ComponentProps<typeof Input>, "name" | "id" | "className" | "aria-describedby" | "aria-invalid">;

export function InquiryTextField({ prefix, name, label, error, description, wide = false, required = true, maxLength = 100, ...props }: InquiryTextFieldProps) {
  const id = `${prefix}-${name}`;
  const describedBy = [description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <Field className={wide ? "sm:col-span-2" : undefined} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}{required && <RequiredMark />}</FieldLabel>
      <Input id={id} name={name} className="h-12" required={required} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />
      {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

export function InquiryChoiceField({ prefix, name, label, options, value, onValueChange, error }: {
  prefix: string;
  name: string;
  label: string;
  options: readonly string[];
  value?: string;
  onValueChange: (value: string) => void;
  error?: string;
}) {
  const id = `${prefix}-${name}`;
  return (
    <FieldSet className="gap-3 sm:col-span-2" data-invalid={Boolean(error)}>
      <FieldLegend id={`${id}-label`} variant="label">{label} <RequiredMark /></FieldLegend>
      <RadioGroup id={id} name={name} value={value} onValueChange={onValueChange} aria-labelledby={`${id}-label`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} required className="grid gap-2.5 sm:grid-cols-2">
        {options.map((option, index) => (
          <label key={option} htmlFor={`${id}-${index}`} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-foreground/5 px-4 py-3.5 text-base font-medium leading-relaxed transition-colors hover:bg-foreground/10 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-foreground/10 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring">
            <RadioGroupItem id={`${id}-${index}`} value={option} aria-invalid={Boolean(error)} className="shrink-0" />
            {option}
          </label>
        ))}
      </RadioGroup>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </FieldSet>
  );
}
