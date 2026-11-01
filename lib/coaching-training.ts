import { z } from "zod";

export const trainingPrograms = ["IB", "A-Level", "IGCSE"] as const;

export const trainingInquirySchema = z.object({
  formType: z.literal("training"),
  name: z.string().trim().min(1, "Enter your name.").max(100, "Use 100 characters or fewer."),
  grade: z.string().trim().min(1, "Enter your grade.").max(100, "Use 100 characters or fewer."),
  program: z.enum(trainingPrograms, { error: "Choose a program of interest." }),
  whatsapp: z.string().trim().min(1, "Enter your WhatsApp number.").max(32, "Enter a valid WhatsApp number.")
    .regex(/^\+?[\d ().-]+$/, "Enter a valid WhatsApp number.")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Your WhatsApp number should contain 7–15 digits."),
  preferredLanguage: z.string().trim().min(1, "Enter your preferred language.").max(100, "Use 100 characters or fewer."),
  heardFrom: z.string().trim().min(1, "Tell us where you learned about us.").max(200, "Use 200 characters or fewer."),
  referralCode: z.string().trim().max(100, "Use 100 characters or fewer.").optional().default(""),
});

export type TrainingInquiry = z.infer<typeof trainingInquirySchema>;

export function trainingInquiryToRecord(inquiry: TrainingInquiry) {
  return {
    pathway: "IB / A-Level / IGCSE training" as const,
    audience: "Student" as const,
    currentLevel: inquiry.grade,
    contact: inquiry.whatsapp,
    goals: [
      `Name: ${inquiry.name}`,
      `Program of interest: ${inquiry.program}`,
      `Preferred language for class: ${inquiry.preferredLanguage}`,
      `Where did you learn about us?: ${inquiry.heardFrom}`,
      `Referral code: ${inquiry.referralCode || "Not provided"}`,
    ].join("\n"),
  };
}
