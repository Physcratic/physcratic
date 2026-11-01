import assert from "node:assert/strict";
import test from "node:test";
import { trainingInquirySchema, trainingInquiryToRecord, trainingPrograms } from "./coaching-training";

const validInquiry = {
  formType: "training",
  name: "Avery Student",
  grade: "Year 11",
  program: "IGCSE",
  whatsapp: "+62 812 3456 7890",
  preferredLanguage: "English, Hindi",
  heardFrom: "Instagram",
  referralCode: "PHYSICS",
};

test("training inquiry accepts each supported program", () => {
  for (const program of trainingPrograms) {
    assert.equal(trainingInquirySchema.parse({ ...validInquiry, program }).program, program);
  }
});

test("training inquiry requires every Tally field except referral code", () => {
  for (const field of ["name", "grade", "program", "whatsapp", "preferredLanguage", "heardFrom"] as const) {
    assert.equal(trainingInquirySchema.safeParse({ ...validInquiry, [field]: "" }).success, false, field);
  }
  const { referralCode: _, ...withoutReferral } = validInquiry;
  assert.equal(trainingInquirySchema.parse(withoutReferral).referralCode, "");
  assert.equal(trainingInquirySchema.parse({ ...validInquiry, referralCode: "   " }).referralCode, "");
});

test("training inquiry trims text and rejects whitespace-only required values", () => {
  assert.equal(trainingInquirySchema.parse({ ...validInquiry, name: "  Avery Student  " }).name, "Avery Student");
  for (const field of ["name", "grade", "preferredLanguage", "heardFrom"] as const) {
    assert.equal(trainingInquirySchema.safeParse({ ...validInquiry, [field]: "   " }).success, false, field);
  }
});

test("training inquiry rejects unsupported programs and malformed WhatsApp numbers", () => {
  assert.equal(trainingInquirySchema.safeParse({ ...validInquiry, program: "Other" }).success, false);
  for (const whatsapp of ["student@example.com", "123456", "+1234567890123456", "+62\n81234567890", "call me later"]) {
    assert.equal(trainingInquirySchema.safeParse({ ...validInquiry, whatsapp }).success, false, whatsapp);
  }
  for (const whatsapp of ["+1 (202) 555-0123", "08123456789", "+44 7700 900123"]) {
    assert.equal(trainingInquirySchema.safeParse({ ...validInquiry, whatsapp }).success, true, whatsapp);
  }
});

test("training inquiry enforces field length limits", () => {
  for (const field of ["name", "grade", "preferredLanguage", "referralCode"] as const) {
    assert.equal(trainingInquirySchema.safeParse({ ...validInquiry, [field]: "x".repeat(101) }).success, false, field);
  }
  assert.equal(trainingInquirySchema.safeParse({ ...validInquiry, heardFrom: "x".repeat(201) }).success, false);
});

test("training inquiry preserves all seven fields in the existing inquiry record", () => {
  const inquiry = trainingInquirySchema.parse(validInquiry);
  const record = trainingInquiryToRecord(inquiry);
  assert.equal(record.pathway, "IB / A-Level / IGCSE training");
  assert.equal(record.audience, "Student");
  assert.equal(record.currentLevel, inquiry.grade);
  assert.equal(record.contact, inquiry.whatsapp);
  assert.equal(record.goals, [
    "Name: Avery Student",
    "Program of interest: IGCSE",
    "Preferred language for class: English, Hindi",
    "Where did you learn about us?: Instagram",
    "Referral code: PHYSICS",
  ].join("\n"));
});

test("training inquiry records an omitted referral code without inventing one", () => {
  const { referralCode: _, ...withoutReferral } = validInquiry;
  const record = trainingInquiryToRecord(trainingInquirySchema.parse(withoutReferral));
  assert.match(record.goals, /Referral code: Not provided$/);
});
