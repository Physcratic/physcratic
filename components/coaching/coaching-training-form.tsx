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
  return <span aria-hidden="true" className="text-accent">*</span>;
}

function TrainingTextField({ name, label, error, required = true, ...props }: TrainingTextFieldProps) {
  const id = `training-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}{required && <RequiredMark />}</FieldLabel>
      <Input id={id} name={name} className="h-12" required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
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
      <section className="flex flex-col items-start gap-5 rounded-2xl border border-accent/50 bg-foreground/5 p-6 sm:p-8" role="status" tabIndex={-1} ref={(element) => { element?.focus(); }}>
        <CheckCircle2 className="size-8 text-accent" aria-hidden="true" />
        <h2 className="text-pretty text-2xl font-semibold">Thank you for signing up.</h2>
        <p className="max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">Your training inquiry has been received. Our team will follow up on WhatsApp within two days.</p>
        <Button asChild variant="outline" size="lg" className="h-12"><Link href="/coaching">Back to coaching<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link></Button>
      </section>
    );
  }

  return (
    <form className="flex w-full flex-col gap-6 rounded-2xl border border-border bg-foreground/5 p-6 sm:p-8" onSubmit={handleSubmit} noValidate aria-labelledby="training-title" aria-busy={status === "submitting"} onChange={(event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      const name = event.target.name as FieldName;
      setErrors((current) => current[name] ? { ...current, [name]: undefined } : current);
    }}>
      <FieldGroup className="grid gap-6 sm:grid-cols-2">
        <TrainingTextField name="name" label="Name" placeholder="Your full name" autoComplete="name" maxLength={100} error={errors.name} />
        <TrainingTextField name="grade" label="Grade" placeholder="For example, Year 11" autoComplete="off" maxLength={100} error={errors.grade} />
        <FieldSet className="gap-3 sm:col-span-2" data-invalid={Boolean(errors.program)}>
          <FieldLegend id="training-program-label" variant="label">Program of interest <RequiredMark /></FieldLegend>
          <RadioGroup name="program" aria-labelledby="training-program-label" aria-invalid={Boolean(errors.program)} aria-describedby={errors.program ? "training-program-error" : undefined} required className="grid gap-2.5 sm:grid-cols-3">
            {trainingPrograms.map((program) => (
              <label key={program} htmlFor={`training-program-${program}`} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-foreground/5 px-4 py-3.5 text-base font-medium transition-colors hover:bg-foreground/10 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-foreground/10 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ring">
                <RadioGroupItem id={`training-program-${program}`} value={program} aria-invalid={Boolean(errors.program)} />
                {program}
              </label>
            ))}
          </RadioGroup>
          {errors.program && <FieldError id="training-program-error">{errors.program}</FieldError>}
        </FieldSet>
        <TrainingTextField name="whatsapp" label="WhatsApp number" placeholder="Include your country code" type="tel" autoComplete="tel" maxLength={32} error={errors.whatsapp} />
        <TrainingTextField name="preferredLanguage" label="Preferred language for class" placeholder="English, Hindi, etc" maxLength={100} error={errors.preferredLanguage} />
        <TrainingTextField name="heardFrom" label="Where did you learn about us?" placeholder="Instagram, Friend, etc" maxLength={200} error={errors.heardFrom} />
        <TrainingTextField name="referralCode" label="Referral code" placeholder="Optional" autoComplete="off" maxLength={100} required={false} error={errors.referralCode} />
      </FieldGroup>
      {status === "error" && <p className="text-sm leading-relaxed text-accent" role="alert">We could not save your inquiry. Your details are still here; please try again.</p>}
      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Our team will follow up on WhatsApp within two days.</p>
        <Button type="submit" size="lg" className="h-12 w-full sm:w-auto" disabled={status === "submitting"}>{status === "submitting" ? "Sending…" : "Send inquiry"}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
      </div>
    </form>
  );
}
