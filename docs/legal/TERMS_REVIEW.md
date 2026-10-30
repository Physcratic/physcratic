# Terms review and publication gate

Source: supplied PHYSCRATIC_TERMS_DRAFT_FOR_CODEX.md, used only for policy content.
Revised proposed text: TERMS_REVIEW_DRAFT.md (sole proposed content source, not imported by runtime).
Active source remains lib/terms.ts, version 2026-10-30-draft-1, unchanged including its provisional status.
This PR does not approve that legacy text, activate the proposed revision, or amend any user's acceptance.
Both /terms and the signup dialog render active content through components/terms-content.tsx.

## Comparison and decisions
| Source clauses | Compared with current /terms and reviewed signup | Required decision |
| --- | --- | --- |
| Header; 20.5 | Current page admits missing identity/contact. Draft adds entity, registration, jurisdiction, dates, official URL and multiple contact placeholders. | Founder supplies verifiable identity, contacts, markets and dates; counsel confirms disclosures. No fabricated fields. |
| Summary; 1, 12 | Draft incorporates Privacy Policy and Community Guidelines. Current page requires a separate privacy notice; no such implementation is established here. | Supply approved reachable policies before incorporation. |
| 2 | Draft specifies guardian consent/verification and minor visibility defaults. Signup has no age/guardian controls. | Do not promise implemented consent flows; approve eligibility and implement lawful process before publication. |
| 4–5, 7, 11 | Draft describes regrading, assisted-practice flags, authoring/public discussion, popularity/flairs and certificate verification/storage. Reviewed signup/Terms do not establish those controls. | Product owner verifies each feature or removes its present-tense assertion. Never imply certificate privacy without storage/access evidence. |
| 6 | Current source limits licence to operation and private content; proposed licence adds public display/promotional use plus deletion/backup/anonymization commitments. | Counsel and founder approve scope; distinguish private submissions from deliberately public content, substantiate deletion/retention. |
| 8, 10, 15 | Draft promises reporting, appeals, copyright response/restoration, account deletion. Current page avoids promising unimplemented deletion tools. | Confirm staffed channels, workflows and lawful response processes. No assumed moderation/deletion infrastructure. |
| 3, 9 | Security contacts/disclosure policy and recovery handling are placeholders. | Supply channels/policy; consent UI does not implement recovery or disclosure operations. |
| 14 | Free service and separate future payment/prize terms. | Founder confirms pricing stance; do not imply paid/prize features already exist. |
| 17 | Current text has general limitations; draft introduces SGD100/12-month cap and indemnity including minors. | Explicit qualified legal review; not approved by implementation. |
| 18 | Conditional Singapore forum/law and 30-day dispute response. | Confirm entity/market/jurisdiction and staffed response timeline; draft replaces response promise with approval placeholder. |
| 19 | Draft adds 30-day notice and renewal commitments; current source says fresh acceptance where legally required. | Approve notice process and reacceptance design separately. No automatic legacy acceptance. |
| 20 | Assignment and integrated agreement provisions. | Legal review against entity, transactions and mandatory consumer rights. |

Revisions narrow the summary's unsupported community/review claims and replace fixed response/notice
commitments with explicit approval markers. Remaining numbered provisions are proposals subject to the
matrix above, not verified product descriptions. No evidence from unseen infrastructure was assumed.
The existing Terms also mention correction, private work and future notices: these remain factual/legal
review items, not newly approved promises. The existing draft age threshold itself is not proof of compliance.

## Explicit human publication gate
1. Founder confirms every factual assertion and fills all identity, contact, URL, date and jurisdiction fields.
2. Qualified legal reviewer approves exact final text, minors/privacy, licence, liability/indemnity and dispute terms.
3. Product owner verifies referenced controls/policies exist; remove unsupported promises before approval.
4. Record approver identities, exact content hash/version and approval date in a separate reviewed publication change.
5. Archive immutable prior text/version, choose a new approved version/date, and test archived links before activation.
6. Review any material-change notice/renewed-consent rollout separately. Never overwrite prior acceptance records
   or infer consent from visits, opening/scrolling/dismissing dialogs, publication or deployment.
No environment switch auto-publishes this draft. Merging this implementation must not import proposed legal
content into the active source. This PR intentionally provides no publication approval or approval toggle.
