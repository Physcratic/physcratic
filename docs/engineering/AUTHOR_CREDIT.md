# Independent author credit engineering handoff

Batch 1 adds an owner setting in Problem Studio. `COMMUNITY_AUTHOR_CREDIT_ENABLED` requires the literal value `true`. When it is OFF, the new JSON route returns 503 before importing the application database or authentication bindings, and the Studio controls stay hidden. Arena and problem-detail attribution remain scheduled for Batch 2. Signup still applies its existing profile publication policy.

## Owner operations

`GET /api/authored-problems/author-credit` returns the authenticated owner's handle, credit state and revision. PATCH accepts three separate actions.

- `claim` saves a normalized, permanent username with the private profile defaults and empty credit evidence. The existing unique index resolves concurrent claims across accounts.
- `acknowledge` requires the confirmed handle, current policy version and observed credit revision. The server records the time. Acknowledgement applies to the author's current published work, including any earlier publication.
- `withdraw` records a withdrawal against the observed revision. Fresh acknowledgement is required to restore credit. The profile and published problems follow their existing lifecycle.

All requests require a verified session and a matching `X-Community-Account` header. Writes also require an approved Origin and bounded JSON. The profile write limit of ten writes per account per minute is shared. Status revisions change monotonically and reject stale requests after withdrawal. The advisory lock matches profile editing, so their first claims serialize even on a missing row. Account deletion cascades to the stored preference through the established profile foreign key.

## Migration and Batch 2

0023 adds three nullable columns to the 0007 profile table, with no backfill. It is compatible with the 0022 profile publication extension. The existing B1 SELECT, INSERT and UPDATE on profile and profile write limits suffice. Confirm the actual schema and role during separate release preparation. Rehearse and independently approve any migration or feature activation. Once consent exists, roll back by disabling the feature and retaining the evidence. The DOWN file is guarded for an unused installation and must run inside one transaction.

Keep the feature OFF in Production until Batch 2 and the approved disclosure are ready. Batch 2 needs a shared current-publication lookup for Arena and detail, a current unwithdrawn policy match, handle-only credit and a separately checked profile link. Preserve generic authorship before opt-in, generic deleted-author handling for authorized retained publications and fresh-read withdrawal. Review already-open card expiry before enabling. Get owner approval of the [draft Studio disclosure and Privacy Notice](AUTHOR_CREDIT_DISCLOSURE_DRAFT.md), including profile deactivation wording and the Terms acceptance decision.
