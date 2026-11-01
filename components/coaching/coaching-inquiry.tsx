"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { coachingApplicationSchema, physicsStages, type CoachingApplication } from "@/lib/coaching-inquiries";
import { InquiryChoiceField, InquiryTextField, RequiredMark } from "./coaching-inquiry-fields";

type FieldErrors = Record<string, string | undefined>;
type InquiryStatus = "idle" | "submitting" | "success" | "error";
type FormType = CoachingApplication["formType"];

function TutorFields({ errors }: { errors: FieldErrors }) {
  return (
    <FieldGroup className="grid gap-6 sm:grid-cols-2">
      <InquiryTextField prefix="tutor" name="name" label="Name" placeholder="Your full name" autoComplete="name" error={errors.name} />
      <InquiryTextField prefix="tutor" name="age" label="Age" placeholder="For example, 20" type="number" min={1} max={120} step={1} inputMode="numeric" error={errors.age} />
      <InquiryTextField prefix="tutor" name="country" label="Where are you from?" placeholder="Country name" autoComplete="country-name" error={errors.country} wide />
      <Field className="sm:col-span-2" data-invalid={Boolean(errors.stats)}>
        <FieldLabel htmlFor="tutor-stats">Your stats <RequiredMark /></FieldLabel>
        <Textarea id="tutor-stats" name="stats" placeholder="For example, Best Theory + Gold IPhO 2024; HM APhO 2023" className="min-h-28 resize-y" maxLength={2000} required aria-invalid={Boolean(errors.stats)} aria-describedby={errors.stats ? "tutor-stats-error" : undefined} />
        {errors.stats && <FieldError id="tutor-stats-error">{errors.stats}</FieldError>}
      </Field>
      <InquiryTextField prefix="tutor" name="languages" label="Languages you are comfortable speaking" placeholder="English, Chinese, etc" error={errors.languages} />
      <InquiryTextField prefix="tutor" name="whatsapp" label="WhatsApp number" placeholder="+1 123 456 7890 / @username" autoComplete="tel" maxLength={32} error={errors.whatsapp} />
      <InquiryTextField prefix="tutor" name="heardFrom" label="Where did you learn about us?" placeholder="Social media, friend, etc" maxLength={200} error={errors.heardFrom} wide />
    </FieldGroup>
  );
}

function ConsultationFields({ audience, onAudienceChange, errors, clearError }: {
  audience: "Student" | "Parent";
  onAudienceChange: (audience: "Student" | "Parent") => void;
  errors: FieldErrors;
  clearError: (name: string) => void;
}) {
  return (
    <FieldGroup className="grid gap-6 sm:grid-cols-2">
      <InquiryChoiceField prefix="consultation" name="audience" label="Are you a student or a parent?" options={["Student", "Parent"]} value={audience} onValueChange={(value) => onAudienceChange(value as "Student" | "Parent")} error={errors.audience} />
      <InquiryTextField prefix="consultation" name="name" label="Name" placeholder="Your full name" autoComplete="name" error={errors.name} wide={audience === "Student"} />
      {audience === "Parent" && <InquiryTextField prefix="consultation" name="studentName" label="Student’s full name" placeholder="Name of the student" autoComplete="off" error={errors.studentName} />}
      <InquiryTextField prefix="consultation" name="whatsapp" label="WhatsApp number" placeholder="+1 234 567 8900" type="tel" autoComplete="tel" maxLength={32} required={false} description="Provide a WhatsApp number or an alternative contact below." error={errors.whatsapp} wide />
      <InquiryTextField prefix="consultation" name="alternativeContact" label="If you don’t have WhatsApp, provide another medium of contact" placeholder="For example, Telegram @username, Discord, or email" maxLength={200} required={false} error={errors.alternativeContact} wide />
      <InquiryTextField prefix="consultation" name="country" label="From which country?" placeholder="For example, Indonesia" autoComplete="country-name" error={errors.country} />
      <InquiryTextField prefix="consultation" name="grade" label="Student’s level/grade" placeholder="For example, Grade 10 / Year 11" error={errors.grade} />
      <InquiryChoiceField prefix="consultation" name="physicsStage" label="Physics stage that suits you best" options={physicsStages} onValueChange={() => clearError("physicsStage")} error={errors.physicsStage} />
      <InquiryTextField prefix="consultation" name="languages" label="What languages are you comfortable with?" placeholder="For example, English and Hindi" error={errors.languages} />
      <InquiryTextField prefix="consultation" name="heardFrom" label="Where did you hear about us?" placeholder="Instagram, Threads, friend, etc" maxLength={200} error={errors.heardFrom} />
      <InquiryTextField prefix="consultation" name="referralCode" label="Referral code" placeholder="Optional" autoComplete="off" required={false} error={errors.referralCode} />
    </FieldGroup>
  );
}

export function CoachingInquiryForm({ formType }: { formType: FormType }) {
  const [audience, setAudience] = useState<"Student" | "Parent">("Student");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<InquiryStatus>("idle");
  const isTutor = formType === "tutor";

  function clearError(name: string) {
    setErrors((current) => current[name] ? { ...current, [name]: undefined } : current);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const data = new FormData(event.currentTarget);
    const input = coachingApplicationSchema.safeParse({
      ...Object.fromEntries(data.entries()),
      formType,
      ...(isTutor ? {} : { audience }),
    });

    if (!input.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of input.error.issues) {
        const field = String(issue.path[0]);
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      const firstField = document.getElementById(`${formType}-${String(input.error.issues[0]?.path[0])}`);
      (firstField?.querySelector<HTMLElement>('[role="radio"]') ?? firstField)?.focus();
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
      if (!response.ok) throw new Error("Inquiry could not be saved");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="flex flex-col items-start gap-5 rounded-2xl border border-accent/50 bg-foreground/5 p-6 sm:p-8" role="status" tabIndex={-1} ref={(element) => { element?.focus(); }}>
        <CheckCircle2 className="size-8 text-accent" aria-hidden="true" />
        <h2 className="text-pretty text-2xl font-semibold">{isTutor ? "Thank you for applying." : "Thank you for reaching out."}</h2>
        <p className="max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">{isTutor ? "Your tutor application has been received. Our team will review your details and contact you." : "Your consultation inquiry has been received. Our team will contact you within 2 business days using the contact details you provided."}</p>
        <Button asChild variant="outline" size="lg" className="h-12"><Link href="/coaching">Back to coaching<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link></Button>
      </section>
    );
  }

  return (
    <form className="flex w-full flex-col gap-6 rounded-2xl border border-border bg-foreground/5 p-6 sm:p-8" onSubmit={handleSubmit} noValidate aria-labelledby={`${formType}-title`} aria-busy={status === "submitting"} onChange={(event) => {
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
      clearError(event.target.name);
      if (event.target.name === "alternativeContact") clearError("whatsapp");
    }}>
      {isTutor ? <TutorFields errors={errors} /> : <ConsultationFields audience={audience} onAudienceChange={(value) => { setAudience(value); clearError("audience"); clearError("studentName"); }} errors={errors} clearError={clearError} />}
      {status === "error" && <p className="text-sm leading-relaxed text-accent" role="alert">We could not save your inquiry. Your details are still here; please try again.</p>}
      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{isTutor ? "Our team will review your application and get in touch." : "Our admin will contact you through WhatsApp within 2 business days, or via your alternative contact if provided."}</p>
        <Button type="submit" size="lg" className="h-12 w-full sm:w-auto" disabled={status === "submitting"}>{status === "submitting" ? "Sending…" : isTutor ? "Submit application" : "Send inquiry"}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
      </div>
    </form>
  );
}
