import { z } from "zod";
import { trainingInquirySchema } from "./coaching-training";

export const physicsStages = [
  "Beginner",
  "Provincial/Experienced",
  "National Medallist",
  "IPhO / APhO / EuPhO team selection",
  "Grinding for Physics A-Level / IB / etc",
  "Other",
] as const;

const requiredText = (message: string, maxLength = 100) => z.string().trim().min(1, message).max(maxLength, `Use ${maxLength} characters or fewer.`);
const commonFields = {
  name: requiredText("Enter your full name."),
  country: requiredText("Enter your country."),
  languages: requiredText("Enter the languages you are comfortable with."),
  heardFrom: requiredText("Tell us where you heard about us.", 200),
};

export const tutorInquirySchema = z.object({
  formType: z.literal("tutor"),
  ...commonFields,
  age: z.string().trim().regex(/^(?:[1-9]\d?|1[01]\d|120)$/, "Enter a whole-number age from 1 to 120."),
  stats: requiredText("Tell us about your Olympiad achievements.", 2000),
  whatsapp: trainingInquirySchema.shape.whatsapp.or(z.string().trim().regex(/^@[a-zA-Z0-9_.-]{3,31}$/, "Enter a WhatsApp number or @username.")),
});

export const consultationInquirySchema = z.object({
  formType: z.literal("consultation"),
  audience: z.enum(["Student", "Parent"], { error: "Choose Student or Parent." }),
  ...commonFields,
  studentName: z.string().trim().max(100, "Use 100 characters or fewer.").optional().default(""),
  whatsapp: trainingInquirySchema.shape.whatsapp.or(z.string().trim().length(0)).optional().default(""),
  alternativeContact: z.string().trim().max(200, "Use 200 characters or fewer.").optional().default(""),
  grade: requiredText("Enter the student’s level or grade."),
  physicsStage: z.enum(physicsStages, { error: "Choose the physics stage that fits best." }),
  referralCode: z.string().trim().max(100, "Use 100 characters or fewer.").optional().default(""),
}).superRefine((inquiry, context) => {
  if (inquiry.audience === "Parent" && !inquiry.studentName) {
    context.addIssue({ code: "custom", path: ["studentName"], message: "Enter the student’s full name." });
  }
  if (!inquiry.whatsapp && !inquiry.alternativeContact) {
    context.addIssue({ code: "custom", path: ["whatsapp"], message: "Enter your WhatsApp number or another way to contact you." });
  }
});

export const coachingApplicationSchema = z.discriminatedUnion("formType", [tutorInquirySchema, consultationInquirySchema]);
export type CoachingApplication = z.infer<typeof coachingApplicationSchema>;

export function coachingApplicationToRecord(inquiry: CoachingApplication) {
  if (inquiry.formType === "tutor") {
    return {
      pathway: "Tutor inquiry" as const,
      audience: "Tutor applicant" as const,
      currentLevel: "IPhO / APhO / EuPhO tutor applicant",
      contact: inquiry.whatsapp,
      goals: [
        `Name: ${inquiry.name}`,
        `Age: ${inquiry.age}`,
        `Country: ${inquiry.country}`,
        `Olympiad achievements: ${inquiry.stats}`,
        `Languages: ${inquiry.languages}`,
        `Where did you learn about us?: ${inquiry.heardFrom}`,
      ].join("\n"),
    };
  }

  return {
    pathway: "General physics consultation" as const,
    audience: inquiry.audience,
    currentLevel: inquiry.grade,
    contact: [inquiry.whatsapp, inquiry.alternativeContact].filter(Boolean).join(" | "),
    goals: [
      `Name: ${inquiry.name}`,
      ...(inquiry.audience === "Parent" ? [`Student’s full name: ${inquiry.studentName}`] : []),
      `WhatsApp: ${inquiry.whatsapp || "Not provided"}`,
      `Alternative contact: ${inquiry.alternativeContact || "Not provided"}`,
      `Country: ${inquiry.country}`,
      `Physics stage: ${inquiry.physicsStage}`,
      `Languages: ${inquiry.languages}`,
      `Where did you hear about us?: ${inquiry.heardFrom}`,
      `Referral code: ${inquiry.referralCode || "Not provided"}`,
    ].join("\n"),
  };
}
