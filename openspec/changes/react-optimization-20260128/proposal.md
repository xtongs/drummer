## Title
Apply Vercel React best practices across existing UI to improve rendering and bundle efficiency

## Context
- Current React components and hooks have grown organically; need a pass to align with Vercel React best practices skill (vercel-react-best-practices).
- Goals: reduce avoidable re-renders, tighten dependencies, avoid bundle bloat patterns, and ensure deterministic behavior.

## Scope
- Touch existing React code under `src/` (components, hooks, entry points).
- Refactors only: no new product features or UX changes.
- Prioritize high-usage surfaces: `App.tsx`, playback/metronome hooks, PatternEditor cluster, and shared UI primitives.

## Non-goals
- No API/contract changes visible to end users.
- No design/UX redesign; visuals remain functionally equivalent.

## Approach
- Audit components/hooks using the `react-best-practices` skill rules, focusing on:
  - `rerender-*` rules: stable callbacks, primitive deps, memoization of expensive derived data.
  - `bundle-*` rules: avoid barrel imports, defer heavy/optional modules when safe.
  - `async-*` rules: avoid waterfalls where async data is used.
  - `client-*` rules: dedupe listeners/fetching paths where present.
- Add targeted unit tests when behavior risk is present.

## Acceptance Criteria
- No behavior/UX regressions; existing tests pass.
- Identified React anti-patterns in scope files are corrected per skill guide.
- Key components avoid unnecessary re-renders (e.g., stable deps, memoized selectors, no inline objects in dependency arrays).
- Typecheck/lint pass; performance-sensitive code documented with brief comments where non-obvious.

## Risks
- Over-refactoring could change timing-sensitive playback; mitigate with focused tests on playback/metronome hooks.

## Verification
- `bun run lint`
- `bun run typecheck`
- `bun run test` (or targeted suites for touched hooks/components)
