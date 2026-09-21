# AGENTS.md

## Commands and verification

- `pnpm test` runs content integrity validation **before** Vitest; `pnpm test:watch` runs Vitest only.
- `pnpm check` automatically runs `precheck` (content validation + all tests), then `astro check`. Direct `pnpm astro check` bypasses that gate.
- For a focused run: `pnpm exec vitest run src/lib/tournament.test.ts`. This skips content validation; run `pnpm validate:content` separately for data changes.
- Do not assume `pnpm test -- src/lib/tournament.test.ts` filters tests: it ran the full suite in the verified local environment.
- Vitest discovers `src/**/*.test.ts` and `scripts/**/*.test.ts` (`vitest.config.ts`), not just tournament tests.
- Before an authorized push, run `pnpm test` then `pnpm check`; tests must pass. Report failures without fixing unrelated components.
- Do not reuse the historical MatchCard/Palmares `ts(1002)` exemptions in `CLAUDE.md` without reproducing them; the current check does not report those errors.

## Architecture

- Read `src/content.config.ts` for collection loaders and schemas rather than copying the schema summaries in `CLAUDE.md`.
- Conference League Sudamericana is a separate collection: `src/content/conference-league-sudamericana/`, with domain logic in `src/lib/tournaments/conference-league-sudamericana/`. Do not apply the two title-holder cups' rules to it.
- `src/lib/tournament.ts` is shared by pages and the match-entry CLI. `getCurrentHolder` and `getHolderChain` trust stored `newHolderId`, fall back to seeding `holderId`, and skip pending matches; they do **not** derive transfers from scores.
- Use `getCurrentReign` for the reign start date; `getCurrentHolder().match.date` can be a later successful defense.

## Adding match data

- Edit the appropriate season's `matches` array in `src/content/falopa-cup/` or `src/content/copa-pablo-milad/`; keep entries in ascending date order.
- Check both `src/content.config.ts` (shape) and `src/lib/validation/content-integrity.ts` (semantic constraints). Optional schema fields are not necessarily optional for a played match.
- Club references must exist in `src/content/clubs/`. Played matches require both scores and `newHolderId`; pending matches must omit those fields. A played match's `newHolderId` must be its holder or challenger.
- `pnpm script:next` prints a comment plus a JSON entry to stdout; it does not write files. Paste only the JSON object into `matches`.
- **Copa Pablo Milad discrepancy:** stored history transfers to the challenger when the holder wins (see `src/content/copa-pablo-milad/2026.json`), but `computeNewHolder` in `scripts/next-match.ts` currently transfers on a challenger win for **both** cups, including shootouts. Do not blindly paste its Copa output or rewrite existing history to match it.
- Content validation checks completeness, club IDs, ordering, and participant membership, **not** whether scores justify `newHolderId`. The Copa-named test in `src/lib/tournament.test.ts` also supplies `newHolderId`; it does not prove the transfer rule.
