export const TERMS_VERSION = "2026-10-30-draft-1";
export const TERMS_EFFECTIVE_DATE = "October 30, 2026";

export const TERMS_SECTIONS = [
  {
    id: "agreement",
    title: "Agreement and eligibility",
    paragraphs: [
      "These Terms govern your use of Physcratic, a physics learning and practice service, and form an agreement between you and the operator of Physcratic. Creating an account requires your affirmative acceptance of the version shown at signup. If you do not agree, do not create an account or use account-only features.",
      "You must be at least 13 and meet any higher minimum age required by the law where you live. If you are below the age of legal majority, use the service only with a parent or guardian's permission and supervision. A parent or guardian must agree on your behalf where required by applicable law. Do not create an account if these requirements are not met.",
    ],
  },
  {
    id: "accounts",
    title: "Your account",
    paragraphs: [
      "Provide accurate account information, keep your password confidential, and use an email address you control. Email verification is required before signing in. You are responsible for activity you authorize through your account; notify the operator if you suspect unauthorized access. Do not impersonate others, share access to bypass restrictions, or create accounts for abusive purposes.",
    ],
  },
  {
    id: "learning",
    title: "Learning materials and feedback",
    paragraphs: [
      "Physcratic provides practice problems, archived competition materials, solution tools, and related learning features. It is an independent learning service and is not endorsed by a competition organizer unless expressly stated. Source documents and third-party materials remain subject to their owners' rights and any stated licenses.",
      "Translations, generated explanations, automated feedback, marks, and ratings may be incomplete or incorrect. Translation drafts and unapproved grading references are not official solutions or marking schemes. Check important results against original sources and qualified instruction. No score, contest result, educational outcome, or uninterrupted access is guaranteed. Physics content is for learning, not instructions for unsafe experiments.",
    ],
  },
  {
    id: "conduct",
    title: "Fair use and contest integrity",
    paragraphs: [
      "Use the service lawfully and respectfully. Do not upload malware or unlawful content, harass others, infringe intellectual property, access another person's data, probe or bypass security controls, overload the service, or evade usage limits. Do not scrape or redistribute materials in violation of their licenses or applicable law.",
      "Follow each contest's published rules, including restrictions on collaboration, outside assistance, automated tools, and multiple accounts. Attempts to manipulate submissions, standings, or ratings may lead to disqualification, correction of results, or account restrictions. Do not use the service to cheat in an external assessment.",
    ],
  },
  {
    id: "submissions",
    title: "Your work and uploaded files",
    paragraphs: [
      "You retain ownership of your original solutions, notes, and uploads. You grant Physcratic a limited, non-exclusive license to store, copy, process, and display that content only as reasonably necessary to provide, secure, and maintain the features you use. This does not transfer ownership or grant permission to sell your work or publish private submissions.",
      "Only submit material you have the right to share and avoid unnecessary personal or sensitive information. Saved solutions and notes are intended to be private to your account; contest participation may display a chosen public handle, results, or ratings where that feature indicates. Processing may use hosting, storage, email, and, for explicitly offered AI features, model service providers. These Terms do not replace a privacy notice or any consent separately required by law.",
      "Keep your own copies of important work. Security measures and backups cannot guarantee that data will never be lost or accessed without authorization.",
    ],
  },
  {
    id: "ownership",
    title: "Service ownership and permissions",
    paragraphs: [
      "Physcratic's original interface, software, and branding belong to their respective owners. Subject to these Terms and third-party rights, you may use the service for your own learning. No license to resell the service, reproduce third-party problem collections, or use competition brands is implied. Legal exceptions and permissions granted by an applicable open-source or content license are unaffected.",
    ],
  },
  {
    id: "availability",
    title: "Changes, availability, and charges",
    paragraphs: [
      "Features may change, be limited, or become unavailable for maintenance, security, or other operational reasons. Reasonable notice will be given for significant changes when practicable. These Terms alone do not authorize a charge. Any paid feature would require clear pricing and your separate agreement before purchase; mandatory consumer cancellation and refund rights remain unaffected.",
    ],
  },
  {
    id: "ending-access",
    title: "Ending use and restricting access",
    paragraphs: [
      "You may stop using the service at any time. The operator may restrict or suspend access when reasonably necessary to address abuse, security risks, legal obligations, or material breaches of these Terms. Where appropriate and lawful, notice and an opportunity to resolve the issue will be provided. Account deletion and privacy requests must be handled under applicable law; these Terms do not promise a deletion feature or retention period that has not been implemented.",
    ],
  },
  {
    id: "liability",
    title: "Disclaimers and responsibility",
    paragraphs: [
      "To the extent permitted by applicable law, the service is provided as available without additional warranties about accuracy, suitability for a particular purpose, or continuous availability. You are responsible for assessing learning materials and for decisions made using them.",
      "To the extent permitted by applicable law, the operator is not responsible for indirect or consequential losses, such as lost opportunities or anticipated results. Nothing in these Terms excludes or limits liability for fraud, deliberate misconduct, death or personal injury caused by negligence, or any other liability that cannot lawfully be excluded or limited. Mandatory consumer rights and other non-waivable rights take priority.",
    ],
  },
  {
    id: "updates",
    title: "Updates to these Terms",
    paragraphs: [
      "The effective date and version identify this text. Material changes will be communicated through the service or account email when practicable, and fresh acceptance will be requested where required by law. Changes do not retroactively alter accrued rights. If you do not agree to a future version, stop using the affected features.",
      "At signup, Physcratic stores the accepted Terms version and a server-generated acceptance timestamp with your account. Existing accounts are not treated as having accepted these Terms merely because this page is published.",
    ],
  },
  {
    id: "law",
    title: "Applicable law and remaining provisions",
    paragraphs: [
      "Applicable law determines your rights and the courts with jurisdiction. These starter Terms do not impose arbitration, a class-action waiver, or an exclusive forum. Any mandatory protections available where you live remain in force. If a provision is unenforceable, the remaining provisions continue to apply to the extent lawful.",
    ],
  },
] as const;

export function getTermsAcceptance(body: unknown, acceptedAt = new Date()) {
  if (!body || typeof body !== "object" || !("termsAccepted" in body) || body.termsAccepted !== true || !("termsVersion" in body) || body.termsVersion !== TERMS_VERSION) {
    throw new Error("Accept the current Terms of Service before creating an account.");
  }
  return { termsAcceptedVersion: TERMS_VERSION, termsAcceptedAt: acceptedAt };
}
