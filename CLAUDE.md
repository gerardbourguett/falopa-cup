# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based website for tracking two unofficial Chilean football tournaments: **Falopa Cup** and **Copa Pablo Milad**. The site follows the "Unofficial Football World Championships" concept where a championship title is contested in every official match.

## Commands

```bash
pnpm dev          # Start local dev server at localhost:4321
pnpm build        # Build production site to ./dist/
pnpm preview      # Preview build locally
pnpm test         # Run unit tests (Vitest)
pnpm test:watch   # Run tests in watch mode
pnpm check        # Run astro check (automatically runs tests first via precheck)
```

## Pre-Push Protocol

Before every `git push`, run in this order:

```bash
pnpm test         # 1. Unit tests — must be 100% green
pnpm check        # 2. Type checking — only pre-existing errors allowed (MatchCard + Palmares ts(1002))
```

### Known pre-existing type errors (do NOT fix unless explicitly working on those components)
- `src/components/MatchCard.astro:420` — `ts(1002)` Unterminated string literal (false positive)
- `src/components/Palmares.astro:333` — `ts(1002)` Unterminated string literal (false positive)

These errors existed before the project was set up and do not affect the build or runtime.

### What each check covers

| Check | Command | Covers |
|-------|---------|--------|
| Unit tests | `pnpm test` | `src/lib/tournament.ts` — `getCurrentHolder`, `getHolderChain`, `resolveClub` |
| Type check | `pnpm check` | All `.astro`, `.ts`, `.tsx` files |

### Test files
- `src/lib/tournament.test.ts` — 17 tests for core tournament logic

## Architecture

### Content Collections

The project uses Astro Content Collections with JSON loaders:

- **`blog`** - Blog posts (Markdown/MDX files in `src/content/blog/`)
- **`falopa-cup`** - Falopa Cup tournament data (JSON in `src/content/falopa-cup/`)
- **`copa-pablo-milad`** - Copa Pablo Milad tournament data (JSON in `src/content/copa-pablo-milad/`)
- **`clubs`** - Chilean football club info (JSON in `src/content/clubs/`)

### Data Schema

Tournament matches use this schema (defined in `src/content.config.ts`):
- `type`: "seeding" | "match"
- `date`: Match date
- `competition`: Competition name (e.g., "Liga de Primera · Fecha 1")
- `holderId`: Current champion's club ID
- `challengerId`: Opponent's club ID
- `scoreHolder` / `scoreChallenger`: Final score
- `penalties`: Optional penalty shootout scores
- `newHolderId`: Who holds the title after this match
- `reason`: Explanation for seeding matches

### Key Files

- `astro.config.mjs` - Astro config with MDX, sitemap, and Tailwind v4
- `src/content.config.ts` - Content collection schemas
- `src/consts.ts` - Site title and description
- `src/pages/index.astro` - Homepage showing current champions
- `src/pages/falopa-cup/index.astro` - Falopa Cup history
- `src/pages/copa-pablo-milad/index.astro` - Copa Pablo Milad history

### Club Data

Each club JSON in `src/content/clubs/` contains:
```json
{
  "id": "club-id",
  "name": "Full Club Name",
  "shortName": "Short Name",
  "stadium": "Stadium Name",
  "logo": "/logos/club-name.svg"
}
```

### Adding Match Data

To add a new match:
1. Edit the appropriate year's JSON file in `src/content/falopa-cup/` or `src/content/copa-pablo-milad/`
2. Add a match object with the required fields
3. For Falopa Cup: title transfers on any loss (defender loses = new holder)
4. For Copa Pablo Milad: title only transfers if defender wins (defender wins = keeps title and challenger becomes worst)
