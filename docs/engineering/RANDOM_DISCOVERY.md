# Random Arena discovery

27 November 2026. F3 follows F2, merged through PR #267 as `6c622c2` after all seven exact-head workflows and both preview checks passed.

The dashboard card now says "Random Arena problem". Its choice uses neither account progress nor the legacy shared-browser solved list. It explicitly identifies random selection and does not promise an unfinished, unattempted or personalised recommendation. Another problem excludes the displayed candidate when alternatives exist. The stable initial Arena link remains usable before hydration and without JavaScript.

This is the smaller random-discovery option from the feature evaluation. It avoids treating missing account progress as zero progress or conflating attempted, personally marked complete and correctly checked work. The existing guest solved-memory writer and its contract are preserved for other callers. No account progress reader, new persistence service or adaptive recommender is introduced.

Focused checks cover server-rendered title/summary/link and the existing picker boundaries, including one/zero candidates. The actual card browser test covers empty, partial, all-candidates and blocked browser storage, synthetic account-cookie changes within one tab, fresh browser contexts, reload, keyboard shuffle, overflow and light/dark axe at 375 and 1440 pixels. It verifies zero account-progress API requests. This is a synthetic component test, not provider or production-session qualification. Full published-head CI remains required before merge.

No schema, migration, dependency, protected release manifest, production setting, feature flag or deployment changes. Saved-practice qualification remains deferred. F4 should validate continuation, existing history and favourite retrieval before adding another queue.

## Final qualification

PR #268 merged as d88deee9e4554749cf713cf9c5349b836fb2e975. All six workflows and both preview checks passed on exact head 3390cdd89b4d96aa4de9aa7963d64897a90c9a32, including core CI, full public library, community, CSP, discovery/feedback and written recovery. The PR records linked run evidence. No production deployment occurred.
