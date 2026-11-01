"use client";

import Link from "next/link";
import { useState, type ComponentProps, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trainingInquirySchema, trainingPrograms, type TrainingInquiry } from "@/lib/coaching-training";

type FieldName = Exclude<keyof TrainingInquiry, "formType">;
type FieldErrors = Partial<Record<FieldName, string>>;
type TextFieldName = Exclude<FieldName, "program">;

type TrainingTextFieldProps = {
  name: TextFieldName;
  label: string;
  error?: string;
} & Pick<ComponentProps<typeof Input>, "autoComplete" | "maxLength" | "placeholder" | "required" | "type">;

function RequiredMark() {
  return <span aria-hidden="true" className="text-muted-foreground">*</span>;
}

function TrainingTextField({ name, label, error, required = true, ...props }: TrainingTextFieldProps) {
  const id = `training-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}{required && <RequiredMark />}</FieldLabel>
      <Input id={id} name={name} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

export function CoachingTrainingForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const data = new FormData(event.currentTarget);
    const input = trainingInquirySchema.safeParse({
      formType: "training",
      name: data.get("name") ?? "",
      grade: data.get("grade") ?? "",
      program: data.get("program") ?? "",
      whatsapp: data.get("whatsapp") ?? "",
      preferredLanguage: data.get("preferredLanguage") ?? "",
      heardFrom: data.get("heardFrom") ?? "",
      referralCode: data.get("referralCode") ?? "",
    });

    if (!input.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of input.error.issues) {
        const field = issue.path[0] as FieldName;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      const firstField = input.error.issues[0]?.path[0];
      const firstId = firstField === "program" ? "training-program-IB" : `training-${String(firstField)}`;
      document.getElementById(firstId)?.focus();
      return;
    }

    setErrors({});
    setStatus("submitting");
    try {
      const response = await fetch("/api/coaching/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.data),
      });
      if (!response.ok) throw new Error("Training inquiry could not be saved");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="flex max-w-sm flex-col items-start gap-5" role="status" tabIndex={-1} ref={(element) => { element?.focus(); }}>
        <CheckCircle2 className="size-8" aria-hidden="true" />
        <h2 className="text-pretty text-2xl font-semibold">Thank you for signing up.</h2>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground">Your training inquiry has been received. Our team will follow up on WhatsApp within two days.</p>
        <Button asChild variant="outline"><Link href="/coaching">Back to coaching<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link></Button>
      </section>
    );
  }

  return (
    <form className="flex w-full max-w-xs flex-col items-start gap-6" onSubmit={handleSubmit} noValidate aria-labelledby="training-title" aria-busy={status === "submitting"} onChange={(event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      const name = event.target.name as FieldName;
      setErrors((current) => current[name] ? { ...current, [name]: undefined } : current);
    }}>
      <FieldGroup>
        <TrainingTextField name="name" label="Name" autoComplete="name" maxLength={100} error={errors.name} />
        <TrainingTextField name="grade" label="Grade" autoComplete="off" maxLength={100} error={errors.grade} />
        <FieldSet className="gap-3" data-invalid={Boolean(errors.program)}>
          <FieldLegend id="training-program-label" variant="label">Program of Interest <RequiredMark /></FieldLegend>
          <RadioGroup name="program" aria-labelledby="training-program-label" aria-invalid={Boolean(errors.program)} aria-describedby={errors.program ? "training-program-error" : undefined} orientation="vertical" required className="flex flex-col items-start gap-2">
            {trainingPrograms.map((program, index) => (
              <label key={program} htmlFor={`training-program-${program}`} className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm shadow-sm transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring">
                <RadioGroupItem id={`training-program-${program}`} value={program} className="sr-only" aria-invalid={Boolean(errors.program)} />
                <span className="flex size-5 items-center justify-center rounded-sm bg-foreground text-sm font-semibold text-background" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                {program}
              </label>
            ))}
          </RadioGroup>
          {errors.program && <FieldError id="training-program-error">{errors.program}</FieldError>}
        </FieldSet>
        <TrainingTextField name="whatsapp" label="WhatsApp Number" type="tel" autoComplete="tel" maxLength={32} error={errors.whatsapp} />
        <TrainingTextField name="preferredLanguage" label="Preferred Language for class" placeholder="English, Hindi, etc" maxLength={100} error={errors.preferredLanguage} />
        <TrainingTextField name="heardFrom" label="Where did you learn about us?" placeholder="Instagram, Friend, etc" maxLength={200} error={errors.heardFrom} />
        <TrainingTextField name="referralCode" label="Referral Code" placeholder="Optional" autoComplete="off" maxLength={100} required={false} error={errors.referralCode} />
      </FieldGroup>
      {status === "error" && <p className="text-sm leading-relaxed" role="alert">We could not save your inquiry. Your details are still here; please try again.</p>}
      <Button type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Submitting…" : "Submit"}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
    </form>
  );
}
