import assert from "node:assert/strict";
import test from "node:test";
import { coachingApplicationSchema, coachingApplicationToRecord, consultationInquirySchema, physicsStages, tutorInquirySchema } from "./coaching-inquiries";
import { coachingGoalPaths, coachingGoals } from "./coaching-pathways";

const tutor = {
  formType: "tutor",
  name: "Example Tutor",
  age: "20",
  country: "Indonesia",
  stats: "Gold IPhO 2024; HM APhO 2023",
  languages: "English, Indonesian",
  whatsapp: "+62 812 3456 7890",
  heardFrom: "A friend",
};

const student = {
  formType: "consultation",
  audience: "Student",
  name: "Example Student",
  whatsapp: "+1 (202) 555-0123",
  alternativeContact: "Telegram @example",
  country: "India",
  grade: "Grade 10",
  physicsStage: "Beginner",
  languages: "English and Hindi",
  heardFrom: "Instagram",
  referralCode: "PHYSICS",
};

test("all three coaching pathways have separate destinations", () => {
  assert.equal(new Set(coachingGoals.map((goal) => coachingGoalPaths[goal])).size, 3);
  assert.equal(coachingGoalPaths["Tutor inquiry"], "/coaching/become-a-tutor");
  assert.equal(coachingGoalPaths["General physics consultation"], "/coaching/consultation");
  assert.equal(coachingGoalPaths["IB / A-Level / IGCSE training"], "/coaching/training");
});

test("tutor inquiry requires all seven screenshot fields", () => {
  assert.equal(tutorInquirySchema.safeParse(tutor).success, true);
  for (const field of ["name", "age", "country", "stats", "languages", "whatsapp", "heardFrom"] as const) {
    assert.equal(tutorInquirySchema.safeParse({ ...tutor, [field]: "   " }).success, false, field);
  }
});

test("tutor inquiry validates age, achievements length and WhatsApp contact", () => {
  for (const age of ["0", "-1", "20.5", "121", "NaN", null, true]) {
    assert.equal(tutorInquirySchema.safeParse({ ...tutor, age }).success, false, String(age));
  }
  assert.equal(tutorInquirySchema.safeParse({ ...tutor, stats: "x".repeat(2001) }).success, false);
  assert.equal(tutorInquirySchema.safeParse({ ...tutor, whatsapp: "@example_tutor" }).success, true);
  assert.equal(tutorInquirySchema.safeParse({ ...tutor, whatsapp: "not a contact" }).success, false);
});

test("tutor inquiry preserves all fields in the existing inquiry record", () => {
  const record = coachingApplicationToRecord(tutorInquirySchema.parse(tutor));
  assert.equal(record.pathway, "Tutor inquiry");
  assert.equal(record.audience, "Tutor applicant");
  assert.equal(record.contact, tutor.whatsapp);
  for (const field of ["name", "age", "country", "stats", "languages", "heardFrom"] as const) {
    assert.ok(record.goals.includes(tutor[field]), field);
  }
});

test("student consultation does not require the parent-only student name", () => {
  assert.equal(consultationInquirySchema.safeParse(student).success, true);
  const record = coachingApplicationToRecord(consultationInquirySchema.parse({ ...student, studentName: "Stale hidden name" }));
  assert.equal(record.audience, "Student");
  assert.ok(!record.goals.includes("Stale hidden name"));
});

test("parent consultation requires and preserves the student’s full name", () => {
  const parent = { ...student, audience: "Parent", name: "Example Parent" };
  const missingName = consultationInquirySchema.safeParse(parent);
  assert.equal(missingName.success, false);
  if (!missingName.success) assert.equal(missingName.error.issues[0].path[0], "studentName");
  const record = coachingApplicationToRecord(consultationInquirySchema.parse({ ...parent, studentName: "Example Child" }));
  assert.equal(record.audience, "Parent");
  assert.ok(record.goals.includes("Name: Example Parent"));
  assert.ok(record.goals.includes("Student’s full name: Example Child"));
});

test("consultation supports all six physics stages and rejects unknown stages", () => {
  for (const physicsStage of physicsStages) {
    assert.equal(consultationInquirySchema.safeParse({ ...student, physicsStage }).success, true, physicsStage);
  }
  assert.equal(consultationInquirySchema.safeParse({ ...student, physicsStage: "Unsupported" }).success, false);
  assert.equal(consultationInquirySchema.safeParse({ ...student, audience: "Tutor" }).success, false);
});

test("consultation requires core fields but keeps referral code optional", () => {
  for (const field of ["name", "country", "grade", "physicsStage", "languages", "heardFrom"] as const) {
    assert.equal(consultationInquirySchema.safeParse({ ...student, [field]: "   " }).success, false, field);
  }
  const { referralCode: _, ...withoutReferral } = student;
  assert.equal(consultationInquirySchema.parse(withoutReferral).referralCode, "");
});

test("consultation accepts alternative contact without WhatsApp but requires one contact method", () => {
  const alternativeOnly = consultationInquirySchema.parse({ ...student, whatsapp: "   " });
  const record = coachingApplicationToRecord(alternativeOnly);
  assert.equal(record.contact, student.alternativeContact);
  assert.equal(consultationInquirySchema.safeParse({ ...student, whatsapp: "", alternativeContact: "   " }).success, false);
  assert.equal(consultationInquirySchema.safeParse({ ...student, whatsapp: "invalid", alternativeContact: "Telegram @example" }).success, false);
});

test("consultation preserves every submitted field and both contact methods", () => {
  const record = coachingApplicationToRecord(consultationInquirySchema.parse(student));
  assert.equal(record.pathway, "General physics consultation");
  assert.equal(record.currentLevel, student.grade);
  assert.equal(record.contact, `${student.whatsapp} | ${student.alternativeContact}`);
  for (const field of ["name", "country", "physicsStage", "languages", "heardFrom", "referralCode", "whatsapp", "alternativeContact"] as const) {
    assert.ok(record.goals.includes(student[field]), field);
  }
});

test("application schema trims values and rejects unknown form types and oversized fields", () => {
  assert.equal(coachingApplicationSchema.parse({ ...tutor, name: "  Example Tutor  " }).name, "Example Tutor");
  assert.equal(coachingApplicationSchema.safeParse({ ...tutor, formType: "unknown" }).success, false);
  for (const field of ["name", "country", "languages", "studentName", "grade", "referralCode"] as const) {
    assert.equal(consultationInquirySchema.safeParse({ ...student, [field]: "x".repeat(101) }).success, false, field);
  }
  for (const field of ["heardFrom", "alternativeContact"] as const) {
    assert.equal(consultationInquirySchema.safeParse({ ...student, [field]: "x".repeat(201) }).success, false, field);
  }
});
