# Project agent audit, 2026-09-06

Scope: free-pdf-editor. Sources: [GPT-6 Astra guide](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra), [OpenLoop PR 176](https://github.com/stozo04/OpenLoop/pull/176).

Read CLAUDE.md, PRD.md, README.md, reference/README.md, package scripts, both helper scripts, and repository hygiene configuration. No AGENTS.md, local skill packages, previous audit branch, or open task PR existed. Excluded dependencies, generated output, proprietary archived reference capture, and nested worktrees.

Moved all unique CLAUDE guidance into shared project instructions; identical root pointers and an always-applied Cursor rule load it alongside the operating policy. Retained client-only privacy, free software choices, PDF coordinate invariants, whiteout limitations, build/dev cache warning, and required PR review. The PRD acceptance suite still applies to product implementation; documentation checks are scoped to this change. Replaced the unavailable frontend-design skill dependency with the existing local Section 9 design requirements.

No skill copies existed to reconcile. All three empty skills directories have identical placeholders; no provider-specific settings were invented. Reused OpenLoop's checker and 16 regressions with a remote-default-aware base lookup and no Android gate references. Integrated synchronization into npm lint through check:agents.

Validation: 16 synchronization regressions pass, including detection and source-preserving repair of foreign paths in both slash formats. Sync passes for 1 placeholder x 3; root pointers and referenced documents independently verified. Staged diff checked and inspected.

Skipped: browser product acceptance and production build because no product code changed. This audit does not refresh the README's historical product verification claims. No interactive agent behavior test, merge, release, or deployment.

Existing npm lint passed with zero warnings or errors, including the integrated synchronization check.
